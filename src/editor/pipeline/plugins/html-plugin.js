// html-plugin.js

import { generateId } from '@/utils/ids'

function generateNodeId() {
  return generateId()
}

/**
 * Converte NamedNodeMap → objeto simples
 */
function getAttributes(el) {
  const attrs = {}
  if (!el?.attributes) return attrs

  for (const attr of el.attributes) {
    attrs[attr.name] = attr.value
  }

  return attrs
}

/**
 * Converte attrs AST → string HTML
//  */
function attrsToString(attrs = {}) {
  return Object.entries(attrs)
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ')
}

function astToHTML(node) {
  if (!node) return ''
  if (node.type === 'text') return node.value
  if (node.type === 'comment') return ``

  if (node.type === 'element') {
    const tag = node.tag.toLowerCase()

    // 1. Prepara os atributos (incluindo o ID de renderização)
    const attrsData = { ...node.attrs, 'data-node-id': node.nodeId }
    const attrsStr = attrsToString(attrsData)
    const openingTag = `<${tag}${attrsStr ? ' ' + attrsStr : ''}>`

    // 2. Lista oficial de elementos que não podem ter fechamento nem filhos
    const voidElements = [
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'param',
      'source',
      'track',
      'wbr',
    ]

    if (voidElements.includes(tag)) {
      return openingTag // Retorna apenas <br ...>
    }

    // 3. Para elementos normais, processa filhos e fecha a tag
    const children = (node.children || []).map(astToHTML).join('')
    return `${openingTag}${children}</${tag}>`
  }

  return ''
}

export function htmlPlugin({ doctype = '<!DOCTYPE html>' } = {}) {
  /**
   * DOM → AST
   */
  function domToAST(node, rootType) {
    const nodeId = generateNodeId()

    if (node.nodeType === Node.ELEMENT_NODE) {
      return {
        nodeId,
        type: 'element',
        tag: rootType || node.tagName.toLowerCase(),
        attrs: getAttributes(node),
        children: [...node.childNodes].map((n) => domToAST(n)),
      }
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return {
        nodeId,
        type: 'text',
        value: node.nodeValue,
        children: [],
      }
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      return {
        nodeId,
        type: 'comment',
        value: node.nodeValue,
        children: [],
      }
    }

    return {
      nodeId,
      type: 'unknown',
      children: [],
    }
  }

  /**
   * AST → HTML
   */
  function astToHTML(node) {
    if (!node) return ''

    if (node.type === 'text') return node.value
    if (node.type === 'comment') return ``

    if (node.type === 'element') {
      const attrs = attrsToString({
        ...node.attrs,
        'data-node-id': node.nodeId,
      })

      const tag = node.tag.toLowerCase()
      const attrsStr = attrs ? ' ' + attrs : ''

      // Lista de tags que NÃO têm fechamento (Void Elements)
      const voidElements = ['br', 'img', 'hr', 'input', 'link', 'meta']

      if (voidElements.includes(tag)) {
        // Retorna apenas a tag de abertura: <br data-node-id="...">
        return `<${tag}${attrsStr}>`
      }

      // Para tags normais, renderiza abertura, filhos e fechamento
      const children = node.children.map(astToHTML).join('')
      return `<${tag}${attrsStr}>${children}</${tag}>`
    }

    return ''
  }

  return {
    name: 'html',

    tokenize(ctx) {
      // O DOMParser é mágico: se você der "<div>", ele cria um documento completo.
      // Se você der "<html>...</html>", ele respeita a estrutura.
      const parser = new DOMParser()
      ctx.document = parser.parseFromString(ctx.input || '', 'text/html')
    },

    parse(ctx) {
      if (ctx.isFragment) {
        // O DOMParser coloca fragmentos soltos dentro do body do documento temporário
        const nodes = [...ctx.document.body.childNodes]
        // Converte cada nó do fragmento para AST
        ctx.ast = nodes.map((n) => domToAST(n))
        return
      }

      // 1. Pegamos os atributos da tag <html> (caso existam no input)
      const htmlEl = ctx.document.documentElement
      ctx.htmlAttrs = getAttributes(htmlEl)

      // 2. Criamos a AST sempre com a estrutura Document > Head + Body
      ctx.ast = {
        nodeId: generateNodeId(),
        type: 'document',
        tag: 'document',
        children: [domToAST(ctx.document.head, 'head'), domToAST(ctx.document.body, 'body')],
      }

      // Captura o Doctype do documento parseado
      const dt = ctx.document.doctype
      if (dt) {
        // Monta a string baseada nas propriedades do nó Doctype
        let dtString = `DOCTYPE ${dt.name}`
        if (dt.publicId) dtString += ` PUBLIC "${dt.publicId}"`
        if (dt.systemId) dtString += ` "${dt.systemId}"`
        ctx.detectedDoctype = dtString
      } else {
        // Se o usuário não enviou nada (ex: só uma div), assume HTML5
        ctx.detectedDoctype = 'DOCTYPE html'
      }

      // Captura atributos do head original
      const headEl = ctx.document.head
      ctx.headAttrs = getAttributes(headEl)

      // Garante que o Regex pegue apenas o miolo
      const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(ctx.input)
      ctx.headHTML = headMatch ? headMatch[1] : headEl.innerHTML
      ctx.charset = ctx.document.characterSet || 'UTF-8'
    },

    // html-plugin.js

    render(ctx) {
      // SE NÃO FOR UM DOCUMENTO COMPLETO (ex: renderização de um nó isolado no Undo)
      if (ctx.ast.type !== 'document') {
        ctx.output = astToHTML(ctx.ast)
        return
      }

      // Lógica original para documentos completos
      const bodyNode = ctx.ast.children.find((n) => n.tag === 'body')

      if (!bodyNode) {
        // Caso de emergência: se for document mas não tiver body, renderiza os filhos diretamente
        ctx.output = (ctx.ast.children || []).map((child) => astToHTML(child)).join('')
        return
      }

      const htmlAttrsStr = attrsToString(ctx.htmlAttrs)
      const bodyAttrs = attrsToString({
        ...bodyNode.attrs,
        'data-node-id': bodyNode.nodeId,
      })

      const bodyContent = (bodyNode.children || []).map((child) => astToHTML(child)).join('')
      const hasCharset = /<meta[^>]*charset=[^>]*>/i.test(ctx.headHTML)
      const headAttrsStr = attrsToString(ctx.headAttrs)

      ctx.output = `<!${ctx.detectedDoctype}>
    <html ${htmlAttrsStr}>
    <head ${headAttrsStr}> ${!hasCharset ? '<meta charset="UTF-8">' : ''}
      ${ctx.headHTML}
    </head>
    <body ${bodyAttrs}>
      ${bodyContent}
    </body>
    </html>`.trim()
    },

    // O CONTRATO: O Pipeline chamará isso
    astToCode(node) {
      return astToHTML(node) // Chama sua função existente
    },
  }
}
