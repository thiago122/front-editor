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
import { conditionForBreakpoint } from '../shared/breakpointStrategy.js'

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Wrap an existing rule inside a new at-rule (@media, @container…).
 *
 * ⚠️ Wrap = operação de ESCOPO: a regra é MOVIDA para dentro da at-rule e
 * deixa de valer nos outros tamanhos. Para criar um override (base intacta),
 * use duplicateRuleToBreakpoint (cssBreakpointActions).
 *
 * @param {Object} rule - The rule to wrap
 * @param {string} type - 'media' | 'supports' | 'container' | 'layer'
 * @param {string|null} [customCondition] - Condição manual (ex.: input do
 *        usuário com o breakpoint base ativo, ou condição não-width).
 * @returns {Object|null} The new at-rule Logic Tree node
 */
export function createAtRule(rule, type, customCondition = null) {
  if (!rule.astNode) return null
  const styleStore  = useStyleStore()
  const editorStore = useEditorStore()
  const applyFn = () => styleStore.applyMutation(editorStore.getIframeDoc())

  // Condição default da @media: breakpoint ativo + estratégia do documento
  // (mobile-first → min-width / desktop-first → max-width). Fallback no modo
  // full (%): largura real do container via viewport.width (ResizeObserver).
  let condition = customCondition ?? undefined
  if (type === 'media' && !condition) {
    const bp = editorStore.previewBreakpoint
    const w = bp.unit === 'px'
      ? bp.width                      // valor exato do botão (768, 1024…)
      : editorStore.viewport?.width   // largura real do container em full mode
    condition = conditionForBreakpoint(w || 768, styleStore.resolvedDirection)
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
