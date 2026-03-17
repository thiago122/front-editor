// src/composables/useDragDrop.js
//
// Drag and drop de elementos HTML no canvas.
// SINGLETON DE MÓDULO: todas as variáveis de estado estão no escopo
// do módulo, não dentro da função factory. Isso garante que
// HighlightOverlay e Preview.vue compartilhem o mesmo _iframeRef
// e os mesmos handlers, independente de quantas vezes useDragDrop() é chamado.

import { ref } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'

// ── Estado reativo público ─────────────────────────────────────────────────────
export const dragState = {
  active:    ref(false),
  nodeId:    ref(null),       // nodeId do nó sendo arrastado
  indicator: ref(null),       // { parentId, index, lineY, lineX, lineW }
}

// ── Estado interno (módulo-level, não reativo) ─────────────────────────────────
let _iframeRef   = null   // Ref<HTMLIFrameElement> — definida em setup()
let _startX      = 0
let _startY      = 0
let _dragStarted = false
const DRAG_THRESHOLD = 5  // px mínimos antes de ativar drag

// Tags que não podem ser pai de destino
const REJECT_AS_PARENT = new Set([
  'html', 'head', 'script', 'style', 'meta', 'link', 'title', 'base',
])

// ── Helpers ────────────────────────────────────────────────────────────────────

function getIframe() {
  return _iframeRef?.value ?? null
}

function toIframeCoords(clientX, clientY) {
  const iframe = getIframe()
  if (!iframe) return null
  const r = iframe.getBoundingClientRect()
  return { x: clientX - r.left, y: clientY - r.top }
}

function getDropTarget(clientX, clientY) {
  const iframe = getIframe()
  if (!iframe) return null

  const pos = toIframeCoords(clientX, clientY)
  if (!pos) return null

  const doc = iframe.contentDocument
  if (!doc) return null

  // Oculta temporariamente o elemento arrastado para não capturá-lo como target
  const dragEl = dragState.nodeId.value
    ? doc.querySelector(`[data-node-id="${dragState.nodeId.value}"]`)
    : null

  if (dragEl) dragEl.style.pointerEvents = 'none'
  let el = doc.elementFromPoint(pos.x, pos.y)
  if (dragEl) dragEl.style.pointerEvents = ''

  if (!el) return null

  el = el.closest('[data-node-id]')
  if (!el) return null
  if (el.dataset.nodeId === dragState.nodeId.value) return null

  const tag       = el.tagName.toLowerCase()
  const elRect    = el.getBoundingClientRect()
  const iframeRect = iframe.getBoundingClientRect()
  const parentEl  = el.parentElement?.closest('[data-node-id]')

  // Posição relativa do mouse dentro do elemento (0 = topo, 1 = base)
  const relY = elRect.height > 0
    ? (clientY - iframeRect.top - elRect.top) / elRect.height
    : 0.5

  if (relY < 0.25 && parentEl) {
    return buildIndicator(el, parentEl, 'before', iframeRect)
  }
  if (relY > 0.75 && parentEl) {
    return buildIndicator(el, parentEl, 'after', iframeRect)
  }
  // Zona central: inserir como último filho do elemento
  if (!REJECT_AS_PARENT.has(tag)) {
    return buildIndicator(null, el, 'inside', iframeRect)
  }

  return null
}

function buildIndicator(siblingEl, parentEl, position, iframeRect) {
  const parentNodeId = parentEl.dataset.nodeId
  if (!parentNodeId) return null

  let index = 0
  let lineY  = 0
  let lineX  = 0
  let lineW  = 0

  // getBoundingClientRect() é relativo ao viewport do iframe.
  // Somamos iframeRect para obter coords no viewport principal.
  const parentRect = parentEl.getBoundingClientRect()

  if (position === 'inside') {
    const children  = [...parentEl.children].filter(c => c.dataset?.nodeId)
    index           = children.length
    const lastChild = children[children.length - 1]
    const refRect   = lastChild?.getBoundingClientRect()
    lineY = iframeRect.top  + (refRect ? refRect.bottom : parentRect.top + 4)
    lineX = iframeRect.left + parentRect.left
    lineW = parentRect.width
  } else {
    const siblings = [...parentEl.children].filter(c => c.dataset?.nodeId)
    const sibIdx   = siblings.indexOf(siblingEl)
    index          = position === 'before' ? Math.max(0, sibIdx) : sibIdx + 1
    const sbRect   = siblingEl.getBoundingClientRect()
    lineY = iframeRect.top  + (position === 'before' ? sbRect.top : sbRect.bottom)
    lineX = iframeRect.left + parentRect.left
    lineW = parentRect.width
  }

  return { parentId: parentNodeId, index, lineY, lineX, lineW }
}

// ── Handlers de mouse ──────────────────────────────────────────────────────────

function onMouseMove(e) {
  const dx = e.clientX - _startX
  const dy = e.clientY - _startY

  if (!_dragStarted) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    _dragStarted = true
    dragState.active.value = true
  }

  dragState.indicator.value = getDropTarget(e.clientX, e.clientY)
}

function onMouseUp() {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup',   onMouseUp)
  document.body.style.cursor     = ''
  document.body.style.userSelect = ''

  if (_dragStarted && dragState.indicator.value) {
    const EditorStore = useEditorStore()
    const { parentId, index } = dragState.indicator.value
    EditorStore.manipulation.moveNodeToParent(
      dragState.nodeId.value,
      parentId,
      index,
    )
  }

  dragState.active.value    = false
  dragState.nodeId.value    = null
  dragState.indicator.value = null
  _dragStarted = false
}

// ── API pública ────────────────────────────────────────────────────────────────

/**
 * Armazena a referência ao iframe (chamado uma vez em Preview.vue no load).
 * @param {import('vue').Ref<HTMLIFrameElement>} iframeRef
 */
function setup(iframeRef) {
  _iframeRef = iframeRef
}

/**
 * Inicia o drag de um nó. Chamado pelo mousedown no handle do HighlightOverlay.
 * @param {string} nodeId
 * @param {MouseEvent} event
 */
function startDrag(nodeId, event) {
  _startX = event.clientX
  _startY = event.clientY
  _dragStarted = false
  dragState.nodeId.value = nodeId

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup',   onMouseUp)

  document.body.style.cursor     = 'grabbing'
  document.body.style.userSelect = 'none'
}

// Exporta a mesma API que o composable, mas como módulo singleton
export function useDragDrop() {
  return { setup, startDrag, dragState }
}
