/**
 * useHeadManager
 *
 * Gerencia elementos do <head> do iframe:
 *   - Lista elementos filtrados (sem internos do editor)
 *   - Adiciona, edita atributos e remove elementos
 *   - Sincroniza: DOM do iframe → ctx.headHTML → ctx.ast (head node)
 */
import { useEditorStore } from '@/stores/EditorStore'
import { generateId } from '@/utils/ids'

// IDs/tags de elementos injetados pelo editor — não devem aparecer no Head Manager
const EDITOR_STYLE_IDS = new Set([
  'editor-ui-styles',
  'editor-outline-mode',
  'editor-empty-placeholder',
])

// Tags do head que podem ser gerenciadas
export const HEAD_TAGS = ['link', 'meta', 'title', 'script', 'style', 'base']

export function useHeadManager() {
  const editorStore = useEditorStore()

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function getHeadEl() {
    return editorStore.iframe?.contentDocument?.head ?? null
  }

  function getCtx() {
    return editorStore.ctx ?? null
  }

  // ── Lista de elementos do head (sem internos do editor) ───────────────────────

  /**
   * Retorna array fresco de { el, tag, attrs, textContent } do head do iframe.
   * Deve ser chamado de dentro de um computed Vue com tick como dependência para reatividade.
   */
  function getHeadElements() {
    const head = getHeadEl()
    if (!head) return []

    return Array.from(head.children).filter(el => {
      const tag = el.tagName.toLowerCase()
      if (!HEAD_TAGS.includes(tag)) return false
      if (EDITOR_STYLE_IDS.has(el.id)) return false
      // Ignora style injetados pelo Vite/runtime (sem data-location)
      if (tag === 'style' && !el.hasAttribute('data-location')) return false
      // Ignora style internal — gerenciados pelo CSS Explorer
      if (tag === 'style' && el.getAttribute('data-location') === 'internal') return false
      return true
    }).map(el => ({
      el,
      tag: el.tagName.toLowerCase(),
      attrs: Array.from(el.attributes).map(a => ({ name: a.name, value: a.value })),
      textContent: el.textContent ?? '',
    }))
  }

  // ── Sincronização do contexto do pipeline ─────────────────────────────────────

  function syncContext() {
    const ctx  = getCtx()
    const head = getHeadEl()
    if (!ctx || !head) return

    // 1. Atualiza headHTML para o save
    ctx.headHTML = head.innerHTML

    // 2. Atualiza ctx.ast: reconstrói os children do nó head
    const headAstNode = ctx.ast?.children?.find(c => c.tag === 'head')
    if (!headAstNode) return

    headAstNode.children = Array.from(head.childNodes)
      .filter(n => {
        if (n.nodeType === Node.ELEMENT_NODE) {
          const tag = n.tagName.toLowerCase()
          if (!HEAD_TAGS.includes(tag)) return false
          if (EDITOR_STYLE_IDS.has(n.id)) return false
          return true
        }
        return n.nodeType === Node.TEXT_NODE && n.nodeValue.trim()
      })
      .map(n => {
        if (n.nodeType !== Node.ELEMENT_NODE) {
          return { nodeId: generateId(), type: 'text', value: n.nodeValue, children: [] }
        }
        const attrs = {}
        for (const a of n.attributes) attrs[a.name] = a.value
        return {
          nodeId: generateId(),
          type:     'element',
          tag:      n.tagName.toLowerCase(),
          attrs,
          children: [],
        }
      })
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * Adiciona um novo elemento ao head.
   * @param {string} tag  - 'link' | 'meta' | 'script' | 'title' | etc.
   * @param {Record<string,string>} attrs - Atributos iniciais
   * @param {string} [textContent] - Conteúdo de texto (para title, style, script inline)
   */
  function addElement(tag, attrs = {}, textContent = '') {
    const doc  = editorStore.iframe?.contentDocument
    const head = getHeadEl()
    if (!doc || !head) return null

    const el = doc.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
    if (textContent) el.textContent = textContent
    head.appendChild(el)
    syncContext()
    return el
  }

  /**
   * Define ou atualiza um atributo de um elemento do head.
   * @param {HTMLElement} el
   * @param {string} name
   * @param {string} value
   */
  function setAttribute(el, name, value) {
    if (!el) return
    el.setAttribute(name, value)
    syncContext()
  }

  /**
   * Remove um atributo de um elemento do head.
   * @param {HTMLElement} el
   * @param {string} name
   */
  function removeAttribute(el, name) {
    if (!el) return
    el.removeAttribute(name)
    syncContext()
  }

  /**
   * Define o textContent de um elemento.
   * @param {HTMLElement} el
   * @param {string} text
   */
  function setTextContent(el, text) {
    if (!el) return
    el.textContent = text
    syncContext()
  }

  /**
   * Remove o elemento do head.
   * @param {HTMLElement} el
   */
  function removeElement(el) {
    if (!el?.parentNode) return
    el.parentNode.removeChild(el)
    syncContext()
  }

  return {
    getHeadElements,
    addElement,
    setAttribute,
    removeAttribute,
    setTextContent,
    removeElement,
    syncContext,
  }
}
