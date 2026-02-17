<template>
  <div class="inspector-panel-container h-full w-full bg-[#f3f3f3] text-[#202124] font-sans text-[12px] shadow-2xl border-l border-[#d1d1d1] flex flex-col overflow-hidden z-[1000] selection:bg-blue-500/30">
    
    <InspectorHeader :activeTab="activeTab" @update:activeTab="(val) => activeTab = val" />
    
    <RuleCreationModal 
      :show="showRuleModal"
      :selector="pendingSelector"
      @close="showRuleModal = false"
      @rule-added="onRuleAddedFromModal"
    />

    <!-- Rule Creator Drawer -->
    <RuleCreator @rule-added="updateRules" />

    <!-- Empty State -->
    <InspectorEmptyState v-if="!editorStore.selectedElement" />

    <div v-else class="flex-1 overflow-y-auto font-mono leading-normal bg-white custom-scrollbar">
      <!-- STYLES TAB -->
      <StylesTab 
        v-if="activeTab === 'Styles'"
        :groups="ruleGroups"
        :activeRuleId="styleStore.activeRuleNodeId"
        :selectorNav="selectorNav"
        :hasPseudo="hasPseudo"
        @remove-attribute="removeSelectorFromElementAttribute"
        @toggle-pseudo="handlePseudoToggle"
        @create-rule="openCreateRuleModal"
        @set-rule-ref="setRuleRef"
        
        @update-at-rule="updateAtRule"
        @update-selector="updateSelector"
        @toggle-declaration="toggleDeclaration"
        @update-property="updateProperty"
        @delete-declaration="deleteDeclaration"
        @focus-value="focusValue"
        @add-property="addNewProperty"
        @wrap-at-rule="wrapInAtRule"
      />

      <!-- COMPUTED TAB -->
      <ComputedTab v-else-if="activeTab === 'Computed'" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, toRaw, nextTick, markRaw } from 'vue'

// Stores
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'

// Composables
import { useCssParser } from '@/composables/useCssParser'

// Constants
import { SELECTORS, ATTRIBUTE_TYPES, PROPERTY_PREFIXES, DOM_SELECTORS, DEFAULT_VALUES, AST_NODE_TYPES } from '@/utils/cssConstants'

// Utilities
import { safeAppend, findCssNode, findParentOfLogicNode, findAndRemoveFromLogicTree } from '@/utils/astHelpers'
import { focusPropertyValue, focusLastProperty, focusLastInlineProperty } from '@/utils/focusHelpers'

// Strategies
import { createInlineStyleStrategy } from '@/strategies/inlineStyleStrategy'
import { createAstRuleStrategy } from '@/strategies/astRuleStrategy'

// Sub-components
import InspectorHeader from './InspectorHeader.vue'
import RuleCreator from './RuleCreator.vue'
import StylesTab from './StylesTab/StylesTab.vue'
import ComputedTab from './ComputedTab/ComputedTab.vue'
import InspectorEmptyState from './InspectorEmptyState.vue'
import RuleCreationModal from './RuleCreationModal.vue'

// ============================================
// STORES & COMPOSABLES
// ============================================

const editorStore = useEditorStore()
const styleStore = useStyleStore()
const { getMatchedRules, syncAstToStyles, createNode, getSpecificity, generateId } =
  useCssParser()

// ============================================
// STATE & REFS
// ============================================

// State: rules vs ruleGroups
// - ruleGroups: Hierarchical structure with target + inherited groups (used by StylesTab)
// - rules: Flat list of ONLY the target element's rules (used by selectorNav for tabs)
// Both are needed: ruleGroups for display, rules as optimized cache for navigation
const rules = ref([])
const activeTab = ref('Styles')
const ruleGroups = ref([])
const ruleRefs = ref({}) // Map of rule.uid -> DOM Element
const activeDoc = computed(() => editorStore.selectedElement?.ownerDocument || document)

// Modal State
const showRuleModal = ref(false)
const pendingSelector = ref('')

const openCreateRuleModal = (selector) => {
  pendingSelector.value = selector
  showRuleModal.value = true
}

