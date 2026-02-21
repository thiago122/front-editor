import { 
  PSEUDO_STATES,
  STATE_REGEXES
} from './cssConstants.js'
import {
  cleanSelectorForMatching,
  isInheritedProperty,
  normalizePropertyName
} from './cssUtils.js'

/**
 * RuleMatcher Class
 * Finds CSS rules from stylesheets that match a specific element
 */
export class RuleMatcher {
  constructor(currentEl, targetEl, ast, viewport, forceStatus) {
    this.currentEl = currentEl
    this.targetEl = targetEl
    this.ast = ast
    this.viewport = viewport
    this.forceStatus = forceStatus
    
    this.isTarget = currentEl === targetEl
    this.targetWin = currentEl.ownerDocument?.defaultView || window
    this.matched = []
    this.stack = []
  }

  /**
   * Find all matching rules
   * @returns {Array} Matched CSS rules
   */
  find() {
    this.traverseLogicNodes(this.ast)
    return this.matched
  }

  /**
   * Recursively traverse CSS logic tree nodes
   * @private
   */
  traverseLogicNodes(nodes) {
    nodes.forEach(logicNode => {
      if (logicNode.type === 'at-rule') {
        this.processAtRule(logicNode)
      } else if (logicNode.type === 'selector') {
        this.processSelectorRule(logicNode)
      } else if (logicNode.children) {
        this.traverseLogicNodes(logicNode.children)
      }
    })
  }

  /**
   * Process at-rule node (@media, @container, @supports, etc.)
   * @private
   */
  processAtRule(logicNode) {
    const name = logicNode.label.split(' ')[0].replace('@', '').toLowerCase()
    const cond = logicNode.label.substring(logicNode.label.indexOf(' ') + 1)

    const contextItem = {
      type: 'Atrule',
      name,
      prelude: cond,
      wrapper: logicNode.label,
      astNode: logicNode.metadata?.astNode,
      logicNodeId: logicNode.id
    }

    this.stack.push(contextItem)
    if (logicNode.children) this.traverseLogicNodes(logicNode.children)
    this.stack.pop()
  }

  /**
   * Process selector rule node
   * @private
   */
  processSelectorRule(logicNode) {
    const selector = logicNode.label
    if (!selector) return

    // Check if selector matches element
    if (!this.matchesSelector(selector)) return

    // Extract declarations
    const declarations = this.extractDeclarations(logicNode)
    if (declarations.length === 0) return

    // Determine if rule is active
    const active = this.isRuleActive()

    this.matched.push({
      uid: logicNode.id,
      selector,
      declarations,
      specificity: logicNode.metadata?.specificity || [0, 0, 0, 0],
      context: [...this.stack],
      active,
      origin: logicNode.metadata?.origin,
      sourceName: logicNode.metadata?.sourceName,
      loc: logicNode.metadata?.line || '?',
      astNode: logicNode.metadata?.astNode
    })
  }

  /**
   * Check if selector matches the current element
   * @private
   */
  matchesSelector(selector) {
    // Check dynamic pseudo-states
    if (!this.shouldMatchDynamicPseudo(selector)) {
      return false
    }

    // Clean and test selector
    const cleanedSelector = this.cleanSelectorForMatching(selector)

    try {
      return this.currentEl.matches(cleanedSelector)
    } catch (e) {
      return false
    }
  }

  /**
   * Check if selector with dynamic pseudo-states should match
   * @private
   */
  shouldMatchDynamicPseudo(selector) {
    let hasDynamicPseudo = false
    let anyStateSelected = false

    for (const state of PSEUDO_STATES) {
      if (STATE_REGEXES[state].test(selector)) {
        hasDynamicPseudo = true
        if (this.isTarget && this.forceStatus[state]) {
          anyStateSelected = true
          break
        }
      }
    }

    return !hasDynamicPseudo || anyStateSelected
  }

  /**
   * Clean selector by removing pseudo-states and pseudo-elements
   * @private
   */
  cleanSelectorForMatching(selector) {
    return cleanSelectorForMatching(selector)
  }

  /**
   * Extract declarations from selector rule
   * @private
   */
  extractDeclarations(logicNode) {
    const declarations = []

    if (!logicNode.children) return declarations

    logicNode.children.forEach(d => {
      if (d.type === 'declaration') {
        const propName = d.label.toLowerCase()
        const { prop, disabled } = normalizePropertyName(propName)

        // Skip non-inherited properties for non-target elements
        if (!this.isTarget && !isInheritedProperty(prop)) return

        declarations.push({
          id: d.id,
          prop,
          value: d.value,
          important: d.metadata?.astNode?.important || false,
          loc: logicNode.metadata?.line || '?',
          astNode: d.metadata?.astNode,
          disabled
        })
      }
    })

    return declarations
  }

  /**
   * Check if rule is active based on context (media queries, container queries)
   * @private
   */
  isRuleActive() {
    let active = true

    this.stack.forEach(contextItem => {
      if (contextItem.name === 'media') {
        active = active && this.targetWin.matchMedia(contextItem.prelude).matches
      }
      if (contextItem.name === 'supports') {
        active = active && this.isSupportsActive(contextItem.prelude)
      }
      if (contextItem.name === 'container') {
        active = active && this.isContainerActive(contextItem.prelude)
      }
    })

    return active
  }

  /**
   * Check if container query is active
   * @private
   */
  isContainerActive(condition) {
    if (!condition) return true
    if (condition.includes('min-width')) {
      const match = condition.match(/min-width:\s*(\d+)/)
      return match ? this.viewport.width >= Number(match[1]) : true
    }
    return true
  }

  /**
   * Evaluate a @supports condition using CSS.supports()
   * @param {string} condition - The @supports condition string
   * @returns {boolean}
   * @private
   */
  isSupportsActive(condition) {
    if (!condition) return true
    try {
      return CSS.supports(condition)
    } catch (e) {
      // Unknown or complex condition — treat as active to avoid hiding rules
      return true
    }
  }
}
