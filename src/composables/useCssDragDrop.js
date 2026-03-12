import { ref } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { useEditorStore } from '@/stores/EditorStore'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { findCssNode } from '@/utils/astHelpers'
import { toRaw } from 'vue'

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

    const rect = event.currentTarget.getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    const position = event.clientY < mid ? 'before' : 'after'

    dropTarget.value = { nodeId: node.id, position }
  }

  function onDrop(node) {
    if (!dragState.value || !dropTarget.value) return
    if (node.id === dragState.value.node.id) return

    const logicTree = toRaw(styleStore.cssLogicTree)
    const dragged = dragState.value.node
    const targetId = dropTarget.value.nodeId
    const position = dropTarget.value.position

    // Encontra o pai do nó alvo para inserção
    const targetParent = findParentNode(logicTree, targetId)
    if (!targetParent) return

    // Verifica se o tipo do nó arrastado é compatível com o pai alvo
    if (!isValidDrop(dragged, targetParent)) return

    // Calcula o índice de inserção no pai do target
    const siblings = targetParent.children
    const targetIdx = siblings.findIndex(n => n.id === targetId)
    const insertAt = position === 'before' ? targetIdx : targetIdx + 1

    const targetParentId = targetParent.id
    let moved = false

    if (dragged.type === 'selector') {
      moved = CssLogicTreeService.moveRule(logicTree, dragged.id, targetParentId, insertAt)
    } else if (dragged.type === 'at-rule') {
      moved = CssLogicTreeService.moveAtRule(logicTree, dragged.id, targetParentId, insertAt)
    } else if (dragged.type === 'declaration') {
      // Para declarations, precisa do nó pai (selector) tanto do source quanto do target
      const sourceParent = findParentNode(logicTree, dragged.id)
      const targetSelectorNode = findParentNode(logicTree, targetId)
      if (sourceParent && targetSelectorNode) {
        moved = CssLogicTreeService.moveDeclaration(sourceParent, dragged, targetSelectorNode, insertAt)
      }
    } else if (dragged.type === 'file') {
      // Reorder de files: manipula diretamente o array do root pai
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

  return {
    dragState,
    dropTarget,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }
}
