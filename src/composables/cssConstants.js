/**
 * CSS Constants
 * Shared constants used across CSS processing modules
 */

// ============================================================================
// CSS LOCATIONS
// ============================================================================

/**
 * CSS Locations (origins)
 * Defines the different sources where CSS can come from
 */
export const CSS_LOCATIONS = ['external', 'internal', 'on_page', 'inline']

/**
 * Location descriptions for reference:
 * - external: External stylesheets (Bootstrap, FontAwesome, etc.)
 * - internal: Internal project stylesheets (assets/css/all.css)
 * - on_page: Inline style tags in the HTML (<style>...</style>)
 * - inline: Inline styles on elements (style="...")
 */

// ============================================================================
// PSEUDO-CLASSES & PSEUDO-ELEMENTS
// ============================================================================

/**
 * Common CSS pseudo-class states
 */
export const PSEUDO_STATES = [
  'hover', 'active', 'focus', 'visited', 
  'focus-within', 'focus-visible', 'target'
]

/**
 * Pre-compiled regexes for pseudo-states (performance optimization)
 */
export const STATE_REGEXES = PSEUDO_STATES.reduce((acc, state) => {
  acc[state] = new RegExp(':' + state + '(\\b|:)', '')
  return acc
}, {})

/**
 * Regex for matching CSS pseudo-elements
 */
export const PSEUDO_ELEMENT_REGEX =
  /::?(after|before|first-letter|first-line|selection|backdrop|marker|placeholder|file-selector-button)/g

// ============================================================================
// CSS PROPERTIES
// ============================================================================

/**
 * CSS properties that are inherited by default
 */
export const INHERITED_PROPERTIES = [
  'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
  'line-height', 'letter-spacing', 'text-align', 'text-indent', 'text-transform', 'white-space',
  'word-spacing', 'text-shadow', 'list-style', 'list-style-type', 'list-style-position',
  'list-style-image', 'visibility', 'cursor', 'quotes', 'border-collapse', 'border-spacing',
  'caption-side', 'pointer-events', 'speak', 'direction', 'writing-mode'
]


// ============================================================================
// COLOR KEYWORDS
// ============================================================================

/**
 * Common CSS color keywords
 */
export const COLOR_KEYWORDS = [
  'red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'purple',
  'orange', 'pink', 'teal', 'indigo', 'cyan', 'magenta'
]

// ============================================================================
// CSS SPECIFICITY
// ============================================================================

/**
 * CSS Specificity values
 * Format: [inline, id, class, tag]
 */
export const SPECIFICITY_INLINE = [1, 0, 0, 0]  // Inline styles (highest)
export const SPECIFICITY_DEFAULT = [0, 0, 0, 0] // Default/fallback
