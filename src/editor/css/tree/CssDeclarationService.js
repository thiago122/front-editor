import { toRaw } from 'vue'
import { CssAstService } from '../ast/CssAstService.js'
import { safeAppend, safeRemove } from '@/utils/astHelpers'
import { findCssNode } from './_logicTreeHelpers.js'
import { generateId } from '@/utils/ids.js'
import { generate } from 'css-tree'

/**
 * CssDeclarationService
 *
 * CRUD + Move + Duplicate for CSS declarations (properties inside a rule).
 * e.g.  color: red;  →  { prop: 'color', value: 'red' }
 *
 * Junior devs: if you need to add, edit, toggle, or move a CSS property
 * inside a rule — this is the file.
 */
export class CssDeclarationService {

  // ─── Create ────────────────────────────────────────────────────────────────

  /**
   * Add a declaration to a rule's AST block.
   *
   * - Without prop/value: creates a 'property: value' placeholder.
   * - With prop/value: creates the declaration already filled in.
   *
   * @param {Object}      rule   - Inspector rule object (with astNode)
   * @param {string|null} [prop] - Property name, e.g. 'color'
   * @param {string|null} [val]  - Property value, e.g. 'red'
   * @returns {boolean}
   */
  static create(rule, prop = null, val = null) {
    if (!rule.astNode?.block) {
      console.error('[CssDeclarationService] create: missing astNode or block')
      return false
    }

    const declStr     = (prop && val) ? `${prop}: ${val}` : 'property: value'
    const newDeclNode = CssAstService.createNode(declStr, 'declaration')
    if (!newDeclNode) return false

    // 1. Adiciona ao AST css-tree
    safeAppend(toRaw(rule.astNode.block).children, newDeclNode, false)

    // 2. Cria o nó correspondente na Logic Tree para que syncToDOM não perca o nó novo
    if (rule.logicNode) {
      const logicDecl = {
        id:       generateId(),
        type:     'declaration',
        label:    newDeclNode.property,
        value:    generate(newDeclNode.value),
        metadata: { astNode: newDeclNode },
        children: [],
      }
      rule.logicNode.children.push(logicDecl)
      return logicDecl
    }

    return true
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  /**
   * Update a declaration's property name or value in the AST.
   *
   * @param {Object} decl     - Declaration object (with astNode)
   * @param {string} field    - 'prop' | 'value'
   * @param {string} newValue - New value string
   * @returns {boolean}
   */
  static update(decl, field, newValue) {
    if (!decl.astNode) {
      console.error('[CssDeclarationService] update: missing astNode')
      return false
    }

    const node = toRaw(decl.astNode)
    if (field === 'prop') {
      const wasDisabled = node.property.startsWith('--disabled-')
      node.property = wasDisabled ? '--disabled-' + newValue : newValue
      // Sincroniza o nó da Logic Tree (usado por _extractDeclarations para reconstruir o inspector)
      if (decl.logicNode) decl.logicNode.label = wasDisabled ? '--disabled-' + newValue : newValue
    } else if (field === 'value') {
      const isImportant = /\s*!important\s*$/i.test(newValue)
      const cleanValue  = newValue.replace(/\s*!important\s*$/i, '').trim()
      node.value    = { type: 'Raw', value: cleanValue }
      node.important = isImportant
      // Sincroniza o nó da Logic Tree
      if (decl.logicNode) decl.logicNode.value = cleanValue
    }
    return true
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  /**
   * Remove a declaration from a rule's AST block.
   *
   * @param {Object} rule - Inspector rule object (with astNode)
   * @param {Object} decl - Declaration object (with astNode)
   * @returns {boolean}
   */
  static delete(rule, decl) {
    if (!rule.astNode || !decl.astNode) {
      console.error('[CssDeclarationService] delete: missing AST nodes')
      return false
    }

    const list    = toRaw(rule.astNode).block?.children
    const removed = safeRemove(list, toRaw(decl.astNode))

    if (!removed) console.error('[CssDeclarationService] delete: node not found in block')
    return removed
  }

  // ─── Toggle ────────────────────────────────────────────────────────────────

  /**
   * Toggle a declaration between enabled and disabled.
   * Disabled declarations are prefixed with '--disabled-' in the AST.
   *
   * @param {Object} decl - Declaration object (with astNode and disabled flag)
   * @returns {boolean}
   */
  static toggle(decl) {
    if (!decl.astNode) {
      console.error('[CssDeclarationService] toggle: missing astNode')
      return false
    }

    const node = toRaw(decl.astNode)
    if (decl.disabled) {
      if (!node.property.startsWith('--disabled-')) node.property = '--disabled-' + node.property
      // Sincroniza o nó da Logic Tree para que _extractDeclarations leia disabled: true na próxima reconstrução
      if (decl.logicNode && !decl.logicNode.label.startsWith('--disabled-')) {
        decl.logicNode.label = '--disabled-' + decl.logicNode.label
      }
    } else {
      node.property = node.property.replace('--disabled-', '')
      // Sincroniza o nó da Logic Tree (remove o prefixo)
      if (decl.logicNode) decl.logicNode.label = decl.logicNode.label.replace('--disabled-', '')
    }
    return true
  }

  // ─── Move ──────────────────────────────────────────────────────────────────

  /**
   * Move a declaration from one rule to another.
   * The AST node is also moved between the respective rule blocks.
   *
   * @param {Object} sourceRule - Inspector rule that currently owns the declaration
   * @param {Object} decl       - The declaration to move
   * @param {Object} targetRule - Inspector rule that will receive the declaration
   * @param {number} [index]    - Insert position in target; defaults to end
   * @returns {boolean}
   */
  static move(sourceRule, decl, targetRule, index = -1) {
    if (!sourceRule.astNode || !targetRule.astNode || !decl.astNode) return false

    const sourceList    = toRaw(sourceRule.astNode).block?.children
    const declAst       = toRaw(decl.astNode)
    const originalIndex = sourceList ? [...sourceList].indexOf(declAst) : -1
    const removed       = safeRemove(sourceList, declAst)
    if (!removed) return false

    const targetBlock = toRaw(targetRule.astNode).block
    if (!targetBlock?.children) return false

    let insertAt = index
    if (insertAt >= 0 && sourceRule === targetRule && originalIndex < insertAt) insertAt -= 1

    safeAppend(targetBlock.children, declAst, false, insertAt)
    return true
  }

  // ─── Duplicate ─────────────────────────────────────────────────────────────

  /**
   * Duplicate a declaration inside the same rule.
   * The clone is inserted immediately after the original.
   *
   * @param {Object} rule - Inspector rule object
   * @param {Object} decl - Declaration to clone
   * @returns {boolean}
   */
  static duplicate(rule, decl) {
    if (!rule.astNode?.block || !decl.astNode) return false

    const declAst   = toRaw(decl.astNode)
    const propStr   = `${declAst.property}: ${declAst.value?.value ?? ''}`
    const clonedAst = CssAstService.createNode(propStr, 'declaration')
    if (!clonedAst) return false

    const block = toRaw(rule.astNode.block)
    const list  = block.children
    const idx   = [...list].indexOf(declAst)

    safeAppend(list, clonedAst, false, idx + 1)
    return true
  }

  // ─── Query ─────────────────────────────────────────────────────────────────

  /**
   * Find the first declaration matching a CSS property name inside a rule.
   *
   * @param {Object} rule     - Inspector rule object (with astNode)
   * @param {string} property - Property name, e.g. 'color'
   * @returns {Object|null} The AST declaration node, or null
   */
  static findByProperty(rule, property) {
    const block = toRaw(rule.astNode)?.block
    if (!block?.children) return null
    for (const decl of block.children) {
      if (decl.type === 'Declaration' && decl.property === property) return decl
    }
    return null
  }
}
