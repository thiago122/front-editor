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
  const isResizing = ref(false)

  let _ref        = null
  let _startPos   = 0
  let _startSize  = 0
  let _min        = 0
  let _max        = Infinity
  let _direction  = 1
  let _multiplier = 1
  let _axis       = 'x' // 'x' ou 'y'

  function onMouseMove(e) {
    if (!_ref) return
    const currentPos = _axis === 'x' ? e.clientX : e.clientY
    const delta      = (currentPos - _startPos) * _direction * _multiplier
    const newSize    = Math.min(_max, Math.max(_min, _startSize + delta))
    _ref.value = newSize
  }

  function onMouseUp() {
    _ref             = null
    isResizing.value = false
    document.body.style.cursor     = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup',   onMouseUp)
  }

  /**
   * @param {MouseEvent} e
   * @param {Ref<number>} sizeRef
   * @param {object} options
   * @param {string} [options.axis='x'] - 'x' para largura, 'y' para altura
   */
  function startResize(e, sizeRef, { min = 100, max = Infinity, direction = 1, multiplier = 1, axis = 'x' } = {}) {
    e.preventDefault()

    _ref        = sizeRef
    _axis       = axis
    _startPos   = axis === 'x' ? e.clientX : e.clientY
    _startSize  = sizeRef.value
    _min        = min
    _max        = max
    _direction  = direction
    _multiplier = multiplier

    isResizing.value             = true
    document.body.style.cursor   = axis === 'x' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup',   onMouseUp)
  }

  onUnmounted(onMouseUp)

  return { startResize, isResizing }
}
