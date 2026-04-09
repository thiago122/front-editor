<script setup>
// EditorView.vue

import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

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
import CodeEditor from '@/components/CodeEditor.vue'
const EditorStore = useEditorStore()
const styleStore  = useStyleStore()

// UI
import Separator from '@/components/Separator.vue'
import AsidePanel from '@/components/AsidePanel.vue'

// node commands
import Delete from '@/components/Delete.vue'
import SelectionControls from '@/components/SelectionControls.vue'
import ClipboardControls from '@/components/ClipboardControls.vue'
import InsertTagMenu from '@/components/InsertTagMenu.vue'

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
import PixelPerfectOverlay from '@/components/PixelPerfectOverlay.vue'
import PixelPerfectPanel from '@/components/PixelPerfectPanel.vue'
import { usePixelPerfect } from '@/composables/usePixelPerfect'

import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService.js'
import { HtmlExportService } from '@/editor/css/export/HtmlExportService.js'
import { AutoSaveService, AUTOSAVE_INTERVAL_MS } from '@/editor/css/export/AutoSaveService.js'
import AutoSaveRecoveryBanner from '@/components/AutoSaveRecoveryBanner.vue'
import SaveStatus from '@/components/SaveStatus.vue'
import { useColumnResize } from '@/composables/useColumnResize.js'

const { startResize, isResizing } = useColumnResize()
const pixelPerfect = usePixelPerfect()
const route = useRoute()

// ─── Larguras das colunas redimensionáveis (em px) ──────────────────────────
const layerWidth     = ref(280)  // col-layer    (HTML Explorer)
const cssWidth       = ref(450)  // col-css      (CSS Explorer)
const inspectorWidth = ref(300)  // col-panel-inspector
const codeEditorHeight = ref(250) // Altura do editor de código

// No template, Vue faz auto-unwrap de refs (layerWidth → 280).
// Usar funções no script garante que o ref correto é passado ao composable.
function startLayerResize(e)        { startResize(e, layerWidth,     { min: 160, max: 520 }) }
function startCssResize(e)          { startResize(e, cssWidth,       { min: 220, max: 680 }) }
function startCssRightResize(e)     { startResize(e, cssWidth,       { min: 220, max: 680, direction: -1 }) }
function startInspectorResize(e)    { startResize(e, inspectorWidth, { min: 200, max: 520, direction: -1 }) }

function startCodeEditorResize(e) {
  startResize(e, codeEditorHeight, { min: 100, max: 800, direction: -1, axis: 'y' })
}

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
  // Se há documento aberto via API, salva também no backend
  if (EditorStore.currentDocument) {
    EditorStore.saveDocument().catch(console.error)
  }
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

// ── Ctrl+S ────────────────────────────────────────────────────────────────
function handleGlobalKeydown(e) {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    // Prioridade: API backend > File System Access > download
    if (EditorStore.currentDocument) {
      EditorStore.saveDocument()
    } else if (EditorStore.fileAccessSupported) {
      EditorStore.saveFile()
    } else {
      downloadHtml()
    }
  }
}
onMounted(()      => window.addEventListener('keydown', handleGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown))

// Auto-open CSS Explorer when a rule navigation is requested from the Inspector
watch(() => styleStore.explorerScrollRequest, (v) => {
  if (v > 0) EditorStore.showCssExplorer = true
})

const handleHtmlLoad = (newHtml) => {
  input.value = newHtml
}


onMounted(async () => {
  // Verifica se existe backup da sessão anterior antes de carregar a página
  pendingSave.value = AutoSaveService.load()

  // Se houver um path na URL, carrega o documento correspondente
  const path = route.query.path
  if (path && EditorStore.currentDocument?.path !== path) {
    try {
      await EditorStore.openDocumentByPath(path)
    } catch (e) {
      console.error('[EditorView] Erro ao carregar documento da URL:', e)
    }
  }

  // Inicia o auto-save periódico após carregar a página
  autoSaveTimer = setInterval(runAutoSave, AUTOSAVE_INTERVAL_MS)
})

