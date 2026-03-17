/**
 * editor/html/constants.js
 *
 * Constantes compartilhadas para o motor HTML do editor.
 * Importadas pelo Explorer, pelo drag & drop e por qualquer
 * outro módulo que precise conhecer restrições de elementos HTML.
 */

// ─── Restrições de drag & drop ────────────────────────────────────────────────

/**
 * Tags que NUNCA podem ser arrastadas no HTML Explorer.
 *
 * Motivo:
 *  - Estruturais (html/head/body): definem a estrutura do documento —
 *    mover qualquer uma delas quebraria o HTML fundamentalmente.
 *  - Críticas do head (script/style/link/meta…): dependem da posição no
 *    documento para funcionar; reordená-las pode causar erros de carregamento,
 *    FOUC ou falhas de segurança (CSP).
 */
export const DRAG_RESTRICTED_TAGS = new Set([
  // Elementos estruturais do documento
  'html', 'head', 'body',

  // Elementos de metadados e recursos críticos do <head>
  'script', 'style', 'link', 'meta', 'title', 'base', 'noscript',
])

/**
 * Tags que NÃO podem ser pai de destino em um drop.
 * Elementos void e auto-fechantes que nunca têm filhos.
 */
export const DROP_REJECT_AS_PARENT = new Set([
  'html', 'head', 'script', 'style', 'meta', 'link', 'title', 'base',
  // Void elements
  'br', 'hr', 'img', 'input', 'area', 'col', 'embed',
  'param', 'source', 'track', 'wbr',
])

// ─── Zonas semânticas do documento ────────────────────────────────────────────

/**
 * Tags que definem zonas semânticas.
 * Elementos NÃO podem ser movidos entre zonas diferentes.
 *
 * Exemplo: um <div> dentro do <body> não pode ser movido para dentro do <head>.
 */
export const SEMANTIC_ZONES = new Set(['head', 'body'])
