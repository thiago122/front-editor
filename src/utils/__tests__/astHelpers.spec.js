import { describe, it, expect } from 'vitest'
import { calculateOverrides } from '../astHelpers.js'

// Helpers — formato mínimo de rule/decl consumido por calculateOverrides.
// A ordem dos grupos/regras já chega ordenada por especificidade (maior primeiro).
let uidSeq = 0
function rule(declarations, { active = true, pseudoSubSection, layerRank = null } = {}) {
  return {
    uid: `r${uidSeq++}`,
    active,
    pseudoSubSection,
    layerRank,
    declarations: declarations.map((d) => ({ important: false, disabled: false, ...d })),
  }
}
function groups(...rules) {
  return [{ rules }]
}

describe('calculateOverrides', () => {
  it('primeira regra (mais específica) vence; a seguinte é overridden', () => {
    const r1 = rule([{ prop: 'color' }])
    const r2 = rule([{ prop: 'color' }])
    calculateOverrides(groups(r1, r2))
    expect(r1.declarations[0].overridden).toBe(false)
    expect(r2.declarations[0].overridden).toBe(true)
  })

  it('propriedades diferentes não competem', () => {
    const r1 = rule([{ prop: 'color' }])
    const r2 = rule([{ prop: 'margin' }])
    calculateOverrides(groups(r1, r2))
    expect(r1.declarations[0].overridden).toBe(false)
    expect(r2.declarations[0].overridden).toBe(false)
  })

  it('!important bate não-important anterior', () => {
    const r1 = rule([{ prop: 'color' }])
    const r2 = rule([{ prop: 'color', important: true }])
    calculateOverrides(groups(r1, r2))
    expect(r1.declarations[0].overridden).toBe(true)
    expect(r2.declarations[0].overridden).toBe(false)
  })

  it('entre dois !important, o primeiro (mais específico) vence', () => {
    const r1 = rule([{ prop: 'color', important: true }])
    const r2 = rule([{ prop: 'color', important: true }])
    calculateOverrides(groups(r1, r2))
    expect(r1.declarations[0].overridden).toBe(false)
    expect(r2.declarations[0].overridden).toBe(true)
  })

  it('declaração disabled nunca vence', () => {
    const r1 = rule([{ prop: 'color', disabled: true }])
    const r2 = rule([{ prop: 'color' }])
    calculateOverrides(groups(r1, r2))
    expect(r2.declarations[0].overridden).toBe(false)
  })

  it('regra inativa (@media que não casa) não vence nem é marcada', () => {
    const inactive = rule([{ prop: 'color' }], { active: false })
    const activeR = rule([{ prop: 'color' }])
    calculateOverrides(groups(inactive, activeR))
    // A inativa não participa da cascata: sem strike-through falso
    expect(inactive.declarations[0].overridden).toBe(false)
    // E não rouba a vitória da regra ativa
    expect(activeR.declarations[0].overridden).toBe(false)
  })

  it('pseudo-elementos têm cascata isolada (::selection não compete com normal)', () => {
    const sel = rule([{ prop: 'color' }], { pseudoSubSection: '::selection' })
    const normal = rule([{ prop: 'color' }])
    calculateOverrides(groups(sel, normal))
    expect(sel.declarations[0].overridden).toBe(false)
    expect(normal.declarations[0].overridden).toBe(false)
  })

  it('vencedor por propriedade dentro da mesma regra não se auto-marca', () => {
    const r1 = rule([{ prop: 'color' }, { prop: 'margin' }])
    calculateOverrides(groups(r1))
    expect(r1.declarations.every((d) => d.overridden === false)).toBe(true)
  })
})

