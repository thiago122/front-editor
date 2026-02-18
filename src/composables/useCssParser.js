import { generateId } from '../utils/ids.js'
import { CssAstBuilder } from './CssAstBuilder.js'
import { CssInjector } from './CssInjector.js'
import { CssLoader } from './CssLoader.js'
import { CssExplorerTreeBuilder } from './CssExplorerTreeBuilder.js'
import { CssRuleExtractor } from './CssRuleExtractor.js'
import { CssTreeSynchronizer } from './CssTreeSynchronizer.js'
import { 
  getSpecificity,
} from './cssUtils.js'


// ============================================================================
// MAIN COMPOSABLE
// ============================================================================

export function useCssParser() {


  // ==========================================================================
  // AST EXTRACTION & TRANSFORMATION
  // ==========================================================================

  /**
   * Extract CSS AST from the target document
   * Handles complete CSS loading, injection, and AST building process
   * @param {Document} targetDoc - The document to extract CSS from
   * @param {string[]} locations - Array of locations to load (e.g., ['internal', 'external'])
   * @returns {Promise<Array>} Logic tree structure
   */
  async function extractCssAst(targetDoc = document, locations = ['internal', 'external']) {
    // 1. Load CSS files
    const loader = new CssLoader(targetDoc)
    const cssContentMap = await loader.loadCssFiles(locations)

    // 2. Inject internal CSS files
    const injector = new CssInjector(targetDoc, cssContentMap)
    await injector.inject(['internal'])
    injector.processOnPageStyles()

    // 3. Build AST from all stylesheets
    const builder = new CssAstBuilder(targetDoc, cssContentMap)
    const masterAst = builder.build()
    
    // 4. Build CSS Explorer tree
    const treeBuilder = new CssExplorerTreeBuilder(masterAst)
    return treeBuilder.build()
  }


  // ==========================================================================
  // RULE MATCHING
  // ==========================================================================

  /**
   * Get all matched CSS rules for an element and its ancestors
   */
  function getMatchedRules(targetEl, ast, viewport, forceStatus = {}) {
    const extractor = new CssRuleExtractor()
    return extractor.getMatchedRules(targetEl, ast, viewport, forceStatus)
  }


  // ==========================================================================
  // AST SYNCHRONIZATION
  // ==========================================================================

  /**
   * Sync logic tree changes back to DOM styles
   */
  function syncAstToStyles(logicTree, targetDoc = document) {
    const synchronizer = new CssTreeSynchronizer(logicTree)
    synchronizer.syncToDom(targetDoc)
  }

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  return {
    extractCssAst,
    getMatchedRules: (el, ast, vp, fs) => new CssRuleExtractor().getMatchedRules(el, ast, vp, fs),
    setSheetsDisabled: (doc, val) => new StyleSheetManager(doc).disableCapturedSheets(val),
    
    // Helpers refactored to cssUtils (forwarded for convenience if needed, or removed)
    syncAstToStyles,
    generateId,
    getSpecificity, 
    // createNode removed in favor of direct createAstNode usage from cssUtils
  }
}
