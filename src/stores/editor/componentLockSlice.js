import { ref } from 'vue'
import { findNodeById } from '@/utils/ast'

/**
 * Fatia do EditorStore: trava de edição de instâncias de componentes.
 * Instâncias começam travadas; o usuário destrava pelo ASTExplorer.
 * Conteúdo dentro de slot é sempre editável.
 *
 * @param {{ getCtx: () => object|null, getParent: (nodeId: string) => object|null }} deps
 */
export function createComponentLockSlice({ getCtx, getParent }) {
  /** IDs de instâncias de componentes que o usuário abriu para edição */
  const unlockedComponentIds = ref(new Set())

  function unlockComponent(nodeId) {
    unlockedComponentIds.value.add(nodeId)
  }

  function lockComponent(nodeId) {
    unlockedComponentIds.value.delete(nodeId)
  }

  function isNodeInsideLockedComponent(nodeId) {
    const ctx = getCtx()
    if (!ctx?.ast) return false

    // 1. Encontra o nó na AST para ver se ele mesmo é um componente
    const node = findNodeById(ctx.ast, nodeId)
    if (!node) return false

    // 2. Se ele for um componente-raiz e estiver travado
    if (node.attrs?.['data-component'] && !unlockedComponentIds.value.has(nodeId)) {
      return true
    }

    // 3. Verifica os ancestrais, parando se encontrar um slot antes do componente
    let currentId = nodeId
    while (true) {
      const parent = getParent(currentId)
      if (!parent) break

      // Se o nó atual (ou algum ancestral direto) for um slot, ele está livre para edição
      const current = findNodeById(ctx.ast, currentId)
      if (current?.attrs?.['data-slot'] !== undefined) {
        return false // Está dentro de um slot — libera edição
      }

      if (parent.attrs?.['data-component']) {
        // Achou um pai componente antes de achar um slot
        if (!unlockedComponentIds.value.has(parent.nodeId)) {
          return true // Travado
        }
        break // Componente desbloqueado — para de subir
      }
      currentId = parent.nodeId
    }

    return false
  }

  return { unlockedComponentIds, unlockComponent, lockComponent, isNodeInsideLockedComponent }
}
