/**
 * cssAtRuleActions.js
 *
 * All operations on CSS at-rules (@media, @supports, @container…).
 *
 * Usage:
 *   import { createAtRule, updateAtRule, deleteAtRule } from '@/editor/css/actions/cssAtRuleActions'
 */

import { toRaw } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { useEditorStore } from '@/stores/EditorStore'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { cssHistory } from '@/editor/css/history/CssHistoryManager'

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Wrap an existing rule inside a new at-rule (@media, @container…).
 * @param {Object} rule - The rule to wrap
 * @param {string} type - 'media' | 'supports' | 'container' | 'layer'
 * @returns {Object|null} The new at-rule Logic Tree node
 */
export function createAtRule(rule, type) {
  if (!rule.astNode) return null
  const styleStore = useStyleStore()
  cssHistory.snapshot(styleStore.cssLogicTree)
  const newNode = CssLogicTreeService.createAtRule(toRaw(styleStore.cssLogicTree), rule.uid, type)
  if (newNode) {
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)
  } else {
    cssHistory._pending = null
  }
  return newNode
}

/**
 * Update an at-rule's condition string (e.g. "(min-width: 768px)").
 * @param {Object} contextItem - Object with an `astNode` property
 * @param {string} newCondition
 * @returns {boolean}
 */
export function updateAtRule(contextItem, newCondition) {
  if (!contextItem?.astNode) return false
  const styleStore = useStyleStore()
  cssHistory.snapshot(styleStore.cssLogicTree)
  const updated = CssLogicTreeService.updateAtRule(contextItem.astNode, newCondition)
  if (updated) {
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)
  } else {
    cssHistory._pending = null
  }
  return updated
}

/**
 * Delete an at-rule and all its children.
 * @param {string} atRuleUid
 * @returns {boolean}
 */
export function deleteAtRule(atRuleUid) {
  if (!atRuleUid) return false
  const styleStore = useStyleStore()
  cssHistory.snapshot(styleStore.cssLogicTree)
  const removed = CssLogicTreeService.deleteAtRule(toRaw(styleStore.cssLogicTree), atRuleUid)
  if (removed) {
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)
  } else {
    cssHistory._pending = null
  }
  return removed
}
