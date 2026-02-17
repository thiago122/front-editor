/**
 * AST Rule Strategy
 * Handles CSS property operations for AST-based rules
 */

import { toRaw } from 'vue'
import { safeAppend } from '@/utils/astHelpers'
import { focusLastProperty } from '@/utils/focusHelpers'

/**
 * Creates the AST rule strategy
 * @param {Object} styleStore - The Pinia style store
 * @param {Function} createNodeFn - Function to create AST nodes
 * @param {Function} syncAstToStylesFn - Function to sync AST to DOM
 * @param {Document} activeDoc - The active document
 * @param {Function} updateRulesFn - Callback to refresh the inspector UI
 * @param {Object} ruleRefs - Vue refs map for auto-focus
 * @returns {Object} Strategy object with property operation methods
 */
export function createAstRuleStrategy(
  styleStore,
  createNodeFn,
  syncAstToStylesFn,
  activeDoc,
  updateRulesFn,
  ruleRefs
) {
  return {
    /**
     * Adds a new property to an AST rule
     * @param {Object} rule - The rule to add the property to
     */
    addProperty(rule) {
      if (!rule.astNode || !rule.astNode.block) {
        console.error('AstStrategy: Cannot add property - missing astNode or block')
        return
      }

      const block = toRaw(rule.astNode.block)
      const children = block.children
      const countBefore = children.toArray ? children.toArray().length : children.length
      console.log('AstStrategy: Decls before:', countBefore)

      const newDeclNode = createNodeFn('property: value', 'declaration')
      if (newDeclNode) {
        safeAppend(children, newDeclNode, false)
        syncAstToStylesFn(styleStore.cssAst, activeDoc)
        updateRulesFn()

        // Auto-focus the newly added property
        if (ruleRefs) {
          const el = ruleRefs.value[rule.uid]
          if (el) {
            focusLastProperty(el)
          }
        }

        console.log('AST sync and rules update called')
      }
    },

    /**
     * Updates a property name or value in an AST rule
     * @param {Object} decl - The declaration object
     * @param {string} field - 'prop' or 'value'
     * @param {string} newValue - The new value
     */
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

      syncAstToStylesFn(styleStore.cssAst, activeDoc)
      styleStore.refreshCssAst(activeDoc)
      updateRulesFn()
    },

    /**
     * Deletes a property from an AST rule
     * @param {Object} rule - The rule containing the property
     * @param {Object} decl - The declaration to delete
     */
    deleteProperty(rule, decl) {
      if (!styleStore.cssAst || !rule.astNode || !decl.astNode) {
        console.error('AstStrategy: Cannot delete property - missing AST nodes')
        return
      }

      const ast = toRaw(styleStore.cssAst)
      const ruleNode = toRaw(rule.astNode)
      const declNode = toRaw(decl.astNode)

      if (ruleNode.block && ruleNode.block.children) {
        const list = ruleNode.block.children

        // Find and remove the declaration node from the list
        if (list.head) {
          // css-tree List type
          let item = list.head
          while (item) {
            if (item.data === declNode) {
              list.remove(item)
              console.log('✓ Declaration removed from AST')
              syncAstToStylesFn(ast, activeDoc)
              updateRulesFn()
              return
            }
            item = item.next
          }
        } else if (Array.isArray(list)) {
          // Array type
          const idx = list.indexOf(declNode)
          if (idx !== -1) {
            list.splice(idx, 1)
            console.log('✓ Declaration removed from Array AST')
            syncAstToStylesFn(ast, activeDoc)
            updateRulesFn()
            return
          }
        }
      }

      console.error('Failed to remove declaration from AST')
    },

    /**
     * Toggles a property between enabled and disabled states
     * @param {Object} rule - The rule containing the property
     * @param {Object} decl - The declaration to toggle
     */
    toggleProperty(rule, decl) {
      if (!decl.astNode || !rule.astNode) {
        console.error('AstStrategy: Cannot toggle property - missing AST nodes')
        return
      }

      const ast = toRaw(styleStore.cssAst)
      const declNode = toRaw(decl.astNode)

      if (decl.disabled) {
        if (!declNode.property.startsWith('--disabled-')) {
          declNode.property = '--disabled-' + declNode.property
        }
      } else {
        declNode.property = declNode.property.replace('--disabled-', '')
      }

      syncAstToStylesFn(ast, activeDoc)
    }
  }
}
