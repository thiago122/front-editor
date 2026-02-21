/**
 * InspectorController
 *
 * Single class that owns all Inspector state and operations.
 * Replaces the two-composable pattern (useInspectorRules + useRuleOperations).
 *
 * Lifecycle:
 *   const inspector = new InspectorController(editorStore, styleStore)
 *   provide('inspector', inspector)
 *
 * Children inject:
 *   const inspector = inject('inspector')
 *   inspector.updateProperty(rule, decl, 'value', '16px')
 */

import { ref, computed, toRaw, nextTick } from 'vue'
import { CssLogicTreeService } from '@/composables/CssLogicTreeService'
import { CssAstService } from '@/composables/CssAstService'
import {
  calculateOverrides,
  findCssNode,
  findParentOfLogicNode,
  findAndRemoveFromLogicTree,
} from '@/utils/astHelpers'
import { getSpecificity } from '@/composables/cssUtils'
import { SELECTORS } from '@/utils/cssConstants'
import { generateId } from '@/utils/ids'
import { focusLastProperty, focusPropertyValue } from '@/utils/focusHelpers'
import { createInlineStyleStrategy } from '@/strategies/inlineStyleStrategy'
import { createAstRuleStrategy } from '@/strategies/astRuleStrategy'

// ─── Internal helpers ────────────────────────────────────────────────────────

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

// ─── InspectorController ─────────────────────────────────────────────────────

