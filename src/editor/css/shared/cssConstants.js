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
  'focus-within', 'focus-visible', 'target', 'checked'
]

/**
 * Tabs shown in the Inspector Styles panel for pseudo-state / pseudo-element editing
 */
export const PSEUDO_STATE_TABS = [
  { id: 'default',       label: 'Default',        group: 'default', state: null,            pseudoEl: null            },
  // States
  { id: 'hover',         label: ':hover',          group: 'state',   state: 'hover',         pseudoEl: null            },
  { id: 'focus',         label: ':focus',          group: 'state',   state: 'focus',         pseudoEl: null            },
  { id: 'focus-visible', label: ':focus-visible',  group: 'state',   state: 'focus-visible', pseudoEl: null            },
  { id: 'focus-within',  label: ':focus-within',   group: 'state',   state: 'focus-within',  pseudoEl: null            },
  { id: 'active',        label: ':active',         group: 'state',   state: 'active',        pseudoEl: null            },
  { id: 'checked',       label: ':checked',        group: 'state',   state: 'checked',       pseudoEl: null            },
  { id: 'visited',       label: ':visited',        group: 'state',   state: 'visited',       pseudoEl: null            },
  { id: 'target',        label: ':target',         group: 'state',   state: 'target',        pseudoEl: null            },
  // Pseudo-elements
  { id: 'before',        label: '::before',        group: 'element', state: null,            pseudoEl: '::before'      },
  { id: 'after',         label: '::after',         group: 'element', state: null,            pseudoEl: '::after'       },
  { id: 'placeholder',   label: '::placeholder',   group: 'element', state: null,            pseudoEl: '::placeholder' },
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
  // All :: pseudo-elements (incl. vendor prefix and functional ones with parentheses)
  /::[\w-]+(?:\([^)]*\))?|::?(before|after|first-letter|first-line)/g

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
