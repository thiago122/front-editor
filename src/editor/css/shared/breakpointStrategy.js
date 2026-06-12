/**
 * breakpointStrategy.js
 *
 * Utilitários puros para a estratégia de responsividade do documento
 * (ver docs/EDITING_ROADMAP.md → "Decisões de responsividade").
 *
 * Responde três perguntas a partir da Logic Tree, UMA vez por build
 * (nunca por render/por edição — perf é requisito):
 *   1. O CSS é mobile-first (min-width) ou desktop-first (max-width)?
 *   2. As @media são organizadas em blocões por breakpoint ou
 *      adjacentes às regras que sobrescrevem?
 *   3. Quais larguras de breakpoint o CSS já usa?
 *
 * Condições não-width (orientation, print, @container…) são ignoradas
 * de propósito: ficam fora do ciclo de write-target (decisão — eixo 5).
 */

/** Seed para projetos novos — espelha os botões de BreakpointControl.vue. */
export const DEFAULT_BREAKPOINTS = [360, 640, 768, 1024, 1280, 1536]

/** Tolerância (px) ao casar uma condição existente com um breakpoint (767 ≈ 768). */
export const BREAKPOINT_TOLERANCE = 1

const EM_PX = 16

function toPx(value, unit) {
  return parseFloat(value) * (unit === 'em' || unit === 'rem' ? EM_PX : 1)
}

/**
 * Extrai os limites de largura de um label de @media.
 * Mesma gramática aceita por evaluateMediaQuery (min/max-width, px/em/rem, 'and').
 *
 * @param {string} label — ex: '@media (min-width: 768px)'
 * @returns {{min: number|null, max: number|null, other: boolean}|null}
 *          null se o label não for um @media. `other` indica condições
 *          além de largura (orientation, height, print…).
 */
export function parseWidthCondition(label) {
  if (!label || !label.includes('@media')) return null
  const condition = label.replace(/^@media\s*/i, '').trim()
  if (!condition) return null

  let min = null
  let max = null
  let other = false

  for (const part of condition.split(/\s+and\s+/i)) {
    const clean = part.replace(/[()]/g, '').trim()
    if (!clean || /^(all|screen|only\s+screen)$/i.test(clean)) continue

    let m = clean.match(/^min-width\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) { min = toPx(m[1], m[2]); continue }

    m = clean.match(/^max-width\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) { max = toPx(m[1], m[2]); continue }

    other = true
  }
  return { min, max, other }
}

/**
 * Condição é "width pura e de direção única"? (só min OU só max, sem extras)
 * É o único tipo que participa de detecção de estratégia e write-target.
 */
function isSingleWidthBound(parsed) {
  if (!parsed || parsed.other) return false
  return (parsed.min !== null) !== (parsed.max !== null) // XOR
}

/**
 * Raiz de família de um seletor, para a heurística de cluster
 * ("adjacente à regra base"). `.card__title:hover .icon` → 'card'.
 * NÃO confundir com componente HTML (data-component) — conceitos distintos.
 *
 * @param {string} selector
 * @returns {string|null}
 */
