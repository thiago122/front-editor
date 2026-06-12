<script setup>
// EditorView.vue

import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import { Pipeline } from '@/editor/pipeline/pipeline'
import { htmlPlugin } from '@/editor/pipeline/plugins/html-plugin'

// stores
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'

import HistoryControls from '@/components/HistoryControls.vue'
import InspectorPanel from '@/components/InspectorCss/InspectorPanel.vue'
import HighlightOverlay from '@/components/HighlightOverlay.vue'
import ASTExplorer from '@/components/ASTExplorer.vue'
import CssExplorer from '@/components/CssExplorer.vue'
import ComponentExplorer from '@/components/ComponentExplorer.vue'
import Preview from '@/components/Preview.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import CodeEditor from '@/components/CodeEditor.vue'
const codeEditorHtmlRef = ref(null)
const codeEditorCssRef = ref(null)
import QuickCodeEditor from '@/components/QuickCodeEditor.vue'
const EditorStore = useEditorStore()
const styleStore = useStyleStore()

// UI
import FloatingWindow from '@/components/ui/FloatingWindow.vue'
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
import IconHTML from '@/components/icons/IconHTML.vue'
import IconCSS from '@/components/icons/IconCSS.vue'
import IconInspect from '@/components/icons/iconInspect.vue'
import IconOpen from '@/components/icons/IconOpen.vue'
import BreakpointeControl from '@/components/icons/BreakpointeControl.vue'
import CssOutputModal from '@/components/CssOutputModal.vue'
import HtmlImportModal from '@/components/HtmlImportModal.vue'
import PixelPerfectOverlay from '@/components/PixelPerfectOverlay.vue'
import PixelPerfectPanel from '@/components/PixelPerfectPanel.vue'
import { usePixelPerfect } from '@/composables/usePixelPerfect'
import VariablesPanel from '@/components/VariablesPanel.vue'
import ShortcutsDropdown from '@/components/ShortcutsDropdown.vue'

import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService.js'
import { HtmlExportService } from '@/editor/css/export/HtmlExportService.js'
import SaveStatus from '@/components/SaveStatus.vue'
import { useColumnResize } from '@/composables/useColumnResize.js'
import { useEditorShortcuts } from '@/composables/useEditorShortcuts.js'
import { usePreviewResize } from '@/composables/usePreviewResize.js'

const { startResize, isResizing } = useColumnResize()
const pixelPerfect = usePixelPerfect()
const route = useRoute()

// ─── Larguras das colunas redimensionáveis (em px) ──────────────────────────
const layerWidth = ref(280) // col-layer    (HTML Explorer)
const cssWidth = ref(450) // col-css      (CSS Explorer)
const inspectorWidth = ref(300) // col-panel-inspector

// No template, Vue faz auto-unwrap de refs (layerWidth → 280).
// Usar funções no script garante que o ref correto é passado ao composable.
function startLayerResize(e) {
  startResize(e, layerWidth, { min: 160, max: 520 })
}
function startCssRightResize(e) {
  startResize(e, cssWidth, { min: 220, max: 680, direction: -1 })
}
function startInspectorResize(e) {
  startResize(e, inspectorWidth, { min: 200, max: 520, direction: -1 })
}

const isSaveModalOpen = ref(false)
const isImportModalOpen = ref(false)
const isShortcutsModalOpen = ref(false)
const activeExplorer = ref('html') // 'html' | 'css' | 'components' | null

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

// Atalhos globais (window + iframe): Ctrl+S, Alt+E/L/C, Ctrl+Shift+C
useEditorShortcuts({ activeExplorer, downloadHtml })

// Auto-open CSS Explorer when a rule navigation is requested from the Inspector
watch(
  () => styleStore.explorerScrollRequest,
  (v) => {
    if (v > 0) EditorStore.showCssExplorer = true
  },
)

const handleHtmlLoad = (newHtml) => {
  input.value = newHtml
}

onMounted(async () => {
  // Se houver um path na URL, carrega o documento correspondente
  const path = route.query.path
  if (path && EditorStore.currentDocument?.path !== path) {
    try {
      await EditorStore.openDocumentByPath(path)
    } catch (e) {
      console.error('[EditorView] Erro ao carregar documento da URL:', e)
    }
  }
})

// Observa mudanças na URL (navegação entre documentos)
watch(
  () => route.query.path,
  async (newPath) => {
    if (newPath && EditorStore.currentDocument?.path !== newPath) {
      await EditorStore.openDocumentByPath(newPath)
    }
  },
)

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

