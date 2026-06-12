import { ref, computed, nextTick } from 'vue'

/**
 * Busca/filtro do CSS Explorer.
 * matchedIds devolve null quando não há filtro ativo (a virtual list usa
 * isso para pular o modo busca sem custo).
 *
 * @param {object} styleStore — fonte da cssLogicTree
 */
export function useExplorerSearch(styleStore) {
  const searchQuery = ref('')
  const searchActive = ref(false)
  const searchInputRef = ref(null)

  function openSearch() {
    searchActive.value = true
    nextTick(() => searchInputRef.value?.focus())
  }

  function clearSearch() {
    searchQuery.value = ''
    searchActive.value = false
  }

  // Set de IDs que casam a query (nó que casa OU ancestral de quem casa)
  const matchedIds = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return null // null = sem filtro ativo
    const roots = styleStore.cssLogicTree || []
    const ids = new Set()

    const checkNode = (node) => {
      const label = (node.label || '').toLowerCase()
      const value = (node.value || '').toLowerCase()
      return label.includes(q) || value.includes(q)
    }

    const walk = (nodes) => {
      let anyMatch = false
      for (const node of nodes) {
        const childMatch = node.children?.length ? walk(node.children) : false
        const selfMatch = checkNode(node)
        if (selfMatch || childMatch) {
          ids.add(node.id)
          anyMatch = true
        }
      }
      return anyMatch
    }

    walk(roots)
    return ids
  })

  // Quantos nós realmente casam o termo digitado (sem contar ancestrais)
  const matchCount = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q || !matchedIds.value) return 0
    const roots = styleStore.cssLogicTree || []
    let count = 0
    const walk = (nodes) => {
      for (const node of nodes) {
        const label = (node.label || '').toLowerCase()
        const value = (node.value || '').toLowerCase()
        if (label.includes(q) || value.includes(q)) count++
        if (node.children?.length) walk(node.children)
      }
    }
    walk(roots)
    return count
  })

  return { searchQuery, searchActive, searchInputRef, openSearch, clearSearch, matchedIds, matchCount }
}