// Observa mudanças na URL (navegação entre documentos)
watch(() => route.query.path, async (newPath) => {
  if (newPath && EditorStore.currentDocument?.path !== newPath) {
    await EditorStore.openDocumentByPath(newPath)
  }
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
    <style data-location="on_page">
      body {
        font-family:  sans-serif;
      }
      .container {
      margin: 0 auto;
         background-color: #ccc;
        width: 1080px;
      }
    </style>

  </head>
  <body>
    <div class="container">
      asdasd
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

function startPreviewResizeRight(e) { previewUnit.value = 'px'; startResize(e, previewWidth, { min: 320, max: 4000, direction: 1, multiplier: 2 }) }
function startPreviewResizeLeft(e)  { previewUnit.value = 'px'; startResize(e, previewWidth, { min: 320, max: 4000, direction: -1, multiplier: 2 }) }

watch([previewWidth, previewUnit], ([w, u]) => {
  EditorStore.setPreviewBreakpoint(w, u)
})

const pipeline = new Pipeline()
pipeline.use(htmlPlugin())

// observa o imput
watch(
  input,
  (newInput, oldInput) => {
    // oldInput === undefined significa execução imediata ({ immediate: true }).
    // Se já há um documento aberto via API, não sobrescrever o HTML carregado.
    if (oldInput === undefined && EditorStore.currentDocument) return
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
        <div class="flex gap-2 items-center">

              <!-- Voltar para Home (quando veio da lista de documentos) -->
              <button
                v-if="EditorStore.currentDocument"
                @click="$router.push('/')"
                title="Voltar para documentos"
                class="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-600 px-2 border-r border-gray-200 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Docs
              </button>

              <HistoryControls></HistoryControls>
              
              <ClipboardControls :nodeId="EditorStore.selectedNodeId" />

              <!-- Nome do documento/arquivo aberto -->
              <span
                v-if="EditorStore.fileName"
                class="text-[11px] text-gray-500 font-mono px-2 border-l border-gray-200"
                :title="'Documento: ' + EditorStore.fileName"
              >
                📄 {{ EditorStore.fileName }}
              </span>
            </div>

      <div class="flex gap-2">
        <BreakpointeControl :previewWidth="previewWidth" :previewUnit="previewUnit" @update="
          (e) => {
            previewWidth = e.width
            previewUnit = e.unit
            EditorStore.setPreviewBreakpoint(e.width, e.unit)
          }
        " />
      </div>

      <div>
        <SelectionControls :nodeId="EditorStore.selectedNodeId" />
      </div>
      <div>
        <Delete :nodeId="EditorStore.selectedNodeId" icon-only custom-class="hover:scale-110" />
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

        <!-- Placeholder em elementos vazios -->
        <IconSidebarButton
          title="Mostrar placeholder em elementos vazios"
          @click="EditorStore.showEmptyPlaceholder = !EditorStore.showEmptyPlaceholder"
          :class="EditorStore.showEmptyPlaceholder ? 'bg-indigo-100 text-indigo-600' : ''"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="9" y1="12" x2="15" y2="12" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </IconSidebarButton>

        <IconSidebarButton title="Layers" @click="activeExplorer = activeExplorer === 'html' ? null : 'html'"
          :class="activeExplorer === 'html' ? 'bg-gray-200' : ''">
          <IconLayer />
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

        <IconSidebarButton title="Abrir arquivo do disco"
          @click="EditorStore.fileAccessSupported ? EditorStore.openFile() : (isImportModalOpen = true)"
        >
          <IconOpen class="w-5 h-5" />
        </IconSidebarButton>

        <!-- Salvar (Ctrl+S) -->
        <IconSidebarButton
          title="Salvar (Ctrl+S)"
          @click="EditorStore.currentDocument ? EditorStore.saveDocument() : EditorStore.fileAccessSupported ? EditorStore.saveFile() : downloadHtml()"
          :class="EditorStore.currentDocument ? 'text-green-600 hover:bg-green-50' : EditorStore.fileHandle ? 'text-green-600 hover:bg-green-50' : 'text-gray-400'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        </IconSidebarButton>

        <!-- Salvar Como -->
        <IconSidebarButton
          v-if="EditorStore.fileAccessSupported"
          title="Salvar como..."
          @click="EditorStore.saveFileAs()"
          class="text-blue-500 hover:bg-blue-50"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3M9 11l3-3m0 0l3 3m-3-3v8" />
          </svg>
        </IconSidebarButton>

        <!-- Download CSS: baixa todos os stylesheets editáveis -->
        <IconSidebarButton title="Download CSS" @click="downloadCss" class="text-blue-500 hover:bg-blue-50">
          <IconCSS class="w-5 h-5" />
        </IconSidebarButton>

        <!-- Download HTML: baixa o HTML atual do iframe -->
        <IconSidebarButton title="Download HTML" @click="downloadHtml" class="text-blue-500 hover:bg-blue-50">
          <IconHTML class="w-5 h-5" />
        </IconSidebarButton>

        <!-- Pixel Perfect: abre o painel de controles -->
        <IconSidebarButton
          title="Pixel Perfect — sobrepor imagem de referência"
          @click="activeExplorer = activeExplorer === 'pixelPerfect' ? null : 'pixelPerfect'"
          :class="activeExplorer === 'pixelPerfect' ? 'bg-violet-100 text-violet-600' : (pixelPerfect.enabled.value ? 'text-violet-500' : '')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </IconSidebarButton>

        <!-- Input oculto para selecionar arquivo de imagem -->
        <input
          ref="pixelPerfectFileInput"
          type="file"
          accept="image/*"
          style="display:none"
          @change="e => pixelPerfect.loadImage(e.target.files?.[0])"
        />
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

      <!-- col-pixelPerfect: painel de controles do Pixel Perfect -->
      <template v-if="activeExplorer === 'pixelPerfect'">
        <AsidePanel
          title="Pixel Perfect"
          :style="{ width: '220px', minWidth: '200px', maxWidth: '280px' }"
          style2="position: relative; z-index: var(--z-panel)"
        >
          <PixelPerfectPanel :containerEl="previewContainerEl" />
        </AsidePanel>
        <div
          class="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-blue-400/40 transition-colors z-50"
          @mousedown="e => startResize(e, ref(220), { min: 200, max: 280 })"
        />
      </template>

      <!-- col-css: CSS Explorer (REMOVIDO DA ESQUERDA — agora fica à direita do canvas) -->

      <!-- col-main: canvas (absorve diferenças via flex-1) -->
      <div class="flex flex-col h-full w-full overflow-hidden gap-3" id="col-main">
          <div class="flex justify-between shrink-0 px-4 gap-2 overflow-x-auto w-full text-text-secondary text-xs  border-b border-gray-200 relative z-[1000]">
            <InsertTagMenu :nodeId="EditorStore.selectedNodeId" />
            

          </div>
          <div ref="previewContainerEl"
               class="grow shrink-0 overflow-auto flex justify-center overflow-hidden"
               style="position: relative">
            <div class="relative shrink-0 flex items-stretch z-0"
                 :style="{ width: previewWidth + previewUnit, transition: isResizing ? 'none' : 'width 0.3s' }">
              <Preview :html="EditorStore.ctx?.output" class="w-full h-full bg-gray-200 border-0" />
              <!-- Handle Direita -->
              <div
                class="absolute right-0 top-0 bottom-0 w-3 -mr-1.5 cursor-col-resize hover:bg-blue-500/30 z-50 flex items-center justify-center group"
                @mousedown="startPreviewResizeRight"
              >
                <div class="w-1 h-8 bg-gray-400/50 rounded-full group-hover:bg-blue-600"></div>
              </div>
              <!-- Handle Esquerda -->
              <div
                class="absolute left-0 top-0 bottom-0 w-3 -ml-1.5 cursor-col-resize hover:bg-blue-500/30 z-50 flex items-center justify-center group"
                @mousedown="startPreviewResizeLeft"
              >
                <div class="w-1 h-8 bg-gray-400/50 rounded-full group-hover:bg-blue-600"></div>
              </div>
            </div>
            
            <div class="absolute inset-0 pointer-events-none z-10">
              <HighlightOverlay mode="hover" />
              <HighlightOverlay mode="selection" />
            </div>

            <!-- Pixel Perfect overlay + painel de controles -->
            <PixelPerfectOverlay :containerEl="previewContainerEl" class="z-20" />
          </div>
          <div class="shrink-0 max-w-full" style="position: relative;">
              <Breadcrumbs />
          </div>

          <!-- Code Editor Integrado (v-if para otimização radical) -->
          <div v-if="EditorStore.showCodeEditor" class="shrink-0 flex flex-col" :style="{ height: codeEditorHeight + 'px' }">
            <!-- Handle Superior (Vertical) -->
            <div 
              class="h-1 cursor-row-resize bg-transparent hover:bg-indigo-400/40 transition-colors z-[1001] border-t border-gray-300"
              title="Arrastar para ajustar altura do código"
              @mousedown="startCodeEditorResize"
            />
            <CodeEditor />
          </div>
    
      </div>

      <!-- col-css-right: CSS Explorer à direita do canvas (redimensionável, independente do inspector) -->
      <template v-if="EditorStore.showCssExplorer">
        <!-- Handle de resize: col-css-right (handle à esquerda — arrastar esquerda aumenta) -->
        <div
          class="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-blue-400/40 transition-colors z-50 border-l border-gray-300"
          title="Arrastar para redimensionar"
          @mousedown="startCssRightResize"
        />
        <div
          id="col-css-right"
          :style="{ width: cssWidth + 'px', minWidth: '220px', maxWidth: '680px' }"
          
        >
          <CssExplorer />
        </div>
      </template>

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
    <SaveStatus />
  </div>
</template>
