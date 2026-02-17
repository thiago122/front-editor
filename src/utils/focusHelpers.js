/**
 * Focus Management Helpers
 * Utilities for managing focus and text selection in contenteditable elements
 */

import { DOM_SELECTORS } from './cssConstants'

/**
 * Focuses and selects text in a contenteditable element
 * @param {HTMLElement} element - The element to focus
 */
export function focusAndSelectAll(element) {
  if (!element) return false
  
  element.focus()
  const range = document.createRange()
  range.selectNodeContents(element)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  return true
}

/**
 * Finds and focuses the last property name in a rule container
 * Used after adding a new property to auto-focus it
 * @param {HTMLElement} ruleContainer - The rule's DOM container
 * @returns {boolean} True if focus was successful
 */
export function focusLastProperty(ruleContainer) {
  if (!ruleContainer) return false
  
  const props = ruleContainer.querySelectorAll(DOM_SELECTORS.PROP_NAME)
  if (props.length > 0) {
    const lastProp = props[props.length - 1]
    return focusAndSelectAll(lastProp)
  }
  return false
}

/**
 * Finds and focuses the value field of a property by name
 * @param {HTMLElement} ruleContainer - The rule's DOM container
 * @param {string} propertyName - The property name to find
 * @returns {boolean} True if focus was successful
 */
export function focusPropertyValue(ruleContainer, propertyName) {
  if (!ruleContainer || !propertyName) return false
  
  const props = ruleContainer.querySelectorAll(DOM_SELECTORS.PROP_NAME)
  for (const p of props) {
    const text = p.innerText.trim()
    // Match exact name or disabled version
    if (text === propertyName || text === '--disabled-' + propertyName) {
      const item = p.closest('.group/item')
      const valueSpan = item?.querySelector(DOM_SELECTORS.PROP_VALUE)
      if (valueSpan) {
        return focusAndSelectAll(valueSpan)
      }
    }
  }
  return false
}

/**
 * Focuses the last property in an inline style rule
 * Handles the specific DOM structure for inline styles
 * @param {HTMLElement} ruleContainer - The inline rule's DOM container
 * @returns {boolean} True if focus was successful
 */
export function focusLastInlineProperty(ruleContainer) {
  if (!ruleContainer) return false
  
  const listContainer = ruleContainer.querySelector(DOM_SELECTORS.DECL_LIST)
  if (listContainer && listContainer.children.length > 0) {
    const lastItem = listContainer.children[listContainer.children.length - 1]
    const target = lastItem.querySelector(DOM_SELECTORS.PROP_NAME)
    if (target) {
      return focusAndSelectAll(target)
    }
  }
  return false
}
