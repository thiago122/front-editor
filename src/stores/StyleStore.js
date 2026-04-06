import { ref, computed, markRaw, toRaw } from 'vue'
import { defineStore } from 'pinia'
import { CssAstService } from '@/editor/css/ast/CssAstService'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { calculateOverrides, findCssNode } from '@/utils/astHelpers'
import { unifiedHistory } from '@/editor/history/UnifiedHistoryManager'

// ─── Internal helper ──────────────────────────────────────────────────────────

function buildInspectorRule(selectorNode) {
  const declarations = []
  selectorNode.children?.forEach(d => {
    if (d.type !== 'declaration') return
    const propName = d.label.toLowerCase()
    const isDisabled = propName.startsWith('--disabled-')
    declarations.push({
      id: d.id,
      prop: isDisabled ? propName.replace('--disabled-', '') : propName,
      value: d.value,
      important: d.metadata?.astNode?.important || false,
      disabled: isDisabled,
      overridden: false,
      astNode: d.metadata?.astNode,
      logicNode: d,
    })
  })
  return {
    uid: selectorNode.id,
    selector: selectorNode.label,
    declarations,
    origin: selectorNode.metadata?.origin,
    sourceName: selectorNode.metadata?.sourceName,
    specificity: selectorNode.metadata?.specificity || [0, 0, 0, 0],
    context: [],
    active: true,
    loc: selectorNode.metadata?.line || '?',
    astNode: selectorNode.metadata?.astNode,
    logicNode: selectorNode,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStyleStore = defineStore('style', () => {

  // ── State ──────────────────────────────────────────────────────────────────

  /** Logic Tree — single source of truth. Watch `astMutationKey` for changes. */
  const cssLogicTree = ref(null)

  /** ID of the selected CSS rule. Shared between Inspector and Explorer. */
  const selectedRuleId = ref(null)

  /**
   * Incrementing this value signals CssExplorer to scroll to the highlighted rule.
   * EditorView also watches it to auto-open the CSS Explorer panel.
   */
  const explorerScrollRequest = ref(0)

  /**
   * ID de uma regra a ser localizada visualmente no CSS Explorer.
   * Distinto de selectedRuleId: não altera o que o Inspector exibe.
   * Usado apenas para highlight + scroll no Explorer.
   */
  const explorerHighlightId = ref(null)

  /** Increment this after any Logic Tree mutation to trigger Vue reactivity. */
  const astMutationKey = ref(0)

  /**
   * Copied style clipboard — declarações copiadas de uma rule para colar em outra.
   * Shape: { declarations: [{prop, value, important}] } | null
   */
  const copiedStyle = ref(null)

  /** CSS rule groups shown in the Inspector. Updated by updateInspectorRules(). */
  const ruleGroups = ref([])

  /** Active pseudo-state/element tab in the Inspector Styles panel. */
  const activePseudoTab = ref({ id: 'default', state: null, pseudoEl: null })

  /**
   * 'element'  — inspector tracks the selected DOM element (default)
   * 'explorer' — inspector tracks the rule selected in the CSS Explorer
   * Clicking element → resets to 'element'. Clicking rule in Explorer → 'explorer'.
   */
  const inspectorSource = ref('element')

  // ── Actions ────────────────────────────────────────────────────────────────

  function notifyTreeMutation() {
    astMutationKey.value++
  }

  /** Copia as declarações de uma rule para o clipboard de estilo. */
  function copyStyle(declarations, sourceUid = null) {
    copiedStyle.value = {
      _sourceUid: sourceUid,
      declarations: declarations
        .filter(d => !d.disabled)
        .map(d => ({ prop: d.prop, value: d.value, important: d.important ?? false }))
    }
  }

  /** Limpa o clipboard de estilo. */
  function clearCopiedStyle() {
    copiedStyle.value = null
  }

  /** Switch the active pseudo-state/element tab and refresh inspector rules. */
  function setActivePseudoTab(tab) {
    activePseudoTab.value = tab
  }

  /** Select a rule — syncs Inspector and Explorer simultaneously. */
  function selectRule(id, source = null) {
    selectedRuleId.value = id
    if (source) inspectorSource.value = source
  }

  /**
   * Localiza uma regra visualmente no CSS Explorer:
   * - Define explorerHighlightId (highlight visual, sem alterar o Inspector)
   * - Expande os ancestrais do nó no Explorer
   * - Incrementa explorerScrollRequest para rolar até o nó
   * - Abre o painel CSS no EditorView
   * NÃO altera selectedRuleId nem inspectorSource.
   */
  function navigateToRule(id) {
    explorerHighlightId.value = id
    explorerScrollRequest.value++
  }

  function setInspectorSource(source) {
    inspectorSource.value = source
  }

  /**
   * Sync the Logic Tree to the DOM and notify Vue.
   * Call after every CssLogicTreeService mutation.
   * @param {Document} doc - The target document (usually iframe.contentDocument)
   */
  function applyMutation(doc) {
    CssLogicTreeService.syncToDOM(cssLogicTree.value, doc)
    notifyTreeMutation()
  }

  /**
   * Parse CSS from the document and rebuild the Logic Tree from scratch.
   * Only call on init or when stylesheet structure changes.
   * For edits, use applyMutation() instead.
   */
  async function rebuildLogicTree(doc, locations = ['internal', 'external']) {
    if (!doc) return
    const masterAst = await CssAstService.buildMasterAst(doc, locations)
    cssLogicTree.value = markRaw(CssLogicTreeService.buildLogicTree(masterAst))
    // A logicTree foi substituída por um novo array — snapshots antigos
    // apontam para o array anterior e não fazem mais sentido.
    unifiedHistory.clearCssHistory()
    notifyTreeMutation()
  }

  /**
   * Recalculate which CSS rules to show in the Inspector.
   * Called by InspectorPanel whenever the selected element, tree, or viewport changes.
   *
   * @param {HTMLElement|null} element
   * @param {{width: number, height: number}} viewport - Iframe dimensions in px
   * @param {string|null} ruleId - currently selected rule ID
   */
  function updateInspectorRules(element, viewport, ruleId) {
    const logicTree = toRaw(cssLogicTree.value)

    // Explorer mode: mostra a rule do Explorer mesmo que um elemento esteja selecionado.
    // O usuário clicou explicitamente no Explorer — priorizar essa intenção.
    if (inspectorSource.value === 'explorer' && ruleId) {
      const node = findCssNode(logicTree, ruleId)
      if (node && node.type === 'selector') {
        ruleGroups.value = [{ isTarget: true, tagName: 'Explorer: ' + node.label, rules: [buildInspectorRule(node)] }]
        return
      }
    }

    // Element mode (padrão)
    if (!element || !logicTree) {
      ruleGroups.value = []
      return
    }

    const tab    = toRaw(activePseudoTab.value)
    const forceStatus = tab.state ? { [tab.state]: true } : {}
    const groups = CssLogicTreeService.getMatchedRules(element, logicTree, toRaw(viewport), forceStatus, tab)
    calculateOverrides(groups)
    ruleGroups.value = groups

    const target = groups.find(g => g.isTarget)
    selectRule(target?.rules[0]?.uid ?? null)
  }

  // ── Exports ────────────────────────────────────────────────────────────────

  return {
    cssLogicTree,
    selectedRuleId,
    explorerHighlightId,
    explorerScrollRequest,
    astMutationKey,
    ruleGroups,
    activePseudoTab,
    inspectorSource,
    copiedStyle,
    notifyTreeMutation,
    selectRule,
    navigateToRule,
    setInspectorSource,
    setActivePseudoTab,
    applyMutation,
    rebuildLogicTree,
    updateInspectorRules,
    copyStyle,
    clearCopiedStyle,
  }
})
