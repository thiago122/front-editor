import { parse, generate } from 'css-tree'
import { CssLoader } from './CssLoader.js'
import { CssInjector } from './CssInjector.js'
import { CssAstBuilder } from './CssAstBuilder.js'

/**
 * CssAstService
 * 
 * Manages the Master AST layer (css-tree level).
 * Responsible for:
 *  - Loading and parsing CSS from a document
 *  - Creating individual AST nodes from CSS strings
 *  - Generating CSS strings from AST nodes
 * 
 * This is the LOW-LEVEL layer. It knows nothing about the Logic Tree.
 */
export class CssAstService {

  /**
   * Full pipeline: Load CSS → Inject → Parse → Return Master AST
   * @param {Document} doc - Target document
   * @param {string[]} locations - Locations to load ('internal', 'external')
   * @returns {Promise<Object>} Master AST (css-tree StyleSheet node)
   */
  static async buildMasterAst(doc, locations = ['internal', 'external']) {
    // 1. Load CSS files
    const loader = new CssLoader(doc)
    const cssContentMap = await loader.loadCssFiles(locations)

    // 2. Inject CSS files as <style> tags (replaces <link>)
    
    const injector = new CssInjector(doc, cssContentMap)
    await injector.inject(['internal'])
    injector.processOnPageStyles()

    // 3. Build Master AST from all stylesheets
    // // TODO: acho que não precisamos do cssContentMap
    const builder = new CssAstBuilder(doc, cssContentMap)
    return builder.build()
  }

  /**
   * Parse a CSS string into an AST node
   * @param {string} css - CSS string to parse
   * @param {string} context - Parse context ('Rule', 'Declaration', 'SelectorList', etc.)
   * @returns {Object|null} AST node or null if parsing fails
   */
  static createNode(css, context) {
    try {
      const normalizedContext = context.toLowerCase()
      return parse(css, { context: normalizedContext })
    } catch (e) {
      console.error('[CssAstService] Failed to create node from CSS:', css, 'context:', context, e)
      return null
    }
  }

  /**
   * Generate a CSS string from an AST node
   * @param {Object} astNode - css-tree AST node
   * @returns {string} CSS string
   */
  static generateCss(astNode) {
    try {
      return generate(astNode)
    } catch (e) {
      console.error('[CssAstService] Failed to generate CSS from AST node:', e)
      return ''
    }
  }
}
