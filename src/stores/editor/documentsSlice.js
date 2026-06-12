import { ref } from 'vue'
import { editorHooks } from '@/editor/HookManager'
import { FileAccessService } from '@/editor/documents/FileAccessService'
import { HtmlExportService } from '@/editor/documents/HtmlExportService'
import { CssExportService } from '@/editor/css/export/CssExportService'
import { DocumentNormalizer } from '@/editor/documents/DocumentNormalizer'
import { AutoSaveService } from '@/editor/documents/AutoSaveService'
import { ApiService } from '@/services/ApiService'
import { useComponentStore } from '../ComponentStore'

/**
 * Fatia do EditorStore: ciclo de vida de documentos e arquivos.
 * - File System Access API (openFile/saveFile/saveFileAs)
 * - API backend (openDocument/openDocumentByPath/saveDocument)
 * - Hooks document:beforeSave/afterRead (limpeza, prettier, componentes)
 *
 * A ordem/prioridade dos hooks é parte do contrato de salvamento:
 * prioridade 1 (limpezas) → 2 (serializa componentes) → 5 (prettier)
 * → 10+ (hooks externos).
 *
 * @param {{
 *   loadHTML: (html: string) => void,
 *   getIframeDoc: () => Document|null,
 *   getCtx: () => object|null,
 *   styleStore: object,
 *   saveState: import('vue').Ref,
 * }} deps
 */
export function createDocumentsSlice({ loadHTML, getIframeDoc, getCtx, styleStore, saveState }) {
  const fileHandle = ref(null)
  const fileName = ref(null)
  /** Documento atualmente aberto via API { id, title, type, path } */
  const currentDocument = ref(null)

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

      fileName.value = doc.title ?? docPath
      loadHTML(preparedHtml)
      console.log('[EditorStore] loadHTML chamado, ctx:', !!getCtx())

      editorHooks.emit('document:afterOpen', { doc, docPath, html: preparedHtml, ctx: getCtx() })
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

  return {
    fileHandle,
    fileName,
    currentDocument,
    fileAccessSupported: FileAccessService.isSupported(),
    openFile,
    saveFile,
    saveFileAs,
    openDocument,
    openDocumentByPath,
    saveDocument,
  }
}
