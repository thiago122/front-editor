import { describe, it, expect } from 'vitest'
import { CssWriteTargetService } from '../CssWriteTargetService.js'

// ─── Helpers de construção de Logic Tree mínima ───────────────────────────────

let _id = 0
const sel = (label, id = null) => ({
  id: id ?? `s${_id++}`, type: 'selector', label, metadata: {}, children: [],
})
const media = (cond, children = [], id = null) => ({
  id: id ?? `m${_id++}`, type: 'at-rule', label: `@media ${cond}`, metadata: {}, children,
})
const tree = (children) => ([{
  id: 'root::on_page', type: 'root', label: 'ON PAGE', metadata: { origin: 'on_page' },
  children: [{
    id: 'file::on_page::style', type: 'file', label: 'style',
    metadata: { origin: 'on_page', sourceName: 'style' }, children,
  }],
}])

const BPS = [360, 768, 1024, 1280]

const resolve = (t, overrides = {}) => CssWriteTargetService.resolve(t, {
  selector: '.card',
  origin: 'on_page',
  sourceName: 'style',
  direction: 'mobile-first',
  insertion: 'rule-adjacent',
  breakpoints: BPS,
  ...overrides,
})

// ─── kind: base ───────────────────────────────────────────────────────────────

describe('resolve → base', () => {
  it('breakpoint base da estratégia (mobile-first → menor)', () => {
    expect(resolve(tree([sel('.card')]), { breakpointWidth: 360 })).toEqual({ kind: 'base' })
  })

  it('modo full (width null) é base', () => {
    expect(resolve(tree([sel('.card')]), { breakpointWidth: null })).toEqual({ kind: 'base' })
  })

  it('desktop-first → base é o maior', () => {
    expect(resolve(tree([sel('.card')]), { breakpointWidth: 1280, direction: 'desktop-first' }))
      .toEqual({ kind: 'base' })
  })
})

// ─── kind: existing-rule / existing-atrule ────────────────────────────────────

describe('resolve → reuso de @media existente', () => {
  it('regra com o mesmo seletor já existe no @media equivalente', () => {
    const existing = sel('.card', 'alvo')
    const t = tree([sel('.card'), media('(min-width: 768px)', [existing])])
    const r = resolve(t, { breakpointWidth: 768 })
    expect(r.kind).toBe('existing-rule')
    expect(r.rule.id).toBe('alvo')
  })

  it('casa condição com tolerância (min-width: 767px ≈ botão 768)', () => {
    const t = tree([sel('.card'), media('(min-width: 767px)', [sel('.card', 'alvo')])])
    expect(resolve(t, { breakpointWidth: 768 }).kind).toBe('existing-rule')
  })

  it('rule-adjacent: @media do breakpoint com OUTRA família NÃO é reusado → create-atrule', () => {
    const mq = media('(min-width: 768px)', [sel('.menu')], 'mq768')
    const t = tree([sel('.card'), mq])
    const r = resolve(t, { breakpointWidth: 768 })
    // .card não deve cair no @media do .menu; ganha bloco próprio adjacente à base.
    expect(r.kind).toBe('create-atrule')
    expect(r.condition).toBe('(min-width: 768px)')
  })

  it('rule-adjacent: @media do breakpoint da MESMA família é reusado → existing-atrule', () => {
    const mq = media('(min-width: 768px)', [sel('.card__title')], 'mq768')
    const t = tree([sel('.card'), mq])
    const r = resolve(t, { breakpointWidth: 768 })
    expect(r.kind).toBe('existing-atrule')
    expect(r.atRule.id).toBe('mq768')
  })

  it('breakpoint-blocks: reusa @media do breakpoint mesmo de outra família', () => {
    const mq = media('(min-width: 768px)', [sel('.menu')], 'mq768')
    const t = tree([sel('.card'), mq])
    const r = resolve(t, { breakpointWidth: 768, insertion: 'breakpoint-blocks' })
    expect(r.kind).toBe('existing-atrule')
    expect(r.atRule.id).toBe('mq768')
  })

  it('direção trocada NÃO é reusada (max-width num projeto mobile-first)', () => {
    const t = tree([sel('.card'), media('(max-width: 768px)', [sel('.card')])])
    expect(resolve(t, { breakpointWidth: 768 }).kind).toBe('create-atrule')
  })
})

// ─── kind: create-atrule — inserção rule-adjacent ────────────────────────────

