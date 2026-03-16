<script setup>
// EditorView.vue

import { ref, watch, computed, onMounted, onUnmounted } from 'vue'

import { Pipeline } from '@/editor/pipeline/pipeline'
import { htmlPlugin } from '@/editor/pipeline/plugins/html-plugin'

// helpers
import { findPath, findNodeById, findParentNode } from '@/utils/ast.js'
import { parseHTMLFragment } from '@/utils/parseHTMLFragment'

// stores
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'

import HistoryControls from '@/components/HistoryControls.vue'
import InspectorPanel from '@/components/InspectorCss/InspectorPanel.vue'
import HighlightOverlay from '@/components/HighlightOverlay.vue'
import ASTExplorer from '@/components/ASTExplorer.vue'
import CssExplorer from '@/components/CssExplorer.vue'
import Preview from '@/components/Preview.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
const EditorStore = useEditorStore()
const styleStore  = useStyleStore()

// UI
import Separator from '@/components/Separator.vue'
import AsidePanel from '@/components/AsidePanel.vue'

// node commands
import Delete from '@/components/Delete.vue'
import Append from '@/components/Append.vue'
import SelectionControls from '@/components/SelectionControls.vue'
import ClipboardControls from '@/components/ClipboardControls.vue'

// icons
import IconSidebar from '@/components/IconSidebar.vue'
import IconSidebarButton from '@/components/IconSidebarButton.vue'
import IconLayer from '@/components/icons/iconLayer.vue'
import IconComponent from '@/components/icons/iconComponent.vue'
import IconFiles from '@/components/icons/IconFiles.vue'
import IconHTML from '@/components/icons/IconHTML.vue'
import IconCSS from '@/components/icons/IconCSS.vue'
import IconConfig from '@/components/icons/IconConfig.vue'
import IconStyles from '@/components/icons/IconStyles.vue'
import IconInspect from '@/components/icons/iconInspect.vue'
import IconSave from '@/components/icons/IconSave.vue'
import IconOpen from '@/components/icons/IconOpen.vue'
import BreakpointeControl from '@/components/icons/BreakpointeControl.vue'
import CssOutputModal from '@/components/CssOutputModal.vue'
import HtmlImportModal from '@/components/HtmlImportModal.vue'

import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService.js'
import { HtmlExportService } from '@/editor/css/export/HtmlExportService.js'
import { AutoSaveService, AUTOSAVE_INTERVAL_MS } from '@/editor/css/export/AutoSaveService.js'
import AutoSaveRecoveryBanner from '@/components/AutoSaveRecoveryBanner.vue'
import { useColumnResize } from '@/composables/useColumnResize.js'

const { startResize, isResizing } = useColumnResize()

// ─── Larguras das colunas redimensionáveis (em px) ──────────────────────────
const layerWidth     = ref(280)  // col-layer    (HTML Explorer)
const cssWidth       = ref(450)  // col-css      (CSS Explorer)
const inspectorWidth = ref(300)  // col-panel-inspector

// No template, Vue faz auto-unwrap de refs (layerWidth → 280).
// Usar funções no script garante que o ref correto é passado ao composable.
function startLayerResize(e)     { startResize(e, layerWidth,     { min: 160, max: 520 }) }
function startCssResize(e)       { startResize(e, cssWidth,       { min: 220, max: 680 }) }
function startInspectorResize(e) { startResize(e, inspectorWidth, { min: 200, max: 520, direction: -1 }) }

const isSaveModalOpen  = ref(false)
const isImportModalOpen = ref(false)
const activeExplorer   = ref(null) // 'html' | 'css' | null

// ─── Auto-Save ──────────────────────────────────────────────────────────────

/** Guarda o objeto { html, savedAt } se existir um backup na sessão anterior. */
const pendingSave = ref(null)

/** ID do intervalo — guardado para limpar ao desmontar o componente. */
let autoSaveTimer = null

/**
 * Executa o auto-save: gera o HTML atual do iframe e persiste no localStorage.
 * Chamado pelo intervalo periódico.
 */
