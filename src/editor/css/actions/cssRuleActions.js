/**
 * cssRuleActions.js
 *
 * All operations on CSS rules (selectors).
 *
 * Usage:
 *   import { createRule, updateRule, deleteRule } from '@/editor/css/actions/cssRuleActions'
 */

import { toRaw } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { useEditorStore } from '@/stores/EditorStore'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { cssHistory } from '@/editor/css/history/CssHistoryManager'

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Create a new CSS rule and select it in the Explorer.
 * @param {string} selector
 * @param {string} origin - 'on_page' | 'internal'
 * @param {string} sourceName - e.g. 'style' or 'custom.css'
 * @returns {Object|null} The new Logic Tree node
 */
export function createRule(selector, origin = 'on_page', sourceName = 'style') {
  const styleStore = useStyleStore()
  cssHistory.snapshot(styleStore.cssLogicTree)
  const newNode = CssLogicTreeService.createRule(toRaw(styleStore.cssLogicTree), selector, origin, sourceName)
  if (newNode) {
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)
    styleStore.selectRule(newNode.id)
  } else {
    cssHistory._pending = null // descarta snapshot se nada foi criado
  }
  return newNode
}

/**
 * Update an existing rule's selector.
 * @returns {boolean}
 */
export function updateRule(rule, newSelector) {
  if (rule.selector === 'element.style' || !rule.astNode) return false
  const styleStore = useStyleStore()
  cssHistory.snapshot(styleStore.cssLogicTree)
  const updated = CssLogicTreeService.updateRule(toRaw(styleStore.cssLogicTree), rule.uid, newSelector)
  if (updated) {
    rule.selector = newSelector
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)
  } else {
    cssHistory._pending = null
  }
  return updated
}

/**
 * Delete a CSS rule.
 * @returns {boolean}
 */
export function deleteRule(rule) {
  if (rule.selector === 'element.style') return false
  const styleStore = useStyleStore()
  cssHistory.snapshot(styleStore.cssLogicTree)
  const removed = CssLogicTreeService.deleteRule(toRaw(styleStore.cssLogicTree), rule.uid)
  if (removed) {
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)
  } else {
    cssHistory._pending = null
  }
  return removed
}
