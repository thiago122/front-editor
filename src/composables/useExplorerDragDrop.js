import { ref } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { findNodeById, findParentAndIndex } from '@/utils/ast'
import { DRAG_RESTRICTED_TAGS, SEMANTIC_ZONES } from '@/editor/html/constants'

/**
 * Retorna a zona semântica do nó ('head' ou 'body'), ou null se for raiz.
 * Impede moves cross-zone (ex: arrastar um <div> do body para dentro do head).
 */
function getNodeZone(ast, nodeId) {
  function walk(nodes, targetId, zone) {
    for (const node of nodes) {
      const currentZone = SEMANTIC_ZONES.has(node.tag) ? node.tag : zone
      if (node.nodeId === targetId) return currentZone
      if (node.children) {
        const r = walk(node.children, targetId, currentZone)
        if (r !== undefined) return r
      }
    }
    return undefined
  }
  const root = Array.isArray(ast) ? ast : [ast]
  return walk(root, nodeId, null) ?? null
}

// ── Estado reativo público ─────────────────────────────────────────────────────
export const explorerDragState = {
  active:    ref(false),
  nodeId:    ref(null),     // nodeId do nó sendo arrastado
  indicator: ref(null),     // { parentId, siblingId, position, lineY, lineX, lineW }
}

// ── Estado interno ─────────────────────────────────────────────────────────────
let _startX      = 0
let _startY      = 0
let _dragStarted = false
const DRAG_THRESHOLD = 5 // px mínimos antes de ativar drag

// ── Lógica de drop ─────────────────────────────────────────────────────────────

/** Elementos void que não podem ter filhos */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/**
 * Dado o clientX/Y atual, encontra a node-row mais próxima no Explorer
 * e calcula o indicador de drop (before / inside / after).
 *
 * Zonas de drop (3 faixas por row):
 *   ┌─────────────────────┐
 *   │  25%  before         │  → insere como irmão antes
 *   │  50%  inside ████████│  → insere como último filho (só containers)
 *   │  25%  after          │  → insere como irmão depois
 *   └─────────────────────┘
 *
 * Para elementos void (img, input, br...) a zona inside é ignorada
 * e usa-se o threshold 50% normal (before / after).
 */
function getDropIndicator(clientX, clientY) {
  // Oculta temporariamente o nó arrastado para não se auto-capturar
  const sourceRow = document.querySelector(`[data-ast-node-id="${explorerDragState.nodeId.value}"]`)
  if (sourceRow) sourceRow.style.pointerEvents = 'none'

  const el = document.elementFromPoint(clientX, clientY)

  if (sourceRow) sourceRow.style.pointerEvents = ''

  if (!el) return null

  // Sobe na árvore do DOM até achar uma node-row com data-ast-node-id
  const targetRow = el.closest('[data-ast-node-id]')
  if (!targetRow) return null

  const targetNodeId = targetRow.dataset.astNodeId
  if (!targetNodeId) return null

  // Não soltar sobre o próprio nó
  if (targetNodeId === explorerDragState.nodeId.value) return null

  // Não soltar sobre um descendente (sourceRow contém o targetRow no DOM)
  if (sourceRow && sourceRow.contains(targetRow)) return null

  const rect = targetRow.getBoundingClientRect()
  const relY = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5

  // Descobre se o nó alvo é um container (pode receber filhos)
  const targetTag = targetRow.closest('.ast-node')
    ?.querySelector(':scope > [data-ast-node-id]')
    ?.closest('.ast-node')
    ?.dataset.tag
    ?? targetRow.textContent?.match(/^\s*(\w+)/)?.[1]?.toLowerCase()
    ?? ''

  // Lê o tag do próprio targetRow para saber se é void
  // (o data-ast-node-id é o nodeId, o tag está no conteúdo da row — mas é melhor
  //  usar um data-attribute; por ora usamos heurística: se tem children wrapper visível
  //  OU não é void)
  const astNodeDiv    = targetRow.closest('.ast-node')
  const tagName       = (targetRow.dataset.tag ?? '').toLowerCase()
  const canHaveChildren = !VOID_ELEMENTS.has(tagName) && tagName !== ''

  // ── Calcular posição com base nas zonas ─────────────────────────────────
  const parentAstNode = astNodeDiv?.parentElement?.closest('.ast-node')
  const parentRow     = parentAstNode?.querySelector(':scope > [data-ast-node-id]')

  if (canHaveChildren) {
    // 3 zonas: top 25% → before | middle 50% → inside | bottom 25% → after
    if (relY < 0.25 && parentRow) {
      return buildVisualIndicator(targetRow, parentRow, targetNodeId, 'before')
    }
    if (relY > 0.75 && parentRow) {
      return buildVisualIndicator(targetRow, parentRow, targetNodeId, 'after')
    }
    // Zona central → inserir dentro do elemento alvo
    // parentRow = targetRow (o elemento alvo é o novo pai)
    return buildVisualIndicator(null, targetRow, null, 'inside')
  }

  // Void ou texto → 2 zonas clássicas (50/50)
  if (parentRow) {
    const position = relY < 0.50 ? 'before' : 'after'
    return buildVisualIndicator(targetRow, parentRow, targetNodeId, position)
  }

  // Sem pai no explorer → inserir como último filho do nó alvo (edge case: raiz)
  return buildVisualIndicator(null, targetRow, null, 'inside')
}

