/**
 * Builder dos itens do menu de contexto do CSS Explorer.
 * Função pura: recebe o nó e os callbacks de ação, devolve a lista de itens
 * que o CssContextMenu renderiza ({ label, icon, action, disabled?, danger?,
 * divider?, shortcut? }).
 *
 * @param {object|null} node — nó da Logic Tree (cópia do virtual list) ou null (área vazia)
 * @param {object} actions — callbacks do CssExplorer (addFile, deleteNode, …)
 * @param {number} viewportWidth — largura atual do preview (label do Wrap @media)
 * @returns {Array} itens do menu (vazio = não abre)
 */
export function buildContextMenuItems(node, actions, viewportWidth) {
  const isExternal = node?.metadata?.origin === 'external'

  if (!node || node.type === 'root') {
    return [{ label: 'New File', icon: '📄', action: actions.addFile }]
  }

  if (isExternal) {
    return [{ label: 'External — read only', icon: '🔒', disabled: true }]
  }

  if (node.type === 'file') {
    return [
      { label: 'New CSS Rule', icon: '{}', action: () => actions.addRuleInContext(node), shortcut: 'Ctrl+Enter' },
      { label: 'New At-Rule',  icon: '@',  action: () => actions.addAtRuleInContext(node) },
      { divider: true },
      { label: 'Move Up',     icon: '↑',  action: () => actions.moveFileInManifest(node, 'up') },
      { label: 'Move Down',   icon: '↓',  action: () => actions.moveFileInManifest(node, 'down') },
      { divider: true },
      { label: 'Rename',      icon: '✏️', action: () => actions.renameFile(node), shortcut: 'F2' },
      { label: 'Export .css', icon: '↓', action: () => actions.exportFile(node) },
      { divider: true },
      { label: 'Remover arquivo', icon: '✕', action: () => actions.deleteFile(node), danger: true, shortcut: 'Del' },
    ]
  }

  if (node.type === 'at-rule') {
    return [
      { label: 'New CSS Rule inside', icon: '{}', action: () => actions.addRuleInContext(node), shortcut: 'Ctrl+Enter' },
      { label: 'New At-Rule inside',  icon: '@',  action: () => actions.addAtRuleInContext(node) },
      { divider: true },
      { label: 'Add Rule Before',     icon: '↑{}', action: () => actions.addRuleBeforeNode(node), shortcut: 'Alt+↑' },
      { label: 'Add Rule After',      icon: '↓{}', action: () => actions.addRuleAfterNode(node), shortcut: 'Alt+↓' },
      { divider: true },
      { label: 'Duplicate',           icon: '⧉',  action: () => actions.duplicateNode(node), shortcut: 'Ctrl+D' },
      { divider: true },
      { label: 'Delete', icon: '✕', action: () => actions.deleteNode(node), danger: true, shortcut: 'Del' },
    ]
  }

  if (node.type === 'selector') {
    return [
      { label: 'New Declaration', icon: ':', action: () => actions.addDeclaration(node), shortcut: 'Ctrl+Enter' },
      { divider: true },
      { label: 'Add Rule Before', icon: '↑{}', action: () => actions.addRuleBeforeNode(node), shortcut: 'Alt+↑' },
      { label: 'Add Rule After',  icon: '↓{}', action: () => actions.addRuleAfterNode(node), shortcut: 'Alt+↓' },
      { divider: true },
      { label: `Wrap @media (${Math.round(viewportWidth ?? 768)}px)`, icon: '@', action: () => actions.wrapWithAtRule(node), shortcut: 'Ctrl+M' },
      { divider: true },
      { label: 'Duplicate Rule',  icon: '⧉', action: () => actions.duplicateNode(node), shortcut: 'Ctrl+D' },
      { divider: true },
      { label: 'Delete', icon: '✕', action: () => actions.deleteNode(node), danger: true, shortcut: 'Del' },
    ]
  }

  if (node.type === 'declaration') {
    return [
      { label: 'Delete', icon: '✕', action: () => actions.deleteNode(node), danger: true, shortcut: 'Del' },
    ]
  }

  return []
}
