import { describe, it, expect } from 'vitest'
import { evaluateMediaQuery } from '../mediaQuery.js'

const vp = (width, height = 800) => ({ width, height })

describe('evaluateMediaQuery', () => {
  it('label sem @media é sempre ativo', () => {
    expect(evaluateMediaQuery('.btn', vp(500)).active).toBe(true)
    expect(evaluateMediaQuery(null, vp(500)).active).toBe(true)
  })

  it('all e screen são ativos', () => {
    expect(evaluateMediaQuery('@media all', vp(100)).active).toBe(true)
    expect(evaluateMediaQuery('@media screen', vp(100)).active).toBe(true)
  })

  it('print é inativo (editor renderiza screen)', () => {
    const r = evaluateMediaQuery('@media print', vp(1280))
    expect(r.active).toBe(false)
    expect(r.reason).toContain('print')
  })

  it('min-width', () => {
    expect(evaluateMediaQuery('@media (min-width: 768px)', vp(1024)).active).toBe(true)
    const r = evaluateMediaQuery('@media (min-width: 768px)', vp(500))
    expect(r.active).toBe(false)
    expect(r.reason).toContain('500px < 768px')
  })

  it('max-width', () => {
    expect(evaluateMediaQuery('@media (max-width: 768px)', vp(500)).active).toBe(true)
    expect(evaluateMediaQuery('@media (max-width: 768px)', vp(1024)).active).toBe(false)
  })

  it('em/rem convertem a 16px', () => {
    // 48em = 768px
    expect(evaluateMediaQuery('@media (min-width: 48em)', vp(800)).active).toBe(true)
    expect(evaluateMediaQuery('@media (min-width: 48rem)', vp(700)).active).toBe(false)
  })

  it('condições combinadas com and — todas precisam passar', () => {
    const q = '@media (min-width: 600px) and (max-width: 1200px)'
    expect(evaluateMediaQuery(q, vp(800)).active).toBe(true)
    expect(evaluateMediaQuery(q, vp(500)).active).toBe(false)
    expect(evaluateMediaQuery(q, vp(1400)).active).toBe(false)
  })

  it('min/max-height usam viewport.height', () => {
    expect(evaluateMediaQuery('@media (min-height: 600px)', vp(1280, 700)).active).toBe(true)
    expect(evaluateMediaQuery('@media (min-height: 600px)', vp(1280, 500)).active).toBe(false)
    expect(evaluateMediaQuery('@media (max-height: 600px)', vp(1280, 700)).active).toBe(false)
  })

  it('condição não reconhecida não invalida (fica ativo)', () => {
    expect(evaluateMediaQuery('@media (orientation: landscape)', vp(500)).active).toBe(true)
  })
})
