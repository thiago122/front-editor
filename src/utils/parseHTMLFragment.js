// utils/parseHTMLFragment.js

let fragmentNodeIdCounter = 0

function genId() {
  return `f${fragmentNodeIdCounter++}`
}

export function parseHTMLFragment(html) {
  const parser = new DOMParser()

  // usamos body para permitir fragmentos soltos
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html')

  return [...doc.body.childNodes].map(domToAST)
}

function domToAST(node) {
  const nodeId = genId()

  if (node.nodeType === Node.ELEMENT_NODE) {
    return {
      nodeId,
      type: 'element',
      tag: node.tagName.toLowerCase(),
      attrs: getAttributes(node),
      children: [...node.childNodes].map(domToAST),
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

function getAttributes(el) {
  const attrs = {}
  for (const attr of el.attributes || []) {
    attrs[attr.name] = attr.value
  }
  return attrs
}
