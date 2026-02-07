import { ref, markRaw } from 'vue'
import { defineStore } from 'pinia'
import { useCssParser } from '@/composables/useCssParser'

export const useStyleStore = defineStore('style', () => {
  const { extractCssAst } = useCssParser()

  // --- STATE ---
  const cssAst = ref(null) // cache do AST do css-tree (Logic Tree)
  const selectedCssRuleNodeId = ref(null) // ID of the selected CSS rule (Logic Tree Node ID)
  const activeRuleNodeId = ref(null) // ID of the rule currently being edited in the Inspector
  const toggledNodes = ref(new Set())

  // --- ACTIONS ---
  function setActiveRule(id) {
    activeRuleNodeId.value = id
    selectedCssRuleNodeId.value = id
    // Ensure the node is visible in the explorer
    if (id) {
        expandToNode(id)
    }
  }

  function expandToNode(id) {
    // Basic implementation: if it's a rule, we need its parent (file) to be expanded
    const findParent = (nodes, targetId, parent = null) => {
      for (const node of nodes) {
        if (node.id === targetId) return parent
        if (node.children) {
          const found = findParent(node.children, targetId, node)
          if (found) return found
        }
      }
      return null
    }

    const parent = findParent(cssAst.value || [], id)
    if (parent && !isExpanded(parent)) {
      toggleNode(parent.id)
    }
  }

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
    if (node.type === 'root') return true // Divider is always "expanded" (shown)

    // Everything else starts collapsed by default. Toggling expands it.
    return toggledNodes.value.has(node.id)
  }

  function refreshCssAst(doc) {
    if (doc) {
      console.log('[StyleStore] Refreshing CSS AST...')
      const ast = extractCssAst(doc)
      cssAst.value = markRaw(ast)
    }
  }

  function getCssGroupedBySource(origin) {
    if (!cssAst.value) return []
    const { generate } = useCssParser()

    const rootNodes = cssAst.value.filter(node => node.metadata.origin === origin)
    const results = []

    rootNodes.forEach(root => {
      root.children.forEach(file => {
        try {
          const children = file.children.map(rule => rule.metadata.astNode).filter(Boolean)
          const filteredAst = {
            type: 'StyleSheet',
            children: children,
          }
          results.push({
            name: file.label || file.metadata.sourceName,
            css: generate(filteredAst),
          })
        } catch (e) {
          console.error(`Failed to generate CSS for source: ${file.label}`, e)
        }
      })
    })

    return results
  }

  return {
    cssAst,
    selectedCssRuleNodeId,
    activeRuleNodeId,
    toggledNodes,
    refreshCssAst,
    getCssGroupedBySource,
    toggleNode,
    isExpanded,
    setActiveRule,
  }
})
