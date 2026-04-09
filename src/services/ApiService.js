/**
 * ApiService
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory que cria o adapter correto com base em window.__EDITOR_CONFIG__.backend
 *
 * O editor nunca chama URLs diretamente — sempre via o adapter retornado aqui.
 * Para trocar de backend: altere config.js (sem rebuild).
 *
 * Adapters disponíveis:
 *   'standalone' → StandaloneAdapter (api/index.php — padrão)
 *   'wordpress'  → WordPressAdapter  (wp-json/visual-editor/v1/)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { StandaloneAdapter } from './adapters/StandaloneAdapter.js'
import { WordPressAdapter }  from './adapters/WordPressAdapter.js'

function createAdapter() {
  const backend = window.__EDITOR_CONFIG__?.backend ?? 'standalone'

  switch (backend) {
    case 'wordpress':
      return new WordPressAdapter()

    case 'standalone':
      return new StandaloneAdapter()

    default:
      console.warn(`[ApiService] Backend desconhecido: "${backend}". Usando standalone.`)
      return new StandaloneAdapter()
  }
}

export const ApiService = createAdapter()
