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
 * Safely removes a node from a css-tree list or plain array.
 * Handles both the css-tree List (linked-list with .head/.next) and Array types.
 * Use this whenever you need to remove a declaration / rule from an AST block.
 * @param {Object|Array} list - The list to remove from
 * @param {Object} node - The exact AST node object to remove
 * @returns {boolean} True if the node was found and removed
 */
export function safeRemove(list, node) {
  if (!list || !node) return false
  try {
    if (list.head !== undefined) {
      // css-tree List (linked-list)
      let item = list.head
      while (item) {
        if (item.data === node) {
          list.remove(item)
          return true
        }
        item = item.next
      }
    } else if (Array.isArray(list)) {
      const idx = list.indexOf(node)
      if (idx !== -1) {
        list.splice(idx, 1)
        return true
      }
    } else {
      console.warn('Unknown list type in safeRemove:', list)
    }
  } catch (e) {
    console.error('Error in safeRemove:', e)
  }
  return false
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

/**
 * Marks declarations as `overridden` based on CSS specificity and !important.
 * Rules:
 *   1. An !important declaration beats any non-important one for the same property.
 *   2. Between two !important declarations, the one that appears first (highest
 *      specificity, as guaranteed by sortRulesBySpecificity) wins.
 *   3. Among non-important declarations, the first encountered wins.
 *   4. Disabled declarations never win and are never marked as winners.
 *
 * Mutates groups in place.
 * @param {Array} groups - Ordered array of rule groups (target first, then inherited)
 */
export function calculateOverrides(groups) {
  // Map<prop, { ruleUid, important }>
  const winners = new Map()
  const flatRules = groups.flatMap(g => g.rules)

  flatRules.forEach(rule => {
    if (!rule.active) return
    rule.declarations.forEach(decl => {
      if (decl.disabled) return
      const curr = winners.get(decl.prop)
      if (!curr) {
        // First occurrence always wins initially
        winners.set(decl.prop, { ruleUid: rule.uid, important: decl.important })
      } else if (decl.important && !curr.important) {
        // !important beats non-important regardless of specificity
        winners.set(decl.prop, { ruleUid: rule.uid, important: true })
      }
      // Two !important: first one (higher specificity) already won — do nothing.
      // Non-important vs non-important: first one already won — do nothing.
    })
  })

  groups.forEach(group => {
    group.rules.forEach(rule => {
      rule.declarations.forEach(decl => {
        const winner = winners.get(decl.prop)
        decl.overridden = !!winner && winner.ruleUid !== rule.uid
      })
    })
  })
}