export function selectorFamily(selector) {
  if (!selector) return null
  const first = selector.split(',')[0].trim()
  const m = first.match(/^[.#]?([a-zA-Z0-9_-]+)/)
  if (!m) return null
  // Remove sufixos BEM (__elemento, --modificador) para agrupar a família.
  return m[1].replace(/(__|--).*$/, '').toLowerCase()
}

/**
 * Gera a condição @media para um breakpoint segundo a direção da estratégia.
 * @param {number} width
 * @param {'mobile-first'|'desktop-first'} direction
 * @returns {string} ex: '(min-width: 768px)'
 */
export function conditionForBreakpoint(width, direction) {
  const w = Math.round(width)
  return direction === 'desktop-first' ? `(max-width: ${w}px)` : `(min-width: ${w}px)`
}

/**
 * O breakpoint é a base da estratégia? (mobile-first → o menor;
 * desktop-first → o maior). Base = edita a regra sem @media.
 * width null (modo full/%) também é tratado como base.
 */
export function isBaseBreakpoint(width, direction, breakpoints = []) {
  if (width == null) return true
  if (!breakpoints.length) return false
  const base = direction === 'desktop-first'
    ? Math.max(...breakpoints)
    : Math.min(...breakpoints)
  return Math.abs(width - base) <= BREAKPOINT_TOLERANCE
}

/**
 * Uma condição existente "corresponde" ao breakpoint na direção dada?
 * Exige width pura de direção única e limite dentro da tolerância
 * (absorve 767/768 de temas reais).
 */
export function matchesBreakpoint(parsed, width, direction) {
  if (!isSingleWidthBound(parsed)) return false
  const bound = direction === 'desktop-first' ? parsed.max : parsed.min
  if (bound === null) return false
  return Math.abs(bound - width) <= BREAKPOINT_TOLERANCE
}

/**
 * Detecta o perfil de responsividade do documento em UMA passada.
 * Chamar apenas no build da Logic Tree (rebuildLogicTree) — o resultado
 * é metadado do documento, consumido pelo write-target a cada edição.
 *
 * @param {Array} logicTree
 * @returns {{
 *   direction: 'mobile-first'|'desktop-first'|null,
 *   insertion: 'breakpoint-blocks'|'rule-adjacent'|null,
 *   breakpoints: number[],
 *   counts: { minWidth: number, maxWidth: number }
 * }} direction/insertion null = sem evidência (CSS ambíguo ou sem @media).
 */
export function detectResponsiveProfile(logicTree) {
  let minCount = 0
  let maxCount = 0
  const boundaryFreq = new Map() // boundary normalizado → frequência
  let adjacentVotes = 0
  let blockVotes = 0

  // Conta toda @media de largura (em qualquer profundidade) p/ direção e boundaries.
  const countAtRule = (node) => {
    const parsed = parseWidthCondition(node.label)
    if (isSingleWidthBound(parsed)) {
      if (parsed.min !== null) {
        minCount++
        bump(boundaryFreq, Math.round(parsed.min))
      } else {
        maxCount++
        // max-width: 767 e min-width: 768 marcam a MESMA fronteira (768).
        bump(boundaryFreq, Math.round(parsed.max) + 1)
      }
    }
    return parsed
  }

  const walk = (nodes, onAtRule) => {
    for (const node of nodes ?? []) {
      if (node.type === 'at-rule') onAtRule(node)
      if (node.children?.length && node.type !== 'declaration') walk(node.children, onAtRule)
    }
  }

  for (const root of logicTree ?? []) {
    for (const file of root.children ?? []) {
      if (file.type !== 'file') continue

      // Assinaturas de condição no nível do arquivo → estilo de organização.
      const signatures = new Map() // 'min:max' → { count, maxSelectors }
      for (const child of file.children ?? []) {
        if (child.type !== 'at-rule') continue
        const parsed = parseWidthCondition(child.label)
        if (!isSingleWidthBound(parsed)) continue
        const sig = `${parsed.min}:${parsed.max}`
        const entry = signatures.get(sig) ?? { count: 0, maxSelectors: 0 }
        entry.count++
        const selectorCount = (child.children ?? []).filter(c => c.type === 'selector').length
        entry.maxSelectors = Math.max(entry.maxSelectors, selectorCount)
        signatures.set(sig, entry)
      }
      for (const entry of signatures.values()) {
        if (entry.count >= 2) {
          // Mesma condição repetida no arquivo = blocos pequenos espalhados.
          adjacentVotes += entry.count - 1
        } else if (entry.maxSelectors >= 3) {
          // Condição única com muitos seletores = blocão por breakpoint.
          blockVotes++
        }
      }

      walk(file.children, countAtRule)
    }
  }

  const direction =
    minCount > maxCount ? 'mobile-first' :
    maxCount > minCount ? 'desktop-first' : null

  const insertion =
    adjacentVotes > blockVotes ? 'rule-adjacent' :
    blockVotes > adjacentVotes ? 'breakpoint-blocks' : null

  return {
    direction,
    insertion,
    breakpoints: clusterBoundaries(boundaryFreq),
    counts: { minWidth: minCount, maxWidth: maxCount },
  }
}

function bump(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

/**
 * Agrupa boundaries quase-duplicados (≤ 2px de distância) e devolve o
 * representante mais frequente de cada cluster, em ordem crescente.
 * @private exportado só para testes
 */
export function clusterBoundaries(boundaryFreq) {
  const sorted = [...boundaryFreq.entries()].sort((a, b) => a[0] - b[0])
  const result = []
  let cluster = []

  const flush = () => {
    if (!cluster.length) return
    // Representante: maior frequência; empate → menor valor.
    cluster.sort((a, b) => b[1] - a[1] || a[0] - b[0])
    result.push(cluster[0][0])
    cluster = []
  }

  for (const entry of sorted) {
    if (cluster.length && entry[0] - cluster[cluster.length - 1][0] > 2) flush()
    cluster.push(entry)
  }
  flush()
  return result.sort((a, b) => a - b)
}
