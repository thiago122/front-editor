/**
 * CSS Injector Class
 * Converts <link> CSS references into inline <style> tags for editing
 */
export class CssInjector {
  constructor(targetDoc, cssContentMap = new Map()) {
    this.targetDoc = targetDoc
    this.cssContentMap = cssContentMap
    this.failedFiles = []
  }

  /**
   * Main injection method
   * @param {string[]} locations - Array of location types (e.g., ['internal', 'external'])
   */
  async inject(locations) {
    console.log('[CssInjector] Starting injection...', { locations })
    
    const selectors = this.buildSelectors(locations)
    
    if (selectors.length === 0) {
      console.log('[CssInjector] No locations specified')
      return
    }
    
    const selector = selectors.join(', ')
    const elements = this.targetDoc.querySelectorAll(selector)
    console.log(`[CssInjector] Found ${elements.length} element(s) to process`, elements)
    
    for (const element of elements) {
      await this.processLink(element)
    }
    
    this.reportFailures()
    
    console.log('[CssInjector] Injection complete')
  }

  /**
   * Build CSS selectors from location names
   * @param {string[]} locations - Location names
   * @returns {string[]} CSS selectors
   */
  buildSelectors(locations) {
    return locations.map(loc => `link[rel="stylesheet"][data-location="${loc}"]`)
  }

  /**
   * Process a single link element
   * @param {HTMLLinkElement} linkElement - Link element to process
   */
  async processLink(linkElement) {
    // Skip if already processed
    if (!linkElement.parentNode) {
      console.log(`[CssInjector] Skipping already processed element`)
      return
    }
    
    // Only process <link> elements
    if (linkElement.tagName !== 'LINK') {
      console.warn(`[CssInjector] Unexpected element type: ${linkElement.tagName}`)
      return
    }
    
    const href = linkElement.href
    console.log(`[CssInjector] Processing <link>: ${href}`)
    
    try {
      const cssText = await this.fetchCssContent(href)
      const uniqueId = this.generateUniqueId(href)
      const location = linkElement.getAttribute('data-location') || 'unknown'
      
      const styleElement = this.createStyleElement(cssText, location, href, uniqueId)
      this.replaceLink(linkElement, styleElement)
      
      const filename = new URL(href).pathname.split('/').pop() || 'style.css'
      console.log(`✅ Injected ${location} CSS: ${filename} (${cssText.length} bytes)`)
    } catch (error) {
      this.handleError(href, error)
    }
  }

  /**
   * Fetch CSS content (from cache or network)
   * @param {string} href - CSS file URL
   * @returns {Promise<string>} CSS text content
   */
  async fetchCssContent(href) {
    // Use pre-fetched content if available
    if (this.cssContentMap.has(href)) {
      const cssText = this.cssContentMap.get(href)
      console.log(`[CssInjector] Using pre-fetched content (${cssText.length} bytes)`)
      return cssText
    }
    
    // Fallback: fetch if not pre-loaded
    console.log(`[CssInjector] Fetching ${href}...`)
    const response = await fetch(href)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const cssText = await response.text()
    console.log(`[CssInjector] Fetched ${cssText.length} bytes`)
    return cssText
  }

  /**
   * Generate unique ID from URL path
   * @param {string} href - CSS file URL
   * @returns {string} Unique ID (e.g., 'assets_css__all.css')
   */
  generateUniqueId(href) {
    const url = new URL(href)
    const pathname = url.pathname
    const filename = pathname.split('/').pop() || 'style.css'
    
    // Generate readable ID from path: /assets/css/all.css → assets_css__all.css
    const pathParts = pathname.split('/').filter(p => p) // Remove empty parts
    const sanitizedPath = pathParts.slice(0, -1).join('_') // Get path without filename
    
    return sanitizedPath ? `${sanitizedPath}__${filename}` : filename
  }

