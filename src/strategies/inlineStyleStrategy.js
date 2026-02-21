/**
 * Inline Style Strategy
 * Handles CSS property operations for element.style (inline styles).
 *
 * Design decisions:
 * - Does NOT call updateRules — the caller is responsible for refreshing the UI.
 * - updateProperty and toggleProperty don't call updateRules either: inline style
 *   changes are immediately reflected in the DOM, so the MutationObserver in
 *   InspectorPanel will fire updateRules automatically.
 */

import { focusLastInlineProperty } from '@/utils/focusHelpers'
import { validateStrategy } from './CssRuleStrategy'

/**
 * @param {HTMLElement} element - The DOM element to manipulate
 * @param {import('vue').Ref<Object>} ruleRefs - Ref map of rule.uid → DOM element
 */
export function createInlineStyleStrategy(element, ruleRefs) {
  function setInline(prop, val, important) {
    element.style.removeProperty(prop)
    element.style.removeProperty('--disabled-' + prop)
    element.style.setProperty(prop, val, important ? 'important' : '')

    // If browser rejects the value, preserve it as a disabled custom property
    if (!prop.startsWith('--') && !element.style.getPropertyValue(prop)) {
      element.style.setProperty('--disabled-' + prop, val)
    }
  }

  const strategy = {
    addProperty(rule) {
      element.style.setProperty('--new-property', 'inherit')

      const el = ruleRefs?.value?.[rule.uid]
      if (el) focusLastInlineProperty(el)
    },

    updateProperty(decl, field, newValue, oldValue) {
      if (field === 'prop') {
        element.style.removeProperty(oldValue)
        element.style.removeProperty('--disabled-' + oldValue)
        setInline(newValue, decl.value, decl.important)
      } else if (field === 'value') {
        setInline(decl.prop, newValue, decl.important)
      }
      // MutationObserver will fire updateRules automatically
    },

    deleteProperty(decl) {
      if (decl.disabled) {
        element.style.removeProperty('--disabled-' + decl.prop)
      } else {
        element.style.removeProperty(decl.prop)
      }
      // MutationObserver will fire updateRules automatically
    },

    toggleProperty(decl) {
      if (decl.disabled) {
        element.style.removeProperty(decl.prop)
        element.style.setProperty('--disabled-' + decl.prop, decl.value)
      } else {
        element.style.removeProperty('--disabled-' + decl.prop)
        setInline(decl.prop, decl.value, decl.important)
      }
      // MutationObserver will fire updateRules automatically
    },
  }

  validateStrategy(strategy, 'inlineStyleStrategy')
  return strategy
}
