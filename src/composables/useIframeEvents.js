import { watch } from 'vue'

export function useIframeEvents(iframeRef, EditorStore) {
  const getDoc = () => iframeRef.value?.contentDocument

  // --- Cursor do iframe ---
  function setIframeCursor(cursor) {
    const doc = getDoc()
    if (!doc) return
    doc.documentElement.style.cursor = cursor
    doc.body.style.cursor = cursor
  }

  // --- Hover ---
  function clearHover() {
    EditorStore.handleHover({ id: null, source: 'preview' })
  }

  function applyHover(nodeId) {
    EditorStore.handleHover({ id: nodeId, source: 'preview' })
  }

  // --- Seleção visual no DOM do iframe ---
  function applySelection(nodeId) {
    const doc = getDoc()
    if (!doc) return

    doc.querySelectorAll('[data-selected]').forEach((el) => el.removeAttribute('data-selected'))
    if (!nodeId) return

    const el = doc.querySelector(`[data-node-id="${nodeId}"]`)
    if (el) {
      el.setAttribute('data-selected', 'true')
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }

  // --- Handlers (armazenados para poder remover) ---
  let clickHandler = null
  let mouseover = null
  let mouseleave = null

  function attachInspectListeners(doc) {
    clickHandler = (e) => {
      if (!EditorStore.inspectMode) return
      e.preventDefault()
      e.stopPropagation()

      const el = e.target.closest('[data-node-id]')
      if (!el) {
        // Clique em área vazia do canvas → deseleciona e oculta o overlay
        EditorStore.clearSelection()
        return
      }

      EditorStore.selectNode(el.dataset.nodeId, el)
      // inspect mode permanece ativo — o usuário desativa manualmente pelo ícone
    }

    mouseover = (e) => {
      if (!EditorStore.inspectMode) return
      const target = e.target.closest('[data-node-id]')
      if (target) applyHover(target.getAttribute('data-node-id'))
    }

    mouseleave = () => {
      if (!EditorStore.inspectMode) return
      clearHover()
    }

    doc.addEventListener('click', clickHandler, true) // capture: true para interceptar antes dos links
    doc.addEventListener('mouseover', mouseover)
    doc.addEventListener('mouseleave', mouseleave)
  }

  function setup() {
    const doc = getDoc()
    if (!doc) return
    attachInspectListeners(doc)

    // Previne que Space/ArrowUp/ArrowDown scrollem o iframe quando o foco
    // está no documento (não num contenteditable ou input).
    doc.addEventListener('keydown', (e) => {
      const SCROLL_KEYS = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown']
      if (!SCROLL_KEYS.includes(e.key)) return
      const active = doc.activeElement
      const isEditable = active &&
        (active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
      if (!isEditable) e.preventDefault()
    })
  }

  // Reage ao inspectMode para mudar cursor e limpar hover ao desativar
  watch(
    () => EditorStore.inspectMode,
    (active) => {
      if (active) {
        setIframeCursor('crosshair')
      } else {
        setIframeCursor('')
        clearHover()
        EditorStore.clearSelection()
      }
    },
  )

  return {
    setup,
    applyHover,
    applySelection,
  }
}

