/**
 * CSS Inspector Constants
 * Centralized constants for CSS manipulation and inspection
 */

/**
 * Special CSS selectors used in the inspector
 */
export const SELECTORS = {
  INLINE_STYLE: 'element.style',
  SELECTED_RULE: 'Selected Rule'
}

/**
 * HTML attribute types that can be manipulated
 */
export const ATTRIBUTE_TYPES = {
  CLASS: 'class',
  ID: 'id'
}

/**
 * CSS origin types
 */
export const CSS_ORIGINS = {
  INLINE: 'inline',
  INTERNAL: 'internal',
  EXTERNAL: 'external',
  ON_PAGE: 'on_page'
}

/**
 * AST node types
 */
export const AST_NODE_TYPES = {
  ROOT: 'root',
  FILE: 'file',
  SELECTOR: 'selector',
  DECLARATION: 'declaration',
  AT_RULE: 'at-rule',
  RULE: 'Rule',
  ATRULE: 'Atrule',
  RAW: 'Raw',
  BLOCK: 'Block',
  SELECTOR_LIST: 'SelectorList'
}

/**
 * Property name prefixes
 */
export const PROPERTY_PREFIXES = {
  DISABLED: '--disabled-',
  NEW: '--new-property'
}

/**
 * CSS class selectors for DOM queries
 */
export const DOM_SELECTORS = {
  PROP_NAME: '.prop-name',
  PROP_VALUE: '.prop-value',
  RULE_ITEM: '.group/item',
  DECL_LIST: '.pl-4.space-y-1.5'
}

/**
 * Default values for new CSS properties
 */
export const DEFAULT_VALUES = {
  NEW_PROPERTY_NAME: 'property',
  NEW_PROPERTY_VALUE: 'value',
  SAFE_FALLBACK: 'inherit',
  MEDIA_QUERY: '(min-width: 0px)',
  AT_RULE_NAME: 'name'
}
