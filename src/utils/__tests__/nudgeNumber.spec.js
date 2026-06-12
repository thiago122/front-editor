import { describe, it, expect } from 'vitest'
import { nudgeNumberAtCursor } from '../nudgeNumber.js'

describe('nudgeNumberAtCursor', () => {
  it('incrementa inteiro simples', () => {
    expect(nudgeNumberAtCursor('10px', 1, 1)).toEqual({
      newValue: '11px',
      selectionStart: 0,
      selectionEnd: 2,
    })
  })

  it('decrementa abaixo de zero', () => {
    expect(nudgeNumberAtCursor('0px', 0, -1).newValue).toBe('-1px')
  })

  it('preserva casas decimais do original', () => {
    expect(nudgeNumberAtCursor('0.5', 1, 1).newValue).toBe('1.5')
    expect(nudgeNumberAtCursor('1.25', 0, 1).newValue).toBe('2.25')
  })

  it('delta fracionário (Alt = 0.1) cria precisão', () => {
    expect(nudgeNumberAtCursor('10px', 1, 0.1).newValue).toBe('10.1px')
  })

  it('número negativo em valor composto', () => {
    // translateX(-50%) — cursor sobre o -50
    const r = nudgeNumberAtCursor('translateX(-50%)', 13, 1)
    expect(r.newValue).toBe('translateX(-49%)')
  })

  it('valor composto: só altera o número sob o cursor', () => {
    // '1px 2em' — cursor sobre o 2
    const r = nudgeNumberAtCursor('1px 2em', 4, 1)
    expect(r.newValue).toBe('1px 3em')
  })

  it('rgba: altera componente certo', () => {
    const str = 'rgba(0, 128, 255, 0.5)'
    const r = nudgeNumberAtCursor(str, str.indexOf('128') + 1, 10)
    expect(r.newValue).toBe('rgba(0, 138, 255, 0.5)')
  })

  it('cursor fora de número retorna null', () => {
    expect(nudgeNumberAtCursor('auto', 2, 1)).toBeNull()
    expect(nudgeNumberAtCursor('10px solid', 7, 1)).toBeNull()
  })

  it('cursor adjacente (logo após o número) ainda pega', () => {
    expect(nudgeNumberAtCursor('10px', 2, 1).newValue).toBe('11px')
  })
})
