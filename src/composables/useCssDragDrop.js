import { ref } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { useEditorStore } from '@/stores/EditorStore'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { findCssNode } from '@/utils/astHelpers'
import { toRaw } from 'vue'
import { ApiService } from '@/services/ApiService'

/**
 * useCssDragDrop
 *
 * Composable que encapsula todo o estado e lógica de drag-and-drop
 * para o CSS Explorer. Usa a API nativa HTML5 (sem biblioteca externa).
 *
 * TIPOS SUPORTADOS: selector, at-rule, declaration, file
 * RESTRIÇÃO: apenas reordenação dentro do mesmo pai (sem cross-origin).
 */
export function useCssDragDrop() {
  const styleStore = useStyleStore()
  const editorStore = useEditorStore()

  // ── Estado ─────────────────────────────────────────────────────────────

  /** Nó que está sendo arrastado */
  const dragState = ref(null)
  // { node, parentId }

  /** Nó alvo do drop e posição relativa */
  const dropTarget = ref(null)
  // { nodeId, position: 'before' | 'after' }

  // ── Helpers ────────────────────────────────────────────────────────────

  function getIframeDoc() {
    return editorStore.getIframeDoc()
  }

  function findParentNode(logicTree, childId) {
    const search = (nodes, parent) => {
      for (const n of nodes) {
        if (n.id === childId) return parent
        if (n.children) {
          const found = search(n.children, n)
          if (found) return found
        }
      }
      return null
    }
    return search(toRaw(logicTree), null)
  }

  // ── Handlers ───────────────────────────────────────────────────────────

  function onDragStart(node) {
    if (node.type === 'root') return
    dragState.value = { node }
  }

  function onDragOver(node, event) {
    if (!dragState.value) return
    if (node.id === dragState.value.node.id) return
    if (node.type === 'root') return

    event.preventDefault() // permite o drop

    const dragged = dragState.value.node
    const isContainer = node.type === 'at-rule' || node.type === 'file'
    const rect = event.currentTarget.getBoundingClientRect()
    const relY = event.clientY - rect.top
    const pct  = relY / rect.height // 0..1

    if (isContainer && isValidDropInside(dragged, node)) {
      // 3 zonas: topo 20% → before | centro 60% → inside | base 20% → after
      let position
      if      (pct < 0.2) position = 'before'
      else if (pct > 0.8) position = 'after'
      else                position = 'inside'
      dropTarget.value = { nodeId: node.id, position }
    } else {
      const position = pct < 0.5 ? 'before' : 'after'
      dropTarget.value = { nodeId: node.id, position }
    }
  }

  function onDrop(node) {
    if (!dragState.value || !dropTarget.value) return
    if (node.id === dragState.value.node.id) return

    const logicTree = toRaw(styleStore.cssLogicTree)
    const dragged = dragState.value.node
    const targetId = dropTarget.value.nodeId
    const position = dropTarget.value.position

    let moved = false

    if (position === 'inside') {
      // Drop dentro de um container (at-rule vazia ou file):
      // insere o nó arrastado como último filho do nó alvo.
      const targetNode = findCssNode(logicTree, targetId)
      if (!targetNode || !isValidDropInside(dragged, targetNode)) {
        dragState.value = null
        dropTarget.value = null
        return
      }
      const insertAt = targetNode.children?.length ?? 0

      if (dragged.type === 'selector') {
        moved = CssLogicTreeService.moveRule(logicTree, dragged.id, targetId, insertAt)
      } else if (dragged.type === 'at-rule') {
        moved = CssLogicTreeService.moveAtRule(logicTree, dragged.id, targetId, insertAt)
      }
    } else {
      // Drop antes/depois de um nó irmão (comportamento original)
      const targetParent = findParentNode(logicTree, targetId)
      if (!targetParent) {
        dragState.value = null
        dropTarget.value = null
        return
      }

      if (!isValidDrop(dragged, targetParent)) {
        dragState.value = null
        dropTarget.value = null
        return
      }

      const siblings = targetParent.children
      const targetIdx = siblings.findIndex(n => n.id === targetId)
      const insertAt = position === 'before' ? targetIdx : targetIdx + 1
      const targetParentId = targetParent.id

      if (dragged.type === 'selector') {
        moved = CssLogicTreeService.moveRule(logicTree, dragged.id, targetParentId, insertAt)
      } else if (dragged.type === 'at-rule') {
        moved = CssLogicTreeService.moveAtRule(logicTree, dragged.id, targetParentId, insertAt)
      } else if (dragged.type === 'declaration') {
        const sourceParent = findParentNode(logicTree, dragged.id)
        const targetSelectorNode = findParentNode(logicTree, targetId)
        if (sourceParent && targetSelectorNode) {
          moved = CssLogicTreeService.moveDeclaration(sourceParent, dragged, targetSelectorNode, insertAt)
        }
      } else if (dragged.type === 'file') {
        const sourceParent = findParentNode(logicTree, dragged.id)
        const targetParentFile = findParentNode(logicTree, targetId)
        if (sourceParent && sourceParent === targetParentFile) {
          const fromIdx = sourceParent.children.findIndex(n => n.id === dragged.id)
          if (fromIdx !== -1) {
            sourceParent.children.splice(fromIdx, 1)
            const newIdx = sourceParent.children.findIndex(n => n.id === targetId)
            const finalIdx = position === 'before' ? newIdx : newIdx + 1
            sourceParent.children.splice(finalIdx, 0, dragged)
            moved = true

            // Persiste a nova ordem no manifesto
            const paths = sourceParent.children
              .map(n => n.metadata?.sourceName)
              .filter(Boolean)
            if (paths.length > 0) {
              ApiService.reorderAssets(paths).catch(err =>
                console.error('[useCssDragDrop] reorderAssets falhou:', err)
              )
            }
          }
        }
      }
    }

    if (moved) {
      styleStore.applyMutation(getIframeDoc())
    }

    dragState.value = null
    dropTarget.value = null
  }

  function onDragEnd() {
    dragState.value = null
    dropTarget.value = null
  }

  // ── Validação de drop ──────────────────────────────────────────────────

  /**
   * Verifica se o nó arrastado pode ser solto no pai alvo.
   * Regra: o pai alvo deve ser do mesmo tipo de container que o pai original.
   */
  function isValidDrop(dragged, targetParent) {
    if (dragged.type === 'selector') {
      return targetParent.type === 'file' || targetParent.type === 'at-rule'
    }
    if (dragged.type === 'at-rule') {
      return targetParent.type === 'file' || targetParent.type === 'at-rule'
    }
    if (dragged.type === 'declaration') {
      return targetParent.type === 'selector'
    }
    if (dragged.type === 'file') {
      return targetParent.type === 'root'
    }
    return false
  }

  /**
   * Verifica se é válido soltar o nó arrastado DENTRO do nó alvo (container).
   * Utilizado quando o target é uma at-rule ou file.
   */
  function isValidDropInside(dragged, targetContainer) {
    if (targetContainer.type === 'at-rule' || targetContainer.type === 'file') {
      return dragged.type === 'selector' || dragged.type === 'at-rule'
    }
    return false
  }

  return {
    dragState,
    dropTarget,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }
}
