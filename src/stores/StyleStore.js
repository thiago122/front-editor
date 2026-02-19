import { ref, markRaw } from 'vue'
import { defineStore } from 'pinia'
import { CssAstService } from '@/composables/CssAstService'
import { CssLogicTreeService } from '@/composables/CssLogicTreeService'

export const useStyleStore = defineStore('style', () => {

  // ============================================
  // STATE
  // ============================================

  // cssParserAst: raw css-tree object (LOW-LEVEL — do not use in UI)
  const cssParserAst = ref(null)

  // cssLogicTree: our high-level hierarchical tree (HIGH-LEVEL — use in UI)
  const cssLogicTree = ref(null)

  /**
   * selectedRuleId: the ID of the currently selected CSS rule.
   *
   * Single source of truth for rule selection — shared between the Inspector
   * and the Explorer. Selecting a rule in either panel reflects in the other.
   *
   * - Inspector reads it to know which rule to display/edit.
   * - Explorer reads it to know which tree node to highlight.
   * - Components call selectRule() to change it.
   *
   * Distinct from tree expansion (toggledNodes in CssExplorer): expanding a
   * node in the Explorer does NOT select it, just like clicking "+" in Windows
   * Explorer expands a folder without opening it.
   */
  const selectedRuleId = ref(null)

  /**
   * astMutationKey is a lightweight reactivity trigger for the Logic Tree.
   *
   * Because cssLogicTree is stored as markRaw (to avoid Vue making it deeply
   * reactive — which would be very expensive for large ASTs), Vue cannot
   * detect mutations inside it automatically. So whenever we mutate the tree
   * (add/remove/update nodes), we manually call notifyAstMutation() to
   * increment this counter. Components that need to react to tree changes
   * should watch astMutationKey instead of cssLogicTree directly.
   */
  const astMutationKey = ref(0)


  // ============================================
  // ACTIONS
  // ============================================

  function notifyAstMutation() {
    astMutationKey.value++
  }

  /**
   * Select a CSS rule — updates the Inspector and the Explorer simultaneously.
   * @param {string|null} id - Logic Tree node ID of the rule to select
   */
  function selectRule(id) {
    selectedRuleId.value = id
  }

  /**
   * Full pipeline: Load CSS → Build cssParserAst → Build cssLogicTree
   * @param {Document} doc - Target document
   * @param {string[]} locations - Locations to load
   */
  async function refreshCssAst(doc, locations = ['internal', 'external']) {
    if (!doc) return

    console.log('[StyleStore] Refreshing CSS AST...')

    // 1. Build raw parser AST (css-tree)
    const rawParserAst = await CssAstService.buildMasterAst(doc, locations)
    cssParserAst.value = markRaw(rawParserAst)

    // 2. Transform into Logic Tree (our high-level structure)
    const logicTree = CssLogicTreeService.buildLogicTree(rawParserAst)
    cssLogicTree.value = markRaw(logicTree)

    notifyAstMutation()
  }

  return {
    cssParserAst,
    cssLogicTree,
    selectedRuleId,
    astMutationKey,
    refreshCssAst,
    selectRule,
    notifyAstMutation,
  }
})
