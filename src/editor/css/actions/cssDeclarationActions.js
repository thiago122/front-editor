/**
 * cssDeclarationActions.js
 *
 * All operations on CSS declarations (properties inside a rule).
 * Handles both Logic Tree rules and inline styles (element.style).
 *
 * Usage:
 *   import { toggleDeclaration, updateDeclaration, deleteDeclaration } from '@/editor/css/actions/cssDeclarationActions'
 */

import { toRaw } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { useEditorStore } from '@/stores/EditorStore'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { createInlineStyleStrategy } from '@/strategies/inlineStyleStrategy'
import { findAndRemoveFromLogicTree } from '@/utils/astHelpers'
import { cssHistory } from '@/editor/css/history/CssHistoryManager'

const INLINE = 'element.style'

function getInlineStrategy(rule) {
  const element = useEditorStore().selectedElement
  return rule.selector === INLINE && element
    ? createInlineStyleStrategy(element, null)
    : null
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Toggle a declaration on/off (like the checkbox in DevTools).
 */
export function toggleDeclaration(rule, decl) {
  decl.disabled = !decl.disabled
  const inline = getInlineStrategy(rule)
  if (inline) {
    inline.toggleProperty(decl)
  } else {
    const styleStore = useStyleStore()
    cssHistory.snapshot(styleStore.cssLogicTree)
    CssLogicTreeService.toggleDeclaration(decl)
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)
  }
}

/**
 * Update a declaration's property name ('prop') or value ('value').
 */
export function updateDeclaration(rule, decl, field, newValue) {
  const oldValue = decl[field]
  decl[field] = newValue
  const inline = getInlineStrategy(rule)
  if (inline) {
    inline.updateProperty(decl, field, newValue, oldValue)
    // MutationObserver fires updateInspectorRules automatically for inline
  } else {
    const styleStore = useStyleStore()
    cssHistory.snapshot(styleStore.cssLogicTree)
    CssLogicTreeService.updateDeclaration(decl, field, newValue)
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)
  }
}

/**
 * Delete a declaration from a rule.
 */
export function deleteDeclaration(rule, decl) {
  const inline = getInlineStrategy(rule)
  if (inline) {
    inline.deleteProperty(decl)
  } else {
    const styleStore  = useStyleStore()
    const editorStore = useEditorStore()

    cssHistory.snapshot(styleStore.cssLogicTree)

    // 1. Remove from the Logic Tree first (so syncToDOM regenerates CSS without it)
    const logicTree = toRaw(styleStore.cssLogicTree)
    if (decl.id && logicTree) {
      findAndRemoveFromLogicTree(logicTree, decl.id)
    }

    // 2. Sync Logic Tree → DOM and notify Vue reactivity
    styleStore.applyMutation(editorStore.getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)

    // 3. Force-refresh the inspector immediately (don't rely on the async watcher)
    styleStore.updateInspectorRules(
      editorStore.selectedElement,
      editorStore.viewport,
      styleStore.selectedRuleId,
    )
  }
}


/**
 * Add a new empty declaration to a rule (Logic Tree only).
 * For inline styles, pass the rule's DOM element via `ruleEl`
 * so the new property field can be focused automatically.
 *
 * @param {Object} rule - Inspector rule object
 * @param {HTMLElement|null} ruleEl - The rule's root DOM element (for focus)
 * @param {string|null} prop - Optional property name
 * @param {string|null} val - Optional value
 */
export function addDeclaration(rule, ruleEl = null, prop = null, val = null) {
  const element = useEditorStore().selectedElement
  if (rule.selector === INLINE) {
    const strategy = element
      ? createInlineStyleStrategy(element, { value: { [rule.uid]: ruleEl } })
      : null
    strategy?.addProperty(rule)
  } else {
    const styleStore = useStyleStore()
    cssHistory.snapshot(styleStore.cssLogicTree)
    CssLogicTreeService.createDeclaration(rule, prop, val)
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    cssHistory.commit(styleStore.cssLogicTree)
  }
}