describe('calculateOverrides — shorthand vs longhand (Chrome DevTools)', () => {
  it('shorthand vencedor risca a longhand perdedora', () => {
    const winner = rule([{ prop: 'margin' }])
    const loser = rule([{ prop: 'margin-top' }])
    calculateOverrides(groups(winner, loser))
    expect(winner.declarations[0].overridden).toBe(false)
    expect(loser.declarations[0].overridden).toBe(true)
  })

  it('longhand vencedora NÃO risca o shorthand (outras folhas dele ainda valem)', () => {
    const winner = rule([{ prop: 'margin-top' }])
    const loser = rule([{ prop: 'margin' }])
    calculateOverrides(groups(winner, loser))
    expect(winner.declarations[0].overridden).toBe(false)
    // margin perdeu só o margin-top; right/bottom/left continuam dele
    expect(loser.declarations[0].overridden).toBe(false)
  })

  it('shorthand é riscado quando TODAS as folhas perdem', () => {
    const winner = rule([
      { prop: 'margin-top' }, { prop: 'margin-right' },
      { prop: 'margin-bottom' }, { prop: 'margin-left' },
    ])
    const loser = rule([{ prop: 'margin' }])
    calculateOverrides(groups(winner, loser))
    expect(loser.declarations[0].overridden).toBe(true)
  })

  it('expansão recursiva: border risca border-top-width', () => {
    const winner = rule([{ prop: 'border' }])
    const loser = rule([{ prop: 'border-top-width' }])
    calculateOverrides(groups(winner, loser))
    expect(loser.declarations[0].overridden).toBe(true)
  })

  it('shorthands aninhados competem entre si (border vs border-width)', () => {
    const winner = rule([{ prop: 'border' }])
    const loser = rule([{ prop: 'border-width' }])
    calculateOverrides(groups(winner, loser))
    // border cobre todas as folhas de border-width
    expect(loser.declarations[0].overridden).toBe(true)
  })

  it('longhand !important vence shorthand anterior (só naquela folha)', () => {
    const sh = rule([{ prop: 'margin' }])
    const lh = rule([{ prop: 'margin-top', important: true }])
    calculateOverrides(groups(sh, lh))
    expect(lh.declarations[0].overridden).toBe(false)
    expect(sh.declarations[0].overridden).toBe(false) // perdeu só 1 de 4 folhas
  })

  it('propriedades sem relação shorthand seguem como antes', () => {
    const r1 = rule([{ prop: 'display' }])
    const r2 = rule([{ prop: 'display' }])
    calculateOverrides(groups(r1, r2))
    expect(r2.declarations[0].overridden).toBe(true)
  })
})

describe('calculateOverrides — @layer com !important (ordem invertida)', () => {
  // No fluxo normal a ordenação das regras (matcher) já encode os layers;
  // calculateOverrides só precisa inverter a disputa entre !important.

  it('important LAYERED vence important unlayered (mesmo chegando depois)', () => {
    // Ordem normal: unlayered primeiro (venceria sem important)
    const unlayered = rule([{ prop: 'color', important: true }])
    const layered = rule([{ prop: 'color', important: true }], { layerRank: [0] })
    calculateOverrides(groups(unlayered, layered))
    expect(layered.declarations[0].overridden).toBe(false)
    expect(unlayered.declarations[0].overridden).toBe(true)
  })

  it('entre importants layered, o layer declarado ANTES vence', () => {
    const later = rule([{ prop: 'color', important: true }], { layerRank: [1] })
    const earlier = rule([{ prop: 'color', important: true }], { layerRank: [0] })
    calculateOverrides(groups(later, earlier))
    expect(earlier.declarations[0].overridden).toBe(false)
    expect(later.declarations[0].overridden).toBe(true)
  })

  it('sem important, a ordem das regras (já layer-aware) decide', () => {
    // unlayered chega primeiro na lista (sort do matcher) e vence
    const unlayered = rule([{ prop: 'color' }])
    const layered = rule([{ prop: 'color' }], { layerRank: [0] })
    calculateOverrides(groups(unlayered, layered))
    expect(unlayered.declarations[0].overridden).toBe(false)
    expect(layered.declarations[0].overridden).toBe(true)
  })
})
