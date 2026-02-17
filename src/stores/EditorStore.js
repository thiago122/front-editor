// EditorStore.js

import { ref, computed, watch, markRaw } from 'vue'
import { defineStore } from 'pinia'
import { Pipeline } from '@/editor/pipeline/pipeline'
import { htmlPlugin } from '@/editor/pipeline/plugins/html-plugin'
import { findNodeById } from '@/utils/ast'

import { ManipulationEngine } from '@/editor/ManipulationEngine'
import { history } from '@/editor/history/HistoryManager'
import { useStyleStore } from './StyleStore'

export const useEditorStore = defineStore('editor', () => {
  // --- STATE ---
  const ctx = ref(null)
  const selectedNodeId = ref(null)
  const selectedElement = ref(null) // From Inspector
  const hoveredNodeId = ref(null)
  const inspectMode = ref(null)
  const iframe = ref(null)
  const viewport = ref({ width: window.innerWidth, height: window.innerHeight })
  const manipulation = ref(null)
  const clipboard = ref({ type: null, data: null }) // Clipboard tipado

  const pipeline = new Pipeline()
  pipeline.use(htmlPlugin())

  const styleStore = useStyleStore()

  // --- GETTERS ---
  const ast = computed(() => ctx.value?.ast)
  const selectedNode = computed(() => findNodeById(ast.value, selectedNodeId.value))
  const hoveredElement = computed(() => {
    if (!hoveredNodeId.value) return null
    const doc = getIframeDoc()
    return doc?.querySelector(`[data-node-id="${hoveredNodeId.value}"]`)
  })

  function loadHTML(rawHTML) {
    ctx.value = pipeline.run(rawHTML)
  }

  // manipulation engine
  function initEngine(iframeDoc) {
    manipulation.value = new ManipulationEngine(getContext, getIframeDoc, pipeline)
  }

  function getIframeDoc() {
    return iframe.value?.contentDocument
  }

  function getContext() {
    return ctx.value
  }

  // As ações da Store apenas repassam para a Engine

  function selectNode(nodeId, element = null) {
    selectedNodeId.value = nodeId
    
    if (element) {
      selectedElement.value = markRaw(element)
    } else if (nodeId) {
      const doc = getIframeDoc()
      const el = doc?.querySelector(`[data-node-id="${nodeId}"]`)
      selectedElement.value = el ? markRaw(el) : null
    } else {
      selectedElement.value = null
    }
    
    inspectMode.value = false
  }

  function activate() {
    inspectMode.value = true
  }

  function deactivate() {
    inspectMode.value = false
    selectedElement.value = null
    selectedNodeId.value = null
  }

  function selectParent() {
    const parent = manipulation.value.getParent(selectedNodeId.value)

    if (parent) {
      // Atualiza a seleção para o ID do pai
      selectedNodeId.value = parent.nodeId
      console.log('Subiu para o pai:', parent.tag)
    }
  }

  function getParent(nodeId) {
    return manipulation.value.getParent(nodeId)
  }

  // Getters para a UI
  const canPaste = computed(() => clipboard.value.type === 'html-node')

  watch(iframe, (newIframe) => {
    if (newIframe) {
      initEngine(newIframe.contentDocument)

      // Initialize CSS AST for the new iframe
      newIframe.addEventListener('load', async () => {
        // Refresh CSS AST (loads CSS internally)
        await styleStore.refreshCssAst(getIframeDoc(), ['internal', 'external'])
      })
    }
  })


  // viewport sync
  function setViewport(width, height) {
    viewport.value = { width, height }
  }
  function handleHover({ id, source }) {
    hoveredNodeId.value = id
    
    // 1. Limpa o hover anterior em ambos os documentos
    const oldHovered = document.querySelectorAll('.is-hovered-sync')
    const iframeDoc = getIframeDoc()
    const oldIframeHovered = iframeDoc?.querySelectorAll('.is-hovered-sync')

    ;[...oldHovered, ...(oldIframeHovered || [])].forEach((el) => {
      el.classList.remove('is-hovered-sync')
    })

    if (!id) return

    // 2. Aplica o novo hover no Explorer (DOM Principal)
    const astEl = document.querySelector(`[data-ast-node-id="${id}"]`)
    if (astEl) astEl.classList.add('is-hovered-sync')

    // 3. Aplica o novo hover no Preview (Iframe)
    const previewEl = iframeDoc?.querySelector(`[data-node-id="${id}"]`)
    if (previewEl) previewEl.classList.add('is-hovered-sync')
  }

  function undo() {
    history.undo(manipulation.value)
  }

  function redo() {
    history.redo(manipulation.value)
  }

  return {
    ctx,
    selectNode,
    selectedNode,
    selectedNodeId,
    selectedElement,
    hoveredElement,
    hoveredNodeId,
    inspectMode,
    loadHTML,
    viewport,
    setViewport,
    selectParent,
    iframe,
    getIframeDoc,
    manipulation,
    clipboard,
    canPaste,
    pipeline,
    handleHover,
    getParent,
    activate,
    deactivate,
    undo,
    redo,
  }
})

