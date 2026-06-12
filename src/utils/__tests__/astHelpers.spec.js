import { describe, it, expect } from 'vitest'
import { calculateOverrides } from '../astHelpers.js'

// Helpers — formato mínimo de rule/decl consumido por calculateOverrides.
// A ordem dos grupos/regras já chega ordenada por especificidade (maior primeiro).
let uidSeq = 0
function rule(declarations, { active = true, pseudoSubSection } = {}) {
  return {
    uid: `r${uidSeq++}`,
    active,
    pseudoSubSection,
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
