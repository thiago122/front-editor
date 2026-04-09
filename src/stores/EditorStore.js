// EditorStore.js

import { ref, computed, watch, markRaw, toRaw } from 'vue'
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
  const manipulation = ref(null)
  const clipboard         = ref({ type: null, data: null }) // Clipboard tipado
  const showCssExplorer   = ref(false)                      // CSS Explorer visível ao lado do inspector
  const showCodeEditor    = ref(false)                      // Code Editor visível no rodapé do canvas
  const codeEditorMode     = ref('html')                    // 'html' | 'css'
  const codeEditorTargetId = ref(null)                      // ID do nó ou da regra sendo editada

  /**
   * Abre o editor de código em um modo específico para um alvo específico.
   * @param {string} mode - 'html' | 'css'
   * @param {string} targetId - ID do nó (HTML) ou RuleID (CSS)
   */
  function openCodeEditor(mode, targetId) {
    codeEditorMode.value = mode
    codeEditorTargetId.value = targetId
    showCodeEditor.value = true
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

    // Remove cursor e outline inline adicionados pelo editor durante interações
    doc.documentElement.style.removeProperty('cursor')
    doc.body?.style.removeProperty('cursor')

    // Remove outline: none que o useInlineEdit.js injeta durante edição inline
    // (safety net: o finish/cancel já removem, mas arquivos antigos podem ter ficado com isso)
    doc.querySelectorAll('[style*="outline"]').forEach((el) => {
      el.style.removeProperty('outline')
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
    const parent = manipulation.value.getParent(selectedNodeId.value)
    if (parent) {
      selectNode(parent.nodeId) // selectNode atualiza nodeId + selectedElement juntos
    }
  }

  function getParent(nodeId) {
    return manipulation.value.getParent(nodeId)
  }

  /** Retorna um nó do AST pelo ID (usa toRaw para busca confiável) */
  function getNode(nodeId) {
    if (!ast.value) return null
    return findNodeById(toRaw(ast.value), nodeId)
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

      const { html, manifest, baseUrl } = await ApiService.readDocument(docPath)
      console.log('[EditorStore] html recebido, length:', html?.length)

      // Armazena o manifesto como fonte de verdade no StyleStore
      styleStore.setManifest(manifest ?? [])

      // Injeta <link> com URLs absolutas para o iframe renderizar os CSS
      const preparedHtml = DocumentNormalizer.prepareForEditor(html, manifest ?? [], baseUrl ?? '')

      currentDocument.value = doc
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
  async function saveDocument() {
    const doc = currentDocument.value
    if (!doc) return false
    const iframeDoc = getIframeDoc()
    if (!iframeDoc) return false

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

  return {
    triggerInlineEdit,
    showCssExplorer,
    showCodeEditor,
    codeEditorMode,
    codeEditorTargetId,
    openCodeEditor,
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
    openDocumentByPath,
    saveDocument,
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
  }
})

