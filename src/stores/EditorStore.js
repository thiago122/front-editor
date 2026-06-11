// EditorStore.js

import { ref, shallowRef, triggerRef, computed, watch, markRaw, toRaw } from 'vue'
import { defineStore } from 'pinia'
import { Pipeline } from '@/editor/pipeline/pipeline'
import { htmlPlugin } from '@/editor/pipeline/plugins/html-plugin'
import { findNodeById } from '@/utils/ast'

import { ManipulationEngine } from '@/editor/ManipulationEngine'
import { unifiedHistory } from '@/editor/history/UnifiedHistoryManager'
import { useStyleStore } from './StyleStore'
import { FileAccessService } from '@/editor/css/export/FileAccessService'
import { HtmlExportService } from '@/editor/css/export/HtmlExportService'
import { ApiService } from '@/services/ApiService'
import { CssExportService } from '@/editor/css/export/CssExportService'
import { DocumentNormalizer } from '@/editor/css/export/DocumentNormalizer'
import { editorHooks } from '@/editor/HookManager'
import { useComponentStore } from './ComponentStore'
import { AutoSaveService } from '@/editor/css/export/AutoSaveService'

// ─── AST path helper (runs on raw objects, no Vue proxy overhead) ─────────────
function _findPath(node, targetId, path) {
  if (!node) return null
  const p = [...path, node.nodeId]
  if (node.nodeId === targetId) return p
  const children = node.children
  if (!children) return null
  for (let i = 0; i < children.length; i++) {
    const result = _findPath(children[i], targetId, p)
    if (result) return result
  }
  return null
}

