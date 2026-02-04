// src/editor/sync/DomSync.js
import { nodeHandlers } from '@/editor/sync/handlers/nodeHandlers'

const handlers = { ...nodeHandlers }

export const DomSync = {
  apply(doc, action, payload) {
    const handler = handlers[action]
    if (handler) handler(doc, payload)
  },
}
