import { describe, it, expect } from 'vitest'
import {
  parseWidthCondition,
  selectorFamily,
  conditionForBreakpoint,
  isBaseBreakpoint,
  matchesBreakpoint,
  detectResponsiveProfile,
  clusterBoundaries,
} from '../breakpointStrategy.js'

// ─── Helpers de construção de Logic Tree mínima ───────────────────────────────

let _id = 0
const sel = (label) => ({ id: `s${_id++}`, type: 'selector', label, metadata: {}, children: [] })
const media = (cond, children = []) => ({
  id: `m${_id++}`, type: 'at-rule', label: `@media ${cond}`, metadata: {}, children,
})
const tree = (children) => ([{
  id: 'root::on_page', type: 'root', label: 'ON PAGE', metadata: { origin: 'on_page' },
  children: [{
    id: 'file::on_page::style', type: 'file', label: 'style',
    metadata: { origin: 'on_page', sourceName: 'style' }, children,
  }],
}])

// ─── parseWidthCondition ──────────────────────────────────────────────────────

describe('parseWidthCondition', () => {
  it('min-width em px', () => {
    expect(parseWidthCondition('@media (min-width: 768px)')).toEqual({ min: 768, max: null, other: false })
  })

  it('max-width em em (16px)', () => {
    expect(parseWidthCondition('@media (max-width: 48em)')).toEqual({ min: null, max: 768, other: false })
  })

  it('range min+max', () => {
    expect(parseWidthCondition('@media (min-width: 600px) and (max-width: 1200px)'))
      .toEqual({ min: 600, max: 1200, other: false })
  })

  it('condição não-width marca other', () => {
    expect(parseWidthCondition('@media (orientation: landscape)').other).toBe(true)
    expect(parseWidthCondition('@media print').other).toBe(true)
  })

  it('screen and min-width não marca other', () => {
    expect(parseWidthCondition('@media screen and (min-width: 768px)'))
      .toEqual({ min: 768, max: null, other: false })
  })

  it('label que não é @media retorna null', () => {
    expect(parseWidthCondition('.btn')).toBeNull()
    expect(parseWidthCondition(null)).toBeNull()
  })
})

// ─── selectorFamily ───────────────────────────────────────────────────────────

describe('selectorFamily', () => {
  it('classe simples', () => {
    expect(selectorFamily('.card')).toBe('card')
  })

  it('BEM: elemento e modificador caem na mesma família', () => {
    expect(selectorFamily('.card__title')).toBe('card')
    expect(selectorFamily('.card--dark')).toBe('card')
  })

  it('descendentes e pseudo usam a raiz', () => {
    expect(selectorFamily('.card .icon')).toBe('card')
    expect(selectorFamily('.card:hover')).toBe('card')
  })

  it('lista de seletores usa o primeiro', () => {
    expect(selectorFamily('.menu, .card')).toBe('menu')
  })

  it('seletor sem token identificável retorna null', () => {
    expect(selectorFamily('')).toBeNull()
    expect(selectorFamily(null)).toBeNull()
  })
})

// ─── conditionForBreakpoint / isBaseBreakpoint / matchesBreakpoint ───────────

describe('conditionForBreakpoint', () => {
  it('mobile-first gera min-width', () => {
    expect(conditionForBreakpoint(768, 'mobile-first')).toBe('(min-width: 768px)')
  })

  it('desktop-first gera max-width', () => {
    expect(conditionForBreakpoint(768, 'desktop-first')).toBe('(max-width: 768px)')
  })
})

describe('isBaseBreakpoint', () => {
  const bps = [360, 768, 1280]

  it('mobile-first: base é o menor', () => {
    expect(isBaseBreakpoint(360, 'mobile-first', bps)).toBe(true)
    expect(isBaseBreakpoint(768, 'mobile-first', bps)).toBe(false)
  })

  it('desktop-first: base é o maior', () => {
    expect(isBaseBreakpoint(1280, 'desktop-first', bps)).toBe(true)
    expect(isBaseBreakpoint(360, 'desktop-first', bps)).toBe(false)
  })

  it('width null (modo full) é base', () => {
    expect(isBaseBreakpoint(null, 'mobile-first', bps)).toBe(true)
  })
})

describe('matchesBreakpoint', () => {
  it('casa com tolerância de 1px (767 ≈ 768)', () => {
    expect(matchesBreakpoint({ min: null, max: 767, other: false }, 768, 'desktop-first')).toBe(true)
    expect(matchesBreakpoint({ min: 768, max: null, other: false }, 768, 'mobile-first')).toBe(true)
  })

  it('não casa direção trocada nem ranges', () => {
    expect(matchesBreakpoint({ min: 768, max: null, other: false }, 768, 'desktop-first')).toBe(false)
    expect(matchesBreakpoint({ min: 600, max: 1200, other: false }, 600, 'mobile-first')).toBe(false)
  })
})

// ─── detectResponsiveProfile ──────────────────────────────────────────────────

describe('detectResponsiveProfile', () => {
  it('maioria de min-width → mobile-first', () => {
    const t = tree([
      sel('.a'),
      media('(min-width: 768px)', [sel('.a')]),
      media('(min-width: 1024px)', [sel('.a')]),
      media('(max-width: 480px)', [sel('.a')]),
    ])
    expect(detectResponsiveProfile(t).direction).toBe('mobile-first')
  })

  it('maioria de max-width → desktop-first', () => {
    const t = tree([
      sel('.a'),
      media('(max-width: 1024px)', [sel('.a')]),
      media('(max-width: 640px)', [sel('.a')]),
    ])
    expect(detectResponsiveProfile(t).direction).toBe('desktop-first')
  })

  it('sem @media de largura → direção null (ambíguo)', () => {
    const t = tree([sel('.a'), media('(orientation: landscape)', [sel('.a')])])
    const p = detectResponsiveProfile(t)
    expect(p.direction).toBeNull()
    expect(p.breakpoints).toEqual([])
  })

  it('mesma condição repetida no arquivo → rule-adjacent', () => {
    const t = tree([
      sel('.card'),
      media('(min-width: 768px)', [sel('.card')]),
      sel('.menu'),
      media('(min-width: 768px)', [sel('.menu')]),
    ])
    expect(detectResponsiveProfile(t).insertion).toBe('rule-adjacent')
  })

  it('blocão único com muitos seletores → breakpoint-blocks', () => {
    const t = tree([
      sel('.card'), sel('.menu'),
      media('(min-width: 768px)', [sel('.card'), sel('.menu'), sel('.hero')]),
    ])
    expect(detectResponsiveProfile(t).insertion).toBe('breakpoint-blocks')
  })

  it('extrai breakpoints normalizando max-width p/ fronteira (767 → 768)', () => {
    const t = tree([
      media('(min-width: 768px)', [sel('.a')]),
      media('(max-width: 767px)', [sel('.b')]),
      media('(min-width: 1280px)', [sel('.c')]),
    ])
    expect(detectResponsiveProfile(t).breakpoints).toEqual([768, 1280])
  })
})

describe('clusterBoundaries', () => {
  it('agrupa vizinhos ≤2px e escolhe o mais frequente', () => {
    const freq = new Map([[767, 1], [768, 3], [1280, 2]])
    expect(clusterBoundaries(freq)).toEqual([768, 1280])
  })

  it('empate de frequência → menor valor', () => {
    const freq = new Map([[640, 1], [641, 1]])
    expect(clusterBoundaries(freq)).toEqual([640])
  })
})
