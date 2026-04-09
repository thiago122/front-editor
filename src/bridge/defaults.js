/**
 * defaults.js — Valores padrão do __editorAdapterConfig
 *
 * Aplica defaults seguros para chaves ausentes e valida a versão do schema.
 * @see docs/bridge-architecture.md § O Contrato
 */

const DEFAULTS = {
  version:                  1,
  cms:                      null,
  removeOnLoad:             [],
  lockSelectors:            [],
  ignoreStylePatterns:      [],
  neutralizeScripts:        [],
  suppressResizeHandlers:   true,
  neutralizeDocumentWrite:  true,
}

/**
 * Combina o config do backend com os defaults e valida a versão.
 *
 * @param {object|undefined} rawConfig  - window.__editorAdapterConfig
 * @param {number}           bridgeVer  - Versão suportada pelo bridge
 * @returns {object}                    - Config completo com defaults aplicados
 */
export function applyConfig(rawConfig, bridgeVer) {
  const config = { ...DEFAULTS, ...(rawConfig ?? {}) }
  const cfgVer = config.version ?? 1

  if (cfgVer > bridgeVer) {
    console.warn(
      `[EditorBridge] Config versão ${cfgVer} não suportada. ` +
      `Bridge suporta até v${bridgeVer}. Atualize o editor visual.`
    )
  }

  if (cfgVer < bridgeVer) {
    console.info(
      `[EditorBridge] Config versão ${cfgVer} (legado). Usando compatibilidade retroativa.`
    )
  }

  return config
}
