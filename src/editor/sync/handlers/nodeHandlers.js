// src/editor/sync/handlers/nodeHandlers.js
export const nodeHandlers = {
  REMOVE: (doc, { nodeId }) => {
    const el = doc.querySelector(`[data-node-id="${nodeId}"]`)
    el?.remove()
  },

  INSERT_BEFORE: (doc, { html, refId }) => {
    const refEl = doc.querySelector(`[data-node-id="${refId}"]`)
    refEl?.insertAdjacentHTML('beforebegin', html)
  },

  APPEND: (doc, { parentId, html }) => {
    const parentEl = doc.querySelector(`[data-node-id="${parentId}"]`)
    parentEl?.insertAdjacentHTML('beforeend', html)
  },
}
