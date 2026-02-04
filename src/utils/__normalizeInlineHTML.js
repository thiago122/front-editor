export function normalizeInlineHTML(html) {
  const container = document.createElement('div')
  container.innerHTML = html

  normalize(container)

  // remove wrappers artificiais
  return container.innerHTML
}

function normalize(root) {
  const nodes = [...root.childNodes]

  for (const node of nodes) {
    // 🔁 div -> br + conteúdo
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'DIV') {
      const frag = document.createDocumentFragment()

      // se tiver texto antes
      if (node.textContent?.trim()) {
        frag.append(...node.childNodes)
      }

      frag.appendChild(document.createElement('br'))
      node.replaceWith(frag)
      continue
    }

    // 🔁 <p> -> conteúdo + <br>
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
      const frag = document.createDocumentFragment()
      frag.append(...node.childNodes)
      frag.appendChild(document.createElement('br'))
      node.replaceWith(frag)
      continue
    }

    // remove spans vazios
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.tagName === 'SPAN' &&
      node.innerHTML.trim() === ''
    ) {
      node.remove()
      continue
    }

    // normaliza filhos
    if (node.childNodes?.length) {
      normalize(node)
    }
  }
}
