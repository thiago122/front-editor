import { useEditorStore } from '@/stores/EditorStore'

export function useInlineEdit(iframeRef) {
  const EditorStore = useEditorStore()

  let editingEl = null
  let originalHTML = null
  const TEXT_TAGS = ['p', 'h1', 'h2', 'h3', 'button', 'span', 'div', 'a']

  const getDoc = () => iframeRef.value?.contentDocument

  // Helper para inserir <br> em vez de criar novas divs ao apertar Enter
  function insertLineBreak() {
    const sel = iframeRef.value?.contentWindow.getSelection()
    if (!sel || !sel.rangeCount) return

    const range = sel.getRangeAt(0)
    range.deleteContents()

    const br = document.createElement('br')
    range.insertNode(br)
    range.setStartAfter(br)
    range.setEndAfter(br)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      insertLineBreak()
    }
    if (e.key === 'Escape') {
      cancel()
    }
  }

  function start(el) {
    if (editingEl) return

    editingEl = el
    originalHTML = el.innerHTML

    el.contentEditable = 'true'
    el.spellcheck = false
    el.style.outline = 'none' // Remove o outline padrão se desejar
    el.focus()

    el.addEventListener('keydown', handleKeydown)
    el.addEventListener('blur', finish, { once: true })
  }

  function finish() {
    if (!editingEl) return
    editingEl.removeAttribute('contenteditable')
    editingEl.removeAttribute('spellcheck')

    const html = editingEl.innerHTML
    const nodeId = editingEl.dataset.nodeId

    editingEl.removeEventListener('keydown', handleKeydown)

    EditorStore.manipulation.updateInnerContent(nodeId, html)

    editingEl = null
    originalHTML = null
  }

  function cancel() {
    if (!editingEl) return
    editingEl.innerHTML = originalHTML
    editingEl.blur() // O blur disparará o finish, mas com o HTML restaurado
  }

  /**
   * Configura o listener de clique duplo no documento do iframe
   */
  function setup(isInspectModeCallback) {
    const doc = getDoc()
    if (!doc) return

    doc.addEventListener('dblclick', (e) => {
      // Se estivermos em modo de inspeção, não permitimos editar
      if (isInspectModeCallback()) return

      const el = e.target.closest('[data-node-id]')
      if (!el) return

      const tag = el.tagName.toLowerCase()
      if (TEXT_TAGS.includes(tag)) {
        start(el)
      }
    })
  }

  return {
    setup,
    start,
    finish,
    cancel,
  }
}
