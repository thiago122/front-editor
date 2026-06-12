/**
 * FileAccessService
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidades:
 *   Abrir e salvar arquivos HTML diretamente no sistema de arquivos do usuário,
 *   usando a File System Access API nativa do navegador (Chrome/Edge/Opera).
 *
 * Para desenvolvedores júnior:
 *   - Todos os métodos são estáticos e retornam Promises.
 *   - Use `isSupported()` antes de qualquer operação para detectar o browser.
 *   - Em caso de não suporte (Firefox), recaia no fluxo de download/import.
 *   - O FileSystemFileHandle deve ser armazenado no EditorStore para reutilizar
 *     em Ctrl+S sem abrir o seletor de arquivo novamente.
 *
 * Referência:
 *   https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 * ─────────────────────────────────────────────────────────────────────────────
 */

const HTML_FILE_TYPES = [{
  description: 'Arquivo HTML',
  accept: { 'text/html': ['.html', '.htm'] },
}]

export class FileAccessService {

  // ─── Detecção ────────────────────────────────────────────────────────────────

  /**
   * Verifica se a File System Access API está disponível no navegador atual.
   * Chrome/Edge: true. Firefox: false.
   *
   * @returns {boolean}
   */
  static isSupported() {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window
  }

  // ─── Abrir ───────────────────────────────────────────────────────────────────

  /**
   * Abre o seletor de arquivo nativo e lê o conteúdo HTML.
   *
   * @returns {Promise<{ handle: FileSystemFileHandle, html: string, name: string }>}
   * @throws  {DOMException} Se o usuário cancelar (name === 'AbortError') — ignore esse erro.
   *
   * @example
   *   try {
   *     const { handle, html, name } = await FileAccessService.openFile()
   *     EditorStore.fileHandle = handle
   *     EditorStore.fileName   = name
   *     input.value = html
   *   } catch (e) {
   *     if (e.name !== 'AbortError') console.error(e)
   *   }
   */
  static async openFile() {
    const [handle] = await window.showOpenFilePicker({
      types: HTML_FILE_TYPES,
      multiple: false,
    })
    const file = await handle.getFile()
    const html = await file.text()
    return { handle, html, name: file.name }
  }

  // ─── Salvar ──────────────────────────────────────────────────────────────────

  /**
   * Salva HTML no arquivo já aberto (sem abrir seletor).
   * Use este método no Ctrl+S quando já houver um fileHandle aberto.
   *
   * @param {FileSystemFileHandle} handle - Handle obtido em openFile() ou saveFileAs()
   * @param {string}               html   - Conteúdo HTML a gravar
   * @returns {Promise<void>}
   */
  static async saveFile(handle, html) {
    const writable = await handle.createWritable()
    await writable.write(html)
    await writable.close()
  }

  // ─── Salvar Como ─────────────────────────────────────────────────────────────

  /**
   * Abre o seletor "Salvar como" do OS e grava o HTML no arquivo escolhido.
   * Retorna o novo handle para ser guardado no EditorStore.
   *
   * @param {string} html          - Conteúdo HTML a gravar
   * @param {string} suggestedName - Nome sugerido (ex: 'index.html')
   * @returns {Promise<{ handle: FileSystemFileHandle, name: string }>}
   * @throws  {DOMException} Se o usuário cancelar (name === 'AbortError').
   */
  static async saveFileAs(html, suggestedName = 'index.html') {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: HTML_FILE_TYPES,
    })
    await FileAccessService.saveFile(handle, html)
    const file = await handle.getFile()
    return { handle, name: file.name }
  }
}
