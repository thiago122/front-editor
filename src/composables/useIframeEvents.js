export function useIframeEvents(iframeRef, EditorStore) {
  const getDoc = () => iframeRef.value?.contentDocument

  /**
   * Limpa o estado de hover
   */
  function clearHover() {
    EditorStore.handleHover({
      id: null,
      source: 'preview',
    })
  }

  /**
   * Aplica visualmente o atributo de hover no DOM do iframe
   */
  function applyHover(nodeId) {
    EditorStore.handleHover({
      id: nodeId,
      source: 'preview',
    })
  }

  /**
   * Aplica visualmente o atributo de seleção no DOM do iframe
   */
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

  /**
   * Configura os listeners globais do iframe
   */
  function setup() {
    const doc = getDoc()
    if (!doc) return

    // Evento de Clique (Seleção)
    doc.addEventListener('click', (e) => {
      e.preventDefault()
      const el = e.target.closest('[data-node-id]')
      if (!el) return

      EditorStore.selectNode(el.dataset.nodeId, el)
    })

    doc.addEventListener('mouseover', (e) => {
      // Procura o elemento mais próximo que tenha um ID de nó
      const target = e.target.closest('[data-node-id]')
      if (target) {
        const nodeId = target.getAttribute('data-node-id')
        applyHover(nodeId)
      }
    })

    // Limpeza quando o mouse sai do iframe
    doc.addEventListener('mouseleave', clearHover)
  }

  return {
    setup,
    applyHover,
    applySelection,
  }
}