function runAutoSave() {
  const doc = EditorStore.getIframeDoc()
  const html = HtmlExportService.generateHtml(doc)
  AutoSaveService.save(html)
}

/**
 * Usuário optou por restaurar a sessão salva.
 * Carrega o HTML no editor e descarta o backup.
 */
function handleRestoreSave(html) {
  input.value = html
  AutoSaveService.clear()
  pendingSave.value = null
}

/**
 * Usuário optou por descartar a sessão salva.
 * O AutoSaveRecoveryBanner já chama AutoSaveService.clear() antes de emitir.
 */
function handleDiscardSave() {
  pendingSave.value = null
}

/** Baixa todas as stylesheets CSS editáveis como arquivos .css */
function downloadCss() {
  if (!styleStore.cssLogicTree) return
  CssLogicTreeService.downloadAllStylesheets(styleStore.cssLogicTree)
}

/** Baixa o HTML atual do iframe como arquivo .html */
function downloadHtml() {
  const doc = EditorStore.getIframeDoc()
  HtmlExportService.downloadFile(doc, 'index.html')
}

// Auto-open CSS Explorer when a rule navigation is requested from the Inspector
watch(() => styleStore.explorerScrollRequest, (v) => {
  if (v > 0) activeExplorer.value = 'css'
})

const handleHtmlLoad = (newHtml) => {
  input.value = newHtml
}

const TEST_PAGE_URL = 'http://editor.test/assets/teste-2'

/**
 * Resolve URLs relativas nos atributos href/src do HTML para absolutas.
 * URLs já absolutas passam sem alteração (new URL() garante isso).
 */
function resolveRelativeUrls(html, pageUrl) {
  // new URL('.', pageUrl) extrai o diretório corretamente:
  // 'http://editor.test/assets/teste-2/index.html' → 'http://editor.test/assets/teste-2/'
  // 'http://editor.test/assets/teste-2/'           → 'http://editor.test/assets/teste-2/'
  const baseUrl = new URL('.', pageUrl).href

  const resolve = (match, pre, url, post) => {
    try {
      return pre + new URL(url, baseUrl).href + post
    } catch {
      return match // se a URL for inválida, deixa como está
    }
  }

  return html
    .replace(/(<link\b[^>]*\shref=")([^"]+)(")/gi, resolve)
    .replace(/(<script\b[^>]*\ssrc=")([^"]+)(")/gi, resolve)
    .replace(/(<img\b[^>]*\ssrc=")([^"]+)(")/gi, resolve)
}

const loadExternalTestPage = async () => {
  try {
    const response = await fetch(TEST_PAGE_URL)
    if (response.ok) {
      const html = await response.text()
      // response.url é a URL final após redirects do servidor
      input.value = resolveRelativeUrls(html, response.url)
    }
  } catch (e) {
    console.error('Failed to fetch remote HTML:', e)
  }
}


onMounted(async () => {
  // Verifica se existe backup da sessão anterior antes de carregar a página
  pendingSave.value = AutoSaveService.load()

  await loadExternalTestPage()

  // Inicia o auto-save periódico após carregar a página
  autoSaveTimer = setInterval(runAutoSave, AUTOSAVE_INTERVAL_MS)
})

onUnmounted(() => {
  clearInterval(autoSaveTimer)
})

const inputHTML = `
<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <!-- 1. External Layer: Bootstrap CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" data-location="external" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" data-location="external" crossorigin="anonymous">

    <!-- 2. Internal Layer: Bootstrap CSS -->
    <link rel="stylesheet" href="http://editor.test/assets/teste-1/css/all.css" data-location="internal" crossorigin="anonymous">
    
    <!-- 3. On Page Layer: Styles specific to this page -->
    <style data-location="on_page">
      body {
        background-color: #f8f9fa;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .layer-tag {
        font-size: 0.7rem;
        font-weight: bold;
        text-transform: uppercase;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
      }
    </style>

    <style data-location="on_page">
      body {
        font-family: 'Roboto', sans-serif;
      }
      
    </style>

  </head>
  <body>
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card custom-card shadow-sm p-4">
            <div class="card-body">
              <h2 class="card-title mb-4 font-weight-bold">
                <i class="fas fa-microchip text-primary me-2"></i>
                Export Test (Bootstrap)
              </h2>
              
              <p class="card-text text-muted mb-4 class-1 class-2 class-3">
                Este template usa <strong>Bootstrap 5</strong> para validar a extração de CSS por camadas:
              </p>

              <div class="list-group">
                <div class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <i class="fas fa-link text-warning me-2"></i>
                    <strong>External</strong>
                  </div>
                  <span class="badge bg-warning layer-tag">Bootstrap + FontAwesome</span>
                </div>
                
                <div class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <i class="fas fa-file-code text-primary me-2"></i>
                    <strong>Internal</strong>
                  </div>
                  <span class="badge bg-primary layer-tag" id="meu-id">.custom-card styles</span>
                </div>

                <div class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <i class="fas fa-pager text-success me-2"></i>
                    <strong>On Page</strong>
                  </div>
                  <span class="badge bg-success layer-tag">Body & Utility styles</span>
                </div>
              </div>

              <div class="mt-4 p-3 bg-light rounded border text-center" style="border-style: dashed !important; border-color: #dee2e6 !important;">
                <p class="mb-0 text-secondary small">
                  <i class="fas fa-info-circle me-1"></i>
                  Clique em <strong>Salvar</strong> para ver o output de cada camada nos textareas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`

// refs
const input = ref(inputHTML)

const showExplorer = ref(false)

const previewContainerEl = ref(null)

onMounted(() => {
  EditorStore.previewContainer = previewContainerEl.value
})

const previewWidth = ref(1280)
const previewUnit = ref('px')

// outros
const pipeline = new Pipeline()
pipeline.use(htmlPlugin())

// observa o imput
watch(
  input,
  (newInput) => {
    // ctx.value = pipeline.run(newInput)
    EditorStore.loadHTML(input.value)
  },
  { immediate: true },
)


// Viewport sync from Iframe
watch(
  () => EditorStore.iframe,
  (newIframe) => {
    if (!newIframe) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        EditorStore.setViewport(width, height)
      }
    })
    resizeObserver.observe(newIframe)
  },
)
</script>