export class InspectorController {
  constructor(editorStore, styleStore) {
    this._editorStore = editorStore
    this._styleStore = styleStore

    // ── Reactive state ─────────────────────────────────────────────────────
    this.ruleGroups = ref([])
    this.ruleRefs = ref({})
    this.showRuleModal = ref(false)
    this.pendingSelector = ref('')

    // ── Derived computeds ──────────────────────────────────────────────────
    this.selectedElement = computed(() => editorStore.selectedElement)
    this.activeDoc = computed(() => editorStore.selectedElement?.ownerDocument || document)
    this.viewport = computed(() => editorStore.viewport)

    this.activeInspectorRule = computed(() => {
      const id = styleStore.selectedRuleId
      if (!id) return null
      for (const group of this.ruleGroups.value) {
        const found = group.rules.find(r => r.uid === id)
        if (found) return found
      }
      return null
    })

    this.activePseudos = computed(() => {
      const active = this.activeInspectorRule.value
      if (!active) return new Set()
      const base = active.selector.split(':')[0]
      const targetGroup = this.ruleGroups.value.find(g => g.isTarget)
      const result = new Set()
      ;['hover', 'active', 'focus', 'visited', 'focus-within', 'focus-visible', 'target'].forEach(state => {
        if (targetGroup?.rules.some(r => r.selector === `${base}:${state}`)) {
          result.add(state)
        }
      })
      return result
    })

    this.selectorNav = computed(() => {
      const el = this.selectedElement.value
      if (!el) return { attributes: [], rules: [] }

      const targetGroup = this.ruleGroups.value.find(g => g.isTarget)
      if (!targetGroup) return { attributes: [], rules: [] }
      const targetRules = targetGroup.rules

      const attributes = []
      if (el.id) {
        const match = targetRules.find(r => r.selector === '#' + el.id)
        attributes.push({ type: 'id', value: el.id, label: '#' + el.id, uid: match?.uid })
      }
      Array.from(el.classList).forEach(cls => {
        const escaped = '.' + CSS.escape(cls)
        const match = targetRules.find(r => r.selector === '.' + cls || r.selector === escaped)
        attributes.push({
          type: 'class',
          value: cls,
          label: '.' + cls,
          uid: match?.uid,
          isExactMatch: !!match,
          isUsed: targetRules.some(r => r.selector.includes('.' + cls) || r.selector.includes(escaped)),
        })
      })

      const counts = {}
      targetRules.forEach(r => { counts[r.selector] = (counts[r.selector] || 0) + 1 })
      const rules = targetRules.map(rule => {
        const label = counts[rule.selector] > 1 && rule.selector !== 'element.style'
          ? `${rule.selector} [${rule.sourceName || 'style'}]`
          : rule.selector
        return {
          uid: rule.uid,
          selector: rule.selector,
          label,
          source: rule.sourceName || 'style',
          origin: rule.origin,
          isInline: rule.selector === 'element.style',
        }
      })

      return { attributes, rules }
    })

    // ── Strategies ─────────────────────────────────────────────────────────
    this._astStrategy = createAstRuleStrategy(this.ruleRefs)

    this._inlineStrategy = computed(() =>
      this.selectedElement.value
        ? createInlineStyleStrategy(this.selectedElement.value, this.ruleRefs)
        : null,
    )
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Light sync: write CSS to the DOM <style> elements and notify watchers.
   * Use this after in-place AST mutations (updateProperty, toggleProperty, deleteProperty).
   * No parse — the Logic Tree nodes are already up to date via their astNode refs.
   */
  _syncLight() {
    CssLogicTreeService.syncToDOM(this._styleStore.cssLogicTree, this.activeDoc.value)
    this._styleStore.notifyAstMutation()
  }

  /**
   * Full sync: write CSS to DOM + full parse + rebuild Logic Tree.
   * Use this for structural changes (addRule, deleteRule, wrapInAtRule, updateSelector)
   * where new logic nodes are created or the tree shape changes.
   */
  _syncFull() {
    CssLogicTreeService.syncToDOM(this._styleStore.cssLogicTree, this.activeDoc.value)
    this._styleStore.refreshCssAst(this.activeDoc.value)
  }

  _getStrategy(rule) {
    return rule.selector === SELECTORS.INLINE_STYLE
      ? this._inlineStrategy.value
      : this._astStrategy
  }

  _resolveExplicitRule(ruleId, logicTree) {
    const targetNode = findCssNode(logicTree, ruleId)
    if (!targetNode || targetNode.type !== 'selector') return null
    const rule = buildInspectorRule(targetNode)
    return [{ isTarget: true, tagName: 'Selected Rule', rules: [rule] }]
  }

  // ── Rule state ────────────────────────────────────────────────────────────

  setRuleRef(el, rule) {
    if (el && rule?.uid) {
      this.ruleRefs.value[rule.uid] = el.$el ?? el
    }
  }

  updateRules() {
    const logicTree = toRaw(this._styleStore.cssLogicTree)

    // Explorer mode: user clicked a rule in the CSS Explorer
    if (this._styleStore.selectedRuleId) {
      const groups = this._resolveExplicitRule(this._styleStore.selectedRuleId, logicTree)
      if (groups) {
        this.ruleGroups.value = groups
        return
      }
    }

    // Element mode
    if (!this.selectedElement.value || !logicTree) {
      this.ruleGroups.value = []
      return
    }

    const groups = CssLogicTreeService.getMatchedRules(
      this.selectedElement.value,
      logicTree,
      this.viewport.value,
      {},
    )
    calculateOverrides(groups)
    this.ruleGroups.value = groups

    const targetGroup = groups.find(g => g.isTarget)
    this._styleStore.selectRule(targetGroup?.rules[0]?.uid ?? null)
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openCreateRuleModal(selector) {
    this.pendingSelector.value = selector
    this.showRuleModal.value = true
  }

  onRuleAddedFromModal() {
    this.showRuleModal.value = false
    this.updateRules()
  }

  // ── Property operations ───────────────────────────────────────────────────

  addNewProperty(rule) {
    this._getStrategy(rule)?.addProperty(rule)
    this._syncLight()
    this.updateRules()
  }

  updateProperty(rule, decl, field, newValue) {
    const oldValue = decl[field]
    decl[field] = newValue
    this._getStrategy(rule)?.updateProperty(decl, field, newValue, oldValue)
    // AST: mutate in-place then write to DOM (no parse).
    // Inline: MutationObserver fires updateRules() automatically.
    if (rule.selector !== SELECTORS.INLINE_STYLE) {
      this._syncLight()
      this.updateRules()
    }
  }

  deleteDeclaration(rule, decl) {
    this._getStrategy(rule)?.deleteProperty(rule, decl)
    this._syncLight()
    this.updateRules()
  }

  toggleDeclaration(rule, decl) {
    decl.disabled = !decl.disabled
    this._getStrategy(rule)?.toggleProperty(rule, decl)
    this._syncLight()
    this.updateRules()
  }

  focusValue(rule, decl, e) {
    const newValue = e.target.innerText.trim()
    this.updateProperty(rule, decl, 'prop', newValue)
    nextTick(() => {
      const container = this.ruleRefs.value[rule.uid]
      if (container) focusPropertyValue(container, newValue)
    })
  }

  // ── Selector operations ───────────────────────────────────────────────────

  updateSelector(rule, newSelector) {
    if (rule.selector === 'element.style' || !rule.astNode) return
    rule.selector = newSelector

    const newPrelude = CssAstService.createNode(newSelector, 'SelectorList')
    if (!newPrelude) return

    toRaw(rule.astNode).prelude = newPrelude

    const logicNode = findCssNode(toRaw(this._styleStore.cssLogicTree), rule.uid)
    if (logicNode) {
      logicNode.label = newSelector
      logicNode.metadata.specificity = getSpecificity(newSelector)
    }

    this._syncLight()
    this.updateRules()
  }

  // ── At-rule operations ────────────────────────────────────────────────────

  updateAtRule(rule, contextItem, newCond) {
    if (!contextItem?.astNode) return
    const node = toRaw(contextItem.astNode)
    if (node.type !== 'Atrule') return
    node.prelude = { type: 'Raw', value: newCond.trim() }
    this._syncLight()
    this.updateRules()
  }

  wrapInAtRule(rule, type) {
    if (!rule.astNode || !this._styleStore.cssLogicTree) return

    const logicTree = toRaw(this._styleStore.cssLogicTree)
    const parentLogicNode = findParentOfLogicNode(logicTree, rule.uid)
    if (!parentLogicNode) return

    const targetLogicNode = parentLogicNode.children.find(n => n.id === rule.uid)
    const idx = parentLogicNode.children.indexOf(targetLogicNode)
    if (idx === -1) return

    const preludeValue = type === 'media' ? '(min-width: 0px)' : 'name'
    const atRuleAst = {
      type: 'Atrule',
      name: type,
      prelude: { type: 'Raw', value: preludeValue },
      block: { type: 'Block', children: [rule.astNode] },
    }

    const atRuleLogicNode = {
      id: generateId(),
      type: 'at-rule',
      label: `@${type} ${preludeValue}`,
      metadata: {
        origin: targetLogicNode.metadata.origin,
        sourceName: targetLogicNode.metadata.sourceName,
        astNode: atRuleAst,
      },
      children: [targetLogicNode],
    }

    parentLogicNode.children.splice(idx, 1, atRuleLogicNode)
    this._syncFull()
    this.updateRules()
  }

  // ── Rule operations ───────────────────────────────────────────────────────

  addNewRule(overrideSelector = null) {
    if (!this.selectedElement.value || !this._styleStore.cssLogicTree) return

    const active = this.activeInspectorRule.value
    const origin = active?.origin || 'on_page'
    const sourceName = active?.sourceName || 'style'

    const newLogicNode = CssLogicTreeService.addRule(
      toRaw(this._styleStore.cssLogicTree),
      overrideSelector,
      origin,
      sourceName,
    )

    if (newLogicNode) {
      this._syncFull()
      this._styleStore.selectRule(newLogicNode.id)
      this.updateRules()
    }
  }

  deleteRule(rule) {
    if (!this._styleStore.cssLogicTree || !rule.uid) return
    if (rule.selector === 'element.style') return

    const logicTree = toRaw(this._styleStore.cssLogicTree)
    if (findAndRemoveFromLogicTree(logicTree, rule.uid)) {
      this._syncFull()
      this.updateRules()
    }
  }

  // ── Pseudo-class handling ─────────────────────────────────────────────────

  handlePseudoToggle(state) {
    const active = this.activeInspectorRule.value
    if (!active) return

    const base = active.selector.split(':')[0]
    const targetSelector = `${base}:${state}`
    const targetGroup = this.ruleGroups.value.find(g => g.isTarget)
    const existing = targetGroup?.rules.find(r => r.selector === targetSelector)

    if (existing) {
      this._styleStore.selectRule(existing.uid)
    } else {
      this.addNewRule(targetSelector)
    }
  }
}
