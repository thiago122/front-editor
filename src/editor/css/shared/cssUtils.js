import {
  PSEUDO_STATES,
  PSEUDO_ELEMENT_REGEX,
  INHERITED_PROPERTIES,
  COLOR_KEYWORDS
} from './cssConstants.js'

/**
 * CSS Utility Functions
 * Shared utilities for CSS parsing and manipulation.
 *
 * NOTE: To create/parse AST nodes, use CssAstService.createNode().
 */
/**
 * Clean selector for matching (remove pseudo-elements)
 */
export function cleanSelectorForMatching(selector) {
  let cleaned = selector
  
  // Remove pseudo-states
  PSEUDO_STATES.forEach(state => {
    const globalRegex = new RegExp(':' + state + '(\\b|:)', 'g')
    cleaned = cleaned.replace(globalRegex, '$1')
  })
  
  // Remove pseudo-elements
  cleaned = cleaned.replace(PSEUDO_ELEMENT_REGEX, '')
  
  return cleaned
}

/**
 * Check if a CSS property is inherited
 * @param {string} prop - Property name
 * @returns {boolean} True if property is inherited
 */
export function isInheritedProperty(prop) {
  return INHERITED_PROPERTIES.includes(prop)
}

/**
 * Normalize property name by handling --disabled- prefix
 * @param {string} propName - Raw property name
 * @returns {{prop: string, disabled: boolean}} Normalized property and disabled state
 */
export function normalizePropertyName(propName) {
  const isDisabled = propName.startsWith('--disabled-')
  return {
    prop: isDisabled ? propName.replace('--disabled-', '') : propName,
    disabled: isDisabled
  }
}

/**
 * Check if a value represents a color
 * @param {string} value - CSS value to check
 * @returns {boolean} True if value is a color
 */
export function isColorValue(value) {
  if (!value) return false
  
  return (
    value.startsWith('#') ||
    value.startsWith('rgb') ||
    value.startsWith('hsl') ||
    COLOR_KEYWORDS.includes(value.toLowerCase())
  )
}

/**
 * Calculate CSS selector specificity
 * @param {string} selector - CSS selector
 * @returns {number[]} Specificity array [inline, id, class, tag]
 */
export function getSpecificity(selector) {
  let a = 0, b = 0, c = 0, d = 0

  // IDs
  const ids = selector.match(/#[\w-]+/g)
  if (ids) b = ids.length

  // Classes, attributes, pseudo-classes
  const classes = selector.match(/\.[\w-]+/g)
  const attrs = selector.match(/\[[^\]]+\]/g)
  const pseudoClasses = selector.match(/:(?!not|is|where|has)[\w-]+/g)
  c = (classes?.length || 0) + (attrs?.length || 0) + (pseudoClasses?.length || 0)

  // Elements and pseudo-elements
  const elements = selector.match(/(?:^|[\s>+~])(?!#|\.|:)[a-z][\w-]*/gi)
  const pseudoElements = selector.match(/::[\w-]+/g)
  d = (elements?.length || 0) + (pseudoElements?.length || 0)

  return [a, b, c, d]
}
