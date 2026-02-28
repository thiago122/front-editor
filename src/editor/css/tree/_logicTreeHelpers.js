import { generateId } from '../../../utils/ids.js'
import { findCssNode } from '@/utils/astHelpers'

/**
 * _logicTreeHelpers.js
 *
 * Low-level Logic Tree utilities shared between
 * CssRuleService, CssAtRuleService, and CssDeclarationService.
 *
 * Junior devs: these are "find or create" helpers for the internal tree
 * structure. You probably won't need to touch these directly.
 */

/**
 * Find the parent node of a given node ID.
 * @param {Array} logicTree - The Logic Tree
 * @param {string} targetId - ID to search for
 * @returns {Object|null}
 */
export function findParent(logicTree, targetId) {
  const search = (nodes, parent) => {
    for (const node of nodes) {
      if (node.id === targetId) return parent
      if (node.children) {
        const found = search(node.children, node)
        if (found !== undefined) return found
      }
    }
    return undefined
  }
  return search(logicTree, null) ?? null
}

/**
 * Find or create a root node for a given CSS origin.
 * @param {Array} logicTree - The Logic Tree
 * @param {string} origin - 'on_page' | 'internal' | 'external'
 * @returns {Object} The root node
 */
export function findOrCreateRoot(logicTree, origin) {
  let root = logicTree.find(n => n.metadata?.origin === origin)
  if (!root) {
    root = {
      id: generateId(),
      type: 'root',
      label: origin.toUpperCase().replace('_', ' '),
      metadata: { origin },
      children: [],
    }
    logicTree.push(root)
  }
  return root
}

/**
 * Find or create a file node inside a root node.
 * @param {Object} root - Root Logic Tree node
 * @param {string} sourceName - Stylesheet name (e.g. 'style', 'all.css')
 * @param {string} origin - CSS origin
 * @returns {Object} The file node
 */
export function findOrCreateFile(root, sourceName, origin) {
  let fileNode = root.children.find(n => n.label === sourceName)
  if (!fileNode) {
    fileNode = {
      id: generateId(),
      type: 'file',
      label: sourceName,
      metadata: { origin, sourceName },
      children: [],
    }
    root.children.push(fileNode)
  }
  return fileNode
}

// Re-export findCssNode for convenience
export { findCssNode }
