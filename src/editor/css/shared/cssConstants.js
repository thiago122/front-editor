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
 * CSS properties that are inherited by default.
 *
 * Fonte de verdade: mdn-data (specs W3C) — gerado por
 * scripts/gen-inherited-properties.mjs (build-time). NÃO editar à mão:
 * rode o script e cole o resultado. Critério: inherited=true, status
 * standard/experimental, sem custom props.
 *
 * Lookup via INHERITED_PROPERTIES_SET (O(1)) — ver isInheritedProperty().
 *
 * 119 propriedades herdadas — gerado por scripts/gen-inherited-properties.mjs
 */
export const INHERITED_PROPERTIES = [
  'accent-color', 'border-collapse', 'border-spacing', 'caption-side', 'caret', 'caret-color',
  'caret-shape', 'clip-rule', 'color', 'color-interpolation-filters', 'color-scheme', 'cursor',
  'direction', 'dominant-baseline', 'empty-cells', 'fill', 'fill-opacity', 'fill-rule',
  'font', 'font-family', 'font-feature-settings', 'font-kerning', 'font-language-override', 'font-optical-sizing',
  'font-palette', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-synthesis',
  'font-synthesis-position', 'font-synthesis-small-caps', 'font-synthesis-style', 'font-synthesis-weight', 'font-variant', 'font-variant-alternates',
  'font-variant-caps', 'font-variant-east-asian', 'font-variant-emoji', 'font-variant-ligatures', 'font-variant-numeric', 'font-variant-position',
  'font-variation-settings', 'font-weight', 'forced-color-adjust', 'hanging-punctuation', 'hyphenate-character', 'hyphenate-limit-chars',
  'hyphens', 'image-orientation', 'image-rendering', 'image-resolution', 'interpolate-size', 'letter-spacing',
  'line-break', 'line-height', 'line-height-step', 'list-style', 'list-style-image', 'list-style-position',
  'list-style-type', 'marker', 'marker-end', 'marker-mid', 'marker-start', 'math-depth',
  'math-shift', 'math-style', 'object-position', 'orphans', 'overflow-wrap', 'paint-order',
  'pointer-events', 'print-color-adjust', 'quotes', 'ruby-align', 'ruby-merge', 'ruby-position',
  'scrollbar-color', 'stroke', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'tab-size', 'text-align', 'text-align-last',
  'text-anchor', 'text-combine-upright', 'text-decoration-skip', 'text-decoration-skip-ink', 'text-emphasis', 'text-emphasis-color',
  'text-emphasis-position', 'text-emphasis-style', 'text-indent', 'text-justify', 'text-orientation', 'text-rendering',
  'text-shadow', 'text-size-adjust', 'text-spacing-trim', 'text-transform', 'text-underline-offset', 'text-underline-position',
  'text-wrap', 'text-wrap-mode', 'text-wrap-style', 'visibility', 'white-space', 'white-space-collapse',
  'widows', 'word-break', 'word-spacing', 'word-wrap', 'writing-mode',
]

/** Set para lookup O(1) — usado por isInheritedProperty(). */
export const INHERITED_PROPERTIES_SET = new Set(INHERITED_PROPERTIES)


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
