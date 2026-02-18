/**
 * StyleSheetManager Class
 * Manages the document's stylesheets (enable/disable, create, remove).
 */
export class StyleSheetManager {
  constructor(targetDoc = document) {
    this.targetDoc = targetDoc
  }

  /**
   * Enable or disable captured stylesheets
   * @param {boolean} disabled - Whether to disable the sheets
   */
  disableCapturedSheets(disabled) {
    Array.from(this.targetDoc.styleSheets).forEach(sheet => {
      try {
        const owner = sheet.ownerNode
        if (
          owner &&
          (owner.id === 'vite-plugin-vue-devtools' ||
            owner.dataset.captured !== 'true')
        )
          return

        sheet.disabled = disabled
      } catch (e) {
        // Safe skip (e.g. cross-origin issues access)
      }
    })
  }
}
