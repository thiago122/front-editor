import { parse, walk, generate } from 'css-tree'
import { generateId } from '../utils/ids.js'
import { CssAstBuilder } from './CssAstBuilder.js'
import { CssInjector } from './CssInjector.js'
import { CssLoader } from './CssLoader.js'
import { CssExplorerTreeBuilder } from './CssExplorerTreeBuilder.js'
import { RuleMatcher } from './RuleMatcher.js'
import { CssTreeSynchronizer } from './CssTreeSynchronizer.js'
import { 
  cleanSelectorForMatching,
  isInheritedProperty,
  normalizePropertyName,
  isColorValue,
  getSpecificity
} from './cssUtils.js'
import { 
  SPECIFICITY_INLINE,
  SPECIFICITY_DEFAULT
} from './cssConstants.js'


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
    if (!targetEl || !ast) return []
    
    const groups = []
    let currentEl = targetEl

    // Walk up the DOM tree
    while (currentEl?.nodeType === 1) {
      const group = processElement(currentEl, targetEl, ast, viewport, forceStatus)
      if (group) groups.push(group)

      if (shouldStopTraversal(currentEl)) break
      currentEl = currentEl.parentElement
    }

    return groups
  }

  /**
   * Process a single element to find matched rules
   */
  function processElement(currentEl, targetEl, ast, viewport, forceStatus) {
    const isTarget = currentEl === targetEl
    const matched = []

    // 1. Process inline styles
    const inlineRule = processInlineStyles(currentEl, isTarget)
    if (inlineRule) matched.push(inlineRule)

    // 2. Process stylesheet rules
    const styleRules = findMatchingRulesForElement(currentEl, targetEl, ast, viewport, forceStatus)
    matched.push(...styleRules)

    if (matched.length === 0) return null

    return createElementGroup(currentEl, isTarget, matched)
  }

  /**
   * Process inline styles for an element
   */
  function processInlineStyles(element, isTarget) {
    const styleAttr = element.getAttribute('style')?.trim()
    if (!styleAttr) return null

    const declarations = parseInlineDeclarations(styleAttr, element)
    
    if (!isTarget && declarations.length === 0) return null

    return {
      uid: isTarget ? 'inline-target' : `inline-parent-${generateId()}`,
      selector: 'element.style',
      declarations,
      specificity: SPECIFICITY_INLINE,
      context: [],
      active: true,
      loc: 'inline'
    }
  }

  /**
   * Parse inline style declarations
   */
  function parseInlineDeclarations(styleAttr, element) {
    try {
      return parseInlineStyleAst(styleAttr)
    } catch (e) {
      console.warn('Failed to parse inline style attribute, using fallback', e)
      return parseInlineStyleFallback(element)
    }
  }

  /**
   * Parse inline styles using AST
   */
  function parseInlineStyleAst(styleAttr) {
    const inlineAst = parse(styleAttr, { context: 'declarationList' })
    const declarations = []
    let declIndex = 0

    walk(inlineAst, {
      visit: 'Declaration',
      enter(node) {
        const propName = node.property.toLowerCase()
        const { prop, disabled } = normalizePropertyName(propName)
        const rawValue = generate(node.value)

        declarations.push({
          id: `inline-decl-${declIndex++}`,
          prop,
          value: rawValue,
          important: !!node.important,
          disabled
        })
      }
    })

    return declarations
  }

  /**
   * Parse inline styles using fallback method
   */
  function parseInlineStyleFallback(element) {
    const declarations = []
    const styleNames = Array.from(element.style)

    styleNames.forEach((propName, i) => {
      const { prop, disabled } = normalizePropertyName(propName)
      const value = element.style.getPropertyValue(propName)

      declarations.push({
        id: `inline-decl-${i}`,
        prop,
        value: value,
        important: element.style.getPropertyPriority(propName) === 'important',
        disabled
      })
    })

    return declarations
  }

  /**
   * Find CSS rules from stylesheets that match an element
   * @param {Element} currentEl - Element to find rules for
   * @param {Element} targetEl - Original target element
   * @param {Array} ast - CSS logic tree
   * @param {Object} viewport - Viewport dimensions
   * @param {Object} forceStatus - Forced pseudo-states (:hover, :focus, etc.)
   * @returns {Array} Matched CSS rules
   */
  function findMatchingRulesForElement(currentEl, targetEl, ast, viewport, forceStatus) {
    const matcher = new RuleMatcher(currentEl, targetEl, ast, viewport, forceStatus)
    return matcher.find()
  }


  /**
   * Create element group object
   */
  function createElementGroup(element, isTarget, rules) {
    return {
      isTarget,
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      rules: sortRulesBySpecificity(rules)
    }
  }

  /**
   * Sort rules by specificity (descending)
   */
  function sortRulesBySpecificity(rules) {
    return rules.sort((a, b) => {
      for (let i = 0; i < 4; i++) {
        if (a.specificity[i] !== b.specificity[i]) {
          return b.specificity[i] - a.specificity[i]
        }
      }
      return 0
    })
  }

  /**
   * Check if DOM traversal should stop
   */
  function shouldStopTraversal(element) {
    return element.tagName === 'BODY' || element.tagName === 'HTML'
  }


  // ==========================================================================
  // AST SYNCHRONIZATION
  // ==========================================================================

  /**
   * Sync logic tree changes back to DOM styles
   */
  function syncAstToStyles(logicTree, targetDoc = document) {
    if (!logicTree) return
    
    console.time('syncAstToStyles')
    
    try {
      const fileGroups = collectRulesByFile(logicTree)
      updateStyleElements(fileGroups, targetDoc)
    } catch (e) {
      console.error('Failed to sync AST to styles:', e)
    }
    
    console.timeEnd('syncAstToStyles')
  }

  /**
   * Collect rules grouped by source file
   */
  function collectRulesByFile(logicTree) {
    const synchronizer = new CssTreeSynchronizer(logicTree)
    return synchronizer.collectRulesByFile()
  }


  /**
   * Update style elements in DOM
   */
  function updateStyleElements(fileGroups, targetDoc) {
    let totalRules = 0

    fileGroups.forEach(({ origin, sourceName, rules }) => {
      const fileAst = {
        type: 'StyleSheet',
        children: rules
      }

      const css = generate(fileAst)
      totalRules += rules.length

      const styleEl = findOrCreateStyleElement(targetDoc, origin, sourceName)
      styleEl.textContent = css

      console.log(`Updated ${origin}/${sourceName}: ${rules.length} rules, ${css.length} bytes`)
    })

    console.log(`--- syncAstToStyles --- | ${fileGroups.size} files, ${totalRules} total rules`)
  }

  /**
   * Find existing style element or create new one
   */
  function findOrCreateStyleElement(targetDoc, origin, sourceName) {
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

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  /**
   * Enable/disable captured stylesheets
   */
  function setSheetsDisabled(disabled, targetDoc = document) {
    Array.from(targetDoc.styleSheets).forEach(sheet => {
      try {
        const owner = sheet.ownerNode
        if (
          owner &&
          (owner.id === 'vite-plugin-vue-devtools' ||
            owner.dataset.captured !== 'true')
        )
          return

        sheet.disabled = disabled
      } catch (e) {
        // Safe skip
      }
    })
  }

  /**
   * Create AST node from CSS string
   */
  function createNode(css, context) {
    try {
      const normalizedContext = context.toLowerCase()
      const ast = parse(css, { context: normalizedContext })
      return ast
    } catch (e) {
      console.error('Failed to create node from CSS:', css, 'context:', context, e)
      return null
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  return {
    extractCssAst,
    getMatchedRules,
    getSpecificity,
    generateId,
    syncAstToStyles,
    isColor: isColorValue,
    setSheetsDisabled,
    parse,
    walk,
    generate,
    createNode
  }
}
