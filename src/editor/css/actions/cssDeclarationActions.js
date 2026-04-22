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
import { unifiedHistory } from '@/editor/history/UnifiedHistoryManager'

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
    const applyFn = () => styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)
    CssLogicTreeService.toggleDeclaration(decl)
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)

    // Refresh inspector rules to reflect the change
    styleStore.updateInspectorRules(
      useEditorStore().selectedElement,
      useEditorStore().viewport,
      useEditorStore().selectedRuleId || rule.uid
    )
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
  } else {
    const styleStore = useStyleStore()
    const applyFn = () => styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)
    CssLogicTreeService.updateDeclaration(decl, field, newValue)
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)

    // Refresh inspector rules to reflect the change
    styleStore.updateInspectorRules(
      useEditorStore().selectedElement,
      useEditorStore().viewport,
      useEditorStore().selectedRuleId || rule.uid
    )
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
    const applyFn = () => styleStore.applyMutation(editorStore.getIframeDoc())

    unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)

    const logicTree = toRaw(styleStore.cssLogicTree)
    if (decl.id && logicTree) findAndRemoveFromLogicTree(logicTree, decl.id)

    styleStore.applyMutation(editorStore.getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)

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
    const applyFn = () => styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)
    CssLogicTreeService.createDeclaration(rule, prop, val)
    styleStore.applyMutation(useEditorStore().getIframeDoc())
    unifiedHistory.commitCss(styleStore.cssLogicTree)

    // Refresh inspector rules to reflect the change
    styleStore.updateInspectorRules(
      useEditorStore().selectedElement,
      useEditorStore().viewport,
      useEditorStore().selectedRuleId || rule.uid
    )
  }
}

/**
 * Paste a list of declarations into a target rule.
 * Existing properties with the same name are overwritten; new ones are added.
 * Supports both Logic Tree rules and inline styles (element.style).
 *
 * @param {Object} rule - Target inspector rule object
 * @param {Array<{prop: string, value: string, important: boolean}>} declarations
 */
export function pasteDeclarations(rule, declarations) {
  if (!declarations?.length) return

  const editorStore = useEditorStore()

  // ── Inline style ──────────────────────────────────────────────────────────
  if (rule.selector === INLINE) {
    const element = editorStore.selectedElement
    if (!element) return
    declarations.forEach(({ prop, value, important }) => {
      element.style.removeProperty(prop)
      element.style.setProperty(prop, value, important ? 'important' : '')
    })
    // MutationObserver no InspectorPanel vai detectar e chamar updateRules
    return
  }

  // ── Logic Tree rule ───────────────────────────────────────────────────────
  const styleStore = useStyleStore()
  const applyFn = () => styleStore.applyMutation(editorStore.getIframeDoc())

  unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)

  declarations.forEach(({ prop, value, important }) => {
    // Se já existe a propriedade na rule, atualiza; se não, cria
    const existing = rule.declarations?.find(d => d.prop === prop && !d.disabled)
    if (existing) {
      CssLogicTreeService.updateDeclaration(existing, 'value', value)
      if (important !== existing.important) {
        CssLogicTreeService.updateDeclaration(existing, 'important', important)
      }
    } else {
      CssLogicTreeService.createDeclaration(rule, prop, value)
    }
  })

  styleStore.applyMutation(editorStore.getIframeDoc())
  unifiedHistory.commitCss(styleStore.cssLogicTree)
}
