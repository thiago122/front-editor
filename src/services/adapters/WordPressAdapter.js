/**
 * WordPressAdapter
 *
 * Implementação do BackendAdapter para o plugin WordPress.
 * Comunica-se com a REST API em /wp-json/visual-editor/v1/
 *
 * Ativado quando window.__EDITOR_CONFIG__.backend === 'wordpress'
 *
 * ⚠️  STUB — implementação futura. Todos os métodos lançam erro proposital.
 *     Implemente conforme o desenvolvimento do wp-plugin/ avançar.
 */

import { BackendAdapter } from './BackendAdapter.js'

export class WordPressAdapter extends BackendAdapter {

  constructor() {
    super()
    const cfg = window.__EDITOR_CONFIG__ ?? {}
    this._base  = cfg.apiBase ?? '/wp-json/visual-editor/v1'
    this._nonce = cfg.nonce   ?? ''
  }

  // ── Helpers internos ───────────────────────────────────────────────────────

  async _call(path, { method = 'GET', body = null } = {}) {
    const headers = {
      'Content-Type':  'application/json',
      'X-WP-Nonce':    this._nonce,
    }

    const res = await fetch(`${this._base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401 || res.status === 403) {
      // Nonce expirado — tentar renovar e repetir uma vez
      await this.refreshAuth()
      headers['X-WP-Nonce'] = this._nonce
      const retry = await fetch(`${this._base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ message: retry.statusText }))
        throw new Error(`[WordPressAdapter] ${path}: ${err.message}`)
      }
      return retry.json()
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(`[WordPressAdapter] ${path}: ${err.message}`)
    }

    return res.json()
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  async refreshAuth() {
    // TODO: usar WP Heartbeat API para renovar nonce
    // const res = await fetch('/wp-admin/admin-ajax.php', { ... })
    // this._nonce = res.nonce
    console.warn('[WordPressAdapter] refreshAuth: não implementado')
  }

  // ── Documento ──────────────────────────────────────────────────────────────

  listDocuments() {
    // TODO: GET /wp-json/visual-editor/v1/documents
    throw new Error('[WordPressAdapter] listDocuments: não implementado')
  }

  createDocument(docId) {
    // TODO: POST /wp-json/visual-editor/v1/document
    throw new Error('[WordPressAdapter] createDocument: não implementado')
  }

  readDocument(docId) {
    // TODO: GET /wp-json/visual-editor/v1/document?post_id=<docId>
    // Retorna { html, manifest, baseUrl }
    // PHP converte blocks → HTML com data-wp-block
    return this._call(`/document?post_id=${docId}`)
  }

  saveDocument(docId, html, manifest) {
    // TODO: POST /wp-json/visual-editor/v1/document
    // PHP recebe HTML → WpBlockSerializer → wp_update_post()
    return this._call('/document', {
      method: 'POST',
      body:   { post_id: docId, content: html, manifest },
    })
  }

  // ── Assets CSS ─────────────────────────────────────────────────────────────

  listAssets(docId) {
    return this._call(`/assets?post_id=${docId}`)
  }

  saveAsset(path, content) {
    return this._call('/assets/save', { method: 'POST', body: { path, content } })
  }

  createAsset(path, type = 'css') {
    return this._call('/assets/create', { method: 'POST', body: { path, type } })
  }

  renameAsset(oldPath, newPath) {
    return this._call('/assets/rename', { method: 'POST', body: { oldPath, newPath } })
  }

  reorderAssets(paths) {
    return this._call('/assets/reorder', { method: 'POST', body: { paths } })
  }

  // ── Lixeira ────────────────────────────────────────────────────────────────

  trashAsset(path) {
    return this._call('/assets/trash', { method: 'POST', body: { path } })
  }

  restoreFromTrash(trashId) {
    return this._call('/assets/restore', { method: 'POST', body: { trashId } })
  }

  listTrash() {
    return this._call('/assets/trash')
  }

  // ── Manifesto ──────────────────────────────────────────────────────────────

  saveManifest(manifest) {
    // Manifesto global → wp_options('visual_editor_manifest')
    return this._call('/manifest', { method: 'POST', body: { manifest } })
  }

  savePageCss(docId, css) {
    // CSS específico da página → post_meta(_visual_editor_css)
    return this._call('/page-css', { method: 'POST', body: { post_id: docId, css } })
  }
}
