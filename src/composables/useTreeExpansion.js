import { ref, computed } from 'vue'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'

/**
 * Estado de expansão da árvore do CSS Explorer (UI local, não global).
 * Root é sempre expandido; os demais nós vivem no Set toggledNodes.
 *
 * @param {object} styleStore — fonte da cssLogicTree
 */
export function useTreeExpansion(styleStore) {
  const toggledNodes = ref(new Set())

  function toggleNode(id) {
    const next = new Set(toggledNodes.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    toggledNodes.value = next
  }

  function isExpanded(node) {
    if (!node) return false
    if (node.type === 'root') return true
    return toggledNodes.value.has(node.id)
  }

  /** Expande TODOS os ancestrais (root → file → @media → …) até o nó ficar visível. */
  function expandToNode(id) {
    const ancestors = CssLogicTreeService.findAncestors(styleStore.cssLogicTree || [], id)
    for (const ancestor of ancestors) {
      if (!isExpanded(ancestor)) {
        toggleNode(ancestor.id)
      }
    }
  }

  function expandAll() {
    const ids = new Set(toggledNodes.value)
    const walk = (nodes) => {
      for (const node of nodes) {
        if (node.type !== 'root') ids.add(node.id)
        if (node.children?.length) walk(node.children)
      }
    }
    walk(styleStore.cssLogicTree || [])
    toggledNodes.value = ids
  }

  function collapseAll() {
    toggledNodes.value = new Set()
  }

  /** True quando todos os nós expansíveis (não-root, com filhos) estão abertos */
  const isFullyExpanded = computed(() => {
    const expanded = toggledNodes.value
    let allExpanded = true
    const walk = (nodes) => {
      for (const node of nodes) {
        if (node.type !== 'root' && node.children?.length > 0) {
          if (!expanded.has(node.id)) { allExpanded = false; return }
        }
        if (node.children?.length) walk(node.children)
      }
    }
    walk(styleStore.cssLogicTree || [])
    return allExpanded
  })

  return { toggledNodes, toggleNode, isExpanded, expandToNode, expandAll, collapseAll, isFullyExpanded }
}
