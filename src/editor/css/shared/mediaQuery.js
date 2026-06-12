/**
 * Avalia se o label de um @media está ativo para o viewport dado.
 * Cobre os casos comuns: min/max-width, min/max-height, print, screen, all,
 * condições combinadas com 'and', unidades px/em/rem (em/rem = 16px).
 *
 * Usado pelo CSS Explorer para esmaecer @media que não casam o viewport
 * atual (eles continuam visíveis e editáveis — decisão de produto, ver
 * CssRule.vue / calculateOverrides).
 *
 * @param {string} label    — ex: '@media (min-width: 768px)'
 * @param {{width?: number, height?: number}} [viewport]
 * @returns {{ active: boolean, reason: string | null }}
 */
export function evaluateMediaQuery(label, viewport) {
  if (!label || !label.includes('@media')) return { active: true, reason: null }

  // Extract the condition string after '@media'
  const condition = label.replace(/^@media\s*/i, '').trim()

  if (!condition || condition === 'all' || condition === 'screen') {
    return { active: true, reason: null }
  }
  if (condition === 'print') {
    return { active: false, reason: `@media print — inactive (screen)` }
  }

  const vw = viewport?.width ?? window.innerWidth
  const vh = viewport?.height ?? window.innerHeight

  // Parse all conditions joined by 'and'
  const parts = condition.split(/\s+and\s+/i)
  for (const part of parts) {
    const clean = part.replace(/[()]/g, '').trim()

    let m
    // min-width
    m = clean.match(/^min-width\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) {
      const val = parseFloat(m[1]) * (m[2] === 'em' || m[2] === 'rem' ? 16 : 1)
      if (vw < val) return { active: false, reason: `${label} — inactive (viewport ${vw}px < ${Math.round(val)}px)` }
      continue
    }
    // max-width
    m = clean.match(/^max-width\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) {
      const val = parseFloat(m[1]) * (m[2] === 'em' || m[2] === 'rem' ? 16 : 1)
      if (vw > val) return { active: false, reason: `${label} — inactive (viewport ${vw}px > ${Math.round(val)}px)` }
      continue
    }
    // min-height
    m = clean.match(/^min-height\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) {
      const val = parseFloat(m[1]) * (m[2] === 'em' || m[2] === 'rem' ? 16 : 1)
      if (vh < val) return { active: false, reason: `${label} — inactive (viewport height ${vh}px < ${Math.round(val)}px)` }
      continue
    }
    // max-height
    m = clean.match(/^max-height\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) {
      const val = parseFloat(m[1]) * (m[2] === 'em' || m[2] === 'rem' ? 16 : 1)
      if (vh > val) return { active: false, reason: `${label} — inactive (viewport height ${vh}px > ${Math.round(val)}px)` }
      continue
    }
  }
  return { active: true, reason: null }
}
