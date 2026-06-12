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

// 66 shorthands — gerado por scripts/gen-shorthand-map.mjs
export const SHORTHAND_LEAVES = {
  'animation': ['animation-delay', 'animation-direction', 'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state', 'animation-timeline', 'animation-timing-function'],
  'animation-range': ['animation-range-end', 'animation-range-start'],
  'background': ['background-attachment', 'background-clip', 'background-color', 'background-image', 'background-origin', 'background-position-x', 'background-position-y', 'background-repeat', 'background-size'],
  'background-position': ['background-position-x', 'background-position-y'],
  'border': ['border-bottom-color', 'border-bottom-style', 'border-bottom-width', 'border-left-color', 'border-left-style', 'border-left-width', 'border-right-color', 'border-right-style', 'border-right-width', 'border-top-color', 'border-top-style', 'border-top-width'],
  'border-block': ['border-block-color', 'border-block-style', 'border-block-width'],
  'border-block-end': ['border-top-color', 'border-top-style', 'border-top-width'],
  'border-block-start': ['border-block-start-color', 'border-bottom-style', 'border-bottom-width', 'border-left-style', 'border-left-width', 'border-right-style', 'border-right-width', 'border-top-style', 'border-top-width'],
  'border-bottom': ['border-bottom-color', 'border-bottom-style', 'border-bottom-width'],
  'border-color': ['border-bottom-color', 'border-left-color', 'border-right-color', 'border-top-color'],
  'border-image': ['border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source', 'border-image-width'],
  'border-inline': ['border-inline-color', 'border-inline-style', 'border-inline-width'],
  'border-inline-end': ['border-bottom-style', 'border-bottom-width', 'border-inline-end-color', 'border-left-style', 'border-left-width', 'border-right-style', 'border-right-width', 'border-top-style', 'border-top-width'],
  'border-inline-start': ['border-bottom-style', 'border-bottom-width', 'border-inline-start-color', 'border-left-style', 'border-left-width', 'border-right-style', 'border-right-width', 'border-top-style', 'border-top-width'],
  'border-left': ['border-left-color', 'border-left-style', 'border-left-width'],
  'border-radius': ['border-bottom-left-radius', 'border-bottom-right-radius', 'border-top-left-radius', 'border-top-right-radius'],
  'border-right': ['border-right-color', 'border-right-style', 'border-right-width'],
  'border-style': ['border-bottom-style', 'border-left-style', 'border-right-style', 'border-top-style'],
  'border-top': ['border-top-color', 'border-top-style', 'border-top-width'],
  'border-width': ['border-bottom-width', 'border-left-width', 'border-right-width', 'border-top-width'],
  'caret': ['caret-color', 'caret-shape'],
  'column-rule': ['column-rule-color', 'column-rule-style', 'column-rule-width'],
  'columns': ['column-count', 'column-width'],
  'contain-intrinsic-size': ['contain-intrinsic-height', 'contain-intrinsic-width'],
  'container': ['container-name', 'container-type'],
  'flex': ['flex-basis', 'flex-grow', 'flex-shrink'],
  'flex-flow': ['flex-direction', 'flex-wrap'],
  'font': ['font-family', 'font-size', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'line-height'],
  'gap': ['column-gap', 'row-gap'],
  'grid': ['column-gap', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows', 'grid-column-gap', 'grid-row-gap', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'row-gap'],
  'grid-area': ['grid-column-end', 'grid-column-start', 'grid-row-end', 'grid-row-start'],
  'grid-column': ['grid-column-end', 'grid-column-start'],
  'grid-row': ['grid-row-end', 'grid-row-start'],
  'grid-template': ['grid-template-areas', 'grid-template-columns', 'grid-template-rows'],
  'inset': ['bottom', 'left', 'right', 'top'],
  'inset-block': ['inset-block-end', 'inset-block-start'],
  'inset-inline': ['inset-inline-end', 'inset-inline-start'],
  'list-style': ['list-style-image', 'list-style-position', 'list-style-type'],
  'margin': ['margin-bottom', 'margin-left', 'margin-right', 'margin-top'],
  'margin-block': ['margin-block-end', 'margin-block-start'],
  'margin-inline': ['margin-inline-end', 'margin-inline-start'],
  'mask': ['mask-clip', 'mask-composite', 'mask-image', 'mask-mode', 'mask-origin', 'mask-position', 'mask-repeat', 'mask-size'],
  'mask-border': ['mask-border-mode', 'mask-border-outset', 'mask-border-repeat', 'mask-border-slice', 'mask-border-source', 'mask-border-width'],
  'offset': ['offset-anchor', 'offset-distance', 'offset-path', 'offset-position', 'offset-rotate'],
  'outline': ['outline-color', 'outline-style', 'outline-width'],
  'overflow': ['overflow-x', 'overflow-y'],
  'overscroll-behavior': ['overscroll-behavior-x', 'overscroll-behavior-y'],
  'padding': ['padding-bottom', 'padding-left', 'padding-right', 'padding-top'],
  'padding-block': ['padding-block-end', 'padding-block-start'],
  'padding-inline': ['padding-inline-end', 'padding-inline-start'],
  'place-content': ['align-content', 'justify-content'],
  'place-items': ['align-items', 'justify-items'],
  'place-self': ['align-self', 'justify-self'],
  'position-try': ['position-try-fallbacks', 'position-try-order'],
  'scroll-margin': ['scroll-margin-bottom', 'scroll-margin-left', 'scroll-margin-right', 'scroll-margin-top'],
  'scroll-margin-block': ['scroll-margin-block-end', 'scroll-margin-block-start'],
  'scroll-margin-inline': ['scroll-margin-inline-end', 'scroll-margin-inline-start'],
  'scroll-padding': ['scroll-padding-bottom', 'scroll-padding-left', 'scroll-padding-right', 'scroll-padding-top'],
  'scroll-padding-block': ['scroll-padding-block-end', 'scroll-padding-block-start'],
  'scroll-padding-inline': ['scroll-padding-inline-end', 'scroll-padding-inline-start'],
  'scroll-timeline': ['scroll-timeline-axis', 'scroll-timeline-name'],
  'text-decoration': ['text-decoration-color', 'text-decoration-line', 'text-decoration-style', 'text-decoration-thickness'],
  'text-emphasis': ['text-emphasis-color', 'text-emphasis-style'],
  'text-wrap': ['text-wrap-mode', 'text-wrap-style'],
  'transition': ['transition-behavior', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function'],
  'view-timeline': ['view-timeline-axis', 'view-timeline-name'],
}
