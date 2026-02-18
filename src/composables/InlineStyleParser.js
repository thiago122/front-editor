import { parse, walk, generate } from 'css-tree'
import { generateId } from '../utils/ids.js'
import { normalizePropertyName } from './cssUtils.js'
import { SPECIFICITY_INLINE } from './cssConstants.js'

/**
 * InlineStyleParser Class
 * Handles parsing and fallback for inline style attributes (style="...")
 */
export class InlineStyleParser {
  
  /**
   * Parse inline styles for an element
   * @param {Element} element - The DOM element to parse
   * @param {boolean} isTarget - Whether this element is the primary target
   * @returns {Object|null} Logic node for inline styles or null
   */
  parse(element, isTarget) {
    const styleAttr = element.getAttribute('style')?.trim()
    if (!styleAttr) return null

    const declarations = this.parseDeclarations(styleAttr, element)
    
    // If not target and no declarations, don't show empty inline block
    if (!isTarget && declarations.length === 0) return null

    return {
      uid: isTarget ? 'inline-target' : `inline-parent-${generateId()}`,
      selector: 'element.style',
      declarations,
      specificity: SPECIFICITY_INLINE,
      context: [],
      active: true,
      loc: 'inline'
    }
  }

  /**
   * Parse inline style declarations with fallback
   * @private
   */
  parseDeclarations(styleAttr, element) {
    try {
      return this.parseAst(styleAttr)
    } catch (e) {
      console.warn('Failed to parse inline style attribute, using fallback', e)
      return this.parseFallback(element)
    }
  }

  /**
   * Parse inline styles using CSS AST
   * @private
   */
  parseAst(styleAttr) {
    const inlineAst = parse(styleAttr, { context: 'declarationList' })
    const declarations = []
    let declIndex = 0

    walk(inlineAst, {
      visit: 'Declaration',
      enter(node) {
        const propName = node.property.toLowerCase()
        const { prop, disabled } = normalizePropertyName(propName)
        const rawValue = generate(node.value)

        declarations.push({
          id: `inline-decl-${declIndex++}`,
          prop,
          value: rawValue,
          important: !!node.important,
          disabled
        })
      }
    })

    return declarations
  }

  /**
   * Parse inline styles using DOM fallback method
   * @private
   */
  parseFallback(element) {
    const declarations = []
    const styleNames = Array.from(element.style)

    styleNames.forEach((propName, i) => {
      const { prop, disabled } = normalizePropertyName(propName)
      const value = element.style.getPropertyValue(propName)

      declarations.push({
        id: `inline-decl-${i}`,
        prop,
        value: value,
        important: element.style.getPropertyPriority(propName) === 'important',
        disabled
      })
    })

    return declarations
  }
}
