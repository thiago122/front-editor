/**
 * editor-bridge.js — Entry point do Bridge Universal
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANTE: Este arquivo é Vanilla JS puro — sem imports do Vue, Pinia ou
 * qualquer dependência do editor. Ele roda DENTRO do iframe da página do CMS.
 *
 * Build: npm run build:bridge → dist/bridge/bridge.iife.js
 * Deploy: o backend lê bridge.iife.js e injeta inline no <head> do iframe,
 *         antes de qualquer script do CMS.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ⚠️  PLACEHOLDER — implementação futura.
 *     Estrutura definida. Preencher quando o WP plugin for implementado.
 *
 * @see docs/bridge-architecture.md
 */

import { applyConfig }     from './defaults.js'
import { setupDomCleaner } from './domCleaner.js'
import { setupMutation }   from './mutationManager.js'
import { injectNodeIds }   from './nodeIdManager.js'
import { setupEvents }     from './eventInterceptor.js'
import { createInterface } from './bridgeInterface.js'

;(function () {
  'use strict'

  // ── 1. Ler e validar config do backend ─────────────────────────────────────
  const BRIDGE_CONFIG_VERSION = 1
  const config = applyConfig(window.__editorAdapterConfig, BRIDGE_CONFIG_VERSION)

  // ── 2. Neutralizações imediatas (antes dos scripts do CMS) ─────────────────
  setupDomCleaner(config)   // document.write no-op, removeOnLoad

  // ── 3. Aguardar DOM ────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {

    // ── 4. Injetar data-node-id em todos os elementos ────────────────────────
    injectNodeIds(document.body, config)

    // ── 5. MutationObserver para re-injeção após mutações do CMS ─────────────
    setupMutation(config)

    // ── 6. Intercepção de eventos (capture phase) ─────────────────────────────
    setupEvents(config)

    // ── 7. Expor interface pública ────────────────────────────────────────────
    window.__editorBridge = createInterface(config)

    // ── 8. Notificar editor que o bridge está pronto ──────────────────────────
    window.dispatchEvent(new CustomEvent('bridge:ready', {
      detail: { version: BRIDGE_CONFIG_VERSION, cms: config.cms }
    }))
  })

})()
