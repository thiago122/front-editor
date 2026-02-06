// EditorStore.js

import { ref, computed, watch, markRaw } from 'vue'
import { defineStore } from 'pinia'
import { Pipeline } from '@/editor/pipeline/pipeline'
import { htmlPlugin } from '@/editor/pipeline/plugins/html-plugin'
import { findNodeById } from '@/utils/ast'

import { ManipulationEngine } from '@/editor/ManipulationEngine'
import { history } from '@/editor/history/HistoryManager'
import { useCssParser } from '@/composables/useCssParser'

export const useEditorStore = defineStore('editor', () => {
  const { extractCssAst } = useCssParser()

  // --- STATE ---
  const ctx = ref(null)
  const selectedNodeId = ref(null)
  const selectedElement = ref(null) // From Inspector
  const hoveredNodeId = ref(null)
  const hoveredElement = ref(null) // From Inspector
  const hoverSource = ref(null) // 'preview' | 'explorer'
  const inspectMode = ref(null)
  const iframe = ref(null)
  const viewport = ref({ width: window.innerWidth, height: window.innerHeight })
  const cssAst = ref(null) // cache do AST do css-tree
  const manipulation = ref(null)
  const clipboard = ref({ type: null, data: null }) // Clipboard tipado
  const selectedCssRuleNodeId = ref(null) // ID of the selected CSS rule (CSSTree Node ID)

  const pipeline = new Pipeline()
  pipeline.use(htmlPlugin())

  // --- GETTERS ---
  const ast = computed(() => ctx.value?.ast)
  const selectedNode = computed(() => findNodeById(ast.value, selectedNodeId.value))

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

  function refreshCssAst() {
    const doc = getIframeDoc()
    if (doc) {
      console.log('[EditorStore] Refreshing CSS AST...')
      const ast = extractCssAst(doc)
      cssAst.value = markRaw(ast)
    }
  }

  watch(iframe, (newIframe) => {
    if (newIframe) {
      initEngine(newIframe.contentDocument)

      // Initialize CSS AST for the new iframe
      newIframe.addEventListener('load', () => {
        // Wait a small bit for external stylesheets to be parsed by the browser
        setTimeout(() => {
          refreshCssAst()
        }, 500)
      })
    }
  })

  // viewport sync
  function setViewport(width, height) {
    viewport.value = { width, height }
  }

  function handleHover({ id, source }) {
    hoveredNodeId.value = id
    hoverSource.value = source
    
    // 1. Limpa o hover anterior em ambos os documentos
    const oldHovered = document.querySelectorAll('.is-hovered-sync')
    const iframeDoc = getIframeDoc()
    const oldIframeHovered = iframeDoc?.querySelectorAll('.is-hovered-sync')

    ;[...oldHovered, ...(oldIframeHovered || [])].forEach((el) => {
      el.classList.remove('is-hovered-sync')
    })

    if (!id) {
      hoveredElement.value = null
      return
    }

    // 2. Aplica o novo hover no Explorer (DOM Principal)
    const astEl = document.querySelector(`[data-ast-node-id="${id}"]`)
    if (astEl) astEl.classList.add('is-hovered-sync')

    // 3. Aplica o novo hover no Preview (Iframe)
    const previewEl = iframeDoc?.querySelector(`[data-node-id="${id}"]`)
    if (previewEl) {
      previewEl.classList.add('is-hovered-sync')
      hoveredElement.value = markRaw(previewEl)
    } else {
      hoveredElement.value = null
    }
  }

  function undo() {
    history.undo(manipulation.value)
  }

  function redo() {
    history.redo(manipulation.value)
  }

  function getCssByOrigin(origin) {
    if (!cssAst.value) return ''
    const { generate } = useCssParser()
    
    const filteredAst = {
      type: 'StyleSheet',
      children: cssAst.value.children.filter(node => node.origin === origin)
    }
    
    try {
      return generate(filteredAst)
    } catch (e) {
      console.error(`Failed to generate CSS for origin: ${origin}`, e)
      return ''
    }
  }

  function getCssGroupedBySource(origin) {
    if (!cssAst.value) return []
    const { generate } = useCssParser()

    const rules = cssAst.value.children.filter((node) => node.origin === origin)
    const groups = {}

    rules.forEach((rule) => {
      const source = rule.sourceName || (origin === 'on_page' ? 'On Page' : 'style')
      if (!groups[source]) groups[source] = []
      groups[source].push(rule)
    })

    return Object.keys(groups).map((sourceName) => {
      try {
        const filteredAst = {
          type: 'StyleSheet',
          children: groups[sourceName],
        }
        return {
          name: sourceName,
          css: generate(filteredAst),
        }
      } catch (e) {
        console.error(`Failed to generate CSS for source: ${sourceName}`, e)
        return { name: sourceName, css: '' }
      }
    })
  }

  return {
    ctx,
    selectNode,
    selectedNode,
    selectedNodeId,
    selectedCssRuleNodeId,
    selectedElement,
    hoveredNodeId,
    hoveredElement,
    hoverSource,
    inspectMode,
    loadHTML,
    viewport,
    cssAst,
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
    getCssByOrigin,
    getCssGroupedBySource,
    refreshCssAst,
  }
})