export const useEditorStore = defineStore('editor', () => {
  // --- STATE ---
  const ctx = ref(null)
  const selectedNodeId = ref(null)
  const selectedElement = ref(null) // From Inspector
  const hoveredNodeId = ref(null)
  const inspectMode          = ref(true)   // seletor ligado por padrão
  const showBoxModel         = ref(false)  // sem box model por padrão
  const outlineMode          = ref(true)   // outline mode ligado por padrão
  const showEmptyPlaceholder = ref(true)   // placeholder em vazios ligado por padrão
  const fileHandle = ref(null)
  const fileName   = ref(null)
  /** Documento atualmente aberto via API { id, title, type, path } */
  const currentDocument = ref(null)
  const iframe = ref(null)
  const previewContainer = ref(null) // wrapper do <Preview> — base para position:absolute do overlay
  const viewport         = ref({ width: window.innerWidth, height: window.innerHeight })
  const previewBreakpoint = ref({ width: 1280, unit: 'px' }) // breakpoint selecionado pelo usuário
  
  const pipeline = new Pipeline()
  pipeline.use(htmlPlugin())

  const manipulation = ref(new ManipulationEngine(getContext, getIframeDoc, pipeline))
  const clipboard         = ref({ type: null, data: null }) // Clipboard tipado
  const showCssExplorer   = ref(false)                      // CSS Explorer visível ao lado do inspector
  
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

  watch(() => [variablesPanel.value.x, variablesPanel.value.y], ([x, y]) => {
    localStorage.setItem('vars_panel_pos', JSON.stringify({ x, y }))
  })

  const visualEditor = ref({
    activeRuleUid: null,
    nextZIndex: 10000,
    panels: {
      layout:     { show: false, x: 0, y: 0, width: 350, height: 400, zIndex: 10000 },
      typography: { show: false, x: 0, y: 0, width: 350, height: 400, zIndex: 10000 },
      appearance: { show: false, x: 0, y: 0, width: 350, height: 400, zIndex: 10000 },
      dynamics:   { show: false, x: 0, y: 0, width: 350, height: 400, zIndex: 10000 },
    }
  })

  /** IDs de instâncias de componentes que o usuário abriu para edição */
  const unlockedComponentIds = ref(new Set())

  function unlockComponent(nodeId) {
    unlockedComponentIds.value.add(nodeId)
  }

  function lockComponent(nodeId) {
    unlockedComponentIds.value.delete(nodeId)
  }

  function isNodeInsideLockedComponent(nodeId) {
    if (!ctx.value?.ast) return false
    
    // 1. Encontra o nó na AST para ver se ele mesmo é um componente
    const node = findNodeById(ctx.value.ast, nodeId)
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
      const current = findNodeById(ctx.value.ast, currentId)
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

  function bringPanelToTop(categoryId) {
    const panel = visualEditor.value.panels[categoryId]
    if (!panel) return
    visualEditor.value.nextZIndex++
    panel.zIndex = visualEditor.value.nextZIndex
  }

  /**
   * Alterna a visibilidade de um painel de edição visual.
   * Se a regra informada for nova, sincroniza todas as janelas abertas para ela.
   */
  function toggleVisualPanel(ruleUid, categoryId, initialPos = null) {
    const isNewRule = visualEditor.value.activeRuleUid !== ruleUid
    
    // 1. Atualiza o contexto global se for uma regra diferente
    if (isNewRule) {
      visualEditor.value.activeRuleUid = ruleUid
    }

    const panel = visualEditor.value.panels[categoryId]
    if (!panel) return

    // 2. Se a regra mudou, garantimos que o painel clicado abra
    if (isNewRule) {
      panel.show = true
    } else {
      // Se for a mesma regra, alterna (toggle)
      panel.show = !panel.show
    }

    // 3. Posicionamento inicial (só se estiver abrindo e não houver posição salva)
    if (panel.show && initialPos && panel.x === 0 && panel.y === 0) {
      panel.x = initialPos.x
      panel.y = initialPos.y
    }

    // 4. Sempre traz para frente ao abrir ou clicar
    if (panel.show) {
      bringPanelToTop(categoryId)
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
   * Controla o efeito de blink visual no overlay de seleção.
   * Ativado após inserção de novo elemento para ajudar o usuário a
   * identificar onde o elemento foi inserido.
   */
  const isBlinking = ref(false)
  let   _blinkTimer = null

  /**
   * Estado do processo de salvamento para feedback na UI.
   * Ativado por Ctrl+S.
   */
  const saveState = ref({
    active:  false,
    status:  'idle',   // 'saving' | 'success' | 'error'
    message: '',
    details: [],      // lista de arquivos salvos ou erros
  })

  // ── Hooks nativos do editor ─────────────────────────────────────────────────
  // Prioridade 1 garante que todos estes hooks rodam ANTES de qualquer hook externo (padrão: 10).

  // 1. Remove atributos internos do editor
  editorHooks.on('document:beforeSave', (payload) => {
    payload.html = payload.html
      .replace(/ data-node-id="[^"]*"/g, '')   // IDs internos do editor
      .replace(/ data-selected="[^"]*"/g, '')   // estado de seleção
  }, 1)

  // 2. Remove estilos injetados pelo editor (evita acúmulo a cada salvamento)
  //    Apenas IDs específicos do editor são removidos.
  //    NÃO remove data-location="on_page" pois esses são estilos legítimos do manifesto CSS.
  editorHooks.on('document:beforeSave', (payload) => {
    const EDITOR_STYLE_IDS = [
      'editor-ui-styles',
      'editor-outline-mode',
      'editor-empty-placeholder',
    ]

    const parser = new DOMParser()
    const doc = parser.parseFromString(payload.html, 'text/html')

    // Remove style tags do editor
    EDITOR_STYLE_IDS.forEach((id) => doc.getElementById(id)?.remove())

    // Remove cursor e outline inline adicionados pelo editor durante interações
    doc.documentElement.style.removeProperty('cursor')
    doc.body?.style.removeProperty('cursor')

    // Remove outline: none que o useInlineEdit.js injeta durante edição inline
    // (safety net: o finish/cancel já removem, mas arquivos antigos podem ter ficado com isso)
    doc.querySelectorAll('[style*="outline"]').forEach((el) => {
      el.style.removeProperty('outline')
    })

    // Remove a variável --tag-name injetada pelo Outline Mode (label de hover).
    // É escrita inline nos elementos sob hover; nunca deve vazar para o HTML salvo.
    doc.querySelectorAll('[style*="--tag-name"]').forEach((el) => {
      el.style.removeProperty('--tag-name')
    })

    // Remove atributos style que ficaram vazios após as remoções acima
    doc.querySelectorAll('[style]').forEach((el) => {
      if (!el.getAttribute('style').trim()) el.removeAttribute('style')
    })

    // Remove TODOS os text nodes que contêm apenas whitespace do <head>
    // O prettier vai recolocar a indentação correta — não precisamos dos text nodes originais
    Array.from(doc.head.childNodes).forEach((node) => {
      if (node.nodeType === 3 && !node.textContent.trim()) {
        node.parentNode.removeChild(node)
      }
    })

    payload.html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
  }, 1)

  // 3. Formata (beautify) o HTML antes de salvar.
  //    Prioridade 5: roda depois das limpezas (prioridade 1) e antes de hooks externos (padrão: 10).
  editorHooks.on('document:beforeSave', async (payload) => {
    // a) Prettier: indenta e trata whitespace do body
    try {
      const { format }  = await import('prettier')
      const htmlParser  = await import('prettier/plugins/html')
      payload.html = await format(payload.html, {
        parser:                    'html',
        plugins:                   [htmlParser],
        printWidth:                120,
        tabWidth:                  2,
        useTabs:                   false,
        htmlWhitespaceSensitivity: 'ignore',
      })
    } catch (e) {
      console.warn('[EditorStore] Prettier beautify falhou, salvando sem formatar:', e)
    }

    // b) Após o prettier, remove whitespace text nodes SOMENTE do <head>
    //    (o prettier adiciona blank lines entre grupos de elementos no head)
    //    O body NÃO é tocado — útil manter espaços entre seções para legibilidade.
    const parser = new DOMParser()
    const doc = parser.parseFromString(payload.html, 'text/html')
    Array.from(doc.head.childNodes).forEach((node) => {
      if (node.nodeType === 3 && !node.textContent.trim()) {
        node.parentNode.removeChild(node)
      }
    })
    payload.html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
  }, 5)

  // 4. Serializa componentes antes de salvar: substitui elementos com data-component por <component name="...">
  editorHooks.on('document:beforeSave', (payload) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(payload.html, 'text/html')
    
    doc.querySelectorAll('[data-component]').forEach(el => {
      const name = el.getAttribute('data-component')
      const placeholder = doc.createElement('component')
      placeholder.setAttribute('name', name.endsWith('.html') ? name : `${name}.html`)
      el.replaceWith(placeholder)
    })

    payload.html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
  }, 2)

  // 5. Desserializa componentes após a leitura: substitui <component> pelo conteúdo real
  editorHooks.on('document:afterRead', async (payload) => {
    const componentStore = useComponentStore()
    await componentStore.loadComponents()

    const parser = new DOMParser()
    const doc = parser.parseFromString(payload.html, 'text/html')
    const placeholders = doc.querySelectorAll('component')

    if (placeholders.length === 0) return

    placeholders.forEach(placeholder => {
      const fullName = placeholder.getAttribute('name')
      const name = fullName.replace('.html', '')
      const component = componentStore.components.find(c => c.name === name || c.path === fullName)
      
      if (component) {
        const temp = document.createElement('div')
        temp.innerHTML = component.html
        const componentEl = temp.firstElementChild
        if (componentEl) {
          componentEl.setAttribute('data-component', name)
          placeholder.replaceWith(componentEl)
        }
      }
    })

    payload.html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
  })

  const styleStore = useStyleStore()

  // --- GETTERS ---

  /**
   * Ref raso (shallowRef) apontando para o nó raiz do AST.
   * É raw (não observado profundamente pelo Vue).
   * Use triggerRef(ast) via notifyAstMutation() para forçar re-render após mutações in-place.
   */
  const ast = shallowRef(null)

  /**
   * Sinaliza ao Vue que o AST foi mutado in-place.
   * triggerRef() força todos os watchers/computed de `ast` a re-executarem,
   * mesmo que a referência do objeto não tenha mudado.
   */
  function notifyAstMutation() {
    triggerRef(ast)
    // Mantemos astMutationKey para computed que precisam de um número (ex: openPath, selectedNode)
    astMutationKey.value++
  }

  /**
   * Incrementado após qualquer mutação no AST (insert, remove, move, attr).
   * Consumidores devem ler este valor em computed que não dependem de `ast` diretamente.
   */
  const astMutationKey = ref(0)

  const selectedNode = computed(() => {
    astMutationKey.value
    const rawAst = ast.value
    return rawAst ? findNodeById(rawAst, selectedNodeId.value) : null
  })

  const hoveredElement = computed(() => {
    if (!hoveredNodeId.value) return null
    const doc = getIframeDoc()
    return doc?.querySelector(`[data-node-id="${hoveredNodeId.value}"]`)
  })

  /**
   * Caminho de nodeIds do root até o nó selecionado.
   * Calculado na store com `toRaw` para evitar custo de Proxy.
   * Passado como prop para ASTExplorer → elimina o findPath recursivo em cada componente.
   */
  const openPath = computed(() => {
    astMutationKey.value
    if (!selectedNodeId.value || !ast.value) return []
    return _findPath(toRaw(ast.value), selectedNodeId.value, []) || []
  })

  function loadHTML(rawHTML) {
    // markRaw: impede o Vue de criar Proxies reativos profundos no AST.
    // Mutações são sinalizadas via notifyAstMutation() → triggerRef(ast).
    const result = markRaw(pipeline.run(rawHTML))
    ctx.value = result
    ast.value = result.ast   // shallowRef: atribuir novo valor notifica subscribers
    // astMutationKey também sobe para acionar computed dependentes
    astMutationKey.value++
  }

  // manipulation engine
  function initEngine(iframeDoc) {
    // Engine já inicializada no setup, agora usa getters dinâmicos.
    // Apenas garantimos que o histórico saiba da engine atual se necessário.
    // (O construtor da ManipulationEngine já faz history.setEngine(this))
  }

  function getIframeDoc() {
    return iframe.value?.contentDocument
  }

  function getContext() {
    return ctx.value
  }

  // As ações da Store apenas repassam para a Engine

  function selectNode(nodeId, element = null) {
    selectedNodeId.value = nodeId

    if (element) {
      selectedElement.value = markRaw(element)
    } else if (nodeId) {
      const doc = getIframeDoc()
      const el = doc?.querySelector(`[data-node-id="${nodeId}"]`)
      selectedElement.value = el ? markRaw(el) : null
    } else {
      selectedElement.value = null
    }
    // inspectMode não é alterado aqui — quem controla é o usuário via IconInspect

    // Reseta a fonte do Inspector de volta para o elemento caso estivesse forçada pelo CssExplorer
    styleStore.setInspectorSource('element')
  }

  /** Inicia o blink do overlay de seleção por 5 segundos. */
  function startBlink() {
    // Cancela timer anterior se houver (reinicia o blink)
    if (_blinkTimer) clearTimeout(_blinkTimer)
    isBlinking.value = true
    _blinkTimer = setTimeout(() => {
      isBlinking.value = false
      _blinkTimer = null
    }, 3000)
  }

  function activate() {
    inspectMode.value = true
  }

  // Desativa o modo inspect — mantém o elemento selecionado (comportamento Chrome)
  function deactivate() {
    inspectMode.value = false
  }

  // Limpa tudo (ex: ao trocar de página ou fechar o inspetor)
  function clearSelection() {
    inspectMode.value = false
    selectedElement.value = null
    selectedNodeId.value = null
  }

  function selectParent() {
    if (!manipulation.value) return
    const parent = manipulation.value.getParent(selectedNodeId.value)
    if (parent) {
      selectNode(parent.nodeId) // selectNode atualiza nodeId + selectedElement juntos
    }
  }

  function getParent(nodeId) {
    if (!manipulation.value) return null
    return manipulation.value.getParent(nodeId)
  }

  /** Retorna um nó do AST pelo ID (usa toRaw para busca confiável) */
  function getNode(nodeId) {
    if (!ast.value) return null
    return findNodeById(toRaw(ast.value), nodeId)
  }

  // Getters para a UI
  const canPaste = computed(() => clipboard.value.type === 'html-node')

  // ── Outline & Viewport Styles: injeta/remove <style> no iframe ───────────────
  const OUTLINE_STYLE_ID = 'editor-outline-mode'
  const EMPTY_PLACEHOLDER_STYLE_ID = 'editor-empty-placeholder'

  // ── Label de tag do Outline Mode (lazy) ──────────────────────────────────────
  // O tooltip de hover usa `content: var(--tag-name)`. Em vez de injetar a variável
  // inline em TODOS os elementos a cada applyEditorStyles (O(N) writes = invalida
  // layout), populamos apenas o elemento sob o cursor, via um único listener
  // delegado de mouseover (O(1) por hover).
  let _tagNameDoc = null
  function _onTagNameHover(e) {
    const el = e.target
    if (el?.nodeType === 1 && el.tagName && !el.style.getPropertyValue('--tag-name')) {
      el.style.setProperty('--tag-name', `'${el.tagName.toLowerCase()}'`)
    }
  }
  function detachTagNameLabel() {
    if (_tagNameDoc) {
      _tagNameDoc.removeEventListener('mouseover', _onTagNameHover)
      _tagNameDoc = null
    }
  }
  function attachTagNameLabel(doc) {
    if (_tagNameDoc === doc) return  // já anexado neste doc
    detachTagNameLabel()
    if (!doc) return
    doc.addEventListener('mouseover', _onTagNameHover)
    _tagNameDoc = doc
  }

  /**
   * Aplica ou remove estilos utilitários (outline, placeholders) no documento do iframe.
   * Centralizado para garantir consistência no load inicial e em reloads.
   */
  function applyEditorStyles(doc = getIframeDoc()) {
    if (!doc) return

    // 1. Outline Mode
    doc.getElementById(OUTLINE_STYLE_ID)?.remove()
    if (outlineMode.value) {
      const style = doc.createElement('style')
      style.id = OUTLINE_STYLE_ID
      style.setAttribute('data-location', 'ignore')
      style.textContent = `
        /* Linhas base sutis para todos */
        * { outline: 1px solid rgba(0, 0, 0, 0.1) !important; outline-offset: -1px; transition: outline-color 0.2s; }

        /* Cores temáticas por categoria (mais vibrantes) */
        div, section, article, main, header, footer { outline-color: rgba(99, 102, 241, 0.4) !important; } 
        span, p, h1, h2, h3, h4, h5, h6 { outline-color: rgba(245, 158, 11, 0.4) !important; }
        a, button, input, select, textarea { outline-color: rgba(16, 185, 129, 0.5) !important; }
        img, video, svg, canvas { outline-color: rgba(236, 72, 153, 0.5) !important; }

        /* Label no Hover */
        *:not(html):not(body):hover { 
          outline: 2px solid #6366f1 !important; 
          outline-offset: -2px;
          z-index: 9999;
        }

        /* Tooltip baseada no nome da tag */
        *:not(html):not(body):hover::after {
          content: "<" var(--tag-name, "element") ">" !important;
          position: absolute;
          top: -18px;
          left: -2px;
          background: #6366f1;
          color: white;
          font-size: 10px;
          font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          padding: 2px 6px;
          border-radius: 4px 4px 0 0;
          pointer-events: none;
          z-index: 10000;
          line-height: 1.2;
          display: block !important;
          text-transform: lowercase;
          white-space: nowrap;
          box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
        }
      `
      doc.head.appendChild(style)

      // Label lazy: popula --tag-name só no elemento sob hover (ver attachTagNameLabel).
      attachTagNameLabel(doc)
    } else {
      detachTagNameLabel()
    }

    // 2. Empty Placeholders
    doc.getElementById(EMPTY_PLACEHOLDER_STYLE_ID)?.remove()
    if (showEmptyPlaceholder.value) {
      const style = doc.createElement('style')
      style.id = EMPTY_PLACEHOLDER_STYLE_ID
      style.setAttribute('data-location', 'ignore')
      style.textContent = `
        [data-node-id]:empty:not(br):not(hr):not(img):not(input):not(svg):not(video):not(iframe):not(canvas):not(button):not(option):not(optgroup):not(select):not(textarea)  {
          min-height: 24px;
          outline: 1.5px dashed rgba(99,102,241,0.5) !important;
          position: relative;
          display: flex !important;
          align-items: center;
          justify-content: center;
        }
        [data-node-id]:empty:not(br):not(hr):not(img):not(input):not(svg):not(video):not(iframe):not(canvas):not(button):not(option):not(optgroup):not(select):not(textarea)::before {
          content: "vazio" !important;
          font-size: 10px;
          font-family: monospace;
          color: rgba(99, 102, 241, 0.6);
          pointer-events: none;
        }
      `
      doc.head.appendChild(style)
    }
  }

  // Watchers reagindo a mudanças de estado manuais
  watch([outlineMode, showEmptyPlaceholder], () => applyEditorStyles())
  watch(iframe, (newIframe) => {
    if (newIframe) applyEditorStyles(newIframe.contentDocument)
  })

  watch(iframe, (newIframe) => {
    if (newIframe) {
      initEngine(newIframe.contentDocument)

      // Initialize CSS AST for the new iframe
      newIframe.addEventListener('load', async () => {
        // Refresh CSS AST (loads CSS internally)
        await styleStore.rebuildLogicTree(getIframeDoc(), ['internal', 'external'])
        
        // Garante que os estilos do editor (outline, etc) sejam reaplicados no novo doc
        applyEditorStyles()
      })
    }
  })


  // viewport sync
  function setViewport(width, height) {
    viewport.value = { width, height }
  }
  function setPreviewBreakpoint(width, unit) {
    previewBreakpoint.value = { width, unit }
  }
  function handleHover({ id, source }) {
    hoveredNodeId.value = id

    // 1. Limpa o hover anterior em ambos os documentos
    const iframeDoc = getIframeDoc()
    document.querySelectorAll('[data-editor-hovered]').forEach(el => el.removeAttribute('data-editor-hovered'))
    iframeDoc?.querySelectorAll('[data-editor-hovered]').forEach(el => el.removeAttribute('data-editor-hovered'))

    if (!id) return

    // 2. Aplica o novo hover no Explorer (DOM Principal)
    const astEl = document.querySelector(`[data-ast-node-id="${id}"]`)
    if (astEl) astEl.setAttribute('data-editor-hovered', '')

    // 3. Aplica o novo hover no Preview (Iframe)
    const previewEl = iframeDoc?.querySelector(`[data-node-id="${id}"]`)
    if (previewEl) previewEl.setAttribute('data-editor-hovered', '')
  }

  function undo() {
    unifiedHistory.undo()
  }

  function redo() {
    unifiedHistory.redo()
  }

  // ── File System Access API ──────────────────────────────────────────────────

  /** Abre um arquivo HTML do disco e carrega no editor. */
  async function openFile() {
    try {
      const { handle, html, name } = await FileAccessService.openFile()
      fileHandle.value = handle
      fileName.value   = name
      loadHTML(html)
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[EditorStore] openFile:', e)
    }
  }

  /**
   * Salva o HTML atual no arquivo aberto (sem seletor de arquivo).
   * Se nenhum arquivo estiver aberto, chama saveFileAs().
   */
  async function saveFile() {
    const doc = getIframeDoc()
    if (!doc) return
    const html = HtmlExportService.generateHtml(doc)
    if (fileHandle.value) {
      await FileAccessService.saveFile(fileHandle.value, html)
    } else {
      await saveFileAs()
    }
  }

  /** Abre o seletor "Salvar como" e grava o arquivo. */
  async function saveFileAs() {
    const doc = getIframeDoc()
    if (!doc) return
    const html = HtmlExportService.generateHtml(doc)
    try {
      const { handle, name } = await FileAccessService.saveFileAs(html, fileName.value ?? 'index.html')
      fileHandle.value = handle
      fileName.value   = name
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[EditorStore] saveFileAs:', e)
    }
  }

  /**
   * Atualiza todas as instâncias de um componente no documento atual,
   * preservando o conteúdo dos slots definidos pelo usuário.
   * @param {string} name - Nome do componente (ex: 'header')
   * @param {string} html - Novo HTML mestre do componente
   */
  function refreshComponentInstances(name, html) {
    if (!ctx.value?.ast) return

    const instances = []
    
    // Função recursiva para achar todas as instâncias na AST
    const findInstances = (node) => {
      if (node.attrs?.['data-component'] === name) {
        instances.push(node.nodeId)
      }
      if (node.children) {
        node.children.forEach(findInstances)
      }
    }
    
    findInstances(ctx.value.ast)
    
    if (instances.length === 0) return

    console.log(`[EditorStore] Refreshing ${instances.length} instances of component: ${name}`)

    // Para cada instância: extrai snapshot dos slots ANTES de atualizar
    instances.forEach(nodeId => {
      const instanceNode = findNodeById(ctx.value.ast, nodeId)
      const slotSnapshots = extractSlotSnapshots(instanceNode)
      manipulation.value.updateNodeFromHtml(nodeId, html, slotSnapshots)
    })
  }

  /**
   * Extrai um mapa de { slotName → { children, extraAttrs } } de uma instância de componente.
   * Usado para preservar o conteúdo editado nos slots durante o hot-swap do master.
   * @param {object} node - Nó AST da instância
   * @returns {Map<string, { children: object[], extraAttrs: object }>}
   */
  function extractSlotSnapshots(node) {
    const snapshots = new Map()
    if (!node?.children) return snapshots

    const SLOT_CONTROL_ATTRS = ['data-slot', 'data-slot-replace', 'data-slot-hide-empty', 'data-slot-no-fallback', 'data-node-id']

    const findSlots = (children) => {
      children.forEach(child => {
        const slotName = child.attrs?.['data-slot']
        if (slotName !== undefined) {
          // Atributos que o usuário adicionou além dos de controle
          const extraAttrs = {}
          if (child.attrs) {
            Object.entries(child.attrs).forEach(([k, v]) => {
              if (!SLOT_CONTROL_ATTRS.includes(k)) {
                extraAttrs[k] = v
              }
            })
          }
          snapshots.set(slotName, {
            children: child.children ?? [],
            extraAttrs,
            replace: child.attrs?.['data-slot-replace'] !== undefined,
          })
        }
        // Não entra recursivamente — slots são filhos diretos do componente-raiz
      })
    }

    findSlots(node.children)
    return snapshots
  }

  // ── API Backend ──────────────────────────────────────────────────────────

  /**
   * Abre um documento via API e carrega o HTML no editor.
   * Recebe { html, manifest, baseUrl } do backend.
   * O DocumentNormalizer injeta os <link> com URLs absolutas antes de carregar no iframe.
   * @param {{ id, title, type, path }} doc
   */
  async function openDocument(doc) {
    if (!doc) return
    try {
      const docPath = (doc.path ?? doc.id).replace(/\\/g, '/') // normaliza barras do Windows
      console.log('[EditorStore] openDocument:', docPath)

      await editorHooks.emitAsync('document:beforeOpen', { doc, docPath })

      currentDocument.value = doc

      const { html, manifest, baseUrl } = await ApiService.readDocument(docPath)
      console.log('[EditorStore] html recebido, length:', html?.length)

      const readPayload = { html }
      await editorHooks.emitAsync('document:afterRead', readPayload)
      const processedHtml = readPayload.html

      // Armazena o manifesto como fonte de verdade no StyleStore
      styleStore.setManifest(manifest ?? [])

      // Injeta <link> com URLs absolutas para o iframe renderizar os CSS
      const preparedHtml = DocumentNormalizer.prepareForEditor(processedHtml, manifest ?? [], baseUrl ?? '')

      fileName.value        = doc.title ?? docPath
      loadHTML(preparedHtml)
      console.log('[EditorStore] loadHTML chamado, ctx:', !!ctx.value)

      editorHooks.emit('document:afterOpen', { doc, docPath, html: preparedHtml, ctx: ctx.value })
    } catch (e) {
      console.error('[EditorStore] openDocument ERRO:', e)
      throw e
    }
  }

  /**
   * Procura um documento pelo path e o abre.
   * Útil para carregar o documento quando a página é atualizada (via URL).
   * @param {string} path 
   */
  async function openDocumentByPath(path) {
    if (!path) return
    try {
      const normalizedPath = path.replace(/\\/g, '/')
      
      // Busca a lista atualizada para encontrar os metadados (id, title, type)
      const docs = await ApiService.listDocuments()
      const doc  = docs.find(d => (d.path ?? d.id).replace(/\\/g, '/') === normalizedPath)
      
      if (doc) {
        await openDocument(doc)
      } else {
        // Fallback: tenta abrir apenas com o path se não encontrar na lista
        console.warn(`[EditorStore] Documento não encontrado na lista: ${normalizedPath}. Tentando abertura direta.`)
        await openDocument({
          id: normalizedPath,
          path: normalizedPath,
          title: normalizedPath.split('/').pop(),
          type: 'document'
        })
      }
    } catch (e) {
      console.error('[EditorStore] openDocumentByPath ERRO:', e)
      throw e
    }
  }

  /**
   * Salva o HTML atual via API no documento aberto.
   * 1. Gera HTML do iframe e aplica hooks (limpeza de atributos, prettier)
   * 2. DocumentNormalizer.prepareForSave() injeta <link> relativos limpos
   * 3. Salva HTML no backend (file_put_contents puro)
   * 4. Salva todos os CSS internos editáveis
   * 5. Salva o manifesto atual
   */
  let _isSaving = false

  async function saveDocument() {
    if (_isSaving) {
      console.warn('[EditorStore] saveDocument ignorado: salvamento já em andamento.')
      return false
    }
    _isSaving = true

    const doc = currentDocument.value
    if (!doc) {
      _isSaving = false
      return false
    }
    const iframeDoc = getIframeDoc()
    if (!iframeDoc) {
      _isSaving = false
      return false
    }

    // Inicia feedback visual
    saveState.value = {
      active:  true,
      status:  'saving',
      message: 'Salvando alterações...',
      details: [],
    }

    try {
      // 1. Gera o HTML e permite que hooks o modifiquem antes de salvar.
      const savePayload = { doc, html: HtmlExportService.generateHtml(iframeDoc) }
      await editorHooks.emitAsync('document:beforeSave', savePayload)

      // 2. Normaliza o HTML
      const docPath = doc.path ?? doc.id
      const manifest = styleStore.getManifest()
      savePayload.html = DocumentNormalizer.prepareForSave(savePayload.html, manifest, docPath)

      // 3. Salva HTML no backend
      await ApiService.saveDocument(docPath, savePayload.html)
      saveState.value.details.push(`HTML: ${fileName.value || docPath}`)
      console.log('[EditorStore] saveDocument: HTML salvo', docPath)

      // 4. Salva todos os CSS internos (ignorando on_page e externos)
      const logicTree = styleStore.cssLogicTree
      if (logicTree) {
        // Usamos toRaw para garantir que trabalhamos com o array real da logicTree
        const sheets = CssExportService.generateAll(logicTree)
        const saves = []
        
        sheets.forEach(({ origin, sourceName, css }) => {
          if (origin !== 'internal') return // só os editáveis
          
          saves.push(
            ApiService.saveAsset(sourceName, css, currentDocument.value?.path)
              .then(() => {
                saveState.value.details.push(`CSS: ${sourceName}`)
                console.log('[EditorStore] CSS salvo:', sourceName)
              })
              .catch(err => {
                const errorMsg = `Erro CSS (${sourceName}): ${err.message}`
                saveState.value.details.push(errorMsg)
                saveState.value.status = 'error'
                console.error('[EditorStore]', errorMsg)
              })
          )
        })
        await Promise.all(saves)
      }

      // 5. Salva o manifesto atualizado
      await ApiService.saveManifest(manifest, docPath)
      saveState.value.details.push(`Manifesto atualizado`)
      console.log('[EditorStore] Manifesto salvo')

      if (saveState.value.status !== 'error') {
        saveState.value.status  = 'success'
        saveState.value.message = 'Documento salvo com sucesso!'
        AutoSaveService.clear()
      } else {
        saveState.value.message = 'Houve problemas ao salvar alguns arquivos.'
      }

      editorHooks.emit('document:afterSave', { doc, html: savePayload.html })

    } catch (e) {
      console.error('[EditorStore] saveDocument ERRO FATAL:', e)
      saveState.value.status  = 'error'
      saveState.value.message = 'Erro crítico ao salvar'
      saveState.value.details.push(e.message)
    } finally {
      _isSaving = false
      // Oculta a mensagem após alguns segundos se for sucesso
      if (saveState.value.status === 'success') {
        setTimeout(() => {
          // Se ainda for a mesma sessão de save, fecha
          if (saveState.value.status === 'success') {
            saveState.value.active = false
          }
        }, 4000)
      }
    }

    return saveState.value.status !== 'error'
  }

  // ── Visual Editing Sync ────────────────────────────────────────────────────
  
  /**
   * Monitora a regra selecionada no StyleStore (Inspector).
   * Se houver algum painel de edição visual aberto, atualiza o activeRuleUid
   * para que os painéis sigam a seleção do usuário automaticamente.
   */
  watch(() => styleStore.selectedRuleId, (newRuleId) => {
    const anyPanelOpen = Object.values(visualEditor.value.panels).some(p => p.show)
    
    if (anyPanelOpen) {
      visualEditor.value.activeRuleUid = newRuleId
    }
  })

  // ── Ouve mutações do ManipulationEngine → notifica Vue via astMutationKey ──
  // ManipulationEngine opera sobre o AST bruto (markRaw). Esses hooks são
  // o único canal de sinalização de mudança para o sistema reativo do Vue.
  editorHooks.on('node:afterInsert',   notifyAstMutation)
  editorHooks.on('node:afterRemove',   notifyAstMutation)
  editorHooks.on('node:afterMove',     notifyAstMutation)
  editorHooks.on('node:afterAttribute', notifyAstMutation)

  return {
    triggerInlineEdit,
    htmlEditor,
    cssFileEditor,
    quickCodeEditor,
    pixelPerfectEditor,
    variablesPanel,
    quickAttributesOpen,
    openCodeEditor,
    ctx,
    ast,
    astMutationKey,
    notifyAstMutation,
    openPath,
    selectNode,
    selectedNode,
    selectedNodeId,
    selectedElement,
    selectorRenameConfirm,
    hoveredElement,
    hoveredNodeId,
    inspectMode,
    showBoxModel,
    outlineMode,
    showEmptyPlaceholder,
    fileHandle,
    fileName,
    currentDocument,
    openFile,
    saveFile,
    saveFileAs,
    openDocument,
    openDocumentByPath,
    saveDocument,
    refreshComponentInstances,
    fileAccessSupported: FileAccessService.isSupported(),
    loadHTML,
    viewport,
    setViewport,
    previewBreakpoint,
    setPreviewBreakpoint,
    selectParent,
    iframe,
    previewContainer,
    getIframeDoc,
    manipulation,
    clipboard,
    canPaste,
    pipeline,
    handleHover,
    getParent,
    getNode,
    activate,
    deactivate,
    clearSelection,
    undo,
    redo,
    isBlinking,
    startBlink,
    saveState,
    pixelPerfectEditor,
    visualEditor,
    toggleVisualPanel,
    bringPanelToTop,
    unlockedComponentIds,
    unlockComponent,
    lockComponent,
    isNodeInsideLockedComponent,
  }
})

