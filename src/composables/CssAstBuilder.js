import { parse, walk } from 'css-tree'

/**
 * CSS AST Builder Class
 * Builds a navigable CSS logic tree from a document's stylesheets
 */
export class CssAstBuilder {
  constructor(targetDoc, cssContentMap = new Map()) {
    this.targetDoc = targetDoc
    this.cssContentMap = cssContentMap
    this.targetWin = targetDoc.defaultView || window
    this.nodeCounter = 0
    this.masterAst = {
      type: 'StyleSheet',
      loc: null,
      children: []
    }
  }

  /**
   * Main build method
   * @returns {Object} Master AST object
   */
  build() {
    console.time('buildCssAst')
    
    this.processAllStyleSheets()
    
    console.log(`AST built with ${this.masterAst.children.length} rules.`)
    console.timeEnd('buildCssAst')
    
    return this.masterAst
  }

  /**
   * Process all stylesheets in the document
   */
  processAllStyleSheets() {
    Array.from(this.targetDoc.styleSheets).forEach(sheet => {
      this.processStyleSheet(sheet)
    })
  }

  /**
   * Process a single stylesheet
   */
  processStyleSheet(sheet) {
    try {
      const owner = sheet.ownerNode
      if (!owner || this.shouldIgnoreSheet(owner)) {
        return
      }

      const { origin, sourceName } = this.detectOrigin(owner)
      const cssText = this.extractCssText(sheet, owner, sourceName)
      
      if (!cssText.trim()) {
        return
      }

      console.log(`[CssAstBuilder] Processing ${sourceName} [${origin}] (${cssText.length} bytes)`)
      
      this.parseAndMerge(cssText, origin, sourceName, owner)
    } catch (e) {
      console.warn('[CssAstBuilder] Skip sheet due to error:', e)
    }
  }

  /**
   * Check if sheet should be ignored
   */
  shouldIgnoreSheet(owner) {
    return owner.id === 'vite-plugin-vue-devtools' || 
           owner.id === 'editor-ui-styles'
  }

  /**
   * Detect CSS origin and source name
   */
  detectOrigin(owner) {
    let origin = 'internal'
    let sourceName = owner.id || null  // Use existing ID if available

    // Check for data-location attribute (from CssInjector)
    if (owner.getAttribute('data-location')) {
      origin = owner.getAttribute('data-location').toLowerCase()
    } 
    // Otherwise, it's an on_page style
    else if (owner.tagName === 'STYLE') {
      origin = 'on_page'
    }

    // Handle on_page styles: first is editable, others are read-only
    if (origin === 'on_page' && !sourceName) {
      const hasOnPage = this.targetDoc.getElementById('on_page')
      
      if (!hasOnPage) {
        // First inline <style> → editable
        sourceName = 'on_page'
        owner.id = 'on_page'
      } else {
        // Subsequent inline <style> → read-only
        sourceName = this.generateReadOnlyId()
        owner.id = sourceName
        owner.setAttribute('data-readonly', 'true')
      }
    }

    // Fallback: ensure sourceName is never null
    if (!sourceName) {
      sourceName = owner.id || 'style'
    }

    return { origin, sourceName }
  }

  /**
   * Generate unique ID for read-only on_page styles
   * @returns {string} Unique ID (e.g., 'on_page_readonly-2', 'on_page_readonly-3', etc.)
   */
  generateReadOnlyId() {
    const existingReadOnly = Array.from(
      this.targetDoc.querySelectorAll('style[id^="on_page_readonly"]')
    )
    
    const nextNum = existingReadOnly.length + 2  // Start at 2
    return `on_page_readonly-${nextNum}`
  }

  /**
   * Generate unique ID for on_page styles (DEPRECATED - kept for reference)
   * @returns {string} Unique ID (e.g., 'on_page', 'on_page-2', etc.)
   */
  generateOnPageId() {
    const existingOnPageStyles = Array.from(this.targetDoc.querySelectorAll('style[id^="on_page"]'))
    
    if (existingOnPageStyles.length === 0) {
      return 'on_page'
    }
    
    // Find next available number
    const numbers = existingOnPageStyles
      .map(el => {
        const match = el.id.match(/^on_page-(\d+)$/)
        return match ? parseInt(match[1], 10) : 1
      })
      .filter(n => !isNaN(n))
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 1
    return `on_page-${maxNumber + 1}`
  }


  /**
   * Extract CSS text from stylesheet
   */
  extractCssText(sheet, owner, sourceName) {
    // Try getting text from owner first (good for internal/injected styles)
    if (owner.tagName === 'STYLE' && owner.textContent.trim().length > 0) {
      return owner.textContent
    }

    // Try reading rules (necessary for <link> tags and some injected styles)
    try {
      const rules = sheet.cssRules || sheet.rules
      if (rules) {
        return Array.from(rules).map(r => r.cssText).join('\n')
      }
    } catch (e) {
      this.handleCorsError(sheet, sourceName, e)
    }

    return ''
  }

  /**
   * Handle CORS errors when accessing external stylesheets
   */
  handleCorsError(sheet, sourceName, error) {
    if (!sheet._corsErrorLogged) {
      const tip = sourceName.includes('fonts.googleapis.com') 
        ? "TIP: Google Fonts require 'crossorigin' attribute on the link tag for inspection."
        : "External rules cannot be inspected without 'crossorigin' attribute on the link tag."
      
      console.warn(`[CssAstBuilder] Style "${sourceName}" is CORS-protected. ${tip}`, error.message)
      sheet._corsErrorLogged = true
    }
  }

  /**
   * Parse CSS text and merge into master AST
   */
  parseAndMerge(cssText, origin, sourceName, owner) {
    const sheetAst = parse(cssText, {
      positions: true,
      parseValue: true,
      parseCustomProperty: true,
      parseAtrulePrelude: true
    })

    // Check if this is a read-only style
    const isReadOnly = owner?.getAttribute('data-readonly') === 'true'
    
    this.addMetadata(sheetAst, origin, sourceName, isReadOnly)
    
    // Mark as captured
    if (owner) owner.dataset.captured = 'true'

    // Merge into master AST
    const children = sheetAst.children.toArray?.() || sheetAst.children
    children.forEach(child => this.masterAst.children.push(child))
  }

  /**
   * Add metadata to AST nodes
   */
  addMetadata(ast, origin, sourceName, isReadOnly = false) {
    const nextId = () => `node-${++this.nodeCounter}`

    // Add metadata to Rules
    walk(ast, {
      visit: 'Rule',
      enter(node) {
        node.origin = origin
        node.sourceName = sourceName
        node._nodeId = nextId()
        node.readonly = isReadOnly  // ✅ Mark as read-only
      }
    })

    // Add metadata to At-rules
    walk(ast, {
      visit: 'Atrule',
      enter(node) {
        node.origin = origin
        node.sourceName = sourceName
        node._nodeId = nextId()
        node.readonly = isReadOnly  // ✅ Mark as read-only
      }
    })
  }
}
