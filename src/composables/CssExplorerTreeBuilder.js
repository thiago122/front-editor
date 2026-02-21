import { generate } from 'css-tree'
import { generateId } from '../utils/ids.js'
import { CSS_LOCATIONS } from './cssConstants.js'
import { getSpecificity } from './cssUtils.js'

/**
 * CssExplorerTreeBuilder Class
 * Builds hierarchical tree structure for CSS Explorer from master AST
 */
export class CssExplorerTreeBuilder {
  constructor(masterAst) {
    this.masterAst = masterAst
  }

  /**
   * Build the CSS Explorer tree
   * @returns {Array} Hierarchical tree structure
   */
  build() {
    const rootNodes = []
    const locationMap = {}


   console.log('[locationMap]') 
   console.log(locationMap) 
    // 1. Create location root nodes
    this.createLocationNodes(locationMap, rootNodes)
 console.log(locationMap) 
    // 2. Process all CSS rules and organize by location/source
    this.processRules(locationMap)
 console.log(locationMap) 
    // 3. Filter out empty location roots
    return rootNodes.filter(rn => rn.children.length > 0)
  }

  /**
   * Create root nodes for each CSS location (external, on_page, inline)
   * @private
   */
  createLocationNodes(locationMap, rootNodes) {
    CSS_LOCATIONS.forEach(loc => {
      const node = {
        id: generateId(),
        type: 'root',
        label: loc.toUpperCase().replace('_', ' '),
        metadata: { origin: loc },
        children: []
      }
      locationMap[loc] = node
      rootNodes.push(node)
    })
  }

  /**
   * Process all CSS rules and organize them by location and source file
   * @private
   */
  processRules(locationMap) {
    this.masterAst.children.forEach(cssNode => {
      const origin = cssNode.origin || 'internal'
      const sourceName = cssNode.sourceName || (origin === 'on_page' ? 'on-page' : 'style')

      const locationNode = locationMap[origin]
      
      if (!locationNode) {
        console.warn(`[CssExplorerTreeBuilder] Unknown origin: ${origin}`)
        return
      }
      
      const fileNode = this._findOrCreateFileNode(locationNode, origin, sourceName)
      const logicNode = this.mapCssNodeToLogicNode(cssNode)
      if (logicNode) {
        fileNode.children.push(logicNode)
      }
    })
  }

  /**
   * Find an existing file node within a location node, or create and attach a new one.
   * @private
   */
  _findOrCreateFileNode(locationNode, origin, sourceName) {
    let fileNode = locationNode.children.find(c => c.type === 'file' && c.label === sourceName)
    if (!fileNode) {
      fileNode = {
        id: generateId(),
        type: 'file',
        label: sourceName,
        metadata: { origin, sourceName },
        children: []
      }
      locationNode.children.push(fileNode)
    }
    return fileNode
  }

  /**
   * Map CSS AST node to logic tree node
   * @private
   */
  mapCssNodeToLogicNode(node) {
    if (!node) return null

    const logicNode = {
      id: generateId(),
      type: '',
      label: '',
      value: '',
      metadata: {
        origin: node.origin,
        line: node.loc?.start?.line,
        astNode: node
      },
      children: []
    }

    if (node.type === 'Rule') {
      logicNode.type = 'selector'
      logicNode.label = generate(node.prelude)
      logicNode.metadata.specificity = getSpecificity(logicNode.label)

      // Add declarations and nested rules
      if (node.block?.children) {
        const children = this.getChildrenArray(node.block)
        children.forEach(child => {
          const childLogic = this.mapCssNodeToLogicNode(child)
          if (childLogic) logicNode.children.push(childLogic)
        })
      }
    } else if (node.type === 'Atrule') {
      logicNode.type = 'at-rule'
      const prelude = node.prelude ? generate(node.prelude) : ''
      logicNode.label = `@${node.name} ${prelude}`.trim()

      if (node.block?.children) {
        const children = this.getChildrenArray(node.block)
        children.forEach(child => {
          const childLogic = this.mapCssNodeToLogicNode(child)
          if (childLogic) logicNode.children.push(childLogic)
        })
      }
    } else if (node.type === 'Declaration') {
      logicNode.type = 'declaration'
      logicNode.label = node.property
      logicNode.value = generate(node.value)
    } else {
      return null // Ignore other types
    }

    return logicNode
  }

  /**
   * Get children array from a block node
   * @private
   */
  getChildrenArray(block) {
    if (!block || !block.children) return []
    return Array.isArray(block.children) ? block.children : Array.from(block.children)
  }


}