const onRuleAddedFromModal = (rule) => {
  console.log('🔔 onRuleAddedFromModal chamado com:', rule)
  showRuleModal.value = false
  console.log('🔄 Chamando updateRules...')
  updateRules()
  console.log('✅ updateRules concluído, ruleGroups:', ruleGroups.value)
  console.log('📊 Número de grupos:', ruleGroups.value.length)
  if (ruleGroups.value.length > 0) {
    console.log('📦 Primeiro grupo tem', ruleGroups.value[0].rules?.length, 'regras')
  }
}

// ============================================
// STRATEGIES
// ============================================

// Initialize strategies
const inlineStyleStrategy = computed(() => 
  selectedElement.value 
    ? createInlineStyleStrategy(selectedElement.value, updateRules, ruleRefs)
    : null
)

const astRuleStrategy = createAstRuleStrategy(
  styleStore,
  createNode,
  syncAstToStyles,
  activeDoc,
  updateRules,
  ruleRefs
)

/**
 * Gets the appropriate strategy for a rule
 * @param {Object} rule - The CSS rule
 * @returns {Object} The strategy object
 */
function getStrategy(rule) {
  return rule.selector === SELECTORS.INLINE_STYLE 
    ? inlineStyleStrategy.value 
    : astRuleStrategy
}

// ============================================
// RULE CREATION
// ============================================

/**
 * Internal function to add a new CSS rule (used for pseudo-class toggles)
 * @param {string|null} overrideSelector - Optional selector override
 */
function addNewRule(overrideSelector = null) {

  if (!selectedElement.value || !store.cssAst) return

  // For internal usage (like pseudo classes), we try to find a valid source to append to.
  // We can default to 'on_page'/'style' or try to find where the active rule is.
  
  // Re-implementing a simple version for internal needs (pseudo-classes)
  const selector = overrideSelector
  const logicTree = toRaw(styleStore.cssAst)
  
  // Default to on_page/style if we don't have a context
  let origin = 'on_page'
  let sourceName = 'style'
  
  // Try to use active rule's source if available
  if (activeInspectorRule.value) {
      origin = activeInspectorRule.value.origin || 'on_page'
      sourceName = activeInspectorRule.value.sourceName || 'style'
  }

  const ruleNode = createNode(`${selector} {}`, 'Rule')
  
  let root = logicTree.find(n => n.metadata.origin === origin)
  if (!root) {
      // fallback create root...
       root = { id: generateId(), type: 'root', label: origin.toUpperCase(), metadata: { origin }, children: [] }
       styleStore.cssAst.push(root)
  }
  
  let fileNode = root.children.find(n => n.label === sourceName)
  if (!fileNode) {
       fileNode = { id: generateId(), type: 'file', label: sourceName, metadata: { origin, sourceName }, children: [] }
       root.children.push(fileNode)
  }

  const newLogicNode = {
      id: generateId(),
      type: 'selector',
      label: selector,
      metadata: {
          origin,
          sourceName,
          astNode: ruleNode,
          specificity: getSpecificity(selector)
      },
      children: []
  }

  fileNode.children.unshift(newLogicNode)
  syncAstToStyles(styleStore.cssAst, activeDoc.value)
  styleStore.refreshCssAst(activeDoc.value)
  styleStore.setActiveRule(newLogicNode.id)
  updateRules()
}
/**
 * Focuses the value input field after a property name is edited
 * Handles auto-focus and text selection for better UX
 * @param {Object} rule - The CSS rule being edited
 * @param {Object} decl - The declaration being edited
 * @param {Event} e - The blur event from the property name field
 */
const focusValue = (rule, decl, e) => {
  console.log('--- focusValue START ---', { selector: rule.selector, prop: decl.prop })
  
  // Save current changes
  const newValue = e.target.innerText.trim()
  updateProperty(rule, decl, 'prop', newValue)
  
  // Wait for Vue to finish re-rendering, then focus the value field
  nextTick(() => {
    const targetContainer = ruleRefs.value[rule.uid]
    if (targetContainer) {
      const success = focusPropertyValue(targetContainer, newValue)
      if (success) {
        console.log(`Focused value for property "${newValue}"`)
      } else {
        console.warn('Failed to focus property value after re-render')
      }
    } else {
      console.warn('Rule Ref not found for focusValue', rule.uid)
    }
  })
}




// ============================================
// COMPUTED PROPERTIES
// ============================================

const selectedElement = computed(() => editorStore.selectedElement)
const cssAst = computed(() => styleStore.cssAst)
const viewport = computed(() => editorStore.viewport)