/**
 * Constrói o objeto indicator com coordenadas absolutas (viewport) para a linha
 * de drop visual, e armazena os IDs para calcular o índice AST correto em onMouseUp.
 *
 * @param {Element|null} siblingRow   — row do irmão de referência ou null (inside)
 * @param {Element}      parentRow    — row do pai destino
 * @param {string|null}  siblingId    — nodeId do irmão de referência ou null (inside)
 * @param {'before'|'after'|'inside'} position
 */
function buildVisualIndicator(siblingRow, parentRow, siblingId, position) {
  const parentId = parentRow.dataset.astNodeId
  if (!parentId) return null

  const parentRect = parentRow.getBoundingClientRect()
  let lineY = 0

  if (position === 'inside') {
    lineY = parentRect.bottom
  } else {
    const sibRect = siblingRow.getBoundingClientRect()
    lineY = position === 'before' ? sibRect.top : sibRect.bottom
  }

  return {
    parentId,
    siblingId,   // nodeId do irmão — usado para lookup no AST em onMouseUp
    position,
    lineY,
    lineX: parentRect.left,
    lineW: parentRect.width,
  }
}

// ── Handlers de mouse ──────────────────────────────────────────────────────────

function reset() {
  explorerDragState.active.value    = false
  explorerDragState.nodeId.value    = null
  explorerDragState.indicator.value = null
  _dragStarted = false
}

function onMouseMove(e) {
  const dx = e.clientX - _startX
  const dy = e.clientY - _startY

  if (!_dragStarted) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    _dragStarted = true
    explorerDragState.active.value = true
  }

  explorerDragState.indicator.value = getDropIndicator(e.clientX, e.clientY)
}

function onMouseUp() {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup',   onMouseUp)
  document.body.style.cursor     = ''
  document.body.style.userSelect = ''

  if (_dragStarted && explorerDragState.indicator.value) {
    const EditorStore = useEditorStore()
    const { parentId, siblingId, position } = explorerDragState.indicator.value
    const ast = EditorStore.ctx?.ast
    const dragNodeId = explorerDragState.nodeId.value

    // ── Validações de segurança ──────────────────────────────────────────
    const draggedNode = findNodeById(ast, dragNodeId)

    // 1. Tag restrita (script, style, head, body, etc.) → bloqueado
    if (draggedNode && DRAG_RESTRICTED_TAGS.has(draggedNode.tag?.toLowerCase())) {
      reset(); return
    }

    // 2. Move cross-zone (head ↔ body) → bloqueado
    const sourceZone = getNodeZone(ast, dragNodeId)
    const targetZone = getNodeZone(ast, parentId)
    if (sourceZone !== targetZone) {
      reset(); return
    }
    // ────────────────────────────────────────────────────────────────────

    // Calcula o índice correto no AST (não no DOM visual, que omite text/comment nodes)
    let targetIndex = 0

    if (position === 'inside') {
      const parentNode = findNodeById(ast, parentId)
      targetIndex = parentNode?.children?.length ?? 0
    } else if (siblingId) {
      const { index } = findParentAndIndex(ast, siblingId)
      targetIndex = position === 'before' ? index : index + 1
    }

    EditorStore.manipulation.moveNodeToParent(dragNodeId, parentId, targetIndex)
  }

  reset()
}

// ── API pública ────────────────────────────────────────────────────────────────

/**
 * Inicia o drag de um nó a partir do handle no ASTNode.
 * @param {string}     nodeId — nodeId do nó a arrastar
 * @param {MouseEvent} event  — evento mousedown no handle
 */
function startDrag(nodeId, event) {
  event.preventDefault()
  event.stopPropagation()

  _startX = event.clientX
  _startY = event.clientY
  _dragStarted = false
  explorerDragState.nodeId.value = nodeId

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup',   onMouseUp)

  document.body.style.cursor     = 'grabbing'
  document.body.style.userSelect = 'none'
}

export function useExplorerDragDrop() {
  return { startDrag, explorerDragState }
}
