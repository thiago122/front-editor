// useBoxModel.js
export function useBoxModel(iframeRef) {
  const getDoc = () => iframeRef.value?.contentDocument

  /**
   * Helper para aplicar dimensões
   */
  function setRectOverlay(el, top, left, width, height) {
    if (!el) return
    el.style.top = `${top}px`
    el.style.left = `${left}px`
    el.style.width = `${Math.max(0, width)}px`
    el.style.height = `${Math.max(0, height)}px`
  }

  /**
   * Lógica principal de desenho do Box Model
   */
  function updateOverlay(nodeId) {
    const doc = getDoc()
    if (!doc || !nodeId) return

    const el = doc.querySelector(`[data-node-id="${nodeId}"]`)
    if (!el) return

    const overlay = ensureOverlay(doc)

    // Cálculos de geometria
    const rect = el.getBoundingClientRect()
    const style = doc.defaultView.getComputedStyle(el)

    const parse = (val) => parseFloat(val) || 0

    const margin = {
      top: parse(style.marginTop),
      right: parse(style.marginRight),
      bottom: parse(style.marginBottom),
      left: parse(style.marginLeft),
    }

    const border = {
      top: parse(style.borderTopWidth),
      right: parse(style.borderRightWidth),
      bottom: parse(style.borderBottomWidth),
      left: parse(style.borderLeftWidth),
    }

    const padding = {
      top: parse(style.paddingTop),
      right: parse(style.paddingRight),
      bottom: parse(style.paddingBottom),
      left: parse(style.paddingLeft),
    }

    // 1. Margin (Camada externa)
    setRectOverlay(
      overlay._margin,
      rect.top - margin.top,
      rect.left - margin.left,
      rect.width + margin.left + margin.right,
      rect.height + margin.top + margin.bottom,
    )

    // 2. Border
    setRectOverlay(overlay._border, rect.top, rect.left, rect.width, rect.height)

    // 3. Padding
    setRectOverlay(
      overlay._padding,
      rect.top + border.top,
      rect.left + border.left,
      rect.width - border.left - border.right,
      rect.height - border.top - border.bottom,
    )

    // 4. Content (Camada interna)
    setRectOverlay(
      overlay._content,
      rect.top + border.top + padding.top,
      rect.left + border.left + padding.left,
      rect.width - border.left - border.right - padding.left - padding.right,
      rect.height - border.top - border.bottom - padding.top - padding.bottom,
    )
  }

  function ensureOverlay(doc) {
    let root = doc.getElementById('__box-model-overlay__')
    if (root) return root

    root = doc.createElement('div')
    root.id = '__box-model-overlay__'

    const layers = ['margin', 'border', 'padding', 'content']
    layers.forEach((layer) => {
      const div = doc.createElement('div')
      div.className = layer
      root.appendChild(div)
      root[`_${layer}`] = div // Atalho para referência rápida
    })

    doc.body.appendChild(root)

    const style = doc.createElement('style')
    style.id = '__box-model-style__'
    style.textContent = `
        #__box-model-overlay__ { position: fixed; pointer-events: none; z-index: 999999; }
        #__box-model-overlay__ > div { position: fixed; box-sizing: border-box; }
        .margin { background: rgba(255, 156, 0, 0.3); }
        .border { background: rgba(255, 200, 50, 0.3); }
        .padding { background: rgba(77, 200, 0, 0.3); }
        .content { background: rgba(59, 130, 246, 0.4); }
      `
    doc.head.appendChild(style)
    return root
  }

  function hideOverlay() {
    const doc = getDoc()
    doc?.getElementById('__box-model-overlay__')?.remove()
    doc?.getElementById('__box-model-style__')?.remove()
  }

  return { updateOverlay, hideOverlay }
}
