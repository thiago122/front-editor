/**
 * src/editor/css/shared/cssProperties.js
 *
 * Dados para autocomplete no Inspector de CSS.
 *
 * Estrutura:
 *   CSS_PROPERTIES  — array de strings com todas as propriedades CSS comuns
 *   CSS_VALUES      — mapa prop → array de valores comuns/keywords
 *
 * Não inclui sintaxe de funções (calc, var, etc.) nem unidades —
 * essas são livres e o usuário digita normalmente.
 */

// ─── Lista de propriedades ────────────────────────────────────────────────────

export const CSS_PROPERTIES = [
  // Layout
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'float', 'clear', 'overflow', 'overflow-x', 'overflow-y',
  'visibility', 'opacity',

  // Flexbox
  'flex', 'flex-direction', 'flex-wrap', 'flex-flow',
  'justify-content', 'align-items', 'align-content', 'align-self',
  'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'gap', 'row-gap', 'column-gap',

  // Grid
  'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows',
  'grid-template-areas', 'grid-column', 'grid-row', 'grid-area',
  'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow',
  'place-items', 'place-content', 'place-self',

  // Box model
  'width', 'min-width', 'max-width',
  'height', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'box-sizing',

  // Border
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-width', 'border-style', 'border-color',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-radius',
  'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'outline', 'outline-width', 'outline-style', 'outline-color', 'outline-offset',

  // Background
  'background', 'background-color', 'background-image', 'background-size',
  'background-position', 'background-repeat', 'background-attachment',
  'background-origin', 'background-clip',

  // Typography
  'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
  'font-variant', 'font-stretch',
  'line-height', 'letter-spacing', 'word-spacing',
  'text-align', 'text-decoration', 'text-decoration-color', 'text-decoration-style',
  'text-transform', 'text-indent', 'text-shadow', 'text-overflow',
  'white-space', 'word-break', 'overflow-wrap', 'vertical-align',

  // List
  'list-style', 'list-style-type', 'list-style-position', 'list-style-image',

  // Table
  'border-collapse', 'border-spacing', 'caption-side', 'table-layout',
  'empty-cells',

  // Transforms & Transitions
  'transform', 'transform-origin', 'transform-style', 'perspective',
  'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay',

  // Animation
  'animation', 'animation-name', 'animation-duration', 'animation-timing-function',
  'animation-delay', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state',

  // Misc
  'cursor', 'pointer-events', 'user-select',
  'content', 'resize', 'appearance',
  'box-shadow', 'filter', 'backdrop-filter',
  'clip-path', 'object-fit', 'object-position',
  'aspect-ratio', 'scroll-behavior',
]

// ─── Valores comuns por propriedade ──────────────────────────────────────────

export const CSS_VALUES = {
  display: [
    'block', 'inline', 'inline-block', 'flex', 'inline-flex',
    'grid', 'inline-grid', 'none', 'table', 'table-cell',
    'table-row', 'contents', 'flow-root',
  ],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  overflow: ['visible', 'hidden', 'scroll', 'auto', 'clip'],
  'overflow-x': ['visible', 'hidden', 'scroll', 'auto'],
  'overflow-y': ['visible', 'hidden', 'scroll', 'auto'],
  visibility: ['visible', 'hidden', 'collapse'],
  'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
  'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
  'justify-content': [
    'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly',
    'start', 'end', 'stretch',
  ],
  'align-items': ['flex-start', 'flex-end', 'center', 'baseline', 'stretch', 'start', 'end'],
  'align-content': [
    'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'stretch',
  ],
  'align-self': ['auto', 'flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
  'box-sizing': ['border-box', 'content-box'],
  float: ['none', 'left', 'right', 'inline-start', 'inline-end'],
  clear: ['none', 'left', 'right', 'both', 'inline-start', 'inline-end'],
  cursor: [
    'auto', 'default', 'pointer', 'text', 'move', 'not-allowed', 'grab', 'grabbing',
    'crosshair', 'wait', 'help', 'zoom-in', 'zoom-out', 'col-resize', 'row-resize',
    'n-resize', 's-resize', 'e-resize', 'w-resize', 'none',
  ],
  'pointer-events': ['auto', 'none'],
  'user-select': ['auto', 'none', 'text', 'all'],
  'font-weight': ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold', 'bolder', 'lighter'],
  'font-style': ['normal', 'italic', 'oblique'],
  'font-variant': ['normal', 'small-caps'],
  'text-align': ['left', 'right', 'center', 'justify', 'start', 'end'],
  'text-transform': ['none', 'uppercase', 'lowercase', 'capitalize'],
  'text-decoration': ['none', 'underline', 'overline', 'line-through'],
  'text-overflow': ['clip', 'ellipsis'],
  'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'],
  'word-break': ['normal', 'break-all', 'keep-all', 'break-word'],
  'overflow-wrap': ['normal', 'break-word', 'anywhere'],
  'vertical-align': ['baseline', 'top', 'middle', 'bottom', 'text-top', 'text-bottom', 'sub', 'super'],
  'list-style-type': ['none', 'disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'],
  'list-style-position': ['inside', 'outside'],
  'border-style': ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'],
  'border-top-style': ['none', 'solid', 'dashed', 'dotted', 'double'],
  'border-right-style': ['none', 'solid', 'dashed', 'dotted', 'double'],
  'border-bottom-style': ['none', 'solid', 'dashed', 'dotted', 'double'],
  'border-left-style': ['none', 'solid', 'dashed', 'dotted', 'double'],
  'outline-style': ['none', 'solid', 'dashed', 'dotted', 'double'],
  'background-size': ['auto', 'cover', 'contain'],
  'background-repeat': ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round'],
  'background-attachment': ['scroll', 'fixed', 'local'],
  'background-position': ['top', 'bottom', 'left', 'right', 'center', 'top left', 'top right', 'bottom left', 'bottom right'],
  'object-fit': ['fill', 'contain', 'cover', 'none', 'scale-down'],
  'object-position': ['top', 'bottom', 'left', 'right', 'center'],
  'border-collapse': ['separate', 'collapse'],
  'table-layout': ['auto', 'fixed'],
  'resize': ['none', 'both', 'horizontal', 'vertical'],
  appearance: ['none', 'auto'],
  'scroll-behavior': ['auto', 'smooth'],
  'animation-direction': ['normal', 'reverse', 'alternate', 'alternate-reverse'],
  'animation-fill-mode': ['none', 'forwards', 'backwards', 'both'],
  'animation-play-state': ['running', 'paused'],
  'animation-iteration-count': ['infinite', '1', '2', '3'],
  'transition-timing-function': ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end'],
  'animation-timing-function': ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'],
}
