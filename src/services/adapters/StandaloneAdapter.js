/**
 * StandaloneAdapter
 *
 * Implementação do BackendAdapter para o backend PHP standalone (api/index.php).
 * Toda a lógica atual do ApiService.js foi extraída para cá.
 *
 * Ativado quando window.__EDITOR_CONFIG__.backend === 'standalone'
 */

import { BackendAdapter } from './BackendAdapter.js'

// ── Helpers internos ──────────────────────────────────────────────────────────

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
  const ep  = getEndpoint(endpointName)
  let   url = ep.url

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
    throw new Error(`[StandaloneAdapter] ${endpointName}: ${err.error ?? res.statusText}`)
  }

  return res.json()
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class StandaloneAdapter extends BackendAdapter {

  // ── Documento ──────────────────────────────────────────────────────────────

  listDocuments() {
    return call('listDocuments')
  }

  createDocument(docId) {
    return call('createDocument', { body: { path: docId } })
  }

  renameDocument(oldPath, newPath) {
    return call('renameDocument', { body: { oldPath, newPath } })
  }

  trashDocument(path) {
    return call('trashDocument', { body: { path } })
  }

  createFolder(path) {
    return call('createFolder', { body: { path } })
  }

  renameFolder(oldPath, newPath) {
    return call('renameFolder', { body: { oldPath, newPath } })
  }

  trashFolder(path) {
    return call('trashFolder', { body: { path } })
  }

  readDocument(docId) {
    return call('readDocument', { params: { path: docId } })
  }

  saveDocument(docId, html /*, manifest — standalone salva via saveManifest() */) {
    return call('saveDocument', { body: { path: docId, html } })
  }

  // ── Assets CSS ─────────────────────────────────────────────────────────────

  listAssets(docId) {
    return call('listAssets', { params: { path: docId } })
  }

  saveAsset(path, content, docId = '') {
    return call('saveAsset', { body: { path, content, docPath: docId } })
  }

  createAsset(path, type = 'css', docId = '') {
    return call('createAsset', { body: { path, type, docPath: docId } })
  }

  renameAsset(oldPath, newPath) {
    return call('renameAsset', { body: { oldPath, newPath } })
  }

  reorderAssets(paths, docId = '') {
    return call('reorderAssets', { body: { paths, docPath: docId } })
  }

  // ── Lixeira ────────────────────────────────────────────────────────────────

  trashAsset(path, docId = '') {
    return call('trashAsset', { body: { path, docPath: docId } })
  }

  restoreFromTrash(trashId) {
    return call('restoreFromTrash', { body: { trashId } })
  }

  listTrash() {
    return call('listTrash')
  }

  // ── Manifesto ──────────────────────────────────────────────────────────────

  saveManifest(manifest, docId = '') {
    return call('saveManifest', { body: { manifest, docPath: docId } })
  }

  // savePageCss → no-op herdado do BackendAdapter (standalone não tem CSS por página)
  // refreshAuth → no-op herdado do BackendAdapter (standalone não tem auth)
}
