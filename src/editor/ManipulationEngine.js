// ManipulatinEngine.js

import { findNodeById, findParentAndIndex, findParentNode, cloneAndRegenerate } from '@/utils/ast'
import { unifiedHistory as history } from './history/UnifiedHistoryManager'

export class ManipulationEngine {
  // Passamos funções que buscam os valores atuais (getters)
  constructor(getCtx, getDoc, pipeline) {
    this.getCtx = getCtx
    this.getDoc = getDoc
    this.pipeline = pipeline
    // Registra esta engine no UnifiedHistoryManager para que HtmlCommand
    // possa executar applyOperation() durante undo/redo.
    history.setEngine(this)
  }

  // Método interno para atualizar o DOM
  _syncDom(nodeId, action, html = null, refNodeId = null) {
    const doc = this.getDoc()
    if (!doc) return
    const el = doc.querySelector(`[data-node-id="${nodeId}"]`)
    const refEl = refNodeId ? doc.querySelector(`[data-node-id="${refNodeId}"]`) : null

    switch (action) {
      case 'innerHTML':
        el.innerHTML = html
        break
      case 'append':
        el.insertAdjacentHTML('beforeend', html)
        break
      case 'prepend':
        el.insertAdjacentHTML('afterbegin', html)
        break
      case 'after':
        ;(refEl || el)?.insertAdjacentHTML('afterend', html)
        break
      case 'before':
        refEl.insertAdjacentHTML('beforebegin', html)
        break
      case 'remove':
        el?.remove()
        break

      case 'attr':
        if (arguments[3] === null || arguments[3] === undefined) {
          el?.removeAttribute(arguments[2])
        } else {
          el?.setAttribute(arguments[2], arguments[3])
        }
        break
    }
  }

  /**
   * RE-EXECUTION ENGINE (History Replay)
   */
  async applyOperation(op) {
    switch (op.type) {
      case 'removeNodeAt':
        this.removeNodeAt(op.args[0], op.args[1])
        break

      case 'insertNodeAt':
        this.insertNodeAt(op.args[0], op.args[1], op.args[2])
        break

      case 'moveNodeAt':
        this.moveNodeAt(op.args[0], op.args[1], op.args[2])
        break

      case 'setAttribute':
        this.setAttribute(op.args[0], op.args[1], op.args[2])
        break
    }
  }

  /** --- PRIMITIVE OPERATIONS (History Aware) --- **/

  removeNodeAt(parentId, index) {
    const ctx = this.getCtx()
    const parent = findNodeById(ctx.ast, parentId)
    if (!parent || !parent.children[index]) return

    const [removedNode] = parent.children.splice(index, 1)

    // Sync DOM is tricky here because we only know the parent and index.
    // But removedNode has the ID we need to remove from DOM.
    this._syncDom(removedNode.nodeId, 'remove')

    // Record Inverse: Insert
    history.record({
      type: 'insertNodeAt',
      args: [parentId, index, removedNode],
    })
  }

  insertNodeAt(parentId, index, node) {
    const ctx = this.getCtx()
    const parent = findNodeById(ctx.ast, parentId)
    if (!parent) return

    parent.children.splice(index, 0, node)

    // Sync DOM
    // We need to generate HTML for the node
    const html = this.pipeline.astToCode(node)
    const doc = this.getDoc()

    // Strategy to find a valid DOM anchor:
    // 1. Try to find the closest NEXT sibling that exists in DOM (insert before it)
    let nextAnchor = null
    for (let i = index + 1; i < parent.children.length; i++) {
      const sib = parent.children[i]
      const domEl = doc?.querySelector(`[data-node-id="${sib.nodeId}"]`)
      if (domEl) {
        nextAnchor = sib
        break
      }
    }

    if (nextAnchor) {
      this._syncDom(null, 'before', html, nextAnchor.nodeId)
    } else {
      // 2. If no next anchor, try closest PREVIOUS sibling (insert after it)
      let prevAnchor = null
      for (let i = index - 1; i >= 0; i--) {
        const sib = parent.children[i]
        const domEl = doc?.querySelector(`[data-node-id="${sib.nodeId}"]`)
        if (domEl) {
          prevAnchor = sib
          break
        }
      }

      if (prevAnchor) {
        this._syncDom(null, 'after', html, prevAnchor.nodeId)
      } else {
        // 3. Fallback: Prepend or Append
        if (index === 0) {
          this._syncDom(parentId, 'prepend', html)
        } else {
          this._syncDom(parentId, 'append', html)
        }
      }
    }

    // Record Inverse: Remove
    history.record({
      type: 'removeNodeAt',
      args: [parentId, index],
    })
  }

