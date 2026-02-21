/**
 * AST Rule Strategy
 * Handles CSS property operations for AST-based rules (non-inline).
 *
 * Design decisions:
 * - Mutates astNode in-place only. Does NOT sync to DOM.
 * - The caller (InspectorController) is responsible for calling _syncLight()
 *   or _syncFull() after each operation.
 * - This removes the circular dependency and double-sync issue.
 */

import { toRaw } from 'vue'
import { safeAppend, safeRemove } from '@/utils/astHelpers'
import { focusLastProperty } from '@/utils/focusHelpers'
import { CssAstService } from '@/composables/CssAstService'
import { validateStrategy } from './CssRuleStrategy'

/**
 * @param {import('vue').Ref<Object>} ruleRefs - Ref map of rule.uid → DOM element
 */
export function createAstRuleStrategy(ruleRefs) {
  const strategy = {
    addProperty(rule) {
      if (!rule.astNode?.block) {
        console.error('AstStrategy: Cannot add property — missing astNode or block')
        return
      }

      const newDeclNode = CssAstService.createNode('property: value', 'declaration')
      if (!newDeclNode) return

      safeAppend(toRaw(rule.astNode.block).children, newDeclNode, false)

      const el = ruleRefs?.value?.[rule.uid]
      if (el) focusLastProperty(el)
    },

    updateProperty(decl, field, newValue) {
      if (!decl.astNode) {
        console.error('AstStrategy: Cannot update property — missing astNode')
        return
      }

      const node = toRaw(decl.astNode)
      if (field === 'prop') {
        const wasDisabled = node.property.startsWith('--disabled-')
        node.property = wasDisabled ? '--disabled-' + newValue : newValue
      } else if (field === 'value') {
        node.value = { type: 'Raw', value: newValue }
      }
    },

    deleteProperty(rule, decl) {
      if (!rule.astNode || !decl.astNode) {
        console.error('AstStrategy: Cannot delete property — missing AST nodes')
        return
      }

      const list = toRaw(rule.astNode).block?.children
      const removed = safeRemove(list, toRaw(decl.astNode))

      if (!removed) {
        console.error('AstStrategy: Failed to remove declaration from AST')
      }
    },

    toggleProperty(rule, decl) {
      if (!decl.astNode || !rule.astNode) {
        console.error('AstStrategy: Cannot toggle property — missing AST nodes')
        return
      }

      const declNode = toRaw(decl.astNode)
      if (decl.disabled) {
        if (!declNode.property.startsWith('--disabled-')) {
          declNode.property = '--disabled-' + declNode.property
        }
      } else {
        declNode.property = declNode.property.replace('--disabled-', '')
      }
    },
  }

  validateStrategy(strategy, 'astRuleStrategy')
  return strategy
}
