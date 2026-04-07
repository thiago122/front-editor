/**
 * ApiService
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Wrapper de todas as chamadas à API do editor.
 * Lê os endpoints de window.__EDITOR_CONFIG__.api em runtime.
 * Nenhum rebuild é necessário para trocar de backend — edite config.js.
 *
 * Todos os métodos são async e lançam Error em caso de falha HTTP.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Retorna o endpoint configurado para uma operação.
 * Fallback para /api/?action=<name> quando config.js não está carregado.
 */
function getEndpoint(name) {
  const cfg = window.__EDITOR_CONFIG__?.api?.[name]
  if (cfg) return cfg
  return { method: 'GET', url: `/api/?action=${name}` }
}

/**
 * Faz a chamada HTTP e retorna o JSON.
 * Lança Error se o servidor retornar status não-ok.
 */
async function call(endpointName, { params = {}, body = null } = {}) {
  const ep = getEndpoint(endpointName)
  let url  = ep.url

  // Parâmetros GET: acrescenta na query string
  if (Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString()
    url += (url.includes('?') ? '&' : '?') + qs
  }

  const init = {
    method:  ep.method,
    headers: { 'Content-Type': 'application/json' },
  }

  if (body !== null && ep.method !== 'GET') {
    init.body = JSON.stringify(body)
  }

  const res = await fetch(url, init)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(`[ApiService] ${endpointName}: ${err.error ?? res.statusText}`)
  }

  return res.json()
}

// ── API pública ────────────────────────────────────────────────────────────────

export const ApiService = {

  /**
   * Lista todos os documentos editáveis (páginas, posts, arquivos HTML).
   * @returns {Promise<Array<{id, title, type, path}>>}
   */
  listDocuments() {
    return call('listDocuments')
  },

  /**
   * Lê o HTML de um documento, seu manifesto e a baseUrl para resolver URLs.
   * @param {string} path - Caminho relativo do documento (ex: 'teste-2/index.html')
   * @returns {Promise<{html: string, manifest: Array<{path: string, type: string}>, baseUrl: string}>}
   */
  readDocument(path) {
    return call('readDocument', { params: { path } })
  },

  /**
   * Salva o HTML editado no backend.
   * @param {string} path  - Caminho relativo do documento
   * @param {string} html  - Conteúdo HTML completo
   */
  saveDocument(path, html) {
    return call('saveDocument', { body: { path, html } })
  },

  /**
   * Lista assets (CSS, JS) associados a um documento.
   * @param {string} docPath - Caminho do documento HTML
   * @returns {Promise<Array<{name, path, type}>>}
   */
  listAssets(docPath) {
    return call('listAssets', { params: { path: docPath } })
  },

  /**
   * Salva conteúdo em um asset existente (CSS ou JS).
   * @param {string} path    - Caminho relativo do asset
   * @param {string} content - Conteúdo CSS/JS
   */
  saveAsset(path, content) {
    return call('saveAsset', { body: { path, content } })
  },

  /**
   * Cria um novo arquivo asset no disco.
   * @param {string} path - Caminho relativo do novo arquivo (ex: 'teste-2/novo.css')
   * @param {string} type - 'css' | 'js'
   * @returns {Promise<{ok: boolean, path: string}>}
   */
  createAsset(path, type = 'css') {
    return call('createAsset', { body: { path, type } })
  },

  /**
   * Renomeia um asset no disco.
   * @param {string} oldPath - Caminho atual
   * @param {string} newPath - Novo caminho
   */
  renameAsset(oldPath, newPath) {
    return call('renameAsset', { body: { oldPath, newPath } })
  },

  /**
   * Remove um asset do disco.
   * @param {string} path
   */
  deleteAsset(path) {
    return call('deleteAsset', { body: { path } })
  },

  /**
   * Reordena os assets CSS salvando a nova sequência no manifesto.
   * @param {string[]} paths
   */
  reorderAssets(paths) {
    return call('reorderAssets', { body: { paths } })
  },

  /**
   * Salva o manifesto CSS no backend.
   * @param {Array<{path: string, type: string}>} manifest
   */
  saveManifest(manifest) {
    return call('saveManifest', { body: { manifest } })
  },

  /**
   * Move um asset CSS para a lixeira (em vez de apagar definitivamente).
   * @param {string} path - Caminho relativo ao rootDir
   * @returns {Promise<{ok: boolean, trashId: string}>}
   */
  trashAsset(path) {
    return call('trashAsset', { body: { path } })
  },

  /**
   * Restaura um arquivo da lixeira para seu local original.
   * @param {string} trashId - ID retornado por trashAsset()
   * @returns {Promise<{ok: boolean, path: string}>}
   */
  restoreFromTrash(trashId) {
    return call('restoreFromTrash', { body: { trashId } })
  },

  /**
   * Lista todos os itens na lixeira.
   * @returns {Promise<Array<{id, originalPath, trashedAt}>>}
   */
  listTrash() {
    return call('listTrash')
  },
}
