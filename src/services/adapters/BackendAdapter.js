/**
 * BackendAdapter — Contrato de interface para backends do editor
 *
 * Todo backend (Standalone, WordPress, etc.) deve implementar estes métodos.
 * O editor nunca chama URLs diretamente — sempre via o adapter ativo.
 *
 * O adapter correto é criado em ApiService.js com base em
 * window.__EDITOR_CONFIG__.backend
 *
 * @interface BackendAdapter
 */

/**
 * @typedef {Object} Document
 * @property {string} html       - HTML completo do documento
 * @property {Array}  manifest   - Manifesto de CSS [{path, type}]
 * @property {string} baseUrl    - URL base para resolver assets relativos
 */

/**
 * @typedef {Object} Asset
 * @property {string} path       - Caminho relativo do asset
 * @property {string} type       - 'internal' | 'external' | 'ignore'
 * @property {string} [name]     - Nome de exibição
 */

/**
 * @typedef {Object} TrashItem
 * @property {string} id           - ID único do item na lixeira
 * @property {string} originalPath - Caminho original antes do trash
 * @property {string} trashedAt    - ISO timestamp
 */

export class BackendAdapter {

  // ── Documento ───────────────────────────────────────────────────────────────

  /**
   * Lê o documento para edição.
   * @param {string|number} docId - Path (standalone) ou post ID (WP)
   * @returns {Promise<Document>}
   */
  // eslint-disable-next-line no-unused-vars
  readDocument(docId) { throw new Error('Not implemented') }

  /**
   * Salva o conteúdo editado no backend.
   * @param {string|number} docId
   * @param {string}        html
   * @param {Array}         manifest
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  saveDocument(docId, html, manifest) { throw new Error('Not implemented') }

  /**
   * Lista documentos disponíveis para edição.
   * @returns {Promise<Array<{id, title, type}>>}
   */
  listDocuments() { throw new Error('Not implemented') }
  
  /**
   * Cria um novo documento HTML.
   * @param {string} docId - Nome/Path do novo documento
   * @returns {Promise<{ok: boolean, path: string}>}
   */
  // eslint-disable-next-line no-unused-vars
  createDocument(docId) { throw new Error('Not implemented') }

  /**
   * Renomeia um documento.
   * @param {string} oldPath 
   * @param {string} newPath 
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  renameDocument(oldPath, newPath) { throw new Error('Not implemented') }

  /**
   * Move um documento para a lixeira.
   * @param {string} path 
   * @returns {Promise<{ok: boolean, trashId: string}>}
   */
  // eslint-disable-next-line no-unused-vars
  trashDocument(path) { throw new Error('Not implemented') }

  /**
   * Cria uma nova pasta (projeto).
   * @param {string} path 
   * @returns {Promise<{ok: boolean, path: string}>}
   */
  // eslint-disable-next-line no-unused-vars
  createFolder(path) { throw new Error('Not implemented') }

  /**
   * Renomeia uma pasta.
   * @param {string} oldPath 
   * @param {string} newPath 
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  renameFolder(oldPath, newPath) { throw new Error('Not implemented') }

  /**
   * Move uma pasta para a lixeira.
   * @param {string} path 
   * @returns {Promise<{ok: boolean, trashId: string}>}
   */
  // eslint-disable-next-line no-unused-vars
  trashFolder(path) { throw new Error('Not implemented') }

  // ── Assets CSS ──────────────────────────────────────────────────────────────

  /**
   * Lista assets associados a um documento.
   * @param {string|number} docId
   * @returns {Promise<Asset[]>}
   */
  // eslint-disable-next-line no-unused-vars
  listAssets(docId) { throw new Error('Not implemented') }

  /**
   * Salva conteúdo em um asset existente.
   * @param {string} path
   * @param {string} content
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  saveAsset(path, content) { throw new Error('Not implemented') }

  /**
   * Cria um novo asset vazio.
   * @param {string} path
   * @param {string} [type='css']
   * @param {string} [docId='']    - Documento de contexto
   * @returns {Promise<{ok: boolean, path: string}>}
   */
  // eslint-disable-next-line no-unused-vars
  createAsset(path, type = 'css', docId = '') { throw new Error('Not implemented') }

  /**
   * Renomeia um asset.
   * @param {string} oldPath
   * @param {string} newPath
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  renameAsset(oldPath, newPath) { throw new Error('Not implemented') }

  /**
   * Reordena assets (salva nova sequência no manifesto).
   * @param {string[]} paths
   * @param {string}   [docId='']
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  reorderAssets(paths, docId = '') { throw new Error('Not implemented') }

  // ── Lixeira ────────────────────────────────────────────────────────────────

  /**
   * Move um asset para a lixeira (sem apagar definitivamente).
   * @param {string} path
   * @returns {Promise<{ok: boolean, trashId: string}>}
   */
  // eslint-disable-next-line no-unused-vars
  trashAsset(path) { throw new Error('Not implemented') }

  /**
   * Restaura um item da lixeira.
   * @param {string} trashId
   * @returns {Promise<{ok: boolean, path: string}>}
   */
  // eslint-disable-next-line no-unused-vars
  restoreFromTrash(trashId) { throw new Error('Not implemented') }

  /**
   * Lista todos os itens na lixeira.
   * @returns {Promise<TrashItem[]>}
   */
  listTrash() { throw new Error('Not implemented') }

  // ── Manifesto ──────────────────────────────────────────────────────────────

  /**
   * Salva o manifesto global de CSS.
   * @param {Array<{path: string, type: string}>} manifest
   * @param {string} [docId='']
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  saveManifest(manifest, docId = '') { throw new Error('Not implemented') }

  /**
   * Salva CSS específico de uma página (on_page).
   * No-op em standalone — usado apenas em WordPress.
   * @param {string|number} docId
   * @param {string}        css
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  savePageCss(docId, css) { return Promise.resolve() }

  // ── Auth ───────────────────────────────────────────────────────────────────

  /**
   * Renova o token/nonce de autenticação.
   * No-op em standalone — usado para renovar nonce WP em sessões longas.
   * @returns {Promise<void>}
   */
  refreshAuth() { return Promise.resolve() }

}
