import { generateId } from '../utils/ids.js'
import { getSpecificity } from './cssUtils.js'
import { CssExplorerTreeBuilder } from './CssExplorerTreeBuilder.js'
import { CssTreeSynchronizer } from './CssTreeSynchronizer.js'
import { CssRuleExtractor } from './CssRuleExtractor.js'
import { CssAstService } from './CssAstService.js'

/**
 * CssLogicTreeService
 * 
 * Manages the Logic Tree layer (our high-level structure).
 * Responsible for:
 *  - Transforming Master AST → Logic Tree
 *  - Synchronizing Logic Tree changes back to the DOM
 *  - Finding CSS rules that match a DOM element
 *  - Adding/removing nodes in the Logic Tree
 * 
 * This is the HIGH-LEVEL layer. It works with our Logic Tree structure.
 * Each Logic Node holds a reference to its corresponding Master AST node
 * via `metadata.astNode`.
 */
export class CssLogicTreeService {

  /**
   * Transform a Master AST into a Logic Tree
   * @param {Object} masterAst - Master AST (css-tree StyleSheet node)
   * @returns {Array} Logic Tree (array of root nodes)
   */
  static buildLogicTree(masterAst) {
    const builder = new CssExplorerTreeBuilder(masterAst)
    return builder.build()
  }

  /**
   * Sync Logic Tree changes back to DOM <style> elements
   * @param {Array} logicTree - The Logic Tree
   * @param {Document} doc - Target document
   */
  static syncToDOM(logicTree, doc = document) {
    const synchronizer = new CssTreeSynchronizer(logicTree)
    synchronizer.syncToDom(doc)
  }

  /**
   * Find all CSS rules that match a DOM element and its ancestors
   * @param {Element} el - Target DOM element
   * @param {Array} logicTree - The Logic Tree
   * @param {Object} viewport - Viewport dimensions
   * @param {Object} forceStatus - Forced pseudo-states
   * @returns {Array} List of rule groups
   */
  static getMatchedRules(el, logicTree, viewport, forceStatus = {}) {
    const extractor = new CssRuleExtractor()
    return extractor.getMatchedRules(el, logicTree, viewport, forceStatus)
  }

  /**
   * Add a new rule to the Logic Tree
   * @param {Array} logicTree - The Logic Tree (mutated in place)
   * @param {string} selector - CSS selector
   * @param {string} origin - Origin ('on_page', 'internal', 'external')
   * @param {string} sourceName - Source file name (e.g., 'style', 'styles.css')
   * @returns {Object|null} The created Logic Node or null if failed
   */
  static addRule(logicTree, selector, origin = 'on_page', sourceName = 'style') {
    // 1. Create the AST node for the rule
    const astNode = CssAstService.createNode(`${selector} {}`, 'Rule')
    if (!astNode) {
      console.error(`[CssLogicTreeService] Failed to create AST node for selector: "${selector}"`)
      return null
    }

    // 2. Find or create Root node
    const root = this._findOrCreateRoot(logicTree, origin)

    // 3. Find or create File node
    const fileNode = this._findOrCreateFile(root, sourceName, origin)

    // 4. Create the Logic Node
    const newLogicNode = {
      id: generateId(),
      type: 'selector',
      label: selector,
      metadata: {
        origin,
        sourceName,
        astNode,
        specificity: getSpecificity(selector)
      },
      children: []
    }

    // 5. Append to file
    fileNode.children.push(newLogicNode)

    return newLogicNode
  }

  /**
   * Find or create a Root node for a given origin
   * @private
   */
  static _findOrCreateRoot(logicTree, origin) {
    let root = logicTree.find(n => n.metadata?.origin === origin)
    if (!root) {
      root = {
        id: generateId(),
        type: 'root',
        label: origin.toUpperCase().replace('_', ' '),
        metadata: { origin },
        children: []
      }
      logicTree.push(root)
    }
    return root
  }

  /**
   * Find or create a File node inside a Root
   * @private
   */
  static _findOrCreateFile(root, sourceName, origin) {
    let fileNode = root.children.find(n => n.label === sourceName)
    if (!fileNode) {
      fileNode = {
        id: generateId(),
        type: 'file',
        label: sourceName,
        metadata: { origin, sourceName },
        children: []
      }
      root.children.push(fileNode)
    }
    return fileNode
  }

  /**
   * Find the direct parent of a node with the given id in the Logic Tree.
   * Returns the parent node, or null if the node is at the root level or not found.
   * @param {Array} logicTree - The Logic Tree
   * @param {string} targetId - The id of the node to find the parent of
   * @returns {Object|null}
   */
  static findParent(logicTree, targetId) {
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
   * Find all ancestors of a node with the given id, from outermost to innermost.
   * For example, for "root > file > @media > selector", returns [root, file, @media].
   * Returns an empty array if the node is not found or has no ancestors.
   * @param {Array} logicTree - The Logic Tree
   * @param {string} targetId - The id of the node to find ancestors for
   * @returns {Object[]} Array of ancestor nodes (outermost first)
   */
  static findAncestors(logicTree, targetId) {
    const search = (nodes, path) => {
      for (const node of nodes) {
        if (node.id === targetId) return path
        if (node.children) {
          const found = search(node.children, [...path, node])
          if (found) return found
        }
      }
      return null
    }
    return search(logicTree, []) ?? []
  }
}