/**
 * Selector navigation data for the sticky header
 * Includes removable attributes (ID, classes) and selectable rules
 */
const selectorNav = computed(() => {
  if (!selectedElement.value) return { attributes: [], rules: [] }
  
  const el = selectedElement.value
  
  // 2. Get Matched Rules first (needed for attributes)
  const targetGroup = ruleGroups.value.find(g => g.isTarget)
  if (!targetGroup) return { attributes: [], rules: [] }
  
  const rules = targetGroup.rules
  
  // 1. Direct Attributes (Removable + Selectable)
  const attributes = []
  
  if (el.id) {
    // Find the rule that matches this ID
    const matchingRule = rules.find(r => r.selector === '#' + el.id)
    attributes.push({ 
      type: 'id', 
      value: el.id, 
      label: '#' + el.id,
      uid: matchingRule?.uid  // Add uid for selection
    })
  }
  
  Array.from(el.classList).forEach(cls => {
    // Normalized class name for CSS (escaped)
    const escapedCls = CSS.escape(cls)
    const escapedSelector = '.' + escapedCls
    
    // Find the rule that matches this class (exact or escaped)
    const matchingRule = rules.find(r => r.selector === '.' + cls || r.selector === escapedSelector)
    
    attributes.push({ 
      type: 'class', 
      value: cls, 
      label: '.' + cls,
      uid: matchingRule?.uid,
      isExactMatch: !!matchingRule,
      // Check if used in ANY rule (e.g. compound or escaped)
      isUsed: rules.some(r => r.selector.includes('.' + cls) || r.selector.includes(escapedSelector))
    })
  })

  const selectorCounts = {}
  rules.forEach(r => {
    selectorCounts[r.selector] = (selectorCounts[r.selector] || 0) + 1
  })
  
  const ruleTabs = rules.map(rule => {
    // Add source suffix if selector is duplicated
    let label = rule.selector
    if (selectorCounts[rule.selector] > 1 && rule.selector !== 'element.style') {
      label = `${rule.selector} [${rule.sourceName || 'style'}]`
    }
    
    return {
      uid: rule.uid,
      selector: rule.selector,
      label,
      source: rule.sourceName || 'style',
      origin: rule.origin,
      isInline: rule.selector === 'element.style'
    }
  })

  return { attributes, rules: ruleTabs }
})

// const activeInspectorRule = computed(...) // Logic moved to StylesTab.vue mostly, but we need it here?
// Actually we use activeInspectorRule inside hasPseudo

const activeInspectorRule = computed(() => {
  if (!styleStore.activeRuleNodeId) return null
  // Search in all groups (including inherited for viewing)
  for (const group of ruleGroups.value) {
    const found = group.rules.find(r => r.uid === styleStore.activeRuleNodeId)
    if (found) return found
  }
  return null
})

// Function to register rule element refs
const setRuleRef = (el, rule) => {
  if (el && rule.uid) {
    ruleRefs.value[rule.uid] = el.$el ? el.$el : el // Handle component ref if necessary
    // But ref callback receives the component instance if it's a component.
    // CssRule is a component.
    // We need the underlying DOM element for querySelector
    // So if 'el' is a Vue component, use 'el.$el'
  }
}

// ============================================
// CORE FUNCTION - Update Rules
// ============================================

/**
 * Main function to update rule groups based on selected element
 * Handles both normal element selection and explicit CSS rule selection from Explorer
 */
