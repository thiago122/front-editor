import { parse } from 'css-tree'
import {
  PSEUDO_STATES,
  PSEUDO_ELEMENT_REGEX,
  INHERITED_PROPERTIES_SET,
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

  // Remove empty parts left behind after stripping pseudo-elements
  // e.g. "*, ::before, ::after" → "*, , " → "*"
  cleaned = cleaned
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .join(', ')

  return cleaned
}

/**
 * Check if a CSS property is inherited
 * @param {string} prop - Property name
 * @returns {boolean} True if property is inherited
 */
export function isInheritedProperty(prop) {
  return INHERITED_PROPERTIES_SET.has(prop)
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

// ─── Cascade Layers (CSS Cascading & Inheritance L5 §6.4) ───────────────────
//
// layerRank = array de índices de irmão por nível ([1,0] = 2º layer raiz,
// 1º sublayer dele). null/undefined = regra fora de layer (unlayered).
//
// Declarações NORMAIS: unlayered vence qualquer layer; entre layers, o
// declarado DEPOIS vence; estilos diretos do pai vencem os dos sublayers
// (pai age como sublayer implícito final).
// Declarações !IMPORTANT: ordem INVERTE — layered vence unlayered, o layer
// declarado ANTES vence, e sublayer vence o pai.

/** >0 se `a` vence `b` na cascata normal; 0 empate. */
export function compareLayerRankNormal(a, b) {
  if (!a && !b) return 0
  if (!a) return 1  // unlayered vence
  if (!b) return -1
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1 // declarado depois vence
  }
  // Prefixo comum: caminho mais curto (pai) vence no normal
  return b.length - a.length
}

/** >0 se `a` vence `b` entre declarações !important (ordem invertida). */
export function compareLayerRankImportant(a, b) {
  if (!a && !b) return 0
  if (!a) return -1 // unlayered PERDE entre importants
  if (!b) return 1
  return -compareLayerRankNormal(a, b)
}

// ─── Specificity (Selectors Level 4 §17) ────────────────────────────────────
//
// Calculado sobre o AST do css-tree, NÃO por regex. Motivos:
//   - regex contava "::before" 2× (como pseudo-classe E pseudo-elemento)
//   - :is()/:not()/:has() devem usar a specificity do arg MAIS específico
//   - :where() contribui 0
//   - seletor universal "*" contribui 0
//
// Formato [a, b, c, d] = [inline, id, classe/attr/pseudo-classe, tipo/pseudo-elemento].
// `a` (inline) é sempre 0 aqui — inline tem caminho próprio (SPECIFICITY_INLINE).

// Pseudo-classes funcionais que assumem a specificity do arg mais específico.
const FUNCTIONAL_MOST_SPECIFIC = new Set(['is', 'not', 'has'])
// Pseudo-classes que contam como pseudo-classe E adicionam o "of <S>" mais específico.
const NTH_WITH_SELECTOR = new Set(['nth-child', 'nth-last-child'])

/** Compara duas tuplas de specificity. >0 se a > b. */
function compareSpecificity(a, b) {
  for (let i = 0; i < 4; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

/** Retorna a maior specificity entre os seletores de um nó SelectorList. */
function maxSpecificityOfList(selectorListNode) {
  let best = [0, 0, 0, 0]
  selectorListNode.children?.forEach((sel) => {
    const s = specificityOfSelector(sel)
    if (compareSpecificity(s, best) > 0) best = s
  })
  return best
}

/** Acha o nó SelectorList dentro dos filhos de uma PseudoClassSelector (arg). */
function findArgSelectorList(pseudoNode) {
  if (!pseudoNode.children) return null
  for (const child of pseudoNode.children) {
    if (child.type === 'SelectorList') return child
    // :nth-child(2n of S) — css-tree embrulha o "of S" num nó Nth.selector
    if (child.type === 'Nth' && child.selector?.type === 'SelectorList') return child.selector
  }
  return null
}

/** Calcula a specificity de um único nó 'Selector' do css-tree. */
function specificityOfSelector(selectorNode) {
  let id = 0, cls = 0, type = 0
  selectorNode.children?.forEach((node) => {
    switch (node.type) {
      case 'IdSelector':
        id++
        break
      case 'ClassSelector':
      case 'AttributeSelector':
        cls++
        break
      case 'TypeSelector':
        // Seletor universal "*" não conta.
        if (node.name !== '*') type++
        break
      case 'PseudoElementSelector':
        type++
        break
      case 'PseudoClassSelector': {
        const name = (node.name || '').toLowerCase()
        if (name === 'where') break // contribui 0

        const argList = findArgSelectorList(node)
        if (FUNCTIONAL_MOST_SPECIFIC.has(name) && argList) {
          const [, mb, mc, md] = maxSpecificityOfList(argList)
          id += mb; cls += mc; type += md
        } else if (NTH_WITH_SELECTOR.has(name) && argList) {
          // A pseudo-classe conta + o "of <S>" mais específico.
          cls++
          const [, mb, mc, md] = maxSpecificityOfList(argList)
          id += mb; cls += mc; type += md
        } else {
          cls++ // pseudo-classe normal (:hover, :first-child, etc.)
        }
        break
      }
      // Combinator, WhiteSpace, NestingSelector, Raw → ignorados
    }
  })
  return [0, id, cls, type]
}

/**
 * Calcula specificity a partir de um nó AST do css-tree (Selector / SelectorList / Raw).
 * Reusa o AST já parseado (ex: Rule.prelude no CssExplorerTreeBuilder) — sem reparse.
 * @param {object} node - Nó css-tree
 * @returns {number[]} [inline, id, class, tag]
 */
export function getSpecificityFromAst(node) {
  if (!node) return [0, 0, 0, 0]
  if (node.type === 'SelectorList') return maxSpecificityOfList(node)
  if (node.type === 'Selector') return specificityOfSelector(node)
  // Prelude em modo tolerante pode vir como Raw — cai pro parser de string.
  if (node.type === 'Raw' && typeof node.value === 'string') return getSpecificity(node.value)
  return [0, 0, 0, 0]
}

/**
 * Calculate CSS selector specificity from a selector string.
 * Parseia com css-tree e delega para getSpecificityFromAst (Selectors L4 correto).
 * Para listas separadas por vírgula, retorna a specificity do seletor mais específico.
 * @param {string} selector - CSS selector
 * @returns {number[]} Specificity array [inline, id, class, tag]
 */
export function getSpecificity(selector) {
  if (!selector || typeof selector !== 'string') return [0, 0, 0, 0]
  try {
    const ast = parse(selector, { context: 'selectorList' })
    return getSpecificityFromAst(ast)
  } catch {
    return [0, 0, 0, 0]
  }
}
