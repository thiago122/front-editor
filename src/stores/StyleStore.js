import { ref, markRaw } from 'vue'
import { defineStore } from 'pinia'
import { CssAstService } from '@/composables/CssAstService'
import { CssLogicTreeService } from '@/composables/CssLogicTreeService'

export const useStyleStore = defineStore('style', () => {

  // --- STATE ---
  // Master AST: raw css-tree object (low-level, not reactive for perf)
  const masterAst = ref(null)
  // Logic Tree: our high-level hierarchical structure (used by UI)
  const cssAst = ref(null)

  const selectedCssRuleNodeId = ref(null) // ID of the selected CSS rule (Logic Tree Node ID)
  const activeRuleNodeId = ref(null) // ID of the rule currently being edited in the Inspector
  const toggledNodes = ref(new Set())
  const astMutationKey = ref(0) // Lightweight trigger for AST mutations

  // --- ACTIONS ---
  function notifyAstMutation() {
    astMutationKey.value++
  }

  function setActiveRule(id, fromExplorer = false) {
    activeRuleNodeId.value = id
    selectedCssRuleNodeId.value = fromExplorer ? id : null
    if (id && fromExplorer) {
      expandToNode(id)
    }
  }

  function expandToNode(id) {
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
    if (node.type === 'root') return true
    return toggledNodes.value.has(node.id)
  }

  /**
   * Full pipeline: Load CSS → Build Master AST → Build Logic Tree
   * @param {Document} doc - Target document
   * @param {string[]} locations - Locations to load
   */
  async function refreshCssAst(doc, locations = ['internal', 'external']) {
    if (!doc) return

    console.log('[StyleStore] Refreshing CSS AST...')

    // 1. Build Master AST
    const rawMasterAst = await CssAstService.buildMasterAst(doc, locations)
    masterAst.value = markRaw(rawMasterAst)

    // 2. Build Logic Tree from Master AST
    const logicTree = CssLogicTreeService.buildLogicTree(rawMasterAst)
    cssAst.value = markRaw(logicTree)

    notifyAstMutation()
  }

  return {
    masterAst,
    cssAst,
    selectedCssRuleNodeId,
    activeRuleNodeId,
    toggledNodes,
    astMutationKey,
    refreshCssAst,
    toggleNode,
    isExpanded,
    setActiveRule,
    notifyAstMutation,
  }
})