const previewContainerEl = ref(null)

onMounted(() => {
  EditorStore.previewContainer = previewContainerEl.value
})

const { previewWidth, previewUnit, startPreviewResizeRight, startPreviewResizeLeft } =
  usePreviewResize(startResize)

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
    <!-- Header principal -->
    <header
      class="flex items-center justify-between px-4 h-12 bg-white border-b border-gray-200 relative z-[99999] shrink-0"
    >
      <!-- Seção Esquerda: Navegação e Ferramentas -->
      <div class="flex items-center gap-3 flex-1">
        <!-- Voltar para Home -->
        <button
          v-if="EditorStore.currentDocument"
          @click="$router.push('/')"
          title="Voltar para documentos"
          class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 px-2 py-1.5 rounded-sm hover:bg-gray-100 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Docs
        </button>

        <div class="w-px h-4 bg-gray-200" v-if="EditorStore.currentDocument"></div>

        <!-- Histórico e Clipboard juntos -->
        <div class="flex items-center gap-1">
          <HistoryControls />
          <div class="w-px h-4 bg-gray-200 mx-1"></div>
          <ClipboardControls :nodeId="EditorStore.selectedNodeId" />
        </div>
      </div>

      <!-- Seção Central: Título e Responsividade -->
      <div class="flex items-center justify-center flex-1">
        <div class="flex items-center gap-2 bg-gray-50/80 px-1 py-1 border border-gray-100 h-8">
          <div
            class="flex items-center gap-2 px-2 border-r border-gray-200/60"
            v-if="EditorStore.fileName"
          >
            <svg
              class="w-3.5 h-3.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            <span
              class="text-[11px] font-semibold text-gray-700 max-w-[150px] truncate"
              :title="EditorStore.fileName"
            >
              {{ EditorStore.fileName }}
            </span>
          </div>

          <!-- Breakpoints control -->
          <BreakpointeControl
            :previewWidth="previewWidth"
            :previewUnit="previewUnit"
            @update="
              (e) => {
                previewWidth = e.width
                previewUnit = e.unit
                EditorStore.setPreviewBreakpoint(e.width, e.unit)
              }
            "
          />
        </div>
      </div>

      <!-- Seção Direita: Controles de Seleção e Atalhos -->
      <div class="flex items-center justify-end gap-3 flex-1">
        <SelectionControls :nodeId="EditorStore.selectedNodeId" />

        <div class="w-px h-4 bg-gray-200" v-if="EditorStore.selectedNodeId"></div>

        <Delete
          v-if="EditorStore.selectedNodeId"
          :nodeId="EditorStore.selectedNodeId"
          icon-only
          custom-class="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-sm transition-colors"
        />

        <div class="w-px h-4 bg-gray-200" v-if="EditorStore.selectedNodeId"></div>

        <div class="relative flex items-center">
          <button
            @click="isShortcutsModalOpen = !isShortcutsModalOpen"
            title="Ver Atalhos de Teclado"
            class="text-[11px] font-semibold text-gray-500 hover:text-indigo-600 flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
            :class="isShortcutsModalOpen ? 'bg-gray-100 border-gray-200 text-indigo-600' : ''"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              ></path>
            </svg>
            Atalhos
          </button>
          <ShortcutsDropdown :isOpen="isShortcutsModalOpen" @close="isShortcutsModalOpen = false" />
        </div>
      </div>
    </header>

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
          <div
            class="absolute left-full top-0 pl-1 opacity-0 pointer-events-none group-hover/inspect:opacity-100 group-hover/inspect:pointer-events-auto transition-opacity duration-150 z-50"
          >
            <div
              class="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] text-xs"
            >
              <div
                class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide"
              >
                Cursor
              </div>

              <!-- Opção: Sem Box Model -->
              <button
                class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                :class="!EditorStore.showBoxModel ? 'text-blue-600 font-semibold' : 'text-gray-700'"
                @click.stop="
                  () => {
                    EditorStore.showBoxModel = false
                    EditorStore.inspectMode = true
                  }
                "
              >
                <svg
                  class="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2" />
                </svg>
                Sem Box Model
                <svg
                  v-if="!EditorStore.showBoxModel"
                  class="w-3 h-3 ml-auto text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>

              <!-- Opção: Com Box Model -->
              <button
                class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                :class="EditorStore.showBoxModel ? 'text-blue-600 font-semibold' : 'text-gray-700'"
                @click.stop="
                  () => {
                    EditorStore.showBoxModel = true
                    EditorStore.inspectMode = true
                  }
                "
              >
                <svg
                  class="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2" />
                  <rect
                    x="6"
                    y="6"
                    width="12"
                    height="12"
                    rx="1"
                    stroke-width="1.5"
                    opacity="0.5"
                  />
                  <rect x="9" y="9" width="6" height="6" rx="1" stroke-width="1.5" opacity="0.8" />
                </svg>
                Com Box Model
                <svg
                  v-if="EditorStore.showBoxModel"
                  class="w-3 h-3 ml-auto text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
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
            <rect x="2" y="2" width="20" height="20" rx="2" stroke-width="1.5" />
            <rect x="6" y="6" width="12" height="12" rx="1" stroke-width="1.5" opacity="0.6" />
            <rect x="10" y="10" width="4" height="4" rx="0.5" stroke-width="1.5" opacity="0.9" />
          </svg>
        </IconSidebarButton>

        <!-- Placeholder em elementos vazios -->
        <IconSidebarButton
          title="Mostrar placeholder em elementos vazios"
          @click="EditorStore.showEmptyPlaceholder = !EditorStore.showEmptyPlaceholder"
          :class="EditorStore.showEmptyPlaceholder ? 'bg-indigo-100 text-indigo-600' : ''"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              stroke-width="1.5"
              stroke-dasharray="3 2"
            />
            <line x1="9" y1="12" x2="15" y2="12" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </IconSidebarButton>

        <IconSidebarButton
          title="Layers (Alt+L)"
          @click="activeExplorer = activeExplorer === 'html' ? null : 'html'"
          :class="activeExplorer === 'html' ? 'bg-gray-200' : ''"
        >
          <IconLayer />
        </IconSidebarButton>

        <IconSidebarButton
          title="Componentes (Alt+C)"
          @click="activeExplorer = activeExplorer === 'components' ? null : 'components'"
          :class="activeExplorer === 'components' ? 'bg-gray-200' : ''"
        >
          <IconComponent />
        </IconSidebarButton>

        <IconSidebarButton
          title="HTML do Elemento"
          @click="
            EditorStore.selectedNodeId
              ? EditorStore.openCodeEditor('html', EditorStore.selectedNodeId)
              : null
          "
          :class="EditorStore.htmlEditor.show ? 'bg-gray-200' : ''"
        >
          <IconHTML />
        </IconSidebarButton>

        <IconSidebarButton
          title="Abrir arquivo do disco"
          @click="
            EditorStore.fileAccessSupported ? EditorStore.openFile() : (isImportModalOpen = true)
          "
        >
          <IconOpen class="w-5 h-5" />
        </IconSidebarButton>

        <!-- Salvar (Ctrl+S) -->
        <IconSidebarButton
          title="Salvar (Ctrl+S)"
          @click="
            EditorStore.currentDocument
              ? EditorStore.saveDocument()
              : EditorStore.fileAccessSupported
                ? EditorStore.saveFile()
                : downloadHtml()
          "
          :class="
            EditorStore.currentDocument
              ? 'text-green-600 hover:bg-green-50'
              : EditorStore.fileHandle
                ? 'text-green-600 hover:bg-green-50'
                : 'text-gray-400'
          "
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
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
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3M9 11l3-3m0 0l3 3m-3-3v8"
            />
          </svg>
        </IconSidebarButton>

        <!-- Download CSS: baixa todos os stylesheets editáveis -->
        <IconSidebarButton
          title="Download CSS"
          @click="downloadCss"
          class="text-blue-500 hover:bg-blue-50"
        >
          <IconCSS class="w-5 h-5" />
        </IconSidebarButton>

        <!-- Download HTML: baixa o HTML atual do iframe -->
        <IconSidebarButton
          title="Download HTML"
          @click="downloadHtml"
          class="text-blue-500 hover:bg-blue-50"
        >
          <IconHTML class="w-5 h-5" />
        </IconSidebarButton>

        <!-- Pixel Perfect: abre o painel de controles -->
        <IconSidebarButton
          title="Pixel Perfect — sobrepor imagem de referência"
          @click="EditorStore.pixelPerfectEditor.show = !EditorStore.pixelPerfectEditor.show"
          :class="
            EditorStore.pixelPerfectEditor.show
              ? 'bg-violet-100 text-violet-600'
              : pixelPerfect.enabled.value
                ? 'text-violet-500'
                : ''
          "
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="12" height="12" rx="2" stroke-width="1.5" />
            <rect x="8" y="8" width="12" height="12" rx="2" stroke-width="1.5" opacity="0.6" />
          </svg>
        </IconSidebarButton>

        <!-- Variáveis (Tokens) -->
        <IconSidebarButton
          title="Variáveis CSS (Tokens)"
          @click="EditorStore.variablesPanel.show = !EditorStore.variablesPanel.show"
          :class="
            EditorStore.variablesPanel.show
              ? 'bg-fuchsia-100 text-fuchsia-600'
              : 'text-gray-500 hover:text-fuchsia-500 hover:bg-fuchsia-50'
          "
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </IconSidebarButton>

        <!-- Input oculto para selecionar arquivo de imagem -->
        <input
          ref="pixelPerfectFileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="(e) => pixelPerfect.loadImage(e.target.files?.[0])"
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
          <ASTExplorer :ast="EditorStore.ast" :selectedNodeId="EditorStore.selectedNodeId" :openPath="EditorStore.openPath" />
        </AsidePanel>
        <!-- Handle de resize: col-layer -->
        <div
          class="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-blue-400/40 transition-colors z-50"
          title="Arrastar para redimensionar"
          @mousedown="startLayerResize"
        />
      </template>

      <!-- col-components: Component Explorer -->
      <template v-if="activeExplorer === 'components'">
        <AsidePanel
          id="col-components"
          title="Componentes"
          :style="{ width: layerWidth + 'px', minWidth: '160px', maxWidth: '520px' }"
          style2="position: relative; z-index: var(--z-panel)"
        >
          <ComponentExplorer />
        </AsidePanel>
        <!-- Handle de resize: col-components -->
        <div
          class="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-blue-400/40 transition-colors z-50"
          title="Arrastar para redimensionar"
          @mousedown="startLayerResize"
        />
      </template>

      <!-- col-css: CSS Explorer (REMOVIDO DA ESQUERDA — agora fica à direita do canvas) -->

      <!-- col-main: canvas (absorve diferenças via flex-1) -->
      <div class="flex flex-col h-full w-full overflow-hidden bg-[#f1f1f1]" id="col-main">
        <div
          class="flex items-center shrink-0 px-4 h-8 gap-2 overflow-x-auto w-full border-b border-gray-200 bg-white relative z-[1000]"
        >
          <InsertTagMenu :nodeId="EditorStore.selectedNodeId" />
        </div>
        <div
          ref="previewContainerEl"
          class="grow shrink-0 overflow-auto flex justify-center overflow-hidden"
          style="position: relative; background-color: #f1f1f1"
        >
          <div
            class="relative shrink-0 flex items-stretch z-0 shadow-lg"
            :style="{
              width: previewWidth + previewUnit,
              transition: isResizing ? 'none' : 'width 0.3s',
            }"
          >
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
        <div class="shrink-0 max-w-full" style="position: relative">
          <Breadcrumbs />
        </div>

        <!-- Code Editor HTML Flutuante -->
        <FloatingWindow
          :show="EditorStore.htmlEditor.show"
          title="Editor HTML"
          :initialX="EditorStore.htmlEditor.x"
          :initialY="EditorStore.htmlEditor.y"
          :initialWidth="800"
          :initialHeight="500"
          :closeOnClickOutside="false"
          @close="EditorStore.htmlEditor.show = false"
        >
          <template #header-left>
            <div
              class="flex items-center gap-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
            >
              <span class="w-1.5 h-1.5 rounded-full animate-pulse bg-indigo-400"></span>
              HTML
            </div>
            <div class="h-3 w-[1px] bg-gray-700 mx-1"></div>
            <span
              v-if="EditorStore.htmlEditor.targetId"
              class="text-[10px] text-gray-500 font-mono truncate max-w-[200px]"
            >
              ID: {{ EditorStore.htmlEditor.targetId }}
            </span>
          </template>

          <CodeEditor
            ref="codeEditorHtmlRef"
            mode="html"
            :targetId="EditorStore.htmlEditor.targetId"
            :show="EditorStore.htmlEditor.show"
            :hideHeader="true"
            @close="EditorStore.htmlEditor.show = false"
          />
        </FloatingWindow>

        <!-- Code Editor CSS Flutuante -->
        <FloatingWindow
          :show="EditorStore.cssFileEditor.show"
          title="Editor CSS"
          :initialX="EditorStore.cssFileEditor.x"
          :initialY="EditorStore.cssFileEditor.y"
          :initialWidth="800"
          :initialHeight="500"
          :closeOnClickOutside="false"
          @close="EditorStore.cssFileEditor.show = false"
        >
          <template #header-left>
            <div
              class="flex items-center gap-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border bg-amber-500/20 text-amber-400 border-amber-500/30"
            >
              <span class="w-1.5 h-1.5 rounded-full animate-pulse bg-amber-400"></span>
              CSS
            </div>
            <div class="h-3 w-[1px] bg-gray-700 mx-1"></div>
            <span
              v-if="EditorStore.cssFileEditor.targetId"
              class="text-[10px] text-gray-500 font-mono truncate max-w-[200px]"
            >
              ID: {{ EditorStore.cssFileEditor.targetId }}
            </span>
          </template>

          <template #header-right>
            <div v-if="codeEditorCssRef?.isBulkMode" class="flex items-center">
              <button
                @click="codeEditorCssRef.handleSave"
                :disabled="!codeEditorCssRef.hasUnsavedChanges || codeEditorCssRef.isSaving"
                class="flex items-center gap-1.5 px-3 h-6 rounded text-[10px] font-bold transition-all border"
                :class="
                  codeEditorCssRef.hasUnsavedChanges
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-gray-800 text-gray-500 border-gray-700 cursor-default'
                "
              >
                <svg
                  v-if="codeEditorCssRef.isSaving"
                  class="animate-spin h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <svg v-else class="w-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                {{
                  codeEditorCssRef.isSaving
                    ? 'Salvando'
                    : codeEditorCssRef.hasUnsavedChanges
                      ? 'Salvar'
                      : 'Salvo'
                }}
              </button>
            </div>
          </template>

          <CodeEditor
            ref="codeEditorCssRef"
            mode="css"
            :targetId="EditorStore.cssFileEditor.targetId"
            :show="EditorStore.cssFileEditor.show"
            :hideHeader="true"
            @close="EditorStore.cssFileEditor.show = false"
          />
        </FloatingWindow>
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
    </div>
    <!-- linha -->

    <CssOutputModal :isOpen="isSaveModalOpen" @close="isSaveModalOpen = false" />
    <HtmlImportModal
      :isOpen="isImportModalOpen"
      @close="isImportModalOpen = false"
      @load="handleHtmlLoad"
    />
    <SaveStatus />
    <QuickCodeEditor />

    <!-- Pixel Perfect Floating Window -->
    <FloatingWindow
      :show="EditorStore.pixelPerfectEditor.show"
      title="Pixel Perfect"
      theme="light"
      :initialX="EditorStore.pixelPerfectEditor.x"
      :initialY="EditorStore.pixelPerfectEditor.y"
      :initialWidth="240"
      :initialHeight="400"
      :closable="true"
      :closeOnClickOutside="false"
      @close="EditorStore.pixelPerfectEditor.show = false"
    >
      <template #header-left>
        <div
          class="flex items-center gap-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border bg-violet-500/10 text-violet-600 border-violet-500/20"
        >
          <span class="w-1.5 h-1.5 rounded-full animate-pulse bg-violet-500"></span>
          Pixel Perfect
        </div>
      </template>
      <PixelPerfectPanel :containerEl="previewContainerEl" />
    </FloatingWindow>

    <FloatingWindow
      :show="EditorStore.variablesPanel.show"
      title="Design Tokens"
      theme="light"
      :initialX="EditorStore.variablesPanel.x"
      :initialY="EditorStore.variablesPanel.y"
      :initialWidth="300"
      :initialHeight="450"
      :closable="true"
      :closeOnClickOutside="false"
      @close="EditorStore.variablesPanel.show = false"
      @move="
        (pos) => {
          EditorStore.variablesPanel.x = pos.x
          EditorStore.variablesPanel.y = pos.y
        }
      "
    >
      <template #header-left>
        <div
          class="flex items-center gap-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20"
        >
          <span class="w-1.5 h-1.5 rounded-full animate-pulse bg-fuchsia-500"></span>
          Variáveis CSS
        </div>
      </template>
      <VariablesPanel />
    </FloatingWindow>
  </div>
</template>
