import { describe, it, expect } from 'vitest'
import { getSpecificity, isInheritedProperty, normalizePropertyName, cleanSelectorForMatching } from '../cssUtils.js'

// Referência: Selectors Level 4 §17. Formato [inline, id, classe, tipo].
describe('getSpecificity', () => {
  it('seletores simples', () => {
    expect(getSpecificity('#a')).toEqual([0, 1, 0, 0])
    expect(getSpecificity('.a')).toEqual([0, 0, 1, 0])
    expect(getSpecificity('div')).toEqual([0, 0, 0, 1])
    expect(getSpecificity('[href]')).toEqual([0, 0, 1, 0])
  })

  it('seletor universal contribui 0', () => {
    expect(getSpecificity('*')).toEqual([0, 0, 0, 0])
    expect(getSpecificity('* .a')).toEqual([0, 0, 1, 0])
  })

  it('compostos e descendentes', () => {
    expect(getSpecificity('div.a#b')).toEqual([0, 1, 1, 1])
    expect(getSpecificity('ul li a')).toEqual([0, 0, 0, 3])
    expect(getSpecificity('#nav .item:hover')).toEqual([0, 1, 2, 0])
  })

  it('pseudo-elemento conta UMA vez, como tipo', () => {
    expect(getSpecificity('p::before')).toEqual([0, 0, 0, 2])
    expect(getSpecificity('::selection')).toEqual([0, 0, 0, 1])
  })

  it('pseudo-classe conta como classe', () => {
    expect(getSpecificity(':hover')).toEqual([0, 0, 1, 0])
    expect(getSpecificity('li:first-child')).toEqual([0, 0, 1, 1])
  })

  it(':is()/:not()/:has() usam o argumento mais específico', () => {
    expect(getSpecificity(':is(#a, .b)')).toEqual([0, 1, 0, 0])
    expect(getSpecificity(':not(.x)')).toEqual([0, 0, 1, 0])
    expect(getSpecificity(':has(div)')).toEqual([0, 0, 0, 1])
    expect(getSpecificity('a:not(#x)')).toEqual([0, 1, 0, 1])
  })

  it(':where() contribui 0', () => {
    expect(getSpecificity(':where(#a, .b)')).toEqual([0, 0, 0, 0])
    expect(getSpecificity('div:where(.x)')).toEqual([0, 0, 0, 1])
  })

  it(':nth-child(... of S) soma a pseudo-classe + S mais específico', () => {
    expect(getSpecificity('li:nth-child(2n)')).toEqual([0, 0, 1, 1])
    expect(getSpecificity(':nth-child(2n of .x)')).toEqual([0, 0, 2, 0])
  })

  it('lista separada por vírgula retorna o mais específico', () => {
    expect(getSpecificity('div, #a, .b')).toEqual([0, 1, 0, 0])
  })

  it('entrada inválida retorna zeros', () => {
    expect(getSpecificity(null)).toEqual([0, 0, 0, 0])
    expect(getSpecificity('')).toEqual([0, 0, 0, 0])
    expect(getSpecificity(42)).toEqual([0, 0, 0, 0])
  })
})

describe('isInheritedProperty', () => {
  it('propriedades herdadas (incl. expansão via mdn-data)', () => {
    expect(isInheritedProperty('color')).toBe(true)
    expect(isInheritedProperty('font-size')).toBe(true)
    expect(isInheritedProperty('word-break')).toBe(true)
    expect(isInheritedProperty('tab-size')).toBe(true)
  })

  it('propriedades não herdadas', () => {
    expect(isInheritedProperty('margin')).toBe(false)
    expect(isInheritedProperty('display')).toBe(false)
    expect(isInheritedProperty('position')).toBe(false)
  })
})

describe('normalizePropertyName', () => {
  it('detecta prefixo --disabled-', () => {
    expect(normalizePropertyName('--disabled-color')).toEqual({ prop: 'color', disabled: true })
    expect(normalizePropertyName('color')).toEqual({ prop: 'color', disabled: false })
  })
})

describe('cleanSelectorForMatching', () => {
  it('remove pseudo-elementos e partes vazias', () => {
    expect(cleanSelectorForMatching('p::before')).toBe('p')
    expect(cleanSelectorForMatching('*, ::before, ::after')).toBe('*')
  })
})
