/**
 * Inline Style Strategy
 * Handles CSS property operations for element.style (inline styles)
 */

import { focusLastInlineProperty } from '@/utils/focusHelpers'

/**
 * Creates the inline style strategy for a given element
 * @param {HTMLElement} element - The DOM element to manipulate
 * @param {Function} updateRulesFn - Callback to refresh the inspector UI
 * @param {Object} ruleRefs - Vue refs map for auto-focus
 * @returns {Object} Strategy object with property operation methods
 */
export function createInlineStyleStrategy(element, updateRulesFn, ruleRefs) {
  return {
    /**
     * Adds a new property to inline styles
     * @param {Object} rule - The rule object (for auto-focus)
     */
    addProperty(rule) {
      console.log('InlineStrategy: Adding property to element.style')
      element.style.setProperty('--new-property', 'inherit')
      console.log('Inline style updated:', element.style.cssText)
      updateRulesFn()

      // Auto-focus the newly added property
      if (ruleRefs) {
        const el = ruleRefs.value[rule.uid]
        if (el) {
          focusLastInlineProperty(el)
        }
      }
    },

    /**
     * Updates a property name or value in inline styles
     * @param {Object} decl - The declaration object
     * @param {string} field - 'prop' or 'value'
     * @param {string} newValue - The new value
     * @param {string} oldValue - The old value (for prop changes)
     */
    updateProperty(decl, field, newValue, oldValue) {
      const isCustom = (name) => name.startsWith('--')

      const setInline = (prop, val, prio) => {
        // Clean up previous states for this specific property name
        element.style.removeProperty(prop)
        element.style.removeProperty('--disabled-' + prop)

        // Try setting the real property
        element.style.setProperty(prop, val, prio)

        // Validate: Browsers drop invalid properties immediately
        if (!isCustom(prop)) {
          const checkVal = element.style.getPropertyValue(prop)
          if (!checkVal) {
            // Property was rejected. Fallback to custom property to preserve the text
            console.warn(`Browser rejected ${prop}: ${val}. Preserving as --disabled-${prop}`)
            element.style.setProperty('--disabled-' + prop, val)
          }
        }
      }

      if (field === 'prop') {
        // Clean up the OLD property name completely
        element.style.removeProperty(oldValue)
        element.style.removeProperty('--disabled-' + oldValue)

        // Set the NEW property name with the current value
        setInline(newValue, decl.value, decl.important ? 'important' : '')
      } else if (field === 'value') {
        // Update value for the current property name
        setInline(decl.prop, newValue, decl.important ? 'important' : '')
      }
    },

    /**
     * Deletes a property from inline styles
     * @param {Object} decl - The declaration to delete
     */
    deleteProperty(decl) {
      console.log('InlineStrategy: Removing property from element.style')
      if (decl.disabled) {
        element.style.removeProperty('--disabled-' + decl.prop)
      } else {
        element.style.removeProperty(decl.prop)
      }
      updateRulesFn()
    },

    /**
     * Toggles a property between enabled and disabled states
     * @param {Object} decl - The declaration to toggle
     */
    toggleProperty(decl) {
      if (decl.disabled) {
        // Was enabled, now disable: remove from style and add to custom property
        element.style.removeProperty(decl.prop)
        element.style.setProperty('--disabled-' + decl.prop, decl.value)
      } else {
        // Was disabled, now enable: remove from custom property and add back to style
        element.style.removeProperty('--disabled-' + decl.prop)
        element.style.setProperty(
          decl.prop,
          decl.value,
          decl.important ? 'important' : ''
        )
      }
    }
  }
}
