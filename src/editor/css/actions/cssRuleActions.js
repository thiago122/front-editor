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
import { unifiedHistory } from '@/editor/history/UnifiedHistoryManager'

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Create a new CSS rule and select it in the Explorer.
 * @param {string} selector
 * @param {string} origin - 'on_page' | 'internal'
 * @param {string} sourceName - e.g. 'style' or 'custom.css'
 * @param {string|null} parentId - ID of parent node
 * @param {number} insertIndex - insert position
 * @returns {Object|null} The new Logic Tree node
 */
export function createRule(selector, origin = 'on_page', sourceName = 'style', parentId = null, insertIndex = -1) {
  const styleStore = useStyleStore()
  const applyFn = () => styleStore.applyMutation(useEditorStore().getIframeDoc())
  unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)
  const newNode = CssLogicTreeService.createRule(toRaw(styleStore.cssLogicTree), selector, origin, sourceName, parentId, insertIndex)
  if (newNode) {
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)
    styleStore.selectRule(newNode.id)
  } else {
    unifiedHistory.discardCssSnapshot()
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
  const applyFn = () => styleStore.applyMutation(useEditorStore().getIframeDoc())
  unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)
  const updated = CssLogicTreeService.updateRule(toRaw(styleStore.cssLogicTree), rule.uid, newSelector)
  if (updated) {
    rule.selector = newSelector
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)
  } else {
    unifiedHistory.discardCssSnapshot()
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
  const applyFn = () => styleStore.applyMutation(useEditorStore().getIframeDoc())
  unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)
  const removed = CssLogicTreeService.deleteRule(toRaw(styleStore.cssLogicTree), rule.uid)
  if (removed) {
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)
  } else {
    unifiedHistory.discardCssSnapshot()
  }
  return removed
}
