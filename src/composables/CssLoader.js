/**
 * CssLoader Class
 * Handles loading and fetching CSS files from a document
 */
export class CssLoader {
  constructor(doc) {
    this.doc = doc
  }

  /**
   * Wait for CSS files to finish loading
   * @param {string[]} locations - Array of locations to wait for (e.g., ['internal', 'external'])
   * @returns {Promise<void>}
   */
  async waitCssFilesLoad(locations = ['external']) {
    // Build selector for specified locations
    const selectors = locations.map(loc => `link[rel="stylesheet"][data-location="${loc}"]`).join(', ')
    const links = this.doc.querySelectorAll(selectors)
    
    if (links.length === 0) {
      return
    }

    console.log(`[CssLoader] Waiting for ${links.length} CSS file(s) to load (${locations.join(', ')})...`)
    
    const promises = Array.from(links).map(link => {
      return new Promise((resolve) => {
        // If already loaded (has stylesheet)
        if (link.sheet) {
          console.log(`[CssLoader] ✅ Already loaded: ${link.href}`)
          resolve()
          return
        }

        // Wait for load event
        link.addEventListener('load', () => {
          console.log(`[CssLoader] ✅ Loaded: ${link.href}`)
          resolve()
        })

        // Handle errors gracefully
        link.addEventListener('error', () => {
          console.warn(`[CssLoader] ⚠️ Failed to load: ${link.href}`)
          resolve() // Resolve anyway to not block
        })

        // Timeout fallback (10 seconds max)
        setTimeout(() => {
          console.warn(`[CssLoader] ⏱️ Timeout: ${link.href}`)
          resolve()
        }, 10000)
      })
    })

    await Promise.all(promises)
  }

  /**
   * Fetch CSS file contents
   * @param {string[]} locations - Array of locations to fetch (e.g., ['internal', 'external'])
   * @returns {Promise<Map<string, string>>} - Map of href -> CSS content
   */
  async fetchCssFileContent(locations = ['internal']) {
    // Build selector for specified locations
    const selectors = locations.map(loc => `link[rel="stylesheet"][data-location="${loc}"]`).join(', ')
    const links = this.doc.querySelectorAll(selectors)
    const cssContentMap = new Map()
    
    if (links.length === 0) {
      return cssContentMap
    }

    console.log(`[CssLoader] Fetching ${links.length} CSS file(s) (${locations.join(', ')})...`)
    
    const promises = Array.from(links).map(async (link) => {
      try {
        console.log(`[CssLoader] Fetching: ${link.href}`)
        const response = await fetch(link.href)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const cssText = await response.text()
        cssContentMap.set(link.href, cssText)
        
        console.log(`[CssLoader] ✅ Fetched: ${link.href}`)
      } catch (error) {
        console.warn(`[CssLoader] ⚠️ Failed to fetch: ${link.href}`, error.message)
      }
    })

    await Promise.all(promises)
    return cssContentMap
  }

  /**
   * Load CSS files and return their content
   * @param {string[]} locations - Array of locations to load (e.g., ['internal', 'external'])
   * @returns {Promise<Map<string, string>>} - Map of href -> CSS content
   */
  async loadCssFiles(locations = ['internal', 'external']) {
    const promises = []

    // Wait for CSS files to load
    promises.push(this.waitCssFilesLoad(locations))

    // Fetch CSS content
    let cssContentMap = new Map()
    promises.push(
      this.fetchCssFileContent(locations).then(map => {
        cssContentMap = map
      })
    )

    await Promise.all(promises)
    console.log('[CssLoader] All CSS loaded')
    
    return cssContentMap
  }
}
