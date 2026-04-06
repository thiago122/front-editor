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
import { unifiedHistory } from '@/editor/history/UnifiedHistoryManager'
import { findCssNode } from '@/utils/astHelpers'

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Wrap an existing rule inside a new at-rule (@media, @container…).
 * @param {Object} rule - The rule to wrap
 * @param {string} type - 'media' | 'supports' | 'container' | 'layer'
 * @returns {Object|null} The new at-rule Logic Tree node
 */
export function createAtRule(rule, type) {
  if (!rule.astNode) return null
  const styleStore  = useStyleStore()
  const editorStore = useEditorStore()
  const applyFn = () => styleStore.applyMutation(editorStore.getIframeDoc())

  // Usa o breakpoint selecionado para gerar a condição default da @media.
  // • px mode  → usa o valor exato do breakpoint (ex: 768px)
  // • % (full) → usa a largura real do container via viewport.width (ResizeObserver)
  let condition
  if (type === 'media') {
    const bp = editorStore.previewBreakpoint
    const w = bp.unit === 'px'
      ? bp.width                      // valor exato do botão (768, 1024…)
      : editorStore.viewport?.width   // largura real do container em full mode
    condition = w ? `(max-width: ${Math.round(w)}px)` : '(max-width: 768px)'
  }

  unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)
  const newNode = CssLogicTreeService.createAtRule(toRaw(styleStore.cssLogicTree), rule.uid, type, condition)
  if (newNode) {
    styleStore.applyMutation(editorStore.getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)
  } else {
    unifiedHistory.discardCssSnapshot()
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
  const styleStore  = useStyleStore()
  const editorStore = useEditorStore()
  const applyFn = () => styleStore.applyMutation(editorStore.getIframeDoc())

  unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)

  const updated = CssLogicTreeService.updateAtRule(contextItem.astNode, newCondition)

  if (updated) {
    // Atualiza também o node.label na Logic Tree.
    // _enterAtRule deriva o prelude exibido no inspector a partir do label —
    // sem isto, o inspector reverte ao valor antigo após o re-render.
    if (contextItem.logicNodeId) {
      const logicNode = findCssNode(toRaw(styleStore.cssLogicTree), contextItem.logicNodeId)
      if (logicNode) {
        logicNode.label = `@${contextItem.name} ${newCondition.trim()}`
      }
    }

    styleStore.applyMutation(editorStore.getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)
  } else {
    unifiedHistory.discardCssSnapshot()
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
  const applyFn = () => styleStore.applyMutation(useEditorStore().getIframeDoc())
  unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)
  const removed = CssLogicTreeService.deleteAtRule(toRaw(styleStore.cssLogicTree), atRuleUid)
  if (removed) {
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)
  } else {
    unifiedHistory.discardCssSnapshot()
  }
  return removed
}