function updateRules() {
  // Handle Explicit CSS Rule Selection (From Explorer)
  if (styleStore.selectedCssRuleNodeId) {
      console.log('Explicit CSS Rule Mode:', styleStore.selectedCssRuleNodeId)
      
      const ast = toRaw(cssAst.value)
      const targetNode = findCssNode(ast, styleStore.selectedCssRuleNodeId)
      
      if (targetNode && targetNode.type === 'selector') {
          // Format as Inspector Rule
          const dectList = []
          targetNode.children.forEach((d) => {
              if (d.type === 'declaration') {
                  const propName = d.label.toLowerCase()
                  const isDisabled = propName.startsWith('--disabled-')
                  dectList.push({
                      id: d.id,
                      prop: isDisabled ? propName.replace('--disabled-', '') : propName,
                      value: d.value,
                      important: d.metadata?.astNode?.important || false,
                      disabled: isDisabled,
                      overridden: false
                  })
              }
          })

          const inspectorRule = {
              uid: targetNode.id,
              selector: targetNode.label,
              declarations: dectList,
              origin: targetNode.metadata?.origin,
              sourceName: targetNode.metadata?.sourceName,
              specificity: targetNode.metadata?.specificity || [0,0,0,0],
              context: [],
              active: true,
              loc: targetNode.metadata?.line || '?',
              astNode: targetNode.metadata?.astNode
          }

          rules.value = [inspectorRule]
          ruleGroups.value = [{
             isTarget: true,
             tagName: 'Selected Rule',
             rules: [inspectorRule]
          }]
          return
      }
  }

  if (!selectedElement.value || !cssAst.value) {
    rules.value = []
    ruleGroups.value = []
    return
  }
  // BoxModel and ComputedProperties logic moved to respective components



  console.log('--- updateRules START ---')
  console.log('📍 Elemento em updateRules:', {
    tag: selectedElement.value.tagName,
    id: selectedElement.value.id,
    classes: selectedElement.value.className
  })
  
  const groups = getMatchedRules(
    selectedElement.value,
    toRaw(cssAst.value),
    viewport.value,
    {}, // Empty forceStatus
  )
  
  console.log('📊 Grupos retornados:', groups.length)
  groups.forEach((g, i) => {
    console.log(`Grupo ${i}:`, g.isTarget ? 'TARGET' : 'INHERITED', `${g.rules.length} regras`)
    g.rules.forEach(r => {
      console.log(`  - ${r.selector} (${r.active ? 'ATIVO' : 'INATIVO'})`)
    })
  })

  ruleGroups.value = groups

  // rules.value remains a flat list of rules from the TARGET group primarily for property editing logic
  const targetGroup = groups.find((g) => g.isTarget)
  rules.value = targetGroup ? targetGroup.rules : []

  // AUTO-SELECT first rule if none active or current one lost
  if (targetGroup && targetGroup.rules.length > 0) {
    const currentActive = targetGroup.rules.find(r => r.uid === styleStore.activeRuleNodeId)
    if (!currentActive) {
      styleStore.setActiveRule(targetGroup.rules[0].uid)
    }
  } else if (!targetGroup) {
      styleStore.setActiveRule(null)
  }

  // Calculate Winners (Global across all rules for override strikes)
  // We want to see if a property in an inherited rule is overridden by a direct rule
  const winners = new Map()

  // To calculate winners correctly, we need a flat list of rules ordered by importance:
  // [Direct Specific ... Direct General ... Parent Specific ... Parent General ...]
  const flatRules = groups.flatMap((g) => g.rules)

  flatRules.forEach((rule, ruleIdx) => {
    if (!rule.active) return
    rule.declarations.forEach((decl) => {
      if (decl.disabled) return
      const key = decl.prop
      const curr = winners.get(key)

      // The first encountered (highest priority) wins, unless a later one is !important
      if (!curr || (decl.important && !curr.important)) {
        winners.set(key, { ruleUid: rule.uid, ...decl })
      }
    })
  })

  // Apply overridden status to all rules in all groups
  groups.forEach((group) => {
    group.rules.forEach((rule) => {
      rule.declarations.forEach((decl) => {
        const winner = winners.get(decl.prop)
        decl.overridden = winner && winner.ruleUid !== rule.uid
      })
    })
  })
  console.log(`Matched rules updated: ${groups.length} element groups found`)
}

// ============================================
// PROPERTY OPERATIONS
// ============================================

/**
 * Adds a new CSS property to a rule
 * Uses strategy pattern to handle inline vs AST rules
 * @param {Object} rule - The rule to add the property to
 */
function addNewProperty(rule) {
  try {
    console.log('--- addNewProperty start ---', { selector: rule.selector })
    const strategy = getStrategy(rule)
    if (strategy) {
      strategy.addProperty(rule)
    } else {
      console.error('No strategy available for rule')
    }
  } catch (err) {
    console.error('Error in addNewProperty:', err)
  }
}

/**
 * Updates a CSS property name or value
 * Uses strategy pattern to handle inline vs AST rules
 * @param {Object} rule - The rule containing the property
 * @param {Object} decl - The declaration to update
 * @param {string} field - Field to update ('prop' or 'value')
 * @param {string} newValue - The new value
 */
