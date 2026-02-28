import { toRaw } from 'vue'
import { generateId } from '../../../utils/ids.js'
import { CssAstService } from '../ast/CssAstService.js'
import { safeAppend, findAndRemoveFromLogicTree, extractFromLogicTree } from '@/utils/astHelpers'
import { findParent, findOrCreateRoot, findOrCreateFile, findCssNode } from './_logicTreeHelpers.js'

/**
 * CssAtRuleService
 *
 * CRUD + Move for CSS at-rules (@media, @supports, @container, @layer…).
 *
 * Junior devs: if you need to add, edit, or move a @media block
 * in the Logic Tree — this is the file.
 */
export class CssAtRuleService {

  // ─── Create ────────────────────────────────────────────────────────────────

  /**
   * Create an at-rule in the Logic Tree.
   *
   * - With ruleUid: wraps an existing rule inside the new at-rule.
   * - Without ruleUid + with parentId: empty at-rule nested inside another at-rule.
   * - Without ruleUid + without parentId: empty at-rule added to the file node.
   *
   * @param {Array}       logicTree   - The Logic Tree
   * @param {string|null} ruleUid     - ID of the selector node to wrap, or null
   * @param {string}      type        - 'media' | 'supports' | 'container' | 'layer'
   * @param {string}      [condition] - Condition string, e.g. '(min-width: 768px)'
   * @param {string}      [origin]    - 'on_page' | 'internal' | 'external'
   * @param {string}      [sourceName]- Stylesheet name
   * @param {string|null} [parentId]  - ID of a parent at-rule to nest inside, or null
   * @returns {Object|null} The new at-rule logic node, or null on failure
   */
  static create(logicTree, ruleUid, type, condition, origin = 'on_page', sourceName = 'style', parentId = null) {
    const condStr = condition ?? (type === 'media' ? '(min-width: 0px)' : 'name')

    const atRuleAst = {
      type: 'Atrule',
      name: type,
      prelude: { type: 'Raw', value: condStr },
      block: { type: 'Block', children: [] },
    }

    const atRuleNode = {
      id: generateId(),
      type: 'at-rule',
      label: `@${type} ${condStr}`,
      metadata: { astNode: atRuleAst },
      children: [],
    }

    // — Wrap mode: envolve uma rule existente ——————————————————————————————
    if (ruleUid) {
      const targetNode = findCssNode(logicTree, ruleUid)
      if (!targetNode) return null

      const parentNode = findParent(logicTree, ruleUid)
      if (!parentNode) return null

      const idx = parentNode.children.indexOf(targetNode)
      if (idx === -1) return null

      atRuleAst.block.children = [targetNode.metadata.astNode]
      atRuleNode.metadata.origin     = targetNode.metadata.origin
      atRuleNode.metadata.sourceName = targetNode.metadata.sourceName
      atRuleNode.children = [targetNode]

      parentNode.children.splice(idx, 1, atRuleNode)
      return atRuleNode
    }

    // — Empty mode ——————————————————————————————————————————————————————————
    atRuleNode.metadata.origin     = origin
    atRuleNode.metadata.sourceName = sourceName

    if (parentId) {
      const parentNode = findCssNode(logicTree, parentId)
      if (!parentNode || parentNode.type !== 'at-rule') {
        console.error(`[CssAtRuleService] parentId "${parentId}" not found or not an at-rule`)
        return null
      }
      parentNode.children.push(atRuleNode)
      const block = toRaw(parentNode.metadata.astNode)?.block
      if (block?.children) safeAppend(block.children, atRuleAst)
      return atRuleNode
    }

    const root     = findOrCreateRoot(logicTree, origin)
    const fileNode = findOrCreateFile(root, sourceName, origin)
    fileNode.children.push(atRuleNode)
    return atRuleNode
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  /**
   * Update the condition of an at-rule node.
   *
   * @param {Object} atRuleAstNode - The raw AST node (contextItem.astNode)
   * @param {string} newCondition  - New condition string
   * @returns {boolean}
   */
  static update(atRuleAstNode, newCondition) {
    const node = toRaw(atRuleAstNode)
    if (!node || node.type !== 'Atrule') return false
    node.prelude = { type: 'Raw', value: newCondition.trim() }
    return true
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  /**
   * Remove an at-rule (and all its children) from the Logic Tree.
   *
   * @param {Array}  logicTree - The Logic Tree
   * @param {string} atRuleUid - ID of the at-rule node
   * @returns {boolean}
   */
  static delete(logicTree, atRuleUid) {
    return findAndRemoveFromLogicTree(logicTree, atRuleUid)
  }

  // ─── Move ──────────────────────────────────────────────────────────────────

  /**
   * Move an at-rule (with all its children) to a different parent.
   *
   * @param {Array}  logicTree      - The Logic Tree
   * @param {string} atRuleUid      - ID of the at-rule to move
   * @param {string} targetParentId - ID of the destination node
   * @param {number} [index]        - Insert position; defaults to end
   * @returns {boolean}
   */
  static move(logicTree, atRuleUid, targetParentId, index = -1) {
    const currentParent = findParent(logicTree, atRuleUid)
    const originalIndex = currentParent?.children.findIndex(n => n.id === atRuleUid) ?? -1
    const node = extractFromLogicTree(logicTree, atRuleUid)
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
}
