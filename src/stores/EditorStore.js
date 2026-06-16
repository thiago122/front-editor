// EditorStore.js

import { ref, shallowRef, triggerRef, computed, watch, markRaw, toRaw } from 'vue'
import { defineStore } from 'pinia'
import { Pipeline } from '@/editor/pipeline/pipeline'
import { htmlPlugin } from '@/editor/pipeline/plugins/html-plugin'
import { findNodeById } from '@/utils/ast'

import { ManipulationEngine } from '@/editor/ManipulationEngine'
import { unifiedHistory } from '@/editor/history/UnifiedHistoryManager'
import { useStyleStore } from './StyleStore'
import { editorHooks } from '@/editor/HookManager'
import { createPanelsSlice } from './editor/panelsSlice'
import { createDocumentsSlice } from './editor/documentsSlice'
import { createComponentLockSlice } from './editor/componentLockSlice'
import { createFeedbackSlice } from './editor/feedbackSlice'
import { createEditorStylesSlice } from './editor/editorStylesSlice'

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
  const iframe = ref(null)
  const previewContainer = ref(null) // wrapper do <Preview> — base para position:absolute do overlay
  const viewport         = ref({ width: window.innerWidth, height: window.innerHeight })
  const previewBreakpoint = ref({ width: 100, unit: '%' }) // breakpoint selecionado pelo usuário (default: full width)
  
  const pipeline = new Pipeline()
  pipeline.use(htmlPlugin())

  const manipulation = ref(new ManipulationEngine(getContext, getIframeDoc, pipeline))
  const clipboard         = ref({ type: null, data: null }) // Clipboard tipado
  const showCssExplorer   = ref(false)                      // CSS Explorer visível ao lado do inspector

  // Trava de componentes e feedback visual — fatias (stores/editor/)
  const componentLock = createComponentLockSlice({ getCtx: getContext, getParent })
  const feedback = createFeedbackSlice()
  const { saveState } = feedback // saveDocument escreve nele diretamente

  const styleStore = useStyleStore()

  // Ciclo de vida de documentos/arquivos (open/save, hooks de beforeSave/afterRead)
  // — ver stores/editor/documentsSlice.js. Registra os hooks ao ser criada.
  const documents = createDocumentsSlice({
    loadHTML,
    getIframeDoc,
    getCtx: getContext,
    styleStore,
    saveState,
  })

  // Painéis/janelas flutuantes (htmlEditor, visualEditor, variablesPanel…)
  // vivem em stores/editor/panelsSlice.js — espalhados no return.
  const panels = createPanelsSlice({ styleStore })

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
  function initEngine(_iframeDoc) {
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

  // Outline Mode e placeholder de vazios — fatia própria.
  // applyEditorStyles é usado pelo watcher de load abaixo.
  const editorStyles = createEditorStylesSlice({ getIframeDoc, iframe })
  const { applyEditorStyles } = editorStyles

  // Handler de load guardado fora do watch: sem isso, cada reatribuição do
  // iframe empilharia um listener novo (N rebuilds por load + leak do antigo).
  let _onIframeLoad = null

  watch(iframe, (newIframe, oldIframe) => {
    if (oldIframe && _onIframeLoad) oldIframe.removeEventListener('load', _onIframeLoad)
    if (!newIframe) return

    initEngine(newIframe.contentDocument)

    // Initialize CSS AST for the new iframe
    _onIframeLoad = async () => {
      // Refresh CSS AST (loads CSS internally)
      await styleStore.rebuildLogicTree(getIframeDoc(), ['internal', 'external'])

      // Garante que os estilos do editor (outline, etc) sejam reaplicados no novo doc
      applyEditorStyles()

      // O reload mata o documento antigo — selectedElement apontaria para um
      // elemento órfão (getComputedStyle vazio, overlay some). Re-resolve pelo id.
      restoreSelection()
    }
    newIframe.addEventListener('load', _onIframeLoad)
  })

  /** Re-resolve a seleção no documento atual ou limpa se o nó não existe mais. */
  function restoreSelection() {
    if (!selectedNodeId.value) return
    const el = getIframeDoc()?.querySelector(`[data-node-id="${selectedNodeId.value}"]`)
    if (el) {
      selectedElement.value = markRaw(el)
    } else {
      selectedNodeId.value = null
      selectedElement.value = null
    }
  }


  // viewport sync
  function setViewport(width, height) {
    viewport.value = { width, height }
  }
  function setPreviewBreakpoint(width, unit) {
    previewBreakpoint.value = { width, unit }
  }
  function handleHover({ id, source: _source }) {
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


  // ── Ouve mutações do ManipulationEngine → notifica Vue via astMutationKey ──
  // ManipulationEngine opera sobre o AST bruto (markRaw). Esses hooks são
  // o único canal de sinalização de mudança para o sistema reativo do Vue.
  editorHooks.on('node:afterInsert',   notifyAstMutation)
  editorHooks.on('node:afterRemove',   notifyAstMutation)
  editorHooks.on('node:afterMove',     notifyAstMutation)
  editorHooks.on('node:afterAttribute', notifyAstMutation)

  return {
    // Painéis/janelas flutuantes — ver stores/editor/panelsSlice.js
    ...panels,
    showCssExplorer,
    ctx,
    ast,
    astMutationKey,
    notifyAstMutation,
    openPath,
    selectNode,
    selectedNode,
    selectedNodeId,
    selectedElement,
    hoveredElement,
    hoveredNodeId,
    inspectMode,
    showBoxModel,
    // Outline/placeholder — ver stores/editor/editorStylesSlice.js
    ...editorStyles,
    // Documentos/arquivos (open/save/hooks) — ver stores/editor/documentsSlice.js
    ...documents,
    refreshComponentInstances,
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
    // Trava de componentes + feedback visual — ver stores/editor/
    ...componentLock,
    ...feedback,
  }
})

