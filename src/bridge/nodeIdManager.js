/** @placeholder — implementação futura @see docs/bridge-architecture.md */

let _nodeCounter = 0

/**
 * Injeta data-node-id em todos os elementos do subárvore que não o possuem.
 * @param {Element} root
 * @param {object}  config
 */
export function injectNodeIds(root, config) {
  const locked = config.lockSelectors ?? []

  // TODO: walk completo da árvore, excluindo iframes, scripts, locked
  root.querySelectorAll('*').forEach(el => {
    if (el.hasAttribute('data-node-id')) return
    if (locked.some(sel => el.matches(sel))) return
    el.setAttribute('data-node-id', `n-${++_nodeCounter}`)
  })
}
