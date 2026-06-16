import { ref, watch } from 'vue'

/**
 * Fatia do EditorStore: estilos utilitários injetados no iframe
 * (Outline Mode + placeholder de elementos vazios).
 *
 * Os <style> injetados usam IDs fixos e data-location="ignore"; o hook
 * document:beforeSave os remove antes de salvar. São apenas auxílio visual —
 * nunca escrevem estado inline nos elementos do documento.
 *
 * @param {{ getIframeDoc: () => Document|null, iframe: import('vue').Ref }} deps
 */
export function createEditorStylesSlice({ getIframeDoc, iframe }) {
  const outlineMode = ref(true) // outline mode ligado por padrão
  const showEmptyPlaceholder = ref(true) // placeholder em vazios ligado por padrão

  const OUTLINE_STYLE_ID = 'editor-outline-mode'
  const EMPTY_PLACEHOLDER_STYLE_ID = 'editor-empty-placeholder'

  /**
   * Aplica ou remove estilos utilitários (outline, placeholders) no documento do iframe.
   * Centralizado para garantir consistência no load inicial e em reloads.
   */
  function applyEditorStyles(doc = getIframeDoc()) {
    if (!doc) return

    // 1. Outline Mode
    doc.getElementById(OUTLINE_STYLE_ID)?.remove()
    if (outlineMode.value) {
      const style = doc.createElement('style')
      style.id = OUTLINE_STYLE_ID
      style.setAttribute('data-location', 'ignore')
      style.textContent = `
        /* Linhas base sutis para todos */
        * { outline: 1px solid rgba(0, 0, 0, 0.1) !important; outline-offset: -1px; transition: outline-color 0.2s; }

        /* Cores temáticas por categoria (mais vibrantes) */
        div, section, article, main, header, footer { outline-color: rgba(99, 102, 241, 0.4) !important; }
        span, p, h1, h2, h3, h4, h5, h6 { outline-color: rgba(245, 158, 11, 0.4) !important; }
        a, button, input, select, textarea { outline-color: rgba(16, 185, 129, 0.5) !important; }
        img, video, svg, canvas { outline-color: rgba(236, 72, 153, 0.5) !important; }

        /* Realce de hover (o label da tag é exibido pelo HighlightOverlay.vue) */
        *:not(html):not(body):hover {
          outline: 2px solid #6366f1 !important;
          outline-offset: -2px;
          z-index: 9999;
        }
      `
      doc.head.appendChild(style)
    }

    // 2. Empty Placeholders
    doc.getElementById(EMPTY_PLACEHOLDER_STYLE_ID)?.remove()
    if (showEmptyPlaceholder.value) {
      const style = doc.createElement('style')
      style.id = EMPTY_PLACEHOLDER_STYLE_ID
      style.setAttribute('data-location', 'ignore')
      style.textContent = `
        [data-node-id]:empty:not(br):not(hr):not(img):not(input):not(svg):not(video):not(iframe):not(canvas):not(button):not(option):not(optgroup):not(select):not(textarea)  {
          min-height: 24px;
          outline: 1.5px dashed rgba(99,102,241,0.5) !important;
          position: relative;
          display: flex !important;
          align-items: center;
          justify-content: center;
        }
        [data-node-id]:empty:not(br):not(hr):not(img):not(input):not(svg):not(video):not(iframe):not(canvas):not(button):not(option):not(optgroup):not(select):not(textarea)::before {
          content: "vazio" !important;
          font-size: 10px;
          font-family: monospace;
          color: rgba(99, 102, 241, 0.6);
          pointer-events: none;
        }
      `
      doc.head.appendChild(style)
    }
  }

  // Watchers reagindo a mudanças de estado manuais
  watch([outlineMode, showEmptyPlaceholder], () => applyEditorStyles())
  watch(iframe, (newIframe) => {
    if (newIframe) applyEditorStyles(newIframe.contentDocument)
  })

  return { outlineMode, showEmptyPlaceholder, applyEditorStyles }
}