  moveNodeAt(parentId, fromIndex, toIndex) {
    const ctx = this.getCtx()
    const parent = findNodeById(ctx.ast, parentId)

    if (!parent || !parent.children) return

    // 1. Validation
    if (fromIndex < 0 || fromIndex >= parent.children.length) return
    if (toIndex < 0 || toIndex >= parent.children.length) return

    // 2. Logic Swap
    const [movedNode] = parent.children.splice(fromIndex, 1)
    parent.children.splice(toIndex, 0, movedNode)

    // 3. Sync DOM
    this._syncMoveDom(movedNode.nodeId, parent, toIndex)

    // 4. Record Inverse
    history.record({
      type: 'moveNodeAt',
      args: [parentId, toIndex, fromIndex], // Swap args
    })
  }

  /**
   * Move um nó uma posição acima (-1) ou abaixo (+1) entre os irmãos.
   * Chamado pelo MoveCommand via NodeDispatcher.
   */
  move(nodeId, direction) {
    const ctx = this.getCtx()
    const result = findParentAndIndex(ctx.ast, nodeId)
    if (!result) return

    const { parent, index } = result
    const toIndex = index + direction

    if (toIndex < 0 || toIndex >= parent.children.length) return
    this.moveNodeAt(parent.nodeId, index, toIndex)
  }

  /**
   * Move um nó para outro pai — ou reordena dentro do mesmo pai.
   * Usa removeNodeAt + insertNodeAt para todas as situações, pois:
   *  - moveNodeAt dependia de _syncMoveDom, que falhava silenciosamente quando
   *    o próximo irmão no AST era um text node (sem data-node-id no DOM).
   *  - insertNodeAt já tem lógica robusta de busca de âncora no DOM,
   *    iterando sobre irmãos até encontrar um com data-node-id real.
   *
   * @param {string} nodeId         — nó a mover
   * @param {string} targetParentId — pai de destino
   * @param {number} targetIndex    — índice de inserção (no AST do pai de destino)
   */
  moveNodeToParent(nodeId, targetParentId, targetIndex) {
    const ctx = this.getCtx()
    const srcResult = findParentAndIndex(ctx.ast, nodeId)
    if (!srcResult.parent) return

    const { parent: srcParent, index: srcIndex } = srcResult

    // Captura o nó ANTES de qualquer modificação no AST
    const node = findNodeById(ctx.ast, nodeId)
    if (!node) return

    // Ajuste de índice para mesmo pai:
    // removeNodeAt(srcIndex) desloca todos os elementos posteriores em -1.
    // Quando a fonte está ANTES do alvo, o targetIndex precisa ser decrementado.
    //
    // Exemplo: [X, Y, Z], mover X(0) para depois de Y → targetIndex=2
    //   remove X → [Y, Z]
    //   sem ajuste: insertAt(2) → [Y, Z, X]  ✗  (X vai para o final)
    //   com ajuste: insertAt(1) → [Y, X, Z]  ✓
    const isSameParent   = srcParent.nodeId === targetParentId
    const adjustedIndex  = isSameParent && srcIndex < targetIndex
      ? targetIndex - 1
      : targetIndex

    // Sem mudança real → no-op
    if (isSameParent && adjustedIndex === srcIndex) return

    history.beginTransaction()
    this.removeNodeAt(srcParent.nodeId, srcIndex)
    this.insertNodeAt(targetParentId, adjustedIndex, node)
    history.commit()
  }

