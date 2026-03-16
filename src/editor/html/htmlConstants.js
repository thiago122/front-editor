/**
 * src/editor/html/htmlConstants.js
 *
 * Constantes para a engine de edição HTML.
 * Padrão análogo a editor/css/shared/cssConstants.js.
 */

// ─── Tags com suporte a edição de texto inline ───────────────────────────────

/**
 * Tags HTML cujos nós de texto podem ser editados diretamente no canvas
 * via double-click (contenteditable temporário).
 * Usado por useInlineEdit.js e pelo CSS de indicação visual no iframe.
 */
export const TEXT_EDITABLE_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'span', 'a', 'button', 'div',
  'li', 'td', 'th', 'label',
]
