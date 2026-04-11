import { toRaw } from 'vue'
import { generate, List } from 'css-tree'

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
    try {
      this.collectRulesByFile()
      this.updateStyleElements(targetDoc)
    } catch (e) {
      console.error('Failed to sync AST to styles:', e)
    }
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
    if (this.fileGroups.size === 0) {
      console.warn('[CssTreeSynchronizer] No rules collected to sync.');
    }

    this.fileGroups.forEach(({ origin, sourceName, rules }) => {
      try {
        const fileAst = { 
          type: 'StyleSheet', 
          children: new List().fromArray(rules) 
        }
        const css = generate(fileAst, { pretty: true })
        const styleEl = this.findOrCreateStyleElement(targetDoc, origin, sourceName)
        
        if (styleEl.textContent !== css) {
          styleEl.textContent = css
          console.log(`[CssTreeSynchronizer] Updated DOM <style> for ${sourceName} (${css.length} chars)`);
        }
      } catch (e) {
        console.error(`[CssTreeSynchronizer] Failed to generate CSS for ${sourceName}:`, e);
      }
    })
  }

  /**
   * Find existing style element or create new one
   * @param {Document} targetDoc
   * @param {string} origin
   * @param {string} sourceName
   */
  findOrCreateStyleElement(targetDoc, origin, sourceName) {
    // 1. Busca pelo ID canônico
    let styleEl = targetDoc.getElementById(sourceName)

    // 2. Fallback: busca por data-manifest-path (evita duplicar elementos já capturados de <link>)
    //    Ex: <style id="assets_css__reset.css" data-manifest-path="css/reset.css"> deve ser
    //    reusado quando o manifest tenta criar um <style id="css/reset.css">
    if (!styleEl) {
      styleEl = targetDoc.querySelector(`style[data-manifest-path="${sourceName}"]`)
      if (styleEl) {
        // Normaliza o id para que buscas futuras pelo ID canônico funcionem
        styleEl.id = sourceName
      }
    }

    // 3. Cria se não encontrado
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
