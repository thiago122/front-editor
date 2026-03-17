/**
 * editor/html/textWrap.js
 *
 * Funções PURAS para wrap/unwrap de tags inline sobre texto selecionado.
 * Não dependem de Vue — trabalham diretamente com a Selection/Range API do browser.
 *
 * Estratégia por tag:
 *  - <strong> / <em> → document.execCommand (nativo, lida melhor com seleções
 *    que cruzam múltiplos elementos)
 *  - <code> / <span> / <a> → Range API com fallback para seleções complexas
 *
 * Por que dois caminhos?
 *  execCommand('bold') / ('italic') é o mecanismo nativo do browser para essas
 *  operações. Mesmo depreciado, ele lida corretamente com seleções que começam
 *  em um elemento e terminam em outro — algo que a Range API pura faz
 *  com dificuldade. Para tags que execCommand não suporta, usamos Range API.
 */

// ─── Tags disponíveis na toolbar de formatação ────────────────────────────────

/**
 * Lista de todas as tags inline suportadas pelo wrap/unwrap.
 * A ordem aqui define a ordem dos botões na toolbar.
 */
export const INLINE_WRAP_TAGS = ['strong', 'em', 'code', 'span', 'a']

// Mapeamento de tag semântica → execCommand equivalente
const EXEC_COMMAND_MAP = {
  strong: 'bold',
  em:     'italic',
}

// Tags "legacy" que execCommand pode produzir em vez das tags semânticas
// Ex: execCommand('bold') pode gerar <b> em vez de <strong>
const LEGACY_TAG_MAP = {
  strong: 'b',
  em:     'i',
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Envolve o texto selecionado em uma tag HTML.
 *
 * Exemplos de uso:
 *   wrapSelection(iframeWin, editingEl, 'strong')
 *   wrapSelection(iframeWin, editingEl, 'a', { href: 'https://example.com' })
 *
 * @param {Window}      iframeWin  - window do iframe (não do editor principal)
 * @param {HTMLElement} editingEl  - o elemento com contenteditable ativo
 * @param {string}      tag        - tag a aplicar: 'strong'|'em'|'code'|'span'|'a'
 * @param {Object}      [attrs={}] - atributos para adicionar ao elemento criado
 */
export function wrapSelection(iframeWin, editingEl, tag, attrs = {}) {
  const doc = iframeWin.document
  const sel = iframeWin.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount) return

  // — Caminho 1: execCommand para strong e em —————————————————————————————
  const execCmd = EXEC_COMMAND_MAP[tag]
  if (execCmd) {
    doc.execCommand(execCmd, false, null)
    // execCommand pode produzir <b>/<i> em vez de <strong>/<em>.
    // Corrigimos para as tags semânticas corretas.
    _replaceLegacyTags(editingEl, tag)
    return
  }

  // — Caminho 2: Range API para code, span e a ————————————————————————————
  const range   = sel.getRangeAt(0)
  const wrapper = doc.createElement(tag)
  Object.entries(attrs).forEach(([k, v]) => wrapper.setAttribute(k, v))

  try {
    // Seleção simples: o início e o fim estão no mesmo nó pai
    range.surroundContents(wrapper)
  } catch {
    // Seleção complexa: cruza fronteiras de elementos (ex: do meio de um <span>
    // até o meio de um <strong>). Extraímos e reinserimos.
    const fragment = range.extractContents()
    wrapper.appendChild(fragment)
    range.insertNode(wrapper)
    // Limpa tags vazias que podem sobrar após a extração
    cleanupEmptyNodes(editingEl)
  }
}

/**
 * Remove o wrapper mais próximo de um tipo de tag a partir do cursor.
 * Sobe na árvore DOM até encontrar a tag e "desembrulha" seu conteúdo.
 *
 * Exemplo:
 *   Antes:  Hello <strong>wor|ld</strong> foo   (| = cursor)
 *   Depois: Hello world foo
 *
 * @param {Window}      iframeWin
 * @param {HTMLElement} editingEl
 * @param {string}      tag
 */
export function unwrapNearestTag(iframeWin, editingEl, tag) {
  const doc = iframeWin.document
  const sel = iframeWin.getSelection()
  if (!sel) return

  // Para strong/em, execCommand funciona como toggle (aplica/remove)
  const execCmd = EXEC_COMMAND_MAP[tag]
  if (execCmd) {
    doc.execCommand(execCmd, false, null)
    _replaceLegacyTags(editingEl, tag)
    return
  }

  // Para outras tags: sobe na árvore a partir do nó do cursor para encontrar a tag
  let node = sel.anchorNode?.parentElement
  while (node && node !== editingEl) {
    if (node.tagName?.toLowerCase() === tag) {
      // Move todos os filhos para antes do wrapper, depois remove o wrapper
      while (node.firstChild) {
        node.parentNode.insertBefore(node.firstChild, node)
      }
      node.parentNode.removeChild(node)
      return
    }
    node = node.parentElement
  }
}

/**
 * Detecta quais tags inline estão ativas no ponto atual do cursor.
 * Sobe pela árvore DOM a partir do nó âncora da seleção até o editingEl.
 *
 * @param {Window}      iframeWin
 * @param {HTMLElement} editingEl
 * @returns {Object} ex: { strong: true, em: false, code: false, span: false, a: false }
 */
export function detectActiveFormats(iframeWin, editingEl) {
  // Começa com todos desativados
  const formats = Object.fromEntries(INLINE_WRAP_TAGS.map(tag => [tag, false]))

  const sel = iframeWin.getSelection()
  if (!sel) return formats

  // Sobe da posição do cursor até o editingEl verificando cada tag
  let node = sel.anchorNode?.parentElement
  while (node && node !== editingEl) {
    const tag = node.tagName?.toLowerCase()
    if (tag && tag in formats) {
      formats[tag] = true
    }
    node = node.parentElement
  }

  return formats
}

/**
 * Remove elementos vazios que podem sobrar após uma operação de wrap/unwrap complexa.
 * Ex: <strong></strong> ou <em>  </em> (apenas espaço)
 *
 * @param {HTMLElement} root - elemento raiz a limpar (normalmente o editingEl)
 */
export function cleanupEmptyNodes(root) {
  const selector = INLINE_WRAP_TAGS.join(', ')
  root.querySelectorAll(selector).forEach(el => {
    // Remove apenas se não tiver texto visível nem elementos não-textuais (img, br)
    const hasContent = el.textContent.trim() || el.querySelector('img, br')
    if (!hasContent) el.remove()
  })
}

// ─── Helpers privados ────────────────────────────────────────────────────────

/**
 * execCommand pode produzir tags legacy (<b>, <i>) em vez de semânticas (<strong>, <em>).
 * Esta função percorre o elemento editável e substitui as tags legacy pelas corretas.
 *
 * @param {HTMLElement} root       - elemento a normalizar
 * @param {string}      desiredTag - tag semântica desejada ('strong' ou 'em')
 */
function _replaceLegacyTags(root, desiredTag) {
  const legacyTag = LEGACY_TAG_MAP[desiredTag]
  if (!legacyTag) return

  root.querySelectorAll(legacyTag).forEach(el => {
    const semantic = root.ownerDocument.createElement(desiredTag)
    // Copia todos os filhos para o novo elemento semântico
    while (el.firstChild) semantic.appendChild(el.firstChild)
    el.replaceWith(semantic)
  })
}