  /**
   * Create <style> element with CSS content
   * @param {string} cssText - CSS content
   * @param {string} location - Location type (internal/external)
   * @param {string} href - Original CSS file URL
   * @param {string} uniqueId - Unique element ID
   * @returns {HTMLStyleElement} Created style element
   */
  createStyleElement(cssText, location, href, uniqueId) {
    const styleEl = this.targetDoc.createElement('style')
    styleEl.id = uniqueId
    styleEl.setAttribute('data-location', location)
    styleEl.setAttribute('data-source', href)
    styleEl.setAttribute('data-captured', 'true')
    styleEl.textContent = cssText
    
    return styleEl
  }

  /**
   * Replace link element with style element
   * @param {HTMLLinkElement} linkElement - Link to replace
   * @param {HTMLStyleElement} styleElement - Style to insert
   */
  replaceLink(linkElement, styleElement) {
    // Insert after link
    linkElement.parentNode.insertBefore(styleElement, linkElement.nextSibling)
    
    // Remove original link (no longer needed, data-source has the reference)
    linkElement.remove()
  }

  /**
   * Handle injection error
   * @param {string} href - Failed CSS file URL
   * @param {Error} error - Error object
   */
  handleError(href, error) {
    console.warn(`❌ Failed to inject ${href}:`, error.message)
    console.error(error)
    
    // Keep track of failed files
    this.failedFiles.push({
      href,
      error: error.message
    })
    
    // Leave the link as-is (not disabled, not editable)
    console.log(`⚠️ Keeping ${href} as non-editable link`)
  }

  /**
   * Process on_page styles (inline <style> blocks)
   * Assigns stable IDs to allow editing/referencing
   */
  processOnPageStyles() {
    console.log('[CssInjector] Processing on_page styles...')
    const styleElements = Array.from(this.targetDoc.querySelectorAll('style'))

    // Filter out styles that are already managed (have data-location)
    // We only want "raw" style tags that were part of the original HTML
    const onPageStyles = styleElements.filter(el => !el.hasAttribute('data-location'))

    if (onPageStyles.length === 0) {
      console.log('[CssInjector] No new on_page styles found.')
      return
    }

    console.log(`[CssInjector] Found ${onPageStyles.length} on_page style block(s).`)

    // We need to determine if we already have an "on_page" (editable) style
    // If we run this multiple times, we need to respect existing IDs
    let hasEditable = !!this.targetDoc.getElementById('on_page')
    
    onPageStyles.forEach(el => {
      // If element already has an ID, respect it, but tag it as on_page
      if (el.id) {
        if (!el.hasAttribute('data-location')) {
           el.setAttribute('data-location', 'on_page')
        }
        if (el.id === 'on_page') hasEditable = true
        return
      }

      // Assign ID
      if (!hasEditable) {
        // First one becomes the editable one
        el.id = 'on_page'
        el.setAttribute('data-location', 'on_page')
        hasEditable = true
        console.log('[CssInjector] Assigned ID "on_page" (editable)')
      } else {
        // Subsequent ones are read-only
        const nextNum = this.getNextReadOnlyIndex()
        el.id = `on_page_readonly-${nextNum}`
        el.setAttribute('data-location', 'on_page')
        el.setAttribute('data-readonly', 'true')
        console.log(`[CssInjector] Assigned ID "${el.id}" (read-only)`)
      }
    })
  }

  /**
   * Get next available index for read-only styles
   */
  getNextReadOnlyIndex() {
    const existing = Array.from(this.targetDoc.querySelectorAll('style[id^="on_page_readonly-"]'))
    if (existing.length === 0) return 2
    
    const numbers = existing
      .map(el => {
        const match = el.id.match(/^on_page_readonly-(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
    
    return Math.max(...numbers, 1) + 1
  }

  /**
   * Report failures to user via alert
   */
  reportFailures() {
    if (this.failedFiles.length > 0) {
      const fileList = this.failedFiles
        .map(f => `• ${f.href}\n  Error: ${f.error}`)
        .join('\n\n')
      
      alert(
        `⚠️ CSS Injection Warning\n\n` +
        `The following internal CSS files could not be loaded and will remain as non-editable links:\n\n` +
        `${fileList}\n\n` +
        `These files will be displayed but cannot be edited in the CSS Inspector.`
      )
    }
  }
}
