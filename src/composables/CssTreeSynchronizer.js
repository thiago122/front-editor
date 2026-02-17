import { toRaw } from 'vue'

/**
 * CssTreeSynchronizer
 * Synchronizes Logic Tree changes back to the original AST and groups rules by file
 */
export class CssTreeSynchronizer {
  /**
   * @param {Array} logicTree - The Logic Tree structure
   */
  constructor(logicTree) {
    this.logicTree = logicTree
    this.fileGroups = new Map()
  }

  /**
   * Collect and synchronize rules grouped by source file
   * @returns {Map} Map of file groups with synchronized AST nodes
   */
  collectRulesByFile() {
    this.collectNodesByFile(toRaw(this.logicTree))
    return this.fileGroups
  }

  /**
   * Synchronize a Logic Tree node back to its corresponding AST node
   * @param {Object} logicNode - Logic Tree node
   * @returns {Object|null} Synchronized AST node
   * @private
   */
  syncLogicNodeToAst(logicNode) {
    const astNode = logicNode.metadata?.astNode
    if (!astNode) return null

    // For containers (at-rules, selectors), sync children back to AST block
    if ((logicNode.type === 'at-rule' || logicNode.type === 'selector') && logicNode.children) {
      const block = astNode.block
      if (block?.children) {
        const childAstNodes = logicNode.children
          .map(child => this.syncLogicNodeToAst(child))
          .filter(Boolean)

        if (block.children.fromArray) {
          block.children.fromArray(childAstNodes)
        } else {
          block.children = childAstNodes
        }
      }
    }
    
    return astNode
  }

  /**
   * Recursively collect nodes and group by file
   * @param {Array} nodes - Array of Logic Tree nodes
   * @private
   */
  collectNodesByFile(nodes) {
    nodes.forEach(n => {
      if (n.type === 'file') {
        const origin = n.metadata.origin
        const sourceName = n.label
        const key = `${origin}::${sourceName}`

        // Create group if it doesn't exist
        if (!this.fileGroups.has(key)) {
          this.fileGroups.set(key, {
            origin,
            sourceName,
            rules: []
          })
        }

        // Synchronize each child and add to group
        const group = this.fileGroups.get(key)
        n.children.forEach(logicChild => {
          const synced = this.syncLogicNodeToAst(logicChild)
          if (synced) group.rules.push(synced)
        })
      } else if (n.children) {
        // Recurse for non-file nodes
        this.collectNodesByFile(n.children)
      }
    })
  }
}
