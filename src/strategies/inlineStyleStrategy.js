/**
 * Inline Style Strategy
 * Handles CSS property operations for element.style (inline styles).
 */

import { focusLastInlineProperty } from '@/utils/focusHelpers'
import { validateStrategy } from './CssRuleStrategy'

/**
 * Creates the inline style strategy for a given element
 * @param {HTMLElement} element - The DOM element to manipulate
 * @param {Function} updateRulesFn - Callback to refresh the inspector UI
 * @param {Object} ruleRefs - Vue refs map for auto-focus
 * @returns {Object} Strategy object with property operation methods
 */
export function createInlineStyleStrategy(element, updateRulesFn, ruleRefs) {
  const strategy = {
    addProperty(rule) {
      console.log('InlineStrategy: Adding property to element.style')
      element.style.setProperty('--new-property', 'inherit')
      updateRulesFn()

      if (ruleRefs) {
        const el = ruleRefs.value[rule.uid]
        if (el) focusLastInlineProperty(el)
      }
    },

    updateProperty(decl, field, newValue, oldValue) {
      const isCustom = (name) => name.startsWith('--')

      const setInline = (prop, val, prio) => {
        element.style.removeProperty(prop)
        element.style.removeProperty('--disabled-' + prop)
        element.style.setProperty(prop, val, prio)

        if (!isCustom(prop)) {
          const checkVal = element.style.getPropertyValue(prop)
          if (!checkVal) {
            console.warn(`Browser rejected ${prop}: ${val}. Preserving as --disabled-${prop}`)
            element.style.setProperty('--disabled-' + prop, val)
          }
        }
      }

      if (field === 'prop') {
        element.style.removeProperty(oldValue)
        element.style.removeProperty('--disabled-' + oldValue)
        setInline(newValue, decl.value, decl.important ? 'important' : '')
      } else if (field === 'value') {
        setInline(decl.prop, newValue, decl.important ? 'important' : '')
      }
    },

    deleteProperty(decl) {
      console.log('InlineStrategy: Removing property from element.style')
      if (decl.disabled) {
        element.style.removeProperty('--disabled-' + decl.prop)
      } else {
        element.style.removeProperty(decl.prop)
      }
      updateRulesFn()
    },

    toggleProperty(decl) {
      if (decl.disabled) {
        element.style.removeProperty(decl.prop)
        element.style.setProperty('--disabled-' + decl.prop, decl.value)
      } else {
        element.style.removeProperty('--disabled-' + decl.prop)
        element.style.setProperty(
          decl.prop,
          decl.value,
          decl.important ? 'important' : ''
        )
      }
    }
  }

  validateStrategy(strategy, 'inlineStyleStrategy')
  return strategy
}
