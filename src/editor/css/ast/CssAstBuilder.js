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
    this.cssParserAst = {
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
    this.processAllStyleSheets()
    return this.cssParserAst
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
      if (!owner || this.shouldIgnoreSheet(owner)) return

      const { origin, sourceName } = this.detectOrigin(owner)
      const cssText = this.extractCssText(sheet, owner, sourceName)
      if (!cssText.trim()) return

      this.parseAndMerge(cssText, origin, sourceName, owner)
    } catch (e) {
      console.warn('[CssAstBuilder] Skip sheet due to error:', e)
    }
  }

  /**
   * Check if sheet should be ignored
   */
  shouldIgnoreSheet(owner) {
    // Editor runtime styles
    if (owner.id === 'vite-plugin-vue-devtools') return true
    if (owner.id === 'editor-ui-styles') return true
    // data-location="ignore" → leave completely untouched by the editor
    if (owner.getAttribute?.('data-location') === 'ignore') return true
    return false
  }

  /**
   * Detect CSS origin and source name
   */
  detectOrigin(owner) {
    let origin = 'internal'

    // Check for data-location attribute (from CssInjector)
    if (owner.getAttribute('data-location')) {
      origin = owner.getAttribute('data-location').toLowerCase()
    }
    // Otherwise, it's an on_page style (legacy/fallback)
    else if (owner.tagName === 'STYLE') {
      origin = 'on_page'
    }

    // sourceName: usado como chave para salvar o arquivo.
    // Prioridade:
    //   1. data-manifest-path — path relativo real do arquivo (ex: 'css/global.css')
    //   2. data-source-name   — nome definido manualmente
    //   3. owner.id           — legado
    //   4. owner.href (short) — para <link> tags externas
    //   5. 'style'            — fallback final
    let sourceName =
      owner.getAttribute('data-manifest-path') ||
      owner.getAttribute('data-source-name') ||
      owner.id

    if (!sourceName && owner.tagName === 'LINK' && owner.href) {
      try {
        const url = new URL(owner.href)
        sourceName = url.pathname.split('/').pop() || url.hostname
      } catch (e) {
        sourceName = owner.href
      }
    }

    if (!sourceName) sourceName = 'style'

    return { origin, sourceName }
  }

  /**
   * Extract CSS text from stylesheet
   */
  extractCssText(sheet, owner, sourceName) {
    // 1. <style> tags: lê diretamente o textContent
    if (owner.tagName === 'STYLE' && owner.textContent.trim().length > 0) {
      return owner.textContent
    }

    const href = owner.href || ''

    // 2. <link> tags: tenta ler cssRules (pode falhar por CORS em arquivos externos)
    try {
      const rules = sheet.cssRules || sheet.rules
      if (rules) {
        return Array.from(rules).map(r => r.cssText).join('\n')
      }
    } catch (e) {
      // 3. Fallback: usa o texto já fetched via fetch() (disponível para arquivos externos
      //    mesmo com CORS, desde que o servidor não bloqueie o método fetch)
      const fetchedText = this.cssContentMap.get(href)
      
      if (fetchedText?.trim()) {
        this.handleCorsError(sheet, sourceName, href, e, true) // true = recovered
        
        // Marca o owner como readonly para que o inspector não permita edições
        if (owner && !owner.hasAttribute('data-readonly')) {
          owner.setAttribute('data-readonly', 'true')
        }
        return fetchedText
      }
      
      this.handleCorsError(sheet, sourceName, href, e, false) // false = failed completely
    }

    return ''
  }

  /**
   * Handle CORS errors when accessing external stylesheets
   */
  handleCorsError(sheet, sourceName, href, error, recovered = false) {
    if (!sheet._corsErrorLogged) {
      const isGoogleFonts = href.includes('fonts.googleapis.com') || sourceName.includes('fonts.googleapis.com')
      
      const tip = isGoogleFonts
        ? "TIP: Google Fonts require 'crossorigin' attribute on the link tag for full inspection."
        : "External rules cannot be inspected directly without 'crossorigin' attribute on the link tag."
      
      const status = recovered ? 'Recovered via fetch (Read-Only)' : 'Failed to access'
      const msg = `[CssAstBuilder] Style "${sourceName}" is CORS-protected. ${status}. ${tip}`
      
      if (recovered) {
        console.info(msg, `Error details: ${error.message}`)
      } else {
        console.warn(msg, error.message)
      }
      
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
      parseAtrulePrelude: true,
      // O css-tree não anexa comentários à AST automaticamente de forma útil para geração,
      // mas habilitamos o suporte básico.
    })

    // Check if this is a read-only style
    const isReadOnly = owner?.getAttribute('data-readonly') === 'true'
    
    this.addMetadata(sheetAst, origin, sourceName, isReadOnly)
    
    // Mark as captured
    if (owner) owner.dataset.captured = 'true'

    // Merge into cssParserAst
    const children = sheetAst.children.toArray?.() || Array.from(sheetAst.children)
    children.forEach(child => this.cssParserAst.children.push(child))
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
        node.readonly = isReadOnly
      }
    })

    // Add metadata to At-rules
    walk(ast, {
      visit: 'Atrule',
      enter(node) {
        node.origin = origin
        node.sourceName = sourceName
        node._nodeId = nextId()
        node.readonly = isReadOnly
      }
    })
  }
}