  // Helper for move DOM sync
  _syncMoveDom(nodeId, parentAstNode, toIndex) {
    const doc = this.getDoc()
    const currentEl = doc.querySelector(`[data-node-id="${nodeId}"]`)
    if (!currentEl) return

    // Find reference sibling
    // If we are at the end, append. Else, before sibling.
    // Beware that parentAstNode.children is ALREADY updated.

    // If toIndex is last, there is no next sibling
    if (toIndex === parentAstNode.children.length - 1) {
      // Append to parent element in DOM
      // Ideally we find the parent DOM element.
      // However, _syncMoveFallback Logic from original code fits here or we can simplify.
      // Let's reuse existing logic or simplify.

      // Simple approach: Find next sibling in AST that has a DOM element?
      // Or just append to parent if no next sibling.
      const parentEl = doc.querySelector(`[data-node-id="${parentAstNode.nodeId}"]`)
      if (parentEl) parentEl.appendChild(currentEl)
    } else {
      // Find next sibling
      const nextSiblingNode = parentAstNode.children[toIndex + 1]
      const nextEl = doc.querySelector(`[data-node-id="${nextSiblingNode.nodeId}"]`)
      if (nextEl) {
        nextEl.before(currentEl)
      } else {
        // Fallback if next is text node?
        // For now, assume element.
      }
    }
  }

  /** --- API PÚBLICA (Legacy / High Level) --- **/

  copy(nodeId) {
    const ctx = this.getCtx()
    const node = findNodeById(ctx.ast, nodeId)

    if (!node) return null

    return {
      type: 'html-node',
      data: node, // Guardamos a estrutura AST do nó
    }
  }

  duplicate(nodeId) {
    // Wrapper for copy + insert
    // Ideally this should use insertNodeAt to be undoable!

    const ctx = this.getCtx()
    const { parent, index } = findParentAndIndex(ctx.ast, nodeId)
    const originalNode = findNodeById(ctx.ast, nodeId)

    if (parent && originalNode) {
      const newNode = cloneAndRegenerate(originalNode, this.pipeline.generateId)

      // Use primitive!
      history.beginTransaction()
      this.insertNodeAt(parent.nodeId, index + 1, newNode)
      history.commit()

      return newNode
    }
    return null
  }

  paste(targetId, clipboardObj) {
    if (!clipboardObj || clipboardObj.type !== 'html-node') return null

    const ctx = this.getCtx()
    const targetNode = findNodeById(ctx.ast, targetId)
    if (!targetNode) return null

    const newNode = cloneAndRegenerate(clipboardObj.data, this.pipeline.generateId)

    const containers = ['div', 'td', 'section', 'body', 'main']
    const isContainer = containers.includes(targetNode.tag.toLowerCase())

    history.beginTransaction()
    if (isContainer) {
      if (!targetNode.children) targetNode.children = []
      const index = targetNode.children.length
      this.insertNodeAt(targetId, index, newNode)
    } else {
      const { parent, index } = findParentAndIndex(ctx.ast, targetId)
      if (parent) {
        this.insertNodeAt(parent.nodeId, index + 1, newNode)
      }
    }
    history.commit()

    return newNode
  }

  append(parentId, rawHTML) {
    const ctx = this.getCtx()
    const fragment = this.pipeline.parseFragment(rawHTML)
    const parent = findNodeById(ctx.ast, parentId)

    if (!parent) return null
    if (!parent.children) parent.children = []

    let lastInserted = null
    history.beginTransaction()
    fragment.forEach((node) => {
      this.insertNodeAt(parentId, parent.children.length, node)
      lastInserted = node
    })
    history.commit()

    // Retorna o último nó inserido para que o chamador possa selecioná-lo
    return lastInserted
  }

  /**
   * Insere HTML como IRMÃO, logo após o nó targetId.
   * Útil para o botão "+" do overlay: insere ao lado do elemento selecionado.
   *
   * @param {string} targetId - nodeId do elemento de referência
   * @param {string} rawHTML  - HTML a inserir
   * @returns {Object|null}   - primeiro nó inserido, ou null se falhar
   */
  insertAfter(targetId, rawHTML) {
    const ctx = this.getCtx()
    const result = findParentAndIndex(ctx.ast, targetId)
    if (!result) return null

    const { parent, index } = result
    const fragment = this.pipeline.parseFragment(rawHTML)
    if (!fragment.length) return null

    history.beginTransaction()
    // Insere cada nó a partir de index+1, preservando a ordem
    fragment.forEach((node, i) => {
      this.insertNodeAt(parent.nodeId, index + 1 + i, node)
    })
    history.commit()

    return fragment[0] // retorna o primeiro nó inserido
  }

