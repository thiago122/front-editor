/**
 * AST Helper Functions
 * Reusable utilities for manipulating CSS Abstract Syntax Trees
 */

/**
 * Safely appends data to various list types (AST lists, arrays, etc)
 * Handles different list implementations from css-tree library
 * @param {Object|Array} list - The list to append to
 * @param {*} data - Data to append
 * @param {boolean} prepend - If true, prepend instead of append
 */
export function safeAppend(list, data, prepend = false) {
  if (!list) return
  try {
    // css-tree List type with createItem
    if (list.prepend && list.append) {
      if (prepend) list.prepend(list.createItem(data))
      else list.append(list.createItem(data))
      return
    }

    // css-tree List type with Data methods
    if (list.prependData && list.appendData) {
      if (prepend) list.prependData(data)
      else list.appendData(data)
    } else if (list.insertData) {
      list.insertData(data)
    } else if (Array.isArray(list)) {
      // Standard array
      if (prepend) list.unshift(data)
      else list.push(data)
    } else {
      console.warn('Unknown list type in safeAppend:', list)
    }
  } catch (e) {
    console.error('Error in safeAppend:', e)
  }
}

/**
 * Recursively finds a CSS node by ID in the logic tree
 * @param {Array} nodes - Array of logic tree nodes to search
 * @param {string} targetId - The ID to search for
 * @returns {Object|null} The found node or null
 */
export function findCssNode(nodes, targetId) {
  if (!nodes || !Array.isArray(nodes)) return null
  for (const node of nodes) {
    if (node.id === targetId) return node
    if (node.children) {
      const found = findCssNode(node.children, targetId)
      if (found) return found
    }
  }
  return null
}

/**
 * Finds the parent node of a target node in the logic tree
 * @param {Array} nodes - Array of logic tree nodes to search
 * @param {string} targetId - The ID of the child node
 * @param {Object|null} parent - Current parent (used in recursion)
 * @returns {Object|null} The parent node or null
 */
export function findParentOfLogicNode(nodes, targetId, parent = null) {
  for (const node of nodes) {
    if (node.id === targetId) return parent
    if (node.children) {
      const found = findParentOfLogicNode(node.children, targetId, node)
      if (found) return found
    }
  }
  return null
}

/**
 * Finds and removes a node from the logic tree by ID
 * @param {Array} nodes - Array of logic tree nodes
 * @param {string} targetId - The ID of the node to remove
 * @returns {boolean} True if node was found and removed
 */
export function findAndRemoveFromLogicTree(nodes, targetId) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) {
      nodes.splice(i, 1)
      return true
    }
    if (nodes[i].children && findAndRemoveFromLogicTree(nodes[i].children, targetId)) {
      return true
    }
  }
  return false
}
