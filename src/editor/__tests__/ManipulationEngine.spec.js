import { describe, it, expect, beforeEach } from 'vitest'
import { ManipulationEngine } from '../ManipulationEngine.js'
import { unifiedHistory } from '../history/UnifiedHistoryManager.js'

// Testa as primitivas de mutação do AST + undo/redo por operação inversa.
// getDoc() retorna null de propósito: _syncDom vira no-op e o teste cobre
// apenas AST + histórico (DOM sync é responsabilidade do iframe real).

function el(nodeId, tag, children = [], attrs = {}) {
  return { nodeId, type: 'element', tag, attrs, children }
}

const stubPipeline = {
  astToCode: () => '',
  generateId: () => 'n_test',
  parseFragment: () => null,
}

let ast, ctx, engine

beforeEach(() => {
  ast = el('root', 'body', [
    el('a', 'div', [el('a1', 'p'), el('a2', 'span')]),
    el('b', 'section'),
  ])
  ctx = { ast }
  engine = new ManipulationEngine(() => ctx, () => null, stubPipeline)
  // Singleton compartilhado — zera entre testes
  unifiedHistory.undoStack = []
  unifiedHistory.redoStack = []
  unifiedHistory.rollback()
})

describe('primitivas de AST', () => {
  it('removeNodeAt remove o filho no índice', () => {
    engine.removeNodeAt('a', 0)
    const a = ast.children[0]
    expect(a.children.map((c) => c.nodeId)).toEqual(['a2'])
  })

  it('insertNodeAt insere no índice', () => {
    engine.insertNodeAt('a', 1, el('x', 'em'))
    const a = ast.children[0]
    expect(a.children.map((c) => c.nodeId)).toEqual(['a1', 'x', 'a2'])
  })

  it('setAttribute escreve no AST', () => {
    engine.setAttribute('b', 'class', 'hero')
    expect(ast.children[1].attrs.class).toBe('hero')
  })

  it('move(nodeId, +1) reordena irmãos', () => {
    engine.move('a1', 1)
    const a = ast.children[0]
    expect(a.children.map((c) => c.nodeId)).toEqual(['a2', 'a1'])
  })

  it('move de nó inexistente não lança (regressão do guard de null)', () => {
    expect(() => engine.move('nao-existe', 1)).not.toThrow()
  })
})

describe('undo/redo por operação inversa', () => {
  it('undo de remove restaura o nó no mesmo índice', async () => {
    engine.removeNodeAt('a', 0)
    expect(unifiedHistory.canUndo).toBe(true)

    await unifiedHistory.undo()
    const a = ast.children[0]
    expect(a.children.map((c) => c.nodeId)).toEqual(['a1', 'a2'])
  })

  it('redo refaz o remove', async () => {
    engine.removeNodeAt('a', 0)
    await unifiedHistory.undo()
    await unifiedHistory.redo()
    const a = ast.children[0]
    expect(a.children.map((c) => c.nodeId)).toEqual(['a2'])
  })

  it('undo de setAttribute restaura o valor anterior', async () => {
    engine.setAttribute('b', 'class', 'v1')
    engine.setAttribute('b', 'class', 'v2')
    expect(ast.children[1].attrs.class).toBe('v2')

    await unifiedHistory.undo()
    expect(ast.children[1].attrs.class).toBe('v1')
  })

  it('transação agrupa múltiplas ops num único undo', async () => {
    engine.setAttributes('b', { class: 'hero', id: 'main' })
    expect(unifiedHistory.undoStack.length).toBe(1)

    await unifiedHistory.undo()
    expect(ast.children[1].attrs.class).toBeUndefined()
    expect(ast.children[1].attrs.id).toBeUndefined()
  })

  it('undo de move volta à ordem original', async () => {
    engine.move('a1', 1)
    await unifiedHistory.undo()
    const a = ast.children[0]
    expect(a.children.map((c) => c.nodeId)).toEqual(['a1', 'a2'])
  })
})
