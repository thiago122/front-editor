import { ref, markRaw, toRaw } from 'vue'
import { defineStore } from 'pinia'
import { CssAstService } from '@/editor/css/ast/CssAstService'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { calculateOverrides, findCssNode } from '@/utils/astHelpers'

// ─── Internal helper ──────────────────────────────────────────────────────────

function buildInspectorRule(selectorNode) {
  const declarations = []
  selectorNode.children?.forEach(d => {
    if (d.type !== 'declaration') return
    const propName = d.label.toLowerCase()
    const isDisabled = propName.startsWith('--disabled-')
    declarations.push({
      id: d.id,
      prop: isDisabled ? propName.replace('--disabled-', '') : propName,
      value: d.value,
      important: d.metadata?.astNode?.important || false,
      disabled: isDisabled,
      overridden: false,
      astNode: d.metadata?.astNode,
    })
  })
  return {
    uid: selectorNode.id,
    selector: selectorNode.label,
    declarations,
    origin: selectorNode.metadata?.origin,
    sourceName: selectorNode.metadata?.sourceName,
    specificity: selectorNode.metadata?.specificity || [0, 0, 0, 0],
    context: [],
    active: true,
    loc: selectorNode.metadata?.line || '?',
    astNode: selectorNode.metadata?.astNode,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStyleStore = defineStore('style', () => {

  // ── State ──────────────────────────────────────────────────────────────────

  /** Logic Tree — single source of truth. Watch `astMutationKey` for changes. */
  const cssLogicTree = ref(null)

  /** ID of the selected CSS rule. Shared between Inspector and Explorer. */
  const selectedRuleId = ref(null)

  /** Increment this after any Logic Tree mutation to trigger Vue reactivity. */
  const astMutationKey = ref(0)

  /** CSS rule groups shown in the Inspector. Updated by updateInspectorRules(). */
  const ruleGroups = ref([])

  /** Active pseudo-state/element tab in the Inspector Styles panel. */
  const activePseudoTab = ref({ id: 'default', state: null, pseudoEl: null })

  // ── Actions ────────────────────────────────────────────────────────────────

  function notifyTreeMutation() {
    astMutationKey.value++
  }

  /** Switch the active pseudo-state/element tab and refresh inspector rules. */
  function setActivePseudoTab(tab) {
    activePseudoTab.value = tab
  }

  /** Select a rule — syncs Inspector and Explorer simultaneously. */
  function selectRule(id) {
    selectedRuleId.value = id
  }

  /**
   * Sync the Logic Tree to the DOM and notify Vue.
   * Call after every CssLogicTreeService mutation.
   * @param {Document} doc - The target document (usually iframe.contentDocument)
   */
  function applyMutation(doc) {
    CssLogicTreeService.syncToDOM(cssLogicTree.value, doc)
    notifyTreeMutation()
  }

  /**
   * Parse CSS from the document and rebuild the Logic Tree from scratch.
   * Only call on init or when stylesheet structure changes.
   * For edits, use applyMutation() instead.
   */
  async function rebuildLogicTree(doc, locations = ['internal', 'external']) {
    if (!doc) return
    const masterAst = await CssAstService.buildMasterAst(doc, locations)
    cssLogicTree.value = markRaw(CssLogicTreeService.buildLogicTree(masterAst))
    notifyTreeMutation()
  }

  /**
   * Recalculate which CSS rules to show in the Inspector.
   * Called by InspectorPanel whenever the selected element, tree, or viewport changes.
   *
   * @param {HTMLElement|null} element
   * @param {{width: number, height: number}} viewport - Iframe dimensions in px
   * @param {string|null} ruleId - currently selected rule ID
   */
  function updateInspectorRules(element, viewport, ruleId) {
    const logicTree = toRaw(cssLogicTree.value)

    // Explorer mode: only when NO element is selected and user clicked a rule in the CSS Explorer.
    // When an element IS selected, we always use the matched rules — even if selectedRuleId is set.
    if (!element && ruleId) {
      const node = findCssNode(logicTree, ruleId)
      if (node && node.type === 'selector') {
        ruleGroups.value = [{ isTarget: true, tagName: 'Selected Rule', rules: [buildInspectorRule(node)] }]
        return
      }
    }

    // Element mode
    if (!element || !logicTree) {
      ruleGroups.value = []
      return
    }

    const tab    = toRaw(activePseudoTab.value)
    const forceStatus = tab.state ? { [tab.state]: true } : {}
    const groups = CssLogicTreeService.getMatchedRules(element, logicTree, toRaw(viewport), forceStatus, tab)
    calculateOverrides(groups)
    ruleGroups.value = groups

    const target = groups.find(g => g.isTarget)
    selectRule(target?.rules[0]?.uid ?? null)
  }

  // ── Exports ────────────────────────────────────────────────────────────────

  return {
    cssLogicTree,
    selectedRuleId,
    astMutationKey,
    ruleGroups,
    activePseudoTab,
    notifyTreeMutation,
    selectRule,
    setActivePseudoTab,
    applyMutation,
    rebuildLogicTree,
    updateInspectorRules,
  }
})
