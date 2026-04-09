import { ref, computed, markRaw, toRaw } from 'vue'
import { defineStore } from 'pinia'
import { CssAstService } from '@/editor/css/ast/CssAstService'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { calculateOverrides, findCssNode } from '@/utils/astHelpers'
import { CssExportService } from '@/editor/css/export/CssExportService'
import { useEditorStore } from './EditorStore'
import { generateId } from '@/utils/ids.js'
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

  /**
   * Manifesto CSS atual — [{path, type}] na ordem do <head>.
   * type: 'internal' | 'external' | 'ignore'
   * Fonte de verdade no frontend. Atualizado por openDocument e operações do CssExplorer.
   */
  const cssManifest = ref([])

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

  /**
   * Define o manifesto CSS atual (chamado por openDocument).
   * @param {Array<{path: string, type: string}>} manifest
   */
  function setManifest(manifest) {
    cssManifest.value = manifest ?? []
  }

  /**
   * Retorna o manifesto CSS atual.
   * @returns {Array<{path: string, type: string}>}
   */
  function getManifest() {
    return cssManifest.value
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
    CssLogicTreeService.syncToDOM(toRaw(cssLogicTree.value), doc)
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

  /**
   * Atualiza as declarações de uma regra a partir de uma string de CSS bruto.
   * @param {string} ruleId - ID da regra (nó selector ou at-rule)
   * @param {string} cssString - Apenas o conteúdo interno: "color: red; padding: 10px;"
   */
  function updateRuleDeclarationsFromCSS(ruleId, cssString) {
    const logicTree = toRaw(cssLogicTree.value)
    const node = findCssNode(logicTree, ruleId)
    if (!node) return

    const astNode = toRaw(node.metadata?.astNode)
    if (!astNode?.block) return

    // 1. Criamos um nó temporário de regra para fazer o parse seguro das declarações
    const tempRule = CssAstService.createNode(`.temp { ${cssString} }`, 'Rule')
    if (!tempRule || !tempRule.block) return

    // 2. Substituímos os filhos do bloco AST original (Master AST)
    // Em vez de substituir a lista inteira, usamos os métodos do List se disponíveis
    if (astNode.block.children.fromArray) {
      astNode.block.children.fromArray(tempRule.block.children.toArray())
    } else {
      astNode.block.children = tempRule.block.children
    }

    // 3. Reconstruímos os filhos da Logic Tree para refletir as novas declarações
    // Isso é vital para que o Inspector e Explorer vejam os novos dados.
    node.children = []
    astNode.block.children.forEach(astDecl => {
      if (astDecl.type === 'Declaration') {
        const prop = astDecl.property
        const val  = CssAstService.generateCss(astDecl.value)
        node.children.push({
          id:       generateId(),
          type:     'declaration',
          label:    prop,
          value:    val,
          metadata: { astNode: astDecl },
          children: [],
        })
      }
    })


    // 4. Sincronizamos com o DOM (Preview)
    const editorStore = useEditorStore()
    applyMutation(editorStore.getIframeDoc())
    
    // 5. Atualizamos o Inspector lateral imediatamente
    updateInspectorRules(
      editorStore.selectedElement,
      editorStore.viewport,
      ruleId
    )

    notifyTreeMutation()
  }

  /**
   * Atualiza um ARQUIVO inteiro de CSS a partir de uma string bruta (seletores + chaves).
   * @param {string} fileId - ID do nó 'file' na Logic Tree
   * @param {string} cssString - Código CSS completo: ".btn { ... } @media { ... }"
   */
  function updateFileFromCSS(fileId, cssString) {
    const logicTree = toRaw(cssLogicTree.value)
    const node = findCssNode(logicTree, fileId)
    if (!node || node.type !== 'file') return

    const astNode = toRaw(node.metadata?.astNode) // StyleSheet node
    if (!astNode) return

    // 1. Faz o parse do conteúdo completo como um StyleSheet
    const newSheetAst = CssAstService.createNode(cssString, 'StyleSheet')
    if (!newSheetAst) return

    // 2. Transfere os filhos para o Master AST original
    if (astNode.children.fromArray) {
      astNode.children.fromArray(newSheetAst.children.toArray())
    } else {
      astNode.children = newSheetAst.children
    }

    // 3. Reconstroi a Logic Tree do arquivo (re-uso parcial do builder seria ideal, 
    // mas aqui vamos apenas forçar o rebuild global simples por enquanto pela segurança do sync)
    // TODO: No futuro, reconstruir apenas o sub-ramo do arquivo para performance.
    const editorStore = useEditorStore()
    rebuildLogicTree(editorStore.getIframeDoc())

    console.log(`[StyleStore] File ${fileId} updated via bulk CSS.`);
  }

  // ── Exports ────────────────────────────────────────────────────────────────

  return {
    cssLogicTree,
    cssManifest,
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
    updateRuleDeclarationsFromCSS,
    copyStyle,
    clearCopiedStyle,
    setManifest,
    getManifest,
  }
})
