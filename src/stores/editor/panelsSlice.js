import { ref, watch } from 'vue'
import { debounce } from 'lodash-es'

/**
 * Fatia do EditorStore: estado de UI dos painéis/janelas flutuantes.
 *
 * REGRA DAS FATIAS: nunca importar useEditorStore aqui (ciclo);
 * dependências chegam por parâmetro. Os refs retornados são espalhados
 * no return do EditorStore — a API pública não muda.
 *
 * @param {{ styleStore: object }} deps
 */
export function createPanelsSlice({ styleStore }) {
  const htmlEditor = ref({
    show:     false,
    targetId: null,
    x:        window.innerWidth / 2 - 420,
    y:        window.innerHeight - 560
  })

  const cssFileEditor = ref({
    show:     false,
    targetId: null,
    x:        window.innerWidth / 2 + 20,
    y:        window.innerHeight - 560
  })

  const quickAttributesOpen = ref(false)                    // Acordeão de atributos na base do inspector

  /** Estado do editor rápido (popover) */
  const quickCodeEditor = ref({
    show:     false,
    mode:     'css',
    targetId: null,
    x:        0,
    y:        0,
    updateKey: 0
  })

  const pixelPerfectEditor = ref({
    show:     false,
    x:        window.innerWidth - 450,
    y:        100
  })

  const savedVarsPos = JSON.parse(localStorage.getItem('vars_panel_pos') || 'null')
  const variablesPanel = ref({
    show:     false,
    x:        savedVarsPos?.x ?? window.innerWidth - 320,
    y:        savedVarsPos?.y ?? 100
  })

  // Debounce: o watch dispara a cada pixel do drag — localStorage.setItem é
  // síncrono e travaria o arrasto. Persiste só quando o movimento assenta.
  const persistVarsPos = debounce((x, y) => {
    localStorage.setItem('vars_panel_pos', JSON.stringify({ x, y }))
  }, 300)
  watch(() => [variablesPanel.value.x, variablesPanel.value.y], ([x, y]) => {
    persistVarsPos(x, y)
  })

  // Painel único de edição visual (não mais dividido por categorias).
  // Todos os editores (Layout, Sizing, Spacing, Positioning, Advanced,
  // Typography, Appearance) vivem numa só janela flutuante.
  const visualEditor = ref({
    activeRuleUid: null,
    nextZIndex: 10000,
    panel: { show: false, x: 0, y: 0, width: 350, height: 520, zIndex: 10000 },
  })

  function bringPanelToTop() {
    const panel = visualEditor.value.panel
    visualEditor.value.nextZIndex++
    panel.zIndex = visualEditor.value.nextZIndex
  }

  /**
   * Alterna a visibilidade do painel de edição visual.
   * Se a regra informada for nova, o painel segue para ela (e abre).
   */
  function toggleVisualPanel(ruleUid, initialPos = null) {
    const isNewRule = visualEditor.value.activeRuleUid !== ruleUid

    // 1. Atualiza o contexto global se for uma regra diferente
    if (isNewRule) {
      visualEditor.value.activeRuleUid = ruleUid
    }

    const panel = visualEditor.value.panel

    // 2. Regra nova → garante aberto; mesma regra → alterna (toggle)
    if (isNewRule) {
      panel.show = true
    } else {
      panel.show = !panel.show
    }

    // 3. Posicionamento inicial (só se estiver abrindo e não houver posição salva)
    if (panel.show && initialPos && panel.x === 0 && panel.y === 0) {
      panel.x = initialPos.x
      panel.y = initialPos.y
    }

    // 4. Sempre traz para frente ao abrir ou clicar
    if (panel.show) {
      bringPanelToTop()
    }
  }

  /**
   * Abre o editor de código em um modo específico para um alvo específico.
   * @param {string} mode - 'html' | 'css'
   * @param {string} targetId - ID do nó (HTML) ou RuleID (CSS)
   * @param {{x: number, y: number}} position - Opcional: posição para abrir o editor rápido
   */
  function openCodeEditor(mode, targetId, position = null) {
    // Se for uma regra CSS e tivermos posição, abrimos o Quick Editor (popover)
    if (mode === 'css' && targetId?.startsWith('rule::') && position) {
      quickCodeEditor.value.targetId = targetId
      quickCodeEditor.value.mode     = mode
      quickCodeEditor.value.x        = position.x
      quickCodeEditor.value.y        = position.y
      quickCodeEditor.value.updateKey++ // Sinal de gatilho para os componentes
      quickCodeEditor.value.show     = true
      return
    }

    if (mode === 'html') {
      htmlEditor.value.targetId = targetId
      htmlEditor.value.show = true
    } else {
      cssFileEditor.value.targetId = targetId
      cssFileEditor.value.show = true
    }

    // Fecha o quick editor se ele estiver aberto para outro alvo
    if (quickCodeEditor.value.show) {
      quickCodeEditor.value.show = false
    }
  }

  /**
   * Função registrada pelo Preview.vue que inicia a edição inline num elemento do iframe.
   * Null até o Preview inicializar. Chamada pelo botão "T" do HighlightOverlay.
   */
  const triggerInlineEdit = ref(null)

  /**
   * Estado do banner de confirmação de rename de seletor CSS.
   * Mantido no store para sobreviver ao re-mount do componente CssRule
   * que ocorre quando applyMutation recomputa as regras do inspector.
   */
  const selectorRenameConfirm = ref({
    show:        false,
    type:        null,    // 'class' | 'id'
    oldName:     '',
    newName:     '',
    ruleUid:     null,    // uid da rule para validar que o banner é da rule certa
  })

  /**
   * Monitora a regra selecionada no StyleStore (Inspector).
   * Se houver algum painel de edição visual aberto, atualiza o activeRuleUid
   * para que os painéis sigam a seleção do usuário automaticamente.
   */
  watch(() => styleStore.selectedRuleId, (newRuleId) => {
    if (visualEditor.value.panel.show) {
      visualEditor.value.activeRuleUid = newRuleId
    }
  })

  return {
    htmlEditor,
    cssFileEditor,
    quickAttributesOpen,
    quickCodeEditor,
    pixelPerfectEditor,
    variablesPanel,
    visualEditor,
    bringPanelToTop,
    toggleVisualPanel,
    openCodeEditor,
    triggerInlineEdit,
    selectorRenameConfirm,
  }
}
