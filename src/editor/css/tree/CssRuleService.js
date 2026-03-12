import { toRaw } from 'vue'
import { generateId } from '../../../utils/ids.js'
import { getSpecificity } from '../shared/cssUtils.js'
import { CssAstService } from '../ast/CssAstService.js'
import { safeAppend, findAndRemoveFromLogicTree, extractFromLogicTree } from '@/utils/astHelpers'
import { findParent, findOrCreateRoot, findOrCreateFile, findCssNode } from './_logicTreeHelpers.js'

/**
 * CssRuleService
 *
 * CRUD + Move + Duplicate for CSS selector rules (e.g. ".btn { ... }").
 *
 * Junior devs: if you need to add, edit, move or clone a CSS rule
 * in the Logic Tree — this is the file.
 */
export class CssRuleService {

  // ─── Create ────────────────────────────────────────────────────────────────

  /**
   * Create a new CSS rule (selector node) in the Logic Tree.
   *
   * - Without parentId: inserts at the end of the file node (default).
   * - With parentId: inserts inside an existing at-rule node (e.g. @media).
   *
   * @param {Array}       logicTree  - The Logic Tree (mutated in place)
   * @param {string}      selector   - CSS selector string
   * @param {string}      origin     - 'on_page' | 'internal' | 'external'
   * @param {string}      sourceName - Style sheet name, e.g. 'style' or 'styles.css'
   * @param {string|null} parentId   - ID of an at-rule node to insert into, or null
   * @returns {Object|null} The new logic node, or null on failure
   */
  static create(logicTree, selector, origin = 'on_page', sourceName = 'style', parentId = null) {
    const astNode = CssAstService.createNode(`${selector} {}`, 'Rule')
    if (!astNode) {
      console.error(`[CssRuleService] Failed to create AST node for selector: "${selector}"`)
      return null
    }

    const newNode = {
      id: generateId(),
      type: 'selector',
      label: selector,
      metadata: {
        origin,
        sourceName,
        astNode,
        specificity: getSpecificity(selector),
        // Nova rule fica no final do arquivo → sourceOrder maior que todas as existentes
        sourceOrder: CssRuleService._nextSourceOrder(logicTree),
      },
      children: [],
    }

    if (parentId) {
      const parentNode = findCssNode(logicTree, parentId)
      if (!parentNode || parentNode.type !== 'at-rule') {
        console.error(`[CssRuleService] parentId "${parentId}" not found or not an at-rule`)
        return null
      }
      parentNode.children.push(newNode)
      const block = toRaw(parentNode.metadata.astNode)?.block
      if (block?.children) safeAppend(block.children, astNode)
      return newNode
    }

    const root     = findOrCreateRoot(logicTree, origin)
    const fileNode = findOrCreateFile(root, sourceName, origin)
    fileNode.children.push(newNode)
    return newNode
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  /**
   * Update the selector text of an existing rule.
   *
   * @param {Array}  logicTree   - The Logic Tree
   * @param {string} ruleUid     - ID of the selector node
   * @param {string} newSelector - New CSS selector string
   * @returns {boolean}
   */
  static update(logicTree, ruleUid, newSelector) {
    const node = findCssNode(logicTree, ruleUid)
    if (!node || node.type !== 'selector') return false

    const newPrelude = CssAstService.createNode(newSelector, 'selector')
    if (!newPrelude) return false

    toRaw(node.metadata.astNode).prelude = newPrelude
    node.label = newSelector
    node.metadata.specificity = getSpecificity(newSelector)
    return true
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  /**
   * Remove a rule from the Logic Tree.
   *
   * @param {Array}  logicTree - The Logic Tree
   * @param {string} ruleUid   - ID of the selector node
   * @returns {boolean}
   */
  static delete(logicTree, ruleUid) {
    return findAndRemoveFromLogicTree(logicTree, ruleUid)
  }

  // ─── Move ──────────────────────────────────────────────────────────────────

  /**
   * Move a rule to a different parent in the Logic Tree.
   * The node keeps its ID — no data is lost.
   *
   * @param {Array}  logicTree    - The Logic Tree
   * @param {string} ruleUid      - ID of the rule to move
   * @param {string} targetParentId - ID of the destination (file or at-rule node)
   * @param {number} [index]      - Insert position; defaults to end
   * @returns {boolean}
   */
  static move(logicTree, ruleUid, targetParentId, index = -1) {
    const currentParent  = findParent(logicTree, ruleUid)
    const originalIndex  = currentParent?.children.findIndex(n => n.id === ruleUid) ?? -1
    const node           = extractFromLogicTree(logicTree, ruleUid)
    if (!node) return false

    const target = findCssNode(logicTree, targetParentId)
    if (!target) return false

    let insertAt = index
    if (insertAt >= 0 && currentParent === target && originalIndex < insertAt) insertAt -= 1

    insertAt >= 0 ? target.children.splice(insertAt, 0, node) : target.children.push(node)

    if (target.type === 'at-rule') {
      const block = toRaw(target.metadata.astNode)?.block
      if (block?.children) safeAppend(block.children, node.metadata.astNode)
    }

    node.metadata.origin     = target.metadata.origin     ?? node.metadata.origin
    node.metadata.sourceName = target.metadata.sourceName ?? node.metadata.sourceName
    return true
  }

  // ─── Duplicate ─────────────────────────────────────────────────────────────

  /**
   * Duplicate a rule. The clone gets a new ID and is inserted right after the original.
   *
   * @param {Array}  logicTree - The Logic Tree
   * @param {string} ruleUid   - ID of the rule to clone
   * @returns {Object|null} The new cloned node, or null on failure
   */
  static duplicate(logicTree, ruleUid) {
    const original = findCssNode(logicTree, ruleUid)
    if (!original) return null

    const parent = findParent(logicTree, ruleUid)
    if (!parent) return null

    const clonedAst = CssAstService.createNode(`${original.label} {}`, 'Rule')
    if (!clonedAst) return null

    const srcDecls = toRaw(original.metadata.astNode)?.block?.children
    if (srcDecls) {
      srcDecls.forEach(d => {
        const declClone = CssAstService.createNode(`${d.property}: ${d.value?.value ?? ''}`, 'declaration')
        if (declClone) safeAppend(clonedAst.block.children, declClone)
      })
    }

    const clone = {
      id: generateId(),
      type: original.type,
      label: original.label,
      metadata: {
        origin:      original.metadata.origin,
        sourceName:  original.metadata.sourceName,
        astNode:     clonedAst,
        specificity: original.metadata.specificity,
      },
      children: [],
    }

    const idx = parent.children.indexOf(original)
    parent.children.splice(idx + 1, 0, clone)
    return clone
  }

  // ─── Query ─────────────────────────────────────────────────────────────────

  /**
   * Find the first rule node matching a selector string.
   *
   * @param {Array}  logicTree - The Logic Tree
   * @param {string} selector  - Selector to search for
   * @returns {Object|null}
   */
  static findBySelector(logicTree, selector) {
    const search = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'selector' && node.label === selector) return node
        if (node.children) {
          const found = search(node.children)
          if (found) return found
        }
      }
      return null
    }
    return search(logicTree)
  }

  /**
   * Get all rule nodes belonging to a specific origin.
   *
   * @param {Array}  logicTree - The Logic Tree
   * @param {string} origin    - 'on_page' | 'internal' | 'external'
   * @returns {Array}
   */
  static findByOrigin(logicTree, origin) {
    const results = []
    const search = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'selector' && node.metadata?.origin === origin) results.push(node)
        if (node.children) search(node.children)
      }
    }
    search(logicTree)
    return results
  }

  /**
   * Encontra o maior sourceOrder existente na Logic Tree e retorna max + 1.
   * Garante que regras criadas no editor sempre apareçam como as mais recentes
   * no inspector (override correto para mesma especificidade).
   * @private
   */
  static _nextSourceOrder(logicTree) {
    let max = 0
    const search = (nodes) => {
      for (const n of nodes) {
        if (n.metadata?.sourceOrder != null) max = Math.max(max, n.metadata.sourceOrder)
        if (n.children) search(n.children)
      }
    }
    search(logicTree)
    return max + 1
  }
}