function updateProperty(rule, decl, field, newValue) {
  const oldValue = decl[field]
  decl[field] = newValue

  const strategy = getStrategy(rule)
  if (strategy) {
    strategy.updateProperty(decl, field, newValue, oldValue)
  }
}

// ============================================
// SELECTOR OPERATIONS
// ============================================

/**
 * Updates a rule's CSS selector
 * Cannot be used on inline styles (element.style)
 * @param {Object} rule - The rule to update
 * @param {string} newSelector - The new selector string
 */
function updateSelector(rule, newSelector) {
  if (rule.selector === 'element.style' || !rule.astNode) return
  rule.selector = newSelector

  const newPrelude = createNode(newSelector, 'SelectorList')
  if (newPrelude) {
    const node = toRaw(rule.astNode)
    node.prelude = newPrelude
    
    // Also update the logic node label if we can find it
    const logicNode = findCssNode(toRaw(styleStore.cssAst), rule.uid)
    if (logicNode) {
      logicNode.label = newSelector
      logicNode.metadata.specificity = getSpecificity(newSelector)
    }

    syncAstToStyles(styleStore.cssAst)
    styleStore.refreshCssAst(activeDoc.value)
    updateRules()
  }
}

// ============================================
// ATTRIBUTE MANAGEMENT
// ============================================

/**
 * Removes a class or ID attribute from the selected element
 * Delegates to ManipulationEngine for proper AST sync and undo/redo support
 * @param {Object} attr - Attribute object with type ('class' or 'id') and value
 */
function removeSelectorFromElementAttribute(attr) {
  if (!editorStore.selectedNodeId || !editorStore.manipulation) return
  
  if (attr.type === 'class') {
    // Get current classes and filter out the one to remove
    const el = selectedElement.value
    if (!el) return
    
    const currentClasses = el.className.split(' ').filter(c => c.trim())
    const newClasses = currentClasses.filter(c => c !== attr.value).join(' ')
    
    // Delegate to ManipulationEngine (handles AST + DOM + undo/redo)
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'class', newClasses)
    console.log(`Class "${attr.value}" removed from element`)
  } else if (attr.type === 'id') {
    // Remove ID by setting it to empty string
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'id', '')
    console.log(`ID "${attr.value}" removed from element`)
  }
  
  // Refresh inspector to reflect changes
  updateRules()
}

// ============================================
// AT-RULE OPERATIONS
// ============================================

/**
 * Updates an at-rule's condition (e.g., media query)
 * @param {Object} rule - The CSS rule containing the at-rule
 * @param {Object} contextItem - The at-rule context item
 * @param {string} newCond - The new condition value
 */
function updateAtRule(rule, contextItem, newCond) {
  if (!contextItem || !contextItem.astNode) return
  const ast = toRaw(store.cssAst)
  const node = toRaw(contextItem.astNode)

  if (node.type === 'Atrule') {
    // Basic update for Raw types, might need more complex parsing for structured preludes
    // For now assuming we can set it as Raw value
    const generated = newCond.trim()
    // Strip parens if user added them but we displayed them?
    // Using simple replacement for now
    node.prelude = { type: 'Raw', value: generated }

    syncAstToStyles(ast, activeDoc.value)
    updateRules()
  }
}

/**
 * Wraps a CSS rule in an at-rule (e.g., @media, @supports)
 * @param {Object} rule - The rule to wrap
 * @param {string} type - The at-rule type ('media', 'supports', etc.)
 */
function wrapInAtRule(rule, type) {
  console.log('wrapInAtRule clicked', { ruleSelector: rule.selector, type })
  if (!rule.astNode || !styleStore.cssAst) return
  
  const logicTree = toRaw(styleStore.cssAst)
  
  const parentLogicNode = findParentOfLogicNode(logicTree, rule.uid)
  if (!parentLogicNode) {
    console.error('Could not find parent logic node for rule to wrap')
    return
  }

  const targetLogicNode = parentLogicNode.children.find(n => n.id === rule.uid)
  const idx = parentLogicNode.children.indexOf(targetLogicNode)

  if (idx !== -1) {
    // Create new AtRule CSS node
    const atRuleAst = {
      type: 'Atrule',
      name: type,
      prelude: { type: 'Raw', value: type === 'media' ? '(min-width: 0px)' : 'name' },
      block: {
        type: 'Block',
        children: [rule.astNode]
      }
    }

    // Create new AtRule Logic Node
    const atRuleLogicNode = {
      id: generateId(),
      type: 'at-rule',
      label: `@${type} ${atRuleAst.prelude.value}`,
      metadata: { 
        origin: targetLogicNode.metadata.origin,
        sourceName: targetLogicNode.metadata.sourceName,
        astNode: atRuleAst 
      },
      children: [targetLogicNode]
    }

    // Replace in parent
    parentLogicNode.children.splice(idx, 1, atRuleLogicNode)

    syncAstToStyles(styleStore.cssAst, activeDoc.value)
    styleStore.refreshCssAst(activeDoc.value)
    updateRules()
  }
}