  updateInnerContent(nodeId, newHTML) {
    // Complex because it replaces children.
    // Maybe for now we keep it legacy or wrap in transaction of removeAll + insertAll?
    // For safety, let's keep it mostly as is but without Undo support or manually implementing it?
    // Or better: Implement 'setChildren' primitive?

    // For this iteration, I'll invoke legacy logic but warn about undo.
    // Ideally:
    /*
        const oldChildren = [...node.children]
        history.beginTransaction()
        // remove all
        oldChildren.forEach((_, i) => this.removeNodeAt(nodeId, 0)) // always 0
        // insert new
        newChildren.forEach((n, i) => this.insertNodeAt(nodeId, i, n))
        history.commit()
     */

    // Applying that to be consistent:
    const ctx = this.getCtx()
    const node = findNodeById(ctx.ast, nodeId)
    if (!node) return false

    try {
      const newChildren = this.pipeline.parseFragment(newHTML)
      const assignIds = (nodes) => {
        nodes.forEach((n) => {
          if (!n.nodeId) n.nodeId = this.pipeline.generateId()
          if (n.children) assignIds(n.children)
        })
      }
      assignIds(newChildren)

      if (!node.children) node.children = []
      const oldChildrenCount = node.children.length

      history.beginTransaction()
      // Remove all existing
      for (let i = 0; i < oldChildrenCount; i++) {
        this.removeNodeAt(nodeId, 0)
      }
      // Add new
      newChildren.forEach((child, i) => {
        this.insertNodeAt(nodeId, i, child)
      })
      history.commit()

      return true
    } catch (e) {
      console.error(e)
      history.rollback()
      return false
    }
  }

  remove(nodeId) {
    const ctx = this.getCtx()
    const { parent, index } = findParentAndIndex(ctx.ast, nodeId)

    if (parent && index !== -1) {
      history.beginTransaction()
      this.removeNodeAt(parent.nodeId, index)
      history.commit()
      return true
    }
    return false
  }

  move(nodeId, direction) {
    const ctx = this.getCtx()
    const { parent, index } = findParentAndIndex(ctx.ast, nodeId)

    if (!parent || index === -1) return

    const toIndex = index + direction

    // Primitives handle validation
    history.beginTransaction()
    this.moveNodeAt(parent.nodeId, index, toIndex)
    history.commit()
  }

  getParent(nodeId) {
    const ctx = this.getCtx()
    if (!ctx || !ctx.ast) return null
    return findParentNode(ctx.ast, nodeId)
  }

  setAttribute(nodeId, name, value) {
    const ctx = this.getCtx()
    const node = findNodeById(ctx.ast, nodeId)

    if (node && node.type === 'element') {
      const oldValue = node.attrs ? node.attrs[name] : undefined

      // Update State
      if (!node.attrs) node.attrs = {}
      node.attrs[name] = value
      this._syncDom(nodeId, 'attr', name, value)

      // Record Inverse: Recursive call to setAttribute with old value?
      // YES! setAttribute is idempotent.
      history.record({
        type: 'setAttribute',
        args: [nodeId, name, oldValue],
      })
    }
  }

  setAttributes(nodeId, attrsMap) {
    history.beginTransaction()
    Object.entries(attrsMap).forEach(([key, val]) => {
      this.setAttribute(nodeId, key, val)
    })
    history.commit()
  }

  /**
   * Remove an HTML attribute from a node.
   * Fully undoable: inverse is setAttribute(nodeId, name, oldValue).
   */
  removeAttribute(nodeId, name) {
    const ctx = this.getCtx()
    const node = findNodeById(ctx.ast, nodeId)
    if (!node || node.type !== 'element' || !node.attrs) return

    const oldValue = node.attrs[name]
    delete node.attrs[name]

    const doc = this.getDoc()
    doc?.querySelector(`[data-node-id="${nodeId}"]`)?.removeAttribute(name)

    // Inverse: restore the attribute with its old value
    history.record({
      type: 'setAttribute',
      args: [nodeId, name, oldValue ?? null],
    })
  }
}
