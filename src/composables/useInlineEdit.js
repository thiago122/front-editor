import { useEditorStore } from '@/stores/EditorStore'
import { TEXT_EDITABLE_TAGS } from '@/editor/html/htmlConstants'

export function useInlineEdit(iframeRef) {
  const EditorStore = useEditorStore()

  let editingEl    = null
  let originalHTML = null
  let isCancelling = false  // flag para cancel() suprimir o finish() do blur

  const getDoc = () => iframeRef.value?.contentDocument

  // Helper: insere <br> em vez de criar novas divs ao pressionar Enter
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
      e.preventDefault()
      cancel()
    }
  }

  function start(el) {
    if (editingEl) return

    editingEl    = el
    originalHTML = el.innerHTML
    isCancelling = false

    el.contentEditable = 'true'
    el.spellcheck = false
    el.style.outline = 'none'
    el.setAttribute('data-editing', '')
    el.focus()

    el.addEventListener('keydown', handleKeydown)
    el.addEventListener('blur', finish, { once: true })
  }

  function finish() {
    // Se estamos cancelando, o blur foi artificial — apenas reseta o estado.
    if (isCancelling) {
      isCancelling = false
      editingEl    = null
      originalHTML = null
      return
    }

    if (!editingEl) return

    editingEl.removeAttribute('contenteditable')
    editingEl.removeAttribute('spellcheck')
    editingEl.removeEventListener('keydown', handleKeydown)

    const html   = editingEl.innerHTML
    const nodeId = editingEl.dataset.nodeId

    // Limpa o DOM antes de updateInnerContent reinserir os filhos via AST.
    // Sem isso o engine appenda os filhos sobre o conteúdo já existente → duplicação.
    editingEl.innerHTML = ''
    editingEl.removeAttribute('data-editing')

    EditorStore.manipulation.updateInnerContent(nodeId, html)

    editingEl    = null
    originalHTML = null
  }

  function cancel() {
    if (!editingEl) return

    // Salva referências locais e limpa o estado ANTES de qualquer operação DOM.
    // Motivo: setar innerHTML num contenteditable focado pode disparar blur
    // sincronamente → finish() roda → editingEl = null → crash no removeAttribute.
    const el   = editingEl
    const html = originalHTML
    editingEl    = null
    originalHTML = null
    isCancelling = true

    el.removeEventListener('keydown', handleKeydown)
    el.removeAttribute('contenteditable')
    el.removeAttribute('spellcheck')
    el.removeAttribute('data-editing')
    el.innerHTML = html
    // Não chamamos el.blur() — contenteditable já foi removido,
    // então o listener { once: true } do blur não dispara finish().
  }

  /**
   * Configura o listener de dblclick no documento do iframe.
   * O inspect mode não bloqueia a edição inline — apenas afeta hover/seleção.
   */
  function setup() {
    const doc = getDoc()
    if (!doc) return

    doc.addEventListener('dblclick', (e) => {
      const el  = e.target.closest('[data-node-id]')
      if (!el) return

      const tag = el.tagName.toLowerCase()
      if (TEXT_EDITABLE_TAGS.includes(tag)) {
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
