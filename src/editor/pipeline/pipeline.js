// pipeline.js

import { generateId } from '@/utils/ids'

export class Pipeline {
  constructor() {
    this.plugins = []
    this.generateId = generateId
  }

  use(plugin) {
    this.plugins.push(plugin)
  }

  run(input) {
    const ctx = {
      input,
      tokens: [],
      ast: null,
      output: null,
    }

    this.call('normalize', ctx)
    this.call('tokenize', ctx)
    this.call('parse', ctx)
    this.call('transformAST', ctx)
    this.call('render', ctx)

    return ctx
  }

  render(ctx) {
    this.call('render', ctx)
    return ctx
  }

  /**
   * 👉 Novo modo de execução
   * AST já existe → apenas renderiza
   */
  runFromAST(ast, metadata = {}) {
    console.log(metadata)
    const ctx = {
      input: null,
      tokens: [],
      ast,
      output: null,
      ...metadata,
    }

    this.call('transformAST', ctx)
    this.call('render', ctx)

    return ctx
  }

  call(hook, ctx) {
    for (const plugin of this.plugins) {
      if (typeof plugin[hook] === 'function') {
        plugin[hook](ctx)
      }
    }
  }

  // parse fragment
  parseFragment(htmlString) {
    const tempCtx = {
      input: htmlString,
      ast: null,
      isFragment: true,
    }

    // 1. Precisamos rodar o tokenize para criar o DOMParser
    this.call('tokenize', tempCtx)
    // 2. Rodamos o parse
    this.call('parse', tempCtx)

    // 3. Garantimos que o fragmento receba IDs novos antes de retornar
    this._assignIds(tempCtx.ast)

    return tempCtx.ast
  }

  // Método auxiliar para garantir IDs em fragmentos novos
  _assignIds(node) {
    if (!node) return
    const nodes = Array.isArray(node) ? node : [node]

    nodes.forEach((n) => {
      if (!n.nodeId) n.nodeId = generateNodeId()
      if (n.children) this._assignIds(n.children)
    })
  }

  /**
   * Transforma um nó da AST em código (HTML, JSON, Markdown, etc)
   * delegando para o plugin que implementa 'astToCode'.
   */
  astToCode(node) {
    if (!node) return ''

    for (const plugin of this.plugins) {
      if (typeof plugin.astToCode === 'function') {
        return plugin.astToCode(node)
      }
    }

    console.warn('Nenhum plugin implementou astToCode para o nó:', node)
    return ''
  }
}
