import { InlineStyleParser } from './InlineStyleParser.js'
import { PSEUDO_STATES, STATE_REGEXES } from '../shared/cssConstants.js'
import { cleanSelectorForMatching, isInheritedProperty, normalizePropertyName } from '../shared/cssUtils.js'

// Tags where DOM upward traversal stops — elements above these are non-styleable context
const DOM_TRAVERSAL_STOP_TAGS = ['BODY', 'HTML']

/**
 * CssInspectorMatcher
 *
 * Given a target DOM element, finds every CSS rule that applies to it
 * (and to its ancestors, for inherited properties).
 *
 * HOW IT WORKS (high-level):
 *   1. Walk up the DOM: target → parent → grandparent → … → BODY
 *   2. For each element, collect:
 *        a. Inline styles  (style="…" attribute)
 *        b. Stylesheet rules that match the element (from the Logic Tree)
 *   3. Return one "group" per element: { isTarget, tagName, rules[] }
 *
 * Usage:
 *   const groups = new CssInspectorMatcher(el, logicTree, viewport, forceStatus).find()
 */
export class CssInspectorMatcher {

  /**
   * @param {Element} targetEl    - The element selected in the canvas
   * @param {Array}   logicTree   - The CSS Logic Tree (built by CssLogicTreeService)
   * @param {object}  viewport    - Current viewport dimensions { width, height }
   * @param {object}  forceStatus - Pseudo-states forced on (e.g. { hover: true })
   */
  constructor(targetEl, logicTree, viewport, forceStatus = {}) {
    this.targetEl    = targetEl
    this.logicTree   = logicTree
    this.viewport    = viewport
    this.forceStatus = forceStatus

    // The window of the document that contains the element (usually the iframe's window)
    this.targetWin = targetEl?.ownerDocument?.defaultView || window

    // Reused parser instance — avoids allocating one per element in find()
    this._inlineParser = new InlineStyleParser()
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Run the matching process and return all rule groups.
   * @returns {Array<{isTarget, tagName, id, className, rules[]}>}
   */
  find() {
    if (!this.targetEl || !this.logicTree) return []

    const groups = []
    let currentEl = this.targetEl

    // Walk up the DOM tree, collecting rules for each element
    while (currentEl?.nodeType === 1) {
      const group = this._processElement(currentEl)
      if (group) groups.push(group)

      // Stop at BODY / HTML — styles above those are not relevant
      if (DOM_TRAVERSAL_STOP_TAGS.includes(currentEl.tagName)) break
      currentEl = currentEl.parentElement
    }

    return groups
  }

  // ─── Step 1: Process one element ───────────────────────────────────────────

  /**
   * Collect all rules for a single element (inline + stylesheet).
   * Returns null if the element has no rules at all.
   * @private
   */
  _processElement(currentEl) {
    const isTarget = currentEl === this.targetEl
    const rules = []

    // a) Inline styles — highest specificity, always shown for the target
    const inlineRule = this._inlineParser.parse(currentEl, isTarget)
    if (inlineRule) rules.push(inlineRule)

    // b) Stylesheet rules that match this element
    const stylesheetRules = this._findMatchingRules(currentEl, isTarget)
    rules.push(...stylesheetRules)

    if (rules.length === 0) return null

    return {
      isTarget,
      tagName:   currentEl.tagName.toLowerCase(),
      id:        currentEl.id,
      className: currentEl.className,
      rules:     this._sortBySpecificity(rules),
    }
  }

  // ─── Step 2: Search the Logic Tree ─────────────────────────────────────────

  /**
   * Walk the Logic Tree and collect every selector rule that matches currentEl.
   *
   * Uses a local context object (ctx) passed through the traversal instead of
   * mutable instance properties — makes the traversal safe from re-entrant calls.
   * @private
   */
  _findMatchingRules(currentEl, isTarget) {
    const ctx = {
      currentEl,
      isTarget,
      matched:     [],
      atRuleStack: [],  // e.g. [{ name:'media', prelude:'(min-width:768px)', … }]
    }

    this._traverseLogicNodes(this.logicTree, ctx)
    return ctx.matched
  }

  /**
   * Recursively visit every node in the Logic Tree.
   *
   * The tree looks like:
   *   root (origin group)
   *     └─ file node (style.css)
   *          ├─ at-rule (@media …)
   *          │    └─ selector (.btn)
   *          └─ selector (h1)
   * @private
   */
  _traverseLogicNodes(nodes, ctx) {
    nodes.forEach(node => {
      if (node.type === 'at-rule') {
        // Push the at-rule context, recurse into children, then pop
        this._enterAtRule(node, ctx)

      } else if (node.type === 'selector') {
        // Try to match this rule against the current element
        this._tryMatchSelector(node, ctx)

      } else if (node.children) {
        // root / file nodes — just recurse into children
        this._traverseLogicNodes(node.children, ctx)
      }
    })
  }

  // ─── At-rule handling ──────────────────────────────────────────────────────

  /**
   * Push the at-rule onto the stack, process its children, then pop.
   * This way every selector inside knows which at-rules wrap it.
   * @private
   */
  _enterAtRule(node, ctx) {
    // node.label is e.g. "@media (min-width: 768px)"
    // We split into name ("media") and condition ("(min-width: 768px)")
    const name      = node.label.split(' ')[0].replace('@', '').toLowerCase()
    const condition = node.label.substring(node.label.indexOf(' ') + 1)

    const atRuleCtx = {
      type:        'Atrule',
      name,
      prelude:     condition,
      wrapper:     node.label,
      astNode:     node.metadata?.astNode,
      logicNodeId: node.id,
    }

    ctx.atRuleStack.push(atRuleCtx)
    if (node.children) this._traverseLogicNodes(node.children, ctx)
    ctx.atRuleStack.pop()
  }

  // ─── Selector matching ─────────────────────────────────────────────────────

  /**
   * Check if this selector matches the current element.
   * If yes, extract its declarations and push to ctx.matched.
   * @private
   */
  _tryMatchSelector(node, ctx) {
    const selector = node.label
    if (!selector) return

    // Does this selector actually match the element?
    if (!this._selectorMatchesElement(selector, ctx)) return

    // Extract declarations (skip non-inherited props for ancestor elements)
    const declarations = this._extractDeclarations(node, ctx)
    if (declarations.length === 0) return

    ctx.matched.push({
      uid:         node.id,
      selector,
      declarations,
      specificity: node.metadata?.specificity || [0, 0, 0, 0],
      context:     [...ctx.atRuleStack],          // snapshot of current at-rule stack
      active:      this._isAtRuleStackActive(ctx), // is every wrapping @media/@supports active?
      origin:      node.metadata?.origin,
      sourceName:  node.metadata?.sourceName,
      loc:         node.metadata?.line || '?',
      astNode:     node.metadata?.astNode,
    })
  }

  /**
   * Return true if the selector matches the current element in the DOM.
   *
   * Two-step check:
   *   1. If the selector has a dynamic pseudo (:hover, :focus, …), only match
   *      when that state is force-enabled in the Inspector.
   *   2. Use element.matches() with pseudo-states stripped out.
   * @private
   */
  _selectorMatchesElement(selector, ctx) {
    // Skip pseudo-state rules unless the state is forced on in the Inspector
    if (!this._pseudoStateAllowed(selector, ctx)) return false

    // Strip pseudo-states / pseudo-elements so element.matches() works correctly
    const cleanSelector = cleanSelectorForMatching(selector)

    try {
      return ctx.currentEl.matches(cleanSelector)
    } catch {
      // Invalid selector (e.g. custom pseudo-class) — safe to ignore
      return false
    }
  }

  /**
   * Return false if the selector contains a dynamic pseudo-class that is NOT
   * currently forced on in the Inspector (e.g. :hover without forcing hover).
   *
   * NOTE: Pseudo-states are only evaluated for the TARGET element. If an
   * ancestor has a :hover rule, it is always skipped, even when hover is forced.
   * This is intentional — the Inspector forces state on the selected element only.
   * @private
   */
  _pseudoStateAllowed(selector, ctx) {
    for (const state of PSEUDO_STATES) {
      if (STATE_REGEXES[state].test(selector)) {
        // Selector uses a dynamic pseudo — only allowed if forced on the TARGET element
        const forced = ctx.isTarget && this.forceStatus[state]
        if (!forced) return false
      }
    }
    return true
  }

  // ─── Declaration extraction ────────────────────────────────────────────────

  /**
   * Collect all enabled declarations from a selector node.
   *
   * For ANCESTOR elements (not the target), only inherited CSS properties
   * are included — e.g. color, font-size — because non-inherited ones
   * (margin, padding, etc.) don't affect child elements.
   * @private
   */
  _extractDeclarations(node, ctx) {
    if (!node.children) return []

    const declarations = []

    node.children.forEach(d => {
      if (d.type !== 'declaration') return

      const { prop, disabled } = normalizePropertyName(d.label.toLowerCase())

      // Ancestor filtering: skip non-inherited properties
      if (!ctx.isTarget && !isInheritedProperty(prop)) return

      declarations.push({
        id:        d.id,
        prop,
        value:     d.value,
        important: d.metadata?.astNode?.important || false,
        // Use the declaration's own line first, fall back to the rule's line
        loc:       d.metadata?.line ?? node.metadata?.line ?? '?',
        astNode:   d.metadata?.astNode,
        disabled,
      })
    })

    return declarations
  }

  // ─── At-rule activation checks ─────────────────────────────────────────────

  /**
   * Returns true if every at-rule currently on the stack is active.
   * A rule is inactive if, for example, its @media query doesn't match
   * the current viewport.
   * @private
   */
  _isAtRuleStackActive(ctx) {
    return ctx.atRuleStack.every(atRule => {
      if (atRule.name === 'media')     return this.targetWin.matchMedia(atRule.prelude).matches
      if (atRule.name === 'supports')  return this._isSupportsActive(atRule.prelude)
      if (atRule.name === 'container') return this._isContainerActive(atRule.prelude, ctx.currentEl)
      return true // unknown at-rules are treated as active
    })
  }

  /**
   * Evaluate a @supports condition.
   * Falls back to true for unknown/complex conditions so we never hide rules.
   * @private
   */
  _isSupportsActive(condition) {
    if (!condition) return true
    try {
      return CSS.supports(condition)
    } catch {
      return true
    }
  }

  /**
   * Evaluate a @container query against the nearest container ancestor.
   *
   * Container queries check the dimensions of the nearest ancestor with
   * `container-type` set, NOT the viewport. Falls back to viewport dimensions
   * when no container ancestor is found.
   *
   * Supports: min-width, max-width, min-height, max-height.
   * Named containers (e.g. "sidebar (min-width: 300px)") are accepted —
   * the name part is stripped and the nearest container is always used.
   * @private
   */
  _isContainerActive(condition, currentEl) {
    if (!condition) return true

    // Parse: optionally "name (prop: value unit)"
    const match = condition.match(
      /(?:[\w-]+\s+)?\(\s*([\w-]+)\s*:\s*([\d.]+)(px|em|rem)\s*\)/i
    )
    if (!match) return true

    const [, prop, rawValue, unit] = match
    const pxValue = this._toPx(parseFloat(rawValue), unit)

    // Measure the nearest container ancestor (or fall back to viewport)
    const container = this._findNearestContainer(currentEl)
    const rect = container
      ? container.getBoundingClientRect()
      : { width: this.viewport.width, height: this.viewport.height }

    switch (prop.toLowerCase()) {
      case 'min-width':  return rect.width  >= pxValue
      case 'max-width':  return rect.width  <= pxValue
      case 'min-height': return rect.height >= pxValue
      case 'max-height': return rect.height <= pxValue
      default:           return true
    }
  }

  /**
   * Walk up the DOM to find the nearest ancestor that establishes a CSS
   * container context (i.e. has `container-type` set to anything but "normal").
   * Returns null if none is found before BODY/HTML.
   * @private
   */
  _findNearestContainer(currentEl) {
    let el = currentEl?.parentElement
    while (el && !DOM_TRAVERSAL_STOP_TAGS.includes(el.tagName)) {
      const containerType = this.targetWin.getComputedStyle(el).getPropertyValue('container-type')
      if (containerType && containerType !== 'normal') return el
      el = el.parentElement
    }
    return null
  }

  /**
   * Convert a CSS length to pixels (approximate).
   * em/rem are approximated as 16 px — sufficient for container query evaluation.
   * @private
   */
  _toPx(value, unit) {
    if (unit === 'em' || unit === 'rem') return value * 16
    return value // px
  }

  // ─── Sorting ───────────────────────────────────────────────────────────────

  /**
   * Sort rules by specificity, highest first.
   * Specificity format: [inline, id, class, tag]
   * Returns a NEW array — does not mutate the original.
   * @private
   */
  _sortBySpecificity(rules) {
    return [...rules].sort((a, b) => {
      for (let i = 0; i < 4; i++) {
        if (a.specificity[i] !== b.specificity[i]) {
          return b.specificity[i] - a.specificity[i]
        }
      }
      return 0
    })
  }
}