<template>
  <div class="flex flex-col grow shrink-0 h-full max-h-full overflow-hidden">

    <!-- Banner de recuperação de sessão (aparece somente se há backup no localStorage) -->
    <AutoSaveRecoveryBanner
      v-if="pendingSave"
      :save="pendingSave"
      @restore="handleRestoreSave"
      @discard="handleDiscardSave"
      class="z-[1000]"
    />
    <!-- <div class="flex justify-center bg-gray-200">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/editor">Editor</RouterLink>
    </div> -->

    <div class="flex items-center justify-center bg-white border-b border-gray-200 relative z-[1000]">


      <div class="flex gap-2">
        <BreakpointeControl :previewWidth="previewWidth" :previewUnit="previewUnit" @update="
          (e) => {
            previewWidth = e.width
            previewUnit = e.unit
          }
        " />
      </div>
    </div><!-- linha -->

    <!-- Cursor global durante drag: impede piscar ao sair do handle -->
    <div
      class="flex grow overflow-hidden bg-white"
      :class="isResizing ? '[&>*]:pointer-events-none [&>*]:select-none' : ''"
    >
      <IconSidebar style="position: relative; z-index: var(--z-panel)">

        <!-- Botão Inspect com dropdown de opções no hover -->
        <div class="relative group/inspect">
          <!-- Botão principal: ativa/desativa inspect mode -->
          <button
            class="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-150 hover:bg-gray-200 text-text-primary"
            :class="EditorStore.inspectMode ? 'bg-blue-100 text-blue-600' : ''"
            @click="EditorStore.inspectMode = !EditorStore.inspectMode"
            title="Inspect"
          >
            <IconInspect />
          </button>

          <!-- Dropdown: aparece no hover do botão — sem gap para não perder o hover -->
          <div class="absolute left-full top-0 pl-1 opacity-0 pointer-events-none group-hover/inspect:opacity-100 group-hover/inspect:pointer-events-auto transition-opacity duration-150 z-50">
            <div class="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] text-xs">
              <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cursor</div>

              <!-- Opção: Sem Box Model -->
              <button
                class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                :class="!EditorStore.showBoxModel ? 'text-blue-600 font-semibold' : 'text-gray-700'"
                @click.stop="EditorStore.showBoxModel = false; EditorStore.inspectMode = true"
              >
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
                </svg>
                Sem Box Model
                <svg v-if="!EditorStore.showBoxModel" class="w-3 h-3 ml-auto text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </button>

              <!-- Opção: Com Box Model -->
              <button
                class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                :class="EditorStore.showBoxModel ? 'text-blue-600 font-semibold' : 'text-gray-700'"
                @click.stop="EditorStore.showBoxModel = true; EditorStore.inspectMode = true"
              >
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
                  <rect x="6" y="6" width="12" height="12" rx="1" stroke-width="1.5" opacity="0.5"/>
                  <rect x="9" y="9" width="6" height="6" rx="1" stroke-width="1.5" opacity="0.8"/>
                </svg>
                Com Box Model
                <svg v-if="EditorStore.showBoxModel" class="w-3 h-3 ml-auto text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Outline Mode: revela os limites de todos os elementos -->
        <IconSidebarButton
          title="Outline Mode — revela limites de todos os elementos"
          @click="EditorStore.outlineMode = !EditorStore.outlineMode"
          :class="EditorStore.outlineMode ? 'bg-orange-100 text-orange-600' : ''"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" rx="2" stroke-width="1.5"/>
            <rect x="6" y="6" width="12" height="12" rx="1" stroke-width="1.5" opacity="0.6"/>
            <rect x="10" y="10" width="4" height="4" rx="0.5" stroke-width="1.5" opacity="0.9"/>
          </svg>
        </IconSidebarButton>

        <IconSidebarButton title="Layers" @click="activeExplorer = activeExplorer === 'html' ? null : 'html'"
          :class="activeExplorer === 'html' ? 'bg-gray-200' : ''">
          <IconLayer />
        </IconSidebarButton>
        <IconSidebarButton title="CSS" @click="activeExplorer = activeExplorer === 'css' ? null : 'css'"
          :class="activeExplorer === 'css' ? 'bg-gray-200' : ''">
          <IconCSS />
        </IconSidebarButton>

        <IconSidebarButton title="HTML">
          <IconHTML />
        </IconSidebarButton>

        <!-- 
                <IconSidebarButton title="Components">
          <IconComponent />
        </IconSidebarButton>
        <IconSidebarButton title="Files">
          <IconFiles />
        </IconSidebarButton>
        <IconSidebarButton title="CSS">
          <IconCSS />
        </IconSidebarButton>
        <IconSidebarButton title="Config">
          <IconConfig />
        </IconSidebarButton>
        <IconSidebarButton title="Styles">
          <IconStyles />
        </IconSidebarButton> -->

        <IconSidebarButton title="Abrir" @click="isImportModalOpen = true">
          <IconOpen class="w-5 h-5" />
        </IconSidebarButton>

        <!-- Download CSS: baixa todos os stylesheets editáveis -->
        <IconSidebarButton title="Download CSS" @click="downloadCss" class="text-blue-500 hover:bg-blue-50">
          <IconCSS class="w-5 h-5" />
        </IconSidebarButton>

        <!-- Download HTML: baixa o HTML atual do iframe -->
        <IconSidebarButton title="Download HTML" @click="downloadHtml" class="text-blue-500 hover:bg-blue-50">
          <IconHTML class="w-5 h-5" />
        </IconSidebarButton>
      </IconSidebar>

      <!-- col-layer: HTML Explorer -->
      <template v-if="activeExplorer === 'html'">
        <AsidePanel
          id="col-layer"
          title="LayerExplorer"
          :style="{ width: layerWidth + 'px', minWidth: '160px', maxWidth: '520px' }"
          style2="position: relative; z-index: var(--z-panel)"
        >
          <ASTExplorer :ast="EditorStore.ctx.ast" :selectedNodeId="EditorStore.selectedNodeId" />
        </AsidePanel>
        <!-- Handle de resize: col-layer -->
        <div
          class="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-blue-400/40 transition-colors z-50"
          title="Arrastar para redimensionar"
          @mousedown="startLayerResize"
        />
      </template>

      <!-- col-css: CSS Explorer -->
      <template v-if="activeExplorer === 'css'">
        <AsidePanel
          id="col-css"
          title="CSS Explorer"
          :style="{ width: cssWidth + 'px', minWidth: '220px', maxWidth: '680px' }"
          style2="position: relative; z-index: var(--z-panel)"
        >
          <CssExplorer />
        </AsidePanel>
        <!-- Handle de resize: col-css -->
        <div
          class="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-blue-400/40 transition-colors z-50"
          title="Arrastar para redimensionar"
          @mousedown="startCssResize"
        />
      </template>

      <!-- col-main: canvas (absorve diferenças via flex-1) -->
      <div class="flex flex-col h-full w-full overflow-hidden gap-3" id="col-main">
          <div class="flex justify-between shrink-0 px-4 gap-2 overflow-x-auto w-full text-text-secondary text-xs  border-b border-gray-200 relative z-[1000]">
            <div class="flex gap-2 items-center">
              <HistoryControls></HistoryControls>
              <Separator />
              <ClipboardControls :nodeId="EditorStore.selectedNodeId" />
            </div>
            <div class="flex gap-2 items-center">
            <Append :nodeId="EditorStore.selectedNodeId" html="<div>minha div</div>">div</Append>
            <Separator />
            <Append :nodeId="EditorStore.selectedNodeId" html="<span>meu span</span>">span</Append>
            <Separator />
            <Append :nodeId="EditorStore.selectedNodeId" html="<p>meu parágrafo</p>">P</Append>
            <Separator />
            <Append :nodeId="EditorStore.selectedNodeId"
              html="<table border='1'><tr><td>tabela 1</td><td>tabela 2</td></tr></table>">Table</Append>
            <Separator />
            <Append :nodeId="EditorStore.selectedNodeId" html="<ul><li>lista 1</li><li>lista 2</li></ul>">UL</Append>
            <Separator />
            <Append :nodeId="EditorStore.selectedNodeId" html="<ol><li>lista 1</li><li>lista 2</li></ol>">OL</Append>
            </div>
            <div>
              <SelectionControls :nodeId="EditorStore.selectedNodeId" />
            </div>
            <div>
              <Delete :nodeId="EditorStore.selectedNodeId" icon-only custom-class="hover:scale-110" />
            </div>

          </div>
          <div ref="previewContainerEl"
               class="grow shrink-0 overflow-auto flex justify-center"
               style="position: relative">
            <HighlightOverlay mode="hover" />
            <HighlightOverlay mode="selection" />
            <Preview :html="EditorStore.ctx?.output" class="w-full h-full bg-gray-200 transition-all duration-300 border border-gray-300 "
              :style="{ width: previewWidth + previewUnit }" />
          </div>
          <div class="shrink-0 max-w-full" style="position: relative;">
              <Breadcrumbs />
          </div>
    
      </div>

      <!-- Handle de resize: col-panel-inspector (direção invertida: arrastar para esquerda aumenta) -->
      <div
        class="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-blue-400/40 transition-colors z-50"
        title="Arrastar para redimensionar"
        @mousedown="startInspectorResize"
      />

      <!-- col-panel-inspector: Inspector de CSS/HTML -->
      <div
        id="col-panel-inspector"
        class="grow-0 shrink-0 border-l border-gray-200 relative"
        :style="{ width: inspectorWidth + 'px' }"
      >
        <InspectorPanel />
      </div>
    </div><!-- linha -->

    <CssOutputModal :isOpen="isSaveModalOpen" @close="isSaveModalOpen = false" />
    <HtmlImportModal :isOpen="isImportModalOpen" @close="isImportModalOpen = false" @load="handleHtmlLoad" />
  </div>
  <!-- container main-->
  <!-- <div>
    <CodeEditor></CodeEditor>
  </div> -->
</template>
