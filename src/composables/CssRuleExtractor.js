import { RuleMatcher } from './RuleMatcher.js'
import { InlineStyleParser } from './InlineStyleParser.js'

/**
 * CssRuleExtractor Class
 * Orchestrates the process of finding matched CSS rules for an element and its ancestors.
 */
export class CssRuleExtractor {

  /**
   * Get all matched CSS rules for an element and its ancestors
   * @param {Element} targetEl - The element to inspect
   * @param {Array} ast - The CSS logic tree
   * @param {Object} viewport - Viewport dimensions
   * @param {Object} forceStatus - Forced pseudo-states
   * @returns {Array} List of grouped rules
   */
  getMatchedRules(targetEl, ast, viewport, forceStatus = {}) {
    if (!targetEl || !ast) return []
    
    const groups = []
    let currentEl = targetEl

    // Walk up the DOM tree
    while (currentEl?.nodeType === 1) {
      const group = this.processElement(currentEl, targetEl, ast, viewport, forceStatus)
      if (group) groups.push(group)

      if (this.shouldStopTraversal(currentEl)) break
      currentEl = currentEl.parentElement
    }

    return groups
  }

  /**
   * Process a single element to find matched rules (Inline + Stylesheet)
   * @private
   */
  processElement(currentEl, targetEl, ast, viewport, forceStatus) {
    const isTarget = currentEl === targetEl
    const matched = []

    // 1. Process inline styles
    const inlineParser = new InlineStyleParser()
    const inlineRule = inlineParser.parse(currentEl, isTarget)
    if (inlineRule) matched.push(inlineRule)

    // 2. Process stylesheet rules
    const styleRules = this.findMatchingRulesForElement(currentEl, targetEl, ast, viewport, forceStatus)
    matched.push(...styleRules)

    if (matched.length === 0) return null

    return this.createElementGroup(currentEl, isTarget, matched)
  }

  /**
   * Find CSS rules from stylesheets that match an element
   * @private
   */
  findMatchingRulesForElement(currentEl, targetEl, ast, viewport, forceStatus) {
    const matcher = new RuleMatcher(currentEl, targetEl, ast, viewport, forceStatus)
    return matcher.find()
  }

  /**
   * Create element group object
   * @private
   */
  createElementGroup(element, isTarget, rules) {
    return {
      isTarget,
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      rules: this.sortRulesBySpecificity(rules)
    }
  }

  /**
   * Sort rules by specificity (descending)
   * @private
   */
  sortRulesBySpecificity(rules) {
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
   * @private
   */
  shouldStopTraversal(element) {
    return element.tagName === 'BODY' || element.tagName === 'HTML'
  }
}