describe('resolve → criação adjacente à regra base', () => {
  it('insere após o cluster da família (.card, .card__title, @media do card)', () => {
    const base = sel('.card', 'base')
    const t = tree([
      base,                                          // 0
      sel('.card__title'),                           // 1
      media('(min-width: 768px)', [sel('.card')]),   // 2 (cluster)
      sel('.menu'),                                  // 3 (fora da família)
    ])
    const r = resolve(t, { breakpointWidth: 1024, baseRuleId: 'base' })
    expect(r.kind).toBe('create-atrule')
    expect(r.insertIndex).toBe(3) // depois do cluster, antes do .menu
  })

  it('mantém ordem direcional: 768 entra ANTES do @media 1280 do cluster', () => {
    const t = tree([
      sel('.card', 'base'),                          // 0
      media('(min-width: 1280px)', [sel('.card')]),  // 1 (mais longe da base)
    ])
    const r = resolve(t, { breakpointWidth: 768, baseRuleId: 'base' })
    expect(r.insertIndex).toBe(1)
  })

  it('âncora por seletor quando baseRuleId não é informado', () => {
    const t = tree([sel('.menu'), sel('.card'), sel('.hero')])
    const r = resolve(t, { breakpointWidth: 768 })
    expect(r.insertIndex).toBe(2) // logo após .card
  })

  it('âncora dentro de @media usa o índice do bloco top-level', () => {
    const t = tree([
      sel('.menu'),                                                  // 0
      media('(min-width: 768px)', [sel('.card', 'aninhada')]),       // 1
      sel('.hero'),                                                  // 2
    ])
    const r = resolve(t, { breakpointWidth: 1024, baseRuleId: 'aninhada' })
    expect(r.insertIndex).toBe(2) // após o bloco que contém a âncora
  })

  it('sem âncora → fallback de blocão (fim, sem @media de largura)', () => {
    const t = tree([sel('.menu'), sel('.hero')])
    const r = resolve(t, { breakpointWidth: 768, selector: '.inexistente' })
    expect(r.insertIndex).toBe(-1)
  })
})

// ─── kind: create-atrule — inserção breakpoint-blocks ────────────────────────

describe('resolve → criação em blocão por breakpoint', () => {
  it('novo blocão entra na posição ordenada (min crescente)', () => {
    const t = tree([
      sel('.card'),                                   // 0
      sel('.menu'),                                   // 1
      media('(min-width: 768px)', [sel('.menu')]),    // 2
      media('(min-width: 1280px)', [sel('.menu')]),   // 3
    ])
    const r = resolve(t, { breakpointWidth: 1024, insertion: 'breakpoint-blocks' })
    expect(r.kind).toBe('create-atrule')
    expect(r.insertIndex).toBe(3) // entre 768 e 1280
  })

  it('mais longe que todos → depois do último blocão', () => {
    const t = tree([
      sel('.card'),
      media('(min-width: 768px)', [sel('.card')]),    // 1
    ])
    expect(resolve(t, { breakpointWidth: 1280, insertion: 'breakpoint-blocks' }).insertIndex).toBe(2)
  })

  it('desktop-first: max decrescente (768 entra antes do max 640)', () => {
    const t = tree([
      sel('.card'),
      media('(max-width: 1024px)', [sel('.card')]),   // 1
      media('(max-width: 640px)', [sel('.card')]),    // 2
    ])
    const r = resolve(t, {
      breakpointWidth: 768, direction: 'desktop-first', insertion: 'breakpoint-blocks',
    })
    expect(r.insertIndex).toBe(2)
  })

  it('sem @media de largura no arquivo → fim (-1)', () => {
    const t = tree([sel('.card'), media('(orientation: landscape)', [sel('.card')])])
    expect(resolve(t, { breakpointWidth: 768, insertion: 'breakpoint-blocks' }).insertIndex).toBe(-1)
  })
})

// ─── kind: create-atrule — file-end e arquivo inexistente ────────────────────

describe('resolve → demais estilos', () => {
  it('file-end ignora âncora e ordem', () => {
    const t = tree([sel('.card'), sel('.menu')])
    const r = resolve(t, { breakpointWidth: 768, insertion: 'file-end' })
    expect(r.kind).toBe('create-atrule')
    expect(r.insertIndex).toBe(-1)
  })

  it('arquivo inexistente na tree → fileNodeId null (findOrCreateFile resolve)', () => {
    const r = resolve(tree([sel('.card')]), { breakpointWidth: 768, sourceName: 'outro.css' })
    expect(r.kind).toBe('create-atrule')
    expect(r.fileNodeId).toBeNull()
    expect(r.insertIndex).toBe(-1)
  })
})