// ============================================
// DECLARATION OPERATIONS
// ============================================

/**
 * Deletes a CSS declaration from a rule
 * Uses strategy pattern to handle inline vs AST rules
 * @param {Object} rule - The rule containing the declaration
 * @param {Object} decl - The declaration to delete
 */
function deleteDeclaration(rule, decl) {
  console.log('Deleting declaration:', decl.prop)
  const strategy = getStrategy(rule)
  if (strategy) {
    strategy.deleteProperty(rule, decl)
  }
}

/**
 * Toggles a CSS declaration between enabled and disabled states
 * Uses strategy pattern to handle inline vs AST rules
 * @param {Object} rule - The rule containing the declaration
 * @param {Object} decl - The declaration to toggle
 */
function toggleDeclaration(rule, decl) {
  decl.disabled = !decl.disabled
  console.log('Toggling property:', decl.prop, 'New state disabled:', decl.disabled)
  
  const strategy = getStrategy(rule)
  if (strategy) {
    strategy.toggleProperty(rule, decl)
  }
  updateRules()
}

// ============================================
// ELEMENT OBSERVER
// ============================================

// Monitora mudanças no elemento selecionado para atualização em tempo real
const observer = new MutationObserver(updateRules)
watch(
  selectedElement,
  (newEl, oldEl) => {
    if (oldEl) observer.disconnect()
    if (newEl) {
      observer.observe(newEl, { attributes: true, attributeFilter: ['style', 'class', 'id'] })
      // Always reset to element.style or first rule when element changes
      styleStore.activeRuleNodeId = null 
      updateRules()
    }
  },
  { immediate: true },
)

/**
 * Deletes an entire CSS rule from the logic tree
 * Cannot delete inline styles (element.style)
 * @param {Object} rule - The rule to delete
 */
function deleteRule(rule) {
  console.log('=== deleteRule START ===', rule.selector)
  if (!styleStore.cssAst || !rule.uid) return
  if (rule.selector === 'element.style') return

  const logicTree = toRaw(styleStore.cssAst)
  
  if (findAndRemoveFromLogicTree(logicTree, rule.uid)) {
    syncAstToStyles(styleStore.cssAst, activeDoc.value)
    styleStore.refreshCssAst(activeDoc.value)
    updateRules()
    console.log('Rule deleted from Logic Tree')
  }
}

// ============================================
// PSEUDO-CLASS MANAGEMENT
// ============================================

/**
 * Checks if a pseudo-class rule exists for the active rule
 * @param {string} state - The pseudo-class state (e.g., 'hover', 'focus')
 * @returns {boolean} True if the pseudo-class rule exists
 */
const hasPseudo = (state) => {
  if (!activeInspectorRule.value) return false
  const baseSelector = activeInspectorRule.value.selector.split(':')[0]
  const targetSelector = `${baseSelector}:${state}`
  
  // Look in the same file/source for this pseudo seletor
  const targetGroup = ruleGroups.value.find(g => g.isTarget)
  return targetGroup?.rules.some(r => r.selector === targetSelector)
}

const handlePseudoToggle = (state) => {
  if (!activeInspectorRule.value) return
  const baseSelector = activeInspectorRule.value.selector.split(':')[0]
  const targetSelector = `${baseSelector}:${state}`
  
  const targetGroup = ruleGroups.value.find(g => g.isTarget)
  const existing = targetGroup?.rules.find(r => r.selector === targetSelector)
  
  if (existing) {
    styleStore.setActiveRule(existing.uid)
  } else {
    addNewRule(targetSelector)
  }
}

watch([cssAst, viewport], updateRules)
</script>

<style scoped>
.inspector-panel-container {
  scrollbar-gutter: stable;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
</style>
