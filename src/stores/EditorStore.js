// EditorStore.js

import { ref, computed, watch, markRaw } from 'vue'
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
import { editorHooks } from '@/editor/HookManager'

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
  const viewport = ref({ width: window.innerWidth, height: window.innerHeight })
  const manipulation = ref(null)
  const clipboard      = ref({ type: null, data: null }) // Clipboard tipado

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

  const pipeline = new Pipeline()
  pipeline.use(htmlPlugin())

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

    // Remove cursor inline adicionado pelo useIframeEvents durante o inspectMode
    doc.documentElement.style.removeProperty('cursor')
    doc.body?.style.removeProperty('cursor')

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

  const styleStore = useStyleStore()

  // --- GETTERS ---
  const ast = computed(() => ctx.value?.ast)
  const selectedNode = computed(() => findNodeById(ast.value, selectedNodeId.value))
  const hoveredElement = computed(() => {
    if (!hoveredNodeId.value) return null
    const doc = getIframeDoc()
    return doc?.querySelector(`[data-node-id="${hoveredNodeId.value}"]`)
  })

  function loadHTML(rawHTML) {
    ctx.value = pipeline.run(rawHTML)
  }

  // manipulation engine
  function initEngine(iframeDoc) {
    manipulation.value = new ManipulationEngine(getContext, getIframeDoc, pipeline)
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
    const parent = manipulation.value.getParent(selectedNodeId.value)
    if (parent) {
      selectNode(parent.nodeId) // selectNode atualiza nodeId + selectedElement juntos
    }
  }

  function getParent(nodeId) {
    return manipulation.value.getParent(nodeId)
  }

  // Getters para a UI
  const canPaste = computed(() => clipboard.value.type === 'html-node')

  // ── Outline mode: injeta/remove <style> no iframe ──────────────────────────
  const OUTLINE_STYLE_ID = 'editor-outline-mode'
  watch([outlineMode, iframe], () => {
    const doc = getIframeDoc()
    if (!doc) return
    // Remove sempre primeiro para garantir estado limpo
    doc.getElementById(OUTLINE_STYLE_ID)?.remove()
    if (outlineMode.value) {
      const style = doc.createElement('style')
      style.id = OUTLINE_STYLE_ID
      style.textContent = '* { outline: 1px solid rgba(255, 100, 0, 0.4) !important; }'
      doc.head.appendChild(style)
    }
  })

  // ── Empty placeholder: mostra borda tracejada + label em elementos vazios ─────────
  const EMPTY_PLACEHOLDER_STYLE_ID = 'editor-empty-placeholder'
  watch([showEmptyPlaceholder, iframe], () => {
    const doc = getIframeDoc()
    if (!doc) return
    doc.getElementById(EMPTY_PLACEHOLDER_STYLE_ID)?.remove()
    if (showEmptyPlaceholder.value) {
      const style = doc.createElement('style')
      style.id = EMPTY_PLACEHOLDER_STYLE_ID
      style.textContent = `
        [data-node-id]:empty {
          min-height: 24px;
          outline: 1.5px dashed rgba(99,102,241,0.5) !important;
          
          position: relative;
        }
        [data-node-id]:empty::before {
          content: attr(data-node-id) !important;
          width: 90%;
          display: block !important;
          content: "vazio" !important;
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-family: monospace;
          color: rgba(99,102,241,0.6);
          pointer-events: none;
        }
      `
      doc.head.appendChild(style)
    }
  })

  watch(iframe, (newIframe) => {
    if (newIframe) {
      initEngine(newIframe.contentDocument)

      // Initialize CSS AST for the new iframe
      newIframe.addEventListener('load', async () => {
        // Refresh CSS AST (loads CSS internally)
        await styleStore.rebuildLogicTree(getIframeDoc(), ['internal', 'external'])
      })
    }
  })


  // viewport sync
  function setViewport(width, height) {
    viewport.value = { width, height }
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

  // ── API Backend ──────────────────────────────────────────────────────────

  /**
   * Abre um documento via API e carrega o HTML no editor.
   * Resolve URLs relativas (CSS, imagens, JS) para absolutas usando assetsBaseUrl do config.js.
   * @param {{ id, title, type, path }} doc
   */
  async function openDocument(doc) {
    try {
      const docPath = (doc.path ?? doc.id).replace(/\\/g, '/') // normaliza barras do Windows
      console.log('[EditorStore] openDocument:', docPath)

      await editorHooks.emitAsync('document:beforeOpen', { doc, docPath })

      const { html } = await ApiService.readDocument(docPath)
      console.log('[EditorStore] html recebido, length:', html?.length)

      currentDocument.value = doc
      fileName.value        = doc.title ?? docPath
      loadHTML(html)
      console.log('[EditorStore] loadHTML chamado, ctx:', !!ctx.value)

      editorHooks.emit('document:afterOpen', { doc, docPath, html, ctx: ctx.value })
    } catch (e) {
      console.error('[EditorStore] openDocument ERRO:', e)
      throw e
    }
  }

  /**
   * Salva o HTML atual via API no documento aberto.
   * Também salva todos os CSS internos (editáveis) para garantir
   * que alterações de CSS não se percam.
   * Chamado por Ctrl+S e pelo botão de salvar quando há currentDocument.
   */
  async function saveDocument() {
    const doc = currentDocument.value
    if (!doc) return false
    const iframeDoc = getIframeDoc()
    if (!iframeDoc) return false

    // 1. Gera o HTML e permite que hooks o modifiquem antes de salvar.
    //    O payload é um objeto mutável: handlers podem fazer payload.html = novoHtml.
    const savePayload = { doc, html: HtmlExportService.generateHtml(iframeDoc) }

    await editorHooks.emitAsync('document:beforeSave', savePayload)

    // Usa o html possivelmente modificado pelos hooks
    await ApiService.saveDocument(doc.path ?? doc.id, savePayload.html)
    console.log('[EditorStore] saveDocument: HTML salvo', doc.path ?? doc.id)

    // 2. Salva todos os CSS internos (ignorando on_page e externos)
    const logicTree = styleStore.cssLogicTree
    if (logicTree) {
      const sheets = CssExportService.generateAll(logicTree)
      const saves = []
      sheets.forEach(({ origin, sourceName, css }) => {
        if (origin !== 'internal') return // só arquivos editáveis do manifesto
        saves.push(
          ApiService.saveAsset(sourceName, css)
            .then(() => console.log('[EditorStore] CSS salvo:', sourceName))
            .catch(err => console.error('[EditorStore] Erro ao salvar CSS:', sourceName, err))
        )
      })
      await Promise.all(saves)
    }

    editorHooks.emit('document:afterSave', { doc, html: savePayload.html })

    return true
  }

  return {
    triggerInlineEdit,
    ctx,
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
    saveDocument,
    fileAccessSupported: FileAccessService.isSupported(),
    loadHTML,
    viewport,
    setViewport,
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
    activate,
    deactivate,
    clearSelection,
    undo,
    redo,
    isBlinking,
    startBlink,
  }
})

