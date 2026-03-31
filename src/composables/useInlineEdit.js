/**
 * composables/useInlineEdit.js
 *
 * Gerencia a edição de texto inline diretamente no canvas (iframe).
 * Ativado por double-click em elementos de texto (p, h1, div...).
 *
 * Responsabilidades:
 *  1. Liga/desliga contenteditable no elemento clicado
 *  2. Persiste as mudanças no AST ao sair (via updateInnerContent)
 *  3. Expõe toolbar de formatação: detecta seleção de texto e permite
 *     wrap/unwrap de tags inline (<strong>, <em>, <code>, <span>, <a>)
 */

import { ref } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { TEXT_EDITABLE_TAGS } from '@/editor/html/htmlConstants'

import {
  wrapSelection,
  unwrapNearestTag,
  detectActiveFormats,
} from '@/editor/html/textWrap'

export function useInlineEdit(iframeRef) {
  const EditorStore = useEditorStore()


  // ── Estado interno de edição ──────────────────────────────────────────────
  // Usamos variáveis simples (não reativas) porque o Vue não precisa
  // rastrear esses valores — eles só existem enquanto o usuário edita.
  let editingEl    = null  // elemento com contenteditable ativo
  let originalHTML = null  // HTML original (para o Escape cancelar)
  let isCancelling = false // evita que o cancel() dispare o finish() do blur

  /**
   * Quando true, o blur do contenteditable NÃO fecha a edição.
   * Ativado enquanto o input de href da toolbar está visível.
   */
  let isLinkMode   = false

  // ── Estado reativo da toolbar ─────────────────────────────────────────────
  // Esses valores mudam conforme o usuário seleciona texto → Vue re-renderiza a toolbar.

  /**
   * Rect da seleção atual em coordenadas do viewport principal (não do iframe).
   * null = nenhum texto selecionado, toolbar fica oculta.
   */
  const selectionRect = ref(null)

  /**
   * Quais tags inline estão ativas no ponto do cursor.
   * Ex: { strong: true, em: false, code: false, span: false, a: false }
   */
  const activeFormats = ref({})

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getDoc = () => iframeRef.value?.contentDocument
  const getWin = () => iframeRef.value?.contentWindow

  // ── Blur handler (suspendido durante o modo link) ───────────────────────

  /**
   * Intermediador do blur: só chama finish() se não estamos no modo link.
   * Isso evita que o input de href feche a edição ao receber o foco.
   */
  function handleBlur() {
    if (isLinkMode) return
    finish()
  }

  /**
   * Chamado sempre que a seleção do usuário muda dentro do iframe.
   * Recalcula a posição da toolbar e as formatações ativas.
   */
  function onSelectionChange() {
    // Se não estamos editando, a toolbar fica oculta
    if (!editingEl) {
      selectionRect.value = null
      activeFormats.value = {}
      return
    }

    const iframeWin = getWin()
    if (!iframeWin) return

    const sel = iframeWin.getSelection()

    // Atualiza as formatações ativas independente de haver seleção
    // (para quando o usuário apenas move o cursor)
    activeFormats.value = detectActiveFormats(iframeWin, editingEl)

    // Seleção colapsada (apenas cursor, sem texto selecionado) → toolbar oculta
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      selectionRect.value = null
      return
    }

    // Converte as coords do iframe para coords do viewport principal
    const rangeRect  = sel.getRangeAt(0).getBoundingClientRect()
    const iframeRect = iframeRef.value.getBoundingClientRect()

    selectionRect.value = {
      top:    rangeRect.top    + iframeRect.top,
      left:   rangeRect.left   + iframeRect.left,
      width:  rangeRect.width,
      height: rangeRect.height,
    }
  }

  // ── Wrap / Unwrap ─────────────────────────────────────────────────────────

  /**
   * Aplica ou remove uma tag inline na seleção atual.
   * Se a tag já estiver ativa → remove (unwrap).
   * Se não estiver → aplica (wrap).
   *
   * @param {string} tag   - 'strong' | 'em' | 'code' | 'span' | 'a'
   * @param {Object} attrs - atributos extras (ex: { href: 'https://...' } para <a>)
   */
  function wrap(tag, attrs = {}) {
    const iframeWin = getWin()
    if (!iframeWin || !editingEl) return

    if (activeFormats.value[tag]) {
      unwrapNearestTag(iframeWin, editingEl, tag)
    } else {
      wrapSelection(iframeWin, editingEl, tag, attrs)
    }

    // Atualiza a toolbar após a operação
    onSelectionChange()
  }

  // ── Keyboard shortcuts dentro do contenteditable ──────────────────────────

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      _insertLineBreak()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
      return
    }
    // Ctrl+B → bold (strong)
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      wrap('strong')
      return
    }
    // Ctrl+I → italic (em)
    if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      wrap('em')
      return
    }
  }

  // ── Ciclo de vida da edição ───────────────────────────────────────────────

  /**
   * Inicia a edição inline em um elemento.
   * Liga contenteditable, registra listeners e foca o elemento.
   */
  function start(el) {
    if (editingEl) return // já está editando outro elemento

    editingEl    = el
    originalHTML = el.innerHTML
    isCancelling = false

    el.contentEditable = 'true'
    el.spellcheck      = false
    el.style.outline   = 'none'
    el.setAttribute('data-editing', '')
    el.focus()

    el.addEventListener('keydown', handleKeydown)
    el.addEventListener('blur', handleBlur) // sem { once: true } — removemos manualmente

    // Escuta mudanças de seleção para atualizar a toolbar
    getDoc()?.addEventListener('selectionchange', onSelectionChange)
  }

  /**
   * Finaliza a edição e persiste as mudanças no AST.
   * Chamado automaticamente no blur do elemento.
   */
  function finish() {
    if (isCancelling) {
      // O cancel() causou o blur artificial — apenas reseta o estado.
      isCancelling = false
      editingEl    = null
      originalHTML = null
      return
    }

    if (!editingEl) return

    // Remove os atributos de edição
    editingEl.removeAttribute('contenteditable')
    editingEl.removeAttribute('spellcheck')
    editingEl.removeEventListener('keydown', handleKeydown)
    editingEl.removeEventListener('blur', handleBlur) // remove o listener permanente
    getDoc()?.removeEventListener('selectionchange', onSelectionChange)

    const html   = editingEl.innerHTML
    const nodeId = editingEl.dataset.nodeId

    // Limpa o DOM ANTES de updateInnerContent re-inserir via AST.
    // (evita duplicação de conteúdo)
    editingEl.innerHTML = ''
    editingEl.removeAttribute('data-editing')

    EditorStore.manipulation.updateInnerContent(nodeId, html)

    // Oculta a toolbar
    selectionRect.value = null
    activeFormats.value = {}

    editingEl    = null
    originalHTML = null
  }

  /**
   * Cancela a edição e restaura o HTML original (Escape).
   */
  function cancel() {
    if (!editingEl) return

    // Salva referências locais ANTES de limpar o estado,
    // pois setar innerHTML pode disparar blur → finish() → crash.
    const el   = editingEl
    const html = originalHTML
    editingEl    = null
    originalHTML = null
    isCancelling = true

    el.removeEventListener('keydown', handleKeydown)
    el.removeEventListener('blur', handleBlur) // remove o listener permanente
    el.removeAttribute('contenteditable')
    el.removeAttribute('spellcheck')
    el.removeAttribute('data-editing')
    el.innerHTML = html

    getDoc()?.removeEventListener('selectionchange', onSelectionChange)
    selectionRect.value = null
    activeFormats.value = {}
  }

  // ── Modo link: suspende o finish() enquanto o input de href está ativo ───

  /**
   * Chamado pela InlineToolbar quando o input de href fica visível.
   * Previne que o blur do contenteditable feche a edição.
   */
  function enterLinkMode() {
    isLinkMode = true
  }

  /**
   * Chamado pela InlineToolbar quando o input de href é confirmado ou cancelado.
   * Retoma o comportamento normal e restaura o foco no contenteditable.
   */
  function exitLinkMode() {
    isLinkMode = false
    // Restaura o foco no elemento editável para o usuário continuar digitando
    editingEl?.focus()
  }

  // ── Setup: registra o dblclick no iframe ──────────────────────────────────

  /**
   * Inicializa os listeners no documento do iframe.
   * Deve ser chamado após o iframe carregar (no evento 'load').
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

  // ── Helpers privados ──────────────────────────────────────────────────────

  /**
   * Insere <br> ao pressionar Enter (em vez de criar uma nova <div>).
   */
  function _insertLineBreak() {
    const sel = getWin()?.getSelection()
    if (!sel || !sel.rangeCount) return

    const range = sel.getRangeAt(0)
    range.deleteContents()
    const br = getDoc().createElement('br')
    range.insertNode(br)
    range.setStartAfter(br)
    range.setEndAfter(br)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  // ── API pública ───────────────────────────────────────────────────────────

  return {
    // Ciclo de vida
    setup,
    start,
    finish,
    cancel,
    // Toolbar de formatação
    wrap,
    selectionRect,
    activeFormats,
    // Controle do modo link (suspende o finish durante o input de href)
    enterLinkMode,
    exitLinkMode,
  }
}
