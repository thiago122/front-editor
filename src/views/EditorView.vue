<script setup>
// EditorView.vue

import { ref, watch, computed, onMounted } from 'vue'

import { Pipeline } from '@/editor/pipeline/pipeline'
import { htmlPlugin } from '@/editor/pipeline/plugins/html-plugin'

// helpers
import { findPath, findNodeById, findParentNode } from '@/utils/ast.js'
import { parseHTMLFragment } from '@/utils/parseHTMLFragment'

// stores
import { useEditorStore } from '@/stores/EditorStore'

import HistoryControls from '@/components/HistoryControls.vue'
import InspectorPanel from '@/components/InspectorPanel.vue'
import HighlightOverlay from '@/components/HighlightOverlay.vue'
import ASTExplorer from '@/components/ASTExplorer.vue'
import Preview from '@/components/Preview.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
const EditorStore = useEditorStore()

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

const isSaveModalOpen = ref(false)
const isImportModalOpen = ref(false)

const handleHtmlLoad = (newHtml) => {
  input.value = newHtml
}

onMounted(async () => {
  try {
    const response = await fetch('http://editor.test/assets/site-teste.html')
    if (response.ok) {
      const html = await response.text()
      input.value = html
    }
  } catch (e) {
    console.error('Failed to fetch remote HTML:', e)
  }
})

const inputHTML = `
<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="http://editor.test/assets/css/all.css" data-location="external" crossorigin="anonymous">
    <!-- 1. External Layer: Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" data-location="external" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" data-location="external" crossorigin="anonymous">

    <!-- 2. Internal Layer: Simulating local styles -->
    <style data-location="internal" id="theme.css">
      .custom-card {
        border-left: 5px solid #0d6efd;
        transition: all 0.3s ease;
      }
      .custom-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
      }
    </style>

    <style data-location="internal" id="utilities.css">
      .text-gradient {
        background: linear-gradient(45deg, #0d6efd, #6610f2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .btn-custom {
        border-radius: 50px;
        padding: 0.5rem 2rem;
      }
    </style>

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
              
              <p class="card-text text-muted mb-4">
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
                  <span class="badge bg-primary layer-tag">.custom-card styles</span>
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

watch(
  () => EditorStore.inspectMode,
  (val) => {
    // Logic integrated into EditorStore? 
    // Actually EditorStore.inspectMode IS the state now.
  },
)

const highlightRect = computed(() => {
  const el = EditorStore.hoveredElement
  if (!el || !EditorStore.iframe) return null

  const rect = el.getBoundingClientRect()
  const iframeRect = EditorStore.iframe.getBoundingClientRect()

  return {
    top: rect.top + iframeRect.top,
    left: rect.left + iframeRect.left,
    width: rect.width,
    height: rect.height,
  }
})

const selectionRect = computed(() => {
  const el = EditorStore.selectedElement
  if (!el || !EditorStore.iframe) return null

  const rect = el.getBoundingClientRect()
  const iframeRect = EditorStore.iframe.getBoundingClientRect()

  return {
    top: rect.top + iframeRect.top,
    left: rect.left + iframeRect.left,
    width: rect.width,
    height: rect.height,
  }
})

const highlightLabel = computed(() => {
  const el = EditorStore.hoveredElement
  if (!el) return ''
  return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
})

const selectionLabel = computed(() => {
  const el = EditorStore.selectedElement
  if (!el) return ''
  return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
})

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
    <!-- <div class="flex justify-center bg-gray-200">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/editor">Editor</RouterLink>
    </div> -->

    <div class="flex items-center justify-center bg-white border-b border-gray-200">


      <div class="flex gap-2">
        <BreakpointeControl :previewWidth="previewWidth" :previewUnit="previewUnit" @update="
          (e) => {
            previewWidth = e.width
            previewUnit = e.unit
          }
        " />
      </div>
    </div><!-- linha -->

    <div class="flex grow overflow-hidden bg-white">
      <IconSidebar>
        <IconSidebarButton title="Inspect" @click="EditorStore.inspectMode = !EditorStore.inspectMode"
          :class="EditorStore.inspectMode ? 'bg-gray-200' : ''">
          <IconInspect />
        </IconSidebarButton>
        <IconSidebarButton title="Layers" @click="showExplorer = !showExplorer">
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

        <IconSidebarButton title="Abrir" @click="isImportModalOpen = true">
          <IconOpen class="w-5 h-5" />
        </IconSidebarButton>

        <IconSidebarButton title="Salvar" @click="isSaveModalOpen = true">
          <IconSave class="w-5 h-5" />
        </IconSidebarButton>
      </IconSidebar>

      <AsidePanel class="w-[280px]" title="LayerExplorer" v-if="showExplorer">
        <ASTExplorer :ast="EditorStore.ctx.ast" :selectedNodeId="EditorStore.selectedNodeId" />
      </AsidePanel>

      <div class="flex flex-col h-full w-full overflow-hidden gap-3">
          <div class="flex justify-between shrink-0 px-4 gap-2 overflow-x-auto w-full text-text-secondary text-xs  border-b border-gray-200 ">
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
              <Delete :nodeId="EditorStore.selectedNodeId" icon-only custom-class="hover:scale-110" />
            </div>

          </div>
          <div class="grow shrink-0 overflow-auto flex justify-center ">
            <Preview :html="EditorStore.ctx?.output" class="w-full h-full bg-gray-200 transition-all duration-300 border border-gray-300 "
              :style="{ width: previewWidth + previewUnit }" />
          </div>
          <div class="shrink-0 max-w-full">
              <Breadcrumbs />
          </div>
    
      </div>
      <div class="w-[300px] grow-0 shrink-0 border-l border-gray-200">
        <InspectorPanel />
      </div>
    </div><!-- linha -->

    <!-- Inspector Overlay Components -->
    
    <HighlightOverlay :rect="highlightRect" :label="highlightLabel" />
    <HighlightOverlay :rect="selectionRect" :label="selectionLabel" class="!border-blue-600 !bg-transparent !border-dashed" />

    <CssOutputModal :isOpen="isSaveModalOpen" @close="isSaveModalOpen = false" />
    <HtmlImportModal :isOpen="isImportModalOpen" @close="isImportModalOpen = false" @load="handleHtmlLoad" />
  </div>
  <!-- container main-->
  <!-- <div>
    <CodeEditor></CodeEditor>
  </div> -->
</template>
