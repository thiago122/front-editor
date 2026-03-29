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

// ─── Atributos internos do editor ─────────────────────────────────────────────

/**
 * Atributos adicionados pelo editor em tempo de execução.
 * Não devem ser exibidos nem editados pelo usuário (AttributeManager, HeadManager, etc.)
 * e são removidos do HTML ao salvar.
 */
export const EDITOR_IGNORED_ATTRS = new Set([
  'data-node-id',        // ID da AST (adicionado pelo html-plugin na renderização)
  'data-editor-hovered', // estado de hover do elemento
  'data-selected',       // estado de seleção
  // head manager internals
  'data-location',
  'data-captured',
  'data-readonly',
  'data-source-name',
  'data-source',
  'data-manifest-path',
])

// ─── Valores de data-location para <link rel="stylesheet"> ────────────────────

/**
 * Valores possíveis do atributo `data-location` em elementos <link>/<style>:
 *
 * | Valor      | Descrição |
 * |------------|-----------|
 * | "internal" | Arquivo CSS do manifesto do projeto (gerenciado pelo CSS Explorer).
 * |            | O editor injeta o conteúdo como <style>, mantém o <link> original oculto.
 * | "external" | CSS externo (CDN, Google Fonts, etc.) adicionado via CSS Explorer.
 * |            | O editor lê via fetch(), exibe no CSS Explorer como readonly.
 * |            | Ao salvar: removidos os atributos data-* do editor, mantido o <link>.
 * | "on_page"  | <style> inline diretamente no HTML (sem <link>).
 * |            | Gerenciado pelo CSS Explorer como arquivo editável.
 * | "ignore"   | Link completamente ignorado pelo pipeline do editor.
 * |            | NÃO aparece no CSS Explorer, NÃO é processado, NÃO é modificado.
 * |            | Ao salvar: preservado VERBATIM incluindo todos os atributos.
 * |            | Útil para: bibliotecas de terceiros, links condicionais, polyfills.
 */
export const CSS_LOCATION_VALUES = Object.freeze({
  INTERNAL: 'internal',
  EXTERNAL: 'external',
  ON_PAGE:  'on_page',
  IGNORE:   'ignore',
})
