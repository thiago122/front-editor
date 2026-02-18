import { toRaw } from 'vue'
import { generate } from 'css-tree'

/**
 * CssTreeSynchronizer
 * Synchronizes Logic Tree changes back to the original AST and the DOM
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
   * Sync logic tree changes back to DOM styles
   * @param {Document} targetDoc - The document to update
   */
  syncToDom(targetDoc = document) {
    if (!this.logicTree) return
    
    console.time('syncAstToStyles')
    
    try {
      this.collectRulesByFile()
      this.updateStyleElements(targetDoc)
    } catch (e) {
      console.error('Failed to sync AST to styles:', e)
    }
    
    console.timeEnd('syncAstToStyles')
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
   * Header method to update style elements in DOM based on file groups
   * @param {Document} targetDoc
   */
  updateStyleElements(targetDoc) {
    let totalRules = 0

    this.fileGroups.forEach(({ origin, sourceName, rules }) => {
      const fileAst = {
        type: 'StyleSheet',
        children: rules
      }

      const css = generate(fileAst)
      totalRules += rules.length

      const styleEl = this.findOrCreateStyleElement(targetDoc, origin, sourceName)
      styleEl.textContent = css

      console.log(`Updated ${origin}/${sourceName}: ${rules.length} rules, ${css.length} bytes`)
    })

    console.log(`--- syncAstToStyles --- | ${this.fileGroups.size} files, ${totalRules} total rules`)
  }

  /**
   * Find existing style element or create new one
   * @param {Document} targetDoc
   * @param {string} origin
   * @param {string} sourceName
   */
  findOrCreateStyleElement(targetDoc, origin, sourceName) {
    // Try to find by ID (all styles now have unique IDs)
    let styleEl = targetDoc.getElementById(sourceName)
    
    // Create if not found
    if (!styleEl) {
      styleEl = targetDoc.createElement('style')
      styleEl.id = sourceName
      styleEl.setAttribute('data-location', origin)
      styleEl.setAttribute('data-captured', 'true')
      targetDoc.head.appendChild(styleEl)
      console.log(`Created new <style> for ${origin}/${sourceName}`)
    }
    
    return styleEl
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
