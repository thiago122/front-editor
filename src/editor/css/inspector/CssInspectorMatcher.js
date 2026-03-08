import { InlineStyleParser } from './InlineStyleParser.js'
import { PSEUDO_STATES, STATE_REGEXES, PSEUDO_STATE_TABS } from '../shared/cssConstants.js'
import { cleanSelectorForMatching, isInheritedProperty, normalizePropertyName, getSpecificity } from '../shared/cssUtils.js'

// Tags where DOM upward traversal stops — elements above these are non-styleable context
const DOM_TRAVERSAL_STOP_TAGS = ['BODY', 'HTML']

// Pseudo-elements that have a dedicated tab in the Inspector.
// Others (::backdrop, ::selection, etc.) fall through to the Default tab as sub-sections.
const TAB_PSEUDO_ELEMENTS = new Set(['::before', '::after', '::placeholder'])

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
  constructor(targetEl, logicTree, viewport, forceStatus = {}, pseudoTab = null) {
    this.targetEl    = targetEl
    this.logicTree   = logicTree
    this.viewport    = viewport
    this.forceStatus = forceStatus
    this.pseudoTab   = pseudoTab ?? { id: 'default', state: null, pseudoEl: null }

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

    // a) Inline styles — only shown in Default tab (no state, no pseudo-element)
    const isDefaultContext = this.pseudoTab.state === null && this.pseudoTab.pseudoEl === null
    if (isDefaultContext) {
      const inlineRule = this._inlineParser.parse(currentEl, isTarget)
      if (inlineRule) rules.push(inlineRule)
    }

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
      matched:       [],
      atRuleStack:   [],
      activeState:   this.pseudoTab.state,
      activePseudoEl:this.pseudoTab.pseudoEl,
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

    // 1. Pseudo-state gate: block dynamic states unless forced on
    if (!this._pseudoStateAllowed(selector, ctx)) return

    // 2. Tab context gate: only include rules that belong to the active tab
    if (!this._selectorMatchesTabContext(selector, ctx)) return

    // 3. DOM match: does the selector actually match this element?
    if (!this._selectorMatchesElement(selector, ctx)) return

    // Extract declarations (skip non-inherited props for ancestor elements)
    const declarations = this._extractDeclarations(node, ctx)
    // Regras vazias são puladas para ancestors (herdar nada não faz sentido),
    // mas são MOSTRADAS para o elemento-alvo (ex: rule recém criada, ainda sem declarações).
    if (declarations.length === 0 && !ctx.isTarget) return

    // For comma-separated selector lists, use specificity of the matched part
    const specificity = selector.includes(',')
      ? this._getMatchedPartSpecificity(selector, ctx)
      : (node.metadata?.specificity || [0, 0, 0, 0])

    // Compute pseudoSubSection:
    // - State tabs (e.g. :hover): tag the pseudo-el part (e.g. :hover::before → sub-section)
    // - Default tab, pure pseudo-el (cleanSelector empty): tag it (e.g. ::backdrop {})
    // - Default tab, real element selector (cleanSelector not empty): no sub-section
    const cleanSel = cleanSelectorForMatching(selector)
    const pseudoSubSection = ctx.activeState !== null
      ? this._extractPseudoElement(selector)
      : !cleanSel ? this._extractPseudoElement(selector) : null

    ctx.matched.push({
      uid:            node.id,
      selector,
      declarations,
      specificity,
      pseudoSubSection,
      context:        [...ctx.atRuleStack],
      active:         this._isAtRuleStackActive(ctx),
      origin:         node.metadata?.origin,
      sourceName:     node.metadata?.sourceName,
      loc:            node.metadata?.line || '?',
      sourceOrder:    node.metadata?.sourceOrder ?? 0,
      astNode:        node.metadata?.astNode,
      logicNode:      node,
    })
  }

  /**
   * Gate 2: Does this selector belong to the currently active pseudo tab?
   *
   * Tab       | activeState | activePseudoEl | Allowed selectors
   * ----------|-------------|----------------|--------------------------------------------
   * Default   | null        | null           | no dynamic state, any pseudo-el (via *)
   * :hover    | 'hover'     | null           | must contain :hover (any pseudo-el → sub-section)
   * ::before  | null        | '::before'     | must contain ::before, no dynamic state
   * @private
   */
  _selectorMatchesTabContext(selector, ctx) {
    const { activeState, activePseudoEl } = ctx
    const hasDynamicState = PSEUDO_STATES.some(s => STATE_REGEXES[s].test(selector))

    if (activeState === null && activePseudoEl === null) {
      // Default tab: no dynamic states allowed.
      if (hasDynamicState) return false

      // If the cleaned selector is empty (pure pseudo-element, e.g. "::before {}")
      // only show it when it does NOT have a dedicated tab (::backdrop, ::selection, etc.)
      const cleanSel = cleanSelectorForMatching(selector)
      if (!cleanSel) {
        const pseudoEl = this._extractPseudoElement(selector)
        return pseudoEl !== null && !TAB_PSEUDO_ELEMENTS.has(pseudoEl)
      }

      // Has a real element part — always show in Default.
      return true
    }

    if (activeState !== null) {
      // State tab: only include selectors that explicitly carry that state.
      return STATE_REGEXES[activeState]?.test(selector) ?? false
    }

    if (activePseudoEl !== null) {
      // Pseudo-element tab: only selectors targeting that pseudo-el, without a dynamic state.
      return selector.includes(activePseudoEl) && !hasDynamicState
    }

    return false
  }

  /**
   * Extract the pseudo-element from a selector, if any.
   * Used to tag rules for sub-section rendering in state tabs.
   * @private
   */
  _extractPseudoElement(selector) {
    // Dedicated tabs take priority
    if (/::before/.test(selector))       return '::before'
    if (/::after/.test(selector))        return '::after'
    if (/::placeholder/.test(selector))  return '::placeholder'

    // Generic: extract the first double-colon pseudo-element found
    // Covers ::backdrop, ::selection, ::-webkit-scrollbar, ::scroll-marker, etc.
    const match = selector.match(/::([\w-]+)/)
    return match ? `::${match[1]}` : null
  }

  /**
   * For a comma-separated selector list, find the part that matched the
   * current element and return its specificity.
   * This mirrors the CSS cascade: specificity comes from the part that matched.
   * @private
   */
  _getMatchedPartSpecificity(selector, ctx) {
    const parts = selector.split(',')
    for (const part of parts) {
      const cleaned = cleanSelectorForMatching(part.trim())
      if (!cleaned) continue
      try {
        if (ctx.currentEl.matches(cleaned)) return getSpecificity(part.trim())
      } catch { continue }
    }
    return [0, 0, 0, 0]
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
    const cleanSelector = cleanSelectorForMatching(selector)

    if (!cleanSelector) {
      // Pure pseudo-element selector (no real element part after cleaning)
      if (ctx.activePseudoEl !== null) {
        // In a dedicated pseudo-el tab — match for the target
        return ctx.isTarget
      }
      if (ctx.activePseudoEl === null && ctx.activeState === null) {
        // Default tab — only for pseudo-els WITHOUT a dedicated tab (::backdrop etc.)
        const pseudoEl = this._extractPseudoElement(selector)
        return ctx.isTarget && pseudoEl !== null && !TAB_PSEUDO_ELEMENTS.has(pseudoEl)
      }
      return false
    }

    try {
      return ctx.currentEl.matches(cleanSelector)
    } catch {
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
        logicNode: d,
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
      // Desempate: declarada mais tarde no CSS → aparece acima (comportamento do Chrome)
      return (b.sourceOrder ?? 0) - (a.sourceOrder ?? 0)
    })
  }

  // ─── Available tabs scan ────────────────────────────────────────────────────

  /**
   * Walk the Logic Tree and return the Set of pseudo-tab IDs that have at
   * least one matching rule for the target element.
   * Used by PseudoStateTabBar to dim tabs with no content.
   */
  computeAvailableTabs() {
    const available = new Set(['default'])

    const check = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'selector') {
          const sel = node.label
          const base = cleanSelectorForMatching(sel)

          let domMatches = false
          try { domMatches = !base || this.targetEl.matches(base) } catch {}

          if (domMatches) {
            for (const tab of PSEUDO_STATE_TABS) {
              if (tab.id === 'default') continue
              if (tab.state  && STATE_REGEXES[tab.state]?.test(sel)) available.add(tab.id)
              if (tab.pseudoEl && sel.includes(tab.pseudoEl))         available.add(tab.id)
            }
          }
        }
        if (node.children) check(node.children)
      }
    }

    check(this.logicTree ?? [])
    return available
  }
}
