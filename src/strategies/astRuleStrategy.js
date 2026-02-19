/**
 * AST Rule Strategy
 * Handles CSS property operations for AST-based rules.
 * Uses CssLogicTreeService.syncToDOM directly — no callback needed.
 */

import { toRaw } from 'vue'
import { safeAppend, safeRemove } from '@/utils/astHelpers'
import { focusLastProperty } from '@/utils/focusHelpers'
import { CssAstService } from '@/composables/CssAstService'
import { CssLogicTreeService } from '@/composables/CssLogicTreeService'
import { validateStrategy } from './CssRuleStrategy'

/**
 * Creates the AST rule strategy
 * @param {Object} styleStore - The Pinia style store
 * @param {Document} activeDoc - The active document
 * @param {Function} updateRulesFn - Callback to refresh the inspector UI
 * @param {Object} ruleRefs - Vue refs map for auto-focus
 * @returns {Object} Strategy object with property operation methods
 */
export function createAstRuleStrategy(
  styleStore,
  activeDoc,
  updateRulesFn,
  ruleRefs
) {
  const strategy = {
    addProperty(rule) {
      if (!rule.astNode || !rule.astNode.block) {
        console.error('AstStrategy: Cannot add property - missing astNode or block')
        return
      }

      const block = toRaw(rule.astNode.block)
      const children = block.children

      const newDeclNode = CssAstService.createNode('property: value', 'declaration')
      if (newDeclNode) {
        safeAppend(children, newDeclNode, false)
        CssLogicTreeService.syncToDOM(styleStore.cssLogicTree, activeDoc)
        updateRulesFn()

        if (ruleRefs) {
          const el = ruleRefs.value[rule.uid]
          if (el) focusLastProperty(el)
        }
      }
    },

    updateProperty(decl, field, newValue) {
      if (!decl.astNode) {
        console.error('AstStrategy: Cannot update property - missing astNode')
        return
      }

      const node = toRaw(decl.astNode)

      if (field === 'prop') {
        const wasDisabled = node.property.startsWith('--disabled-')
        node.property = wasDisabled ? '--disabled-' + newValue : newValue
      } else if (field === 'value') {
        node.value = { type: 'Raw', value: newValue }
      }

      CssLogicTreeService.syncToDOM(styleStore.cssLogicTree, activeDoc)
      styleStore.refreshCssAst(activeDoc)
      updateRulesFn()
    },

    deleteProperty(rule, decl) {
      if (!styleStore.cssLogicTree || !rule.astNode || !decl.astNode) {
        console.error('AstStrategy: Cannot delete property - missing AST nodes')
        return
      }

      const list = toRaw(rule.astNode).block?.children
      const removed = safeRemove(list, toRaw(decl.astNode))

      if (removed) {
        CssLogicTreeService.syncToDOM(toRaw(styleStore.cssLogicTree), activeDoc)
        updateRulesFn()
      } else {
        console.error('AstStrategy: Failed to remove declaration from AST')
      }
    },

    toggleProperty(rule, decl) {
      if (!decl.astNode || !rule.astNode) {
        console.error('AstStrategy: Cannot toggle property - missing AST nodes')
        return
      }

      const ast = toRaw(styleStore.cssLogicTree)
      const declNode = toRaw(decl.astNode)

      if (decl.disabled) {
        if (!declNode.property.startsWith('--disabled-')) {
          declNode.property = '--disabled-' + declNode.property
        }
      } else {
        declNode.property = declNode.property.replace('--disabled-', '')
      }

      CssLogicTreeService.syncToDOM(ast, activeDoc)
    }
  }

  validateStrategy(strategy, 'astRuleStrategy')
  return strategy
}
