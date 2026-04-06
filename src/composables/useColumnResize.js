import { ref, onUnmounted } from 'vue'

/**
 * useColumnResize
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Composable de redimensionamento de colunas por arrastar.
 *
 * Para desenvolvedores júnior:
 *   - Chame `startResize(e, widthRef, options)` no mousedown do handle.
 *   - O widthRef é um ref<number> que controla a largura da coluna em pixels.
 *   - col-main absorve a diferença automaticamente por ser flex-1.
 *
 * @example
 *   const { startResize } = useColumnResize()
 *   const inspectorWidth = ref(300)
 *   // no template: @mousedown="e => startResize(e, inspectorWidth, { min: 200, max: 480 })"
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function useColumnResize() {

  /** true enquanto o usuário está arrastando — usado para aplicar cursor global */
  const isResizing = ref(false)

  // Referências internas do drag ativo (limpas ao soltar o mouse)
  let _widthRef  = null
  let _startX    = 0
  let _startW    = 0
  let _min       = 0
  let _max       = Infinity
  let _direction = 1 // +1 = handle à direita da coluna, -1 = handle à esquerda
  let _multiplier = 1

  // ─── Handlers de documento ────────────────────────────────────────────────

  function onMouseMove(e) {
    if (!_widthRef) return
    const delta     = (e.clientX - _startX) * _direction * _multiplier
    const newWidth  = Math.min(_max, Math.max(_min, _startW + delta))
    _widthRef.value = newWidth
  }

  function onMouseUp() {
    _widthRef          = null
    isResizing.value   = false
    document.body.style.cursor       = ''
    document.body.style.userSelect   = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup',   onMouseUp)
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  /**
   * Inicia o redimensionamento a partir de um evento mousedown no handle.
   *
   * @param {MouseEvent} e         - O evento mousedown do handle
   * @param {Ref<number>} widthRef - ref reativo que controla a largura da coluna
   * @param {object} [options]
   * @param {number} [options.min=100]      - Largura mínima em px
   * @param {number} [options.max=Infinity] - Largura máxima em px
   * @param {number} [options.direction=1]  - +1 se handle à direita, -1 se à esquerda
   * @param {number} [options.multiplier=1] - Fator de multiplicação do movimento do mouse
   */
  function startResize(e, widthRef, { min = 100, max = Infinity, direction = 1, multiplier = 1 } = {}) {
    e.preventDefault()

    _widthRef  = widthRef
    _startX    = e.clientX
    _startW    = widthRef.value
    _min       = min
    _max       = max
    _direction = direction
    _multiplier = multiplier

    isResizing.value             = true
    document.body.style.cursor   = 'col-resize'
    document.body.style.userSelect = 'none'

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup',   onMouseUp)
  }

  // Limpeza de segurança se o componente for desmontado durante um drag
  onUnmounted(onMouseUp)

  return { startResize, isResizing }
}
