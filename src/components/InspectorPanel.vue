<script setup>
import { ref, watch, computed, toRaw, nextTick, markRaw } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { useCssParser } from '@/composables/useCssParser'

const store = useEditorStore()
const styleStore = useStyleStore()
const { extractCssAst, getMatchedRules, syncAstToStyles, isColor, createNode, generate, getSpecificity, generateId } =
  useCssParser()

const rules = ref([])
const activeTab = ref('Styles')
const searchQuery = ref('')
const showForceState = ref(false)
const forceStatus = ref({
  hover: false,
  active: false,
  focus: false,
  visited: false,
  'focus-within': false,
  'focus-visible': false,
  target: false,
})
const showClassManager = ref(false)
const newClassName = ref('')
const showCustomSelector = ref(false)
const customSelector = ref('')
const elementClasses = ref([])
const computedProperties = ref([])
const ignoredClasses = ['is-hovered-sync']

// Active CSS Source Selection
const availableSources = computed(() => {
  if (!styleStore.cssAst) return [{ origin: 'on_page', name: 'style' }]
  const sources = []
  
  // Always ensure on_page style exists for new rules
  sources.push({ origin: 'on_page', name: 'style' })

  styleStore.cssAst.forEach(root => {
    if (root.metadata.origin === 'external') return // Cannot add rules to external
    root.children.forEach(file => {
      if (root.metadata.origin === 'on_page' && file.label === 'style') return // Already added
      sources.push({ origin: root.metadata.origin, name: file.label })
    })
  })
  
  // deduplicate
  const seen = new Set()
  return sources.filter(s => {
    const key = `${s.origin}:${s.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const selectedSource = ref(null)

const suggestedSelectors = computed(() => {
  if (!selectedElement.value) return []
  const suggestions = []
  const el = selectedElement.value
  
  // Tag
  suggestions.push({ type: 'tag', label: el.tagName.toLowerCase(), value: el.tagName.toLowerCase() })

  // ID
  if (el.id) {
    suggestions.push({ type: 'id', label: '#' + el.id, value: '#' + el.id })
  }

  // Classes
  Array.from(el.classList)
    .filter(c => !ignoredClasses.includes(c))
    .forEach(c => {
      suggestions.push({ type: 'class', label: '.' + c, value: '.' + c })
    })

  return suggestions
})

// Initialize selectedSource
watch(availableSources, (sources) => {
  if (!selectedSource.value && sources.length > 0) {
    selectedSource.value = sources[0]
  }
}, { immediate: true })

const activeDoc = computed(() => store.selectedElement?.ownerDocument || document)

const nodesMatch = (nodeA, nodeB) => {
  if (!nodeA || !nodeB) return false
  const rA = toRaw(nodeA)
  const rB = toRaw(nodeB)
  if (rA === rB) return true
  // Robust match using our unique internal ID assigned during parsing
  if (rA._nodeId && rB._nodeId) {
    return rA._nodeId === rB._nodeId
  }
  // Fallback to type and location + source (much stricter than before)
  if (rA.type === rB.type && rA.loc && rB.loc && rA.sourceName === rB.sourceName) {
    return rA.loc.start.line === rB.loc.start.line && rA.loc.start.column === rB.loc.start.column
  }
  return false
}

function safeAppend(list, data, prepend = false) {
  if (!list) return
  try {
    if (list.prepend && list.append) {
      if (prepend) list.prepend(list.createItem(data))
      else list.append(list.createItem(data))
      return
    }

    if (list.prependData && list.appendData) {
      if (prepend) list.prependData(data)
      else list.appendData(data)
    } else if (list.insertData) {
      list.insertData(data)
    } else if (Array.isArray(list)) {
      if (prepend) list.unshift(data)
      else list.push(data)
    } else {
      console.warn('Unknown list type in safeAppend:', list)
    }
  } catch (e) {
    console.error('Error in safeAppend:', e)
  }
}

function addNewRule(overrideSelector = null) {
  console.log('addNewRule clicked', { overrideSelector, selectedSource: selectedSource.value })
  if (!selectedElement.value || !store.cssAst) return
  
  const selector =
    overrideSelector ||
    selectedElement.value.tagName.toLowerCase() +
    (selectedElement.value.id ? '#' + selectedElement.value.id : '')

  const ruleNode = createNode(`${selector} {}`, 'Rule')
  if (ruleNode) {
    const origin = selectedSource.value?.origin || 'on_page'
    const sourceName = selectedSource.value?.name || (origin === 'on_page' ? 'style' : 'styles.css')

    // Find the file node in the Logic Tree to append to
    const logicTree = toRaw(styleStore.cssAst)
    let root = logicTree.find(n => n.metadata.origin === origin)
    
    // If root doesn't exist (unlikely if source is in selector), create it?
    // Actually availableSources ensures it exists or it's 'on_page'
    if (!root) {
       root = {
           id: generateId(),
           type: 'root',
           label: origin.toUpperCase(),
           metadata: { origin },
           children: []
       }
       styleStore.cssAst.push(root)
    }

    let fileNode = root.children.find(n => n.label === sourceName)
    if (!fileNode) {
       fileNode = {
           id: generateId(),
           type: 'file',
           label: sourceName,
           metadata: { origin, sourceName },
           children: []
       }
       root.children.push(fileNode)
    }

    // Create the Logic Node for the new rule
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

    // Add to Logic Tree
    fileNode.children.unshift(newLogicNode) // Prepend for visibility

    // Sync and Refresh
    syncAstToStyles(styleStore.cssAst, activeDoc.value)
    styleStore.refreshCssAst(activeDoc.value)
    styleStore.setActiveRule(newLogicNode.id)
    updateRules()
    console.log('Rule added to Logic Tree', newLogicNode)
  }
}


const isEditable = (rule, group = null) => {
  if (!rule) return false
  // If a group is provided, it MUST be the target group
  if (group && !group.isTarget) return false
  
  if (rule.selector === 'element.style') return true
  return rule.origin !== 'external'
}

const getOriginLabel = (rule) => {
  if (rule.selector === 'element.style') return 'inline'
  const origin = rule.origin || 'internal'
  const map = {
    external: 'external',
    internal: rule.sourceName || 'style',
    on_page: 'header',
    inline: 'inline',
  }
  return map[origin] || origin
}

const focusValue = (rule, decl, e) => {
  console.log('--- focusValue START ---', { selector: rule.selector, prop: decl.prop })
  
  // Save current changes
  const newValue = e.target.innerText.trim()
  updateProperty(rule, decl, 'prop', newValue)
  
  // Wait for Vue to finish re-rendering
  nextTick(() => {
    // Robust lookup using Vue Refs (works for both inline and regular rules)
    const targetContainer = ruleRefs.value[rule.uid]
 
    if (targetContainer) {
      // Find the property span that matches the new name (or its disabled version)
      const props = targetContainer.querySelectorAll('.prop-name')
      for (const p of props) {
        const text = p.innerText.trim()
        if (text === newValue || text === '--disabled-' + newValue) {
          const item = p.closest('.group/item')
          const valueSpan = item?.querySelector('.prop-value')
          if (valueSpan) {
            console.log(`Focusing value for property "${text}"`)
            valueSpan.focus()
            const range = document.createRange()
            range.selectNodeContents(valueSpan)
            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(range)
            return
          }
        }
      }
    } else {
       console.warn('Rule Ref not found for focusValue', rule.uid)
    }
    console.warn('Failed to recover focus target after re-render')
  })

}

const boxModel = ref({
  margin: { top: '-', right: '-', bottom: '-', left: '-' },
  border: { top: '-', right: '-', bottom: '-', left: '-' },
  padding: { top: '-', right: '-', bottom: '-', left: '-' },
  content: { width: '-', height: '-' },
})

const selectedElement = computed(() => store.selectedElement)
const cssAst = computed(() => styleStore.cssAst)
const viewport = computed(() => store.viewport)

function compareSpecificity(a, b) {
  for (let i = 0; i < 4; i++) {
    if (a[i] !== b[i]) return b[i] - a[i]
  }
  return 0
}

function updateBoxModel() {
  if (!selectedElement.value) return
  const style = window.getComputedStyle(selectedElement.value)
  const getVal = (prop) => Math.round(parseFloat(style.getPropertyValue(prop))) || '-'

  boxModel.value = {
    margin: {
      top: getVal('margin-top'),
      right: getVal('margin-right'),
      bottom: getVal('margin-bottom'),
      left: getVal('margin-left'),
    },
    border: {
      top: getVal('border-top-width'),
      right: getVal('border-right-width'),
      bottom: getVal('border-bottom-width'),
      left: getVal('border-left-width'),
    },
    padding: {
      top: getVal('padding-top'),
      right: getVal('padding-right'),
      bottom: getVal('padding-bottom'),
      left: getVal('padding-left'),
    },
    content: {
      width: getVal('width'),
      height: getVal('height'),
    },
  }
}

function updateComputedProperties() {
  if (!selectedElement.value) return
  const style = window.getComputedStyle(selectedElement.value)
  const props = []
  for (let i = 0; i < style.length; i++) {
    const prop = style[i]
    props.push({
      name: prop,
      value: style.getPropertyValue(prop),
    })
  }
  computedProperties.value = props.sort((a, b) => a.name.localeCompare(b.name))
}

function refreshAll() {
  console.log('Force Refresh: Re-extracting AST and updating rules...')
  try {
    const ast = extractCssAst(activeDoc.value)
    styleStore.cssAst = markRaw(ast)
    updateRules()
  } catch (err) {
    console.error('Failed to refresh AST:', err)
  }
}

const ruleGroups = ref([])
const expandedGroups = ref(new Set())
const ruleRefs = ref({}) // Map of rule.uid -> DOM Element

// --- COMPUTED: Selector Tabs ---
const selectorTabs = computed(() => {
  // We only show tabs for the TARGET element (not inherited)
  const targetGroup = ruleGroups.value.find(g => g.isTarget)
  if (!targetGroup) return []
  
  const rules = targetGroup.rules
  const selectorCounts = {}
  rules.forEach(r => {
    selectorCounts[r.selector] = (selectorCounts[r.selector] || 0) + 1
  })
  
  return rules.map(rule => {
    const isId = rule.selector.includes('#')
    const isClass = rule.selector.includes('.')
    const isAttributeLinked = isId || isClass
    
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
      isAttributeLinked
    }
  })
})

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
    ruleRefs.value[rule.uid] = el
  }
}

function toggleGroup(groupKey) {
  if (expandedGroups.value.has(groupKey)) {
    expandedGroups.value.delete(groupKey)
  } else {
    expandedGroups.value.add(groupKey)
  }
}
function updateRules() {
  // helper to safely find a CSS node by ID in the logic tree
  const findCssNode = (nodes, targetId) => {
    if (!nodes || !Array.isArray(nodes)) return null
    for (const node of nodes) {
      if (node.id === targetId) return node
      if (node.children) {
        const found = findCssNode(node.children, targetId)
        if (found) return found
      }
    }
    return null
  }

  // Handle Explicit CSS Rule Selection (From Explorer)
  if (styleStore.selectedCssRuleNodeId) {
      console.log('Explicit CSS Rule Mode:', styleStore.selectedCssRuleNodeId)
      // Reset element-specific state
      elementClasses.value = []
      
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
          // Force expand the new "virtual" group
          expandedGroups.value.clear()
          expandedGroups.value.add(`group-0-Selected Rule`)
          return
      }
  }

  if (!selectedElement.value || !cssAst.value) {
    rules.value = []
    ruleGroups.value = []
    elementClasses.value = []
    return
  }
  updateBoxModel()
  updateComputedProperties()

  // Update reactive class list (filtering out editor internal classes)
  elementClasses.value = Array.from(selectedElement.value.classList).filter(
    (c) => !ignoredClasses.includes(c),
  )

  console.log('--- updateRules START ---')
  const groups = getMatchedRules(
    selectedElement.value,
    toRaw(cssAst.value),
    viewport.value,
    forceStatus.value,
  )

  ruleGroups.value = groups
  // Initialize expansion: Target is always expanded, others collapsed by default if not already interacted with
  groups.forEach((g, idx) => {
    const key = `group-${idx}-${g.tagName}`
    if (g.isTarget) {
      expandedGroups.value.add(key)
    }
  })

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

const filteredGroups = computed(() => {
  if (!searchQuery.value) return ruleGroups.value
  const query = searchQuery.value.toLowerCase()
  return ruleGroups.value.map(group => ({
    ...group,
    rules: group.rules.filter(rule => 
      rule.selector.toLowerCase().includes(query) ||
      rule.declarations.some(d => d.prop.toLowerCase().includes(query) || d.value.toLowerCase().includes(query))
    )
  })).filter(group => group.rules.length > 0)
})

const filteredComputedProps = computed(() => {
  if (!searchQuery.value) return computedProperties.value
  const query = searchQuery.value.toLowerCase()
  return computedProperties.value.filter(p => 
    p.name.toLowerCase().includes(query) || p.value.toLowerCase().includes(query)
  )
})


function addNewProperty(rule) {
  try {
    console.log('--- addNewProperty start ---', { selector: rule.selector })
    // Validation removed: trusting the rule object passed from the UI

    // Case 1: Inline Style (element.style)
    if (rule.selector === 'element.style' && selectedElement.value) {
      console.log('Action: Adding inline property to element.style')
      // Use a valid custom property placeholder and a safe CSS-wide value
      selectedElement.value.style.setProperty('--new-property', 'inherit')
      console.log('Inline style updated:', selectedElement.value.style.cssText)
      updateRules()

      // Auto-focus the newly added property
      nextTick(() => {
        // Use the Ref map to find the exact rule element
        // For inline rules, we stable-UID'd them 'inline-target'
        const ruleId = rule.uid // 'inline-target'
        const el = ruleRefs.value[ruleId]
        
        if (el) {
          const listContainer = el.querySelector('.pl-4.space-y-0.5')
          if (listContainer && listContainer.children.length > 0) {
            const lastItem = listContainer.children[listContainer.children.length - 1]
            const target = lastItem.querySelector('.prop-name')
            if (target) {
              target.focus()
              const range = document.createRange()
              range.selectNodeContents(target)
              const sel = window.getSelection()
              sel.removeAllRanges()
              sel.addRange(range)
            }
          }
        } else {
           // Fallback if Ref failed (shouldn't happen with proper keying)
           console.warn('Rule Ref not found for', ruleId)
        }
      })
      return
    }

    // Case 2: AST Rule
    if (rule.astNode && rule.astNode.block) {
      const ast = toRaw(styleStore.cssAst)
      const block = toRaw(rule.astNode.block)
      const children = block.children
      const countBefore = children.toArray ? children.toArray().length : children.length
      console.log('Decls before:', countBefore)

      const newDeclNode = createNode('property: value', 'declaration')
      if (newDeclNode) {
        // Append new properties within the rule
        safeAppend(children, newDeclNode, false)

        syncAstToStyles(styleStore.cssAst, activeDoc.value)
        styleStore.refreshCssAst(activeDoc.value)
        updateRules()
        
        // Auto-focus the newly added property via Refs
        nextTick(() => {
          const el = ruleRefs.value[rule.uid]
          if (el) {
             const props = el.querySelectorAll('.prop-name')
             if (props.length > 0) {
               const lastProp = props[props.length - 1]
               lastProp.focus()
               const range = document.createRange()
               range.selectNodeContents(lastProp)
               const sel = window.getSelection()
               sel.removeAllRanges()
               sel.addRange(range)
             }
          }
        })
        console.log('AST sync and rules update called')
      } else {
        console.error('Failed to parse new property node')
      }
    } else {
      console.error('Rule has no astNode or block', rule)
    }
  } catch (err) {
    console.error('Error in addNewProperty:', err)
  }
}

function updateProperty(rule, decl, field, newValue) {
  const oldValue = decl[field]
  decl[field] = newValue

  if (rule.selector === 'element.style' && selectedElement.value) {
    const el = selectedElement.value
    const isCustom = (name) => name.startsWith('--')

    const setInline = (prop, val, prio) => {
      // Clean up previous states for this specific property name
      el.style.removeProperty(prop)
      el.style.removeProperty('--disabled-' + prop)

      // 1. Try setting the real property
      el.style.setProperty(prop, val, prio)

      // 2. Validate: Browsers drop invalid properties immediately
      // If it's a standard property and it's empty after setting, it was invalid.
      if (!isCustom(prop)) {
        const checkVal = el.style.getPropertyValue(prop)
        if (!checkVal) {
          // Property was rejected. Fallback to a custom property to preserve the text!
          console.warn(`Browser rejected ${prop}: ${val}. Preserving as --disabled-${prop}`)
          el.style.setProperty('--disabled-' + prop, val)
        }
      }
    }

    if (field === 'prop') {
      // First, clean up the OLD property name completely
      el.style.removeProperty(oldValue)
      el.style.removeProperty('--disabled-' + oldValue)

      // Then set the NEW property name with the current value
      setInline(newValue, decl.value, decl.important ? 'important' : '')
    } else if (field === 'value') {
      // Update value for the current property name
      setInline(decl.prop, newValue, decl.important ? 'important' : '')
    }
  } else if (decl.astNode) {
    const ast = toRaw(styleStore.cssAst)
    const node = toRaw(decl.astNode)
    if (field === 'prop') {
      const wasDisabled = node.property.startsWith('--disabled-')
      node.property = wasDisabled ? '--disabled-' + newValue : newValue
    } else if (field === 'value') {
      node.value = { type: 'Raw', value: newValue }
    }
    syncAstToStyles(styleStore.cssAst, activeDoc.value)
    styleStore.refreshCssAst(activeDoc.value)
    updateRules()
  }
}

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

function toggleClass(className) {
  if (!selectedElement.value || !store.manipulation) return
  const el = selectedElement.value
  const nodeId = el.getAttribute('data-node-id')
  if (!nodeId) return

  el.classList.toggle(className)
  store.manipulation.setAttribute(nodeId, 'class', el.className)
}

function addClass() {
  if (!selectedElement.value || !newClassName.value || !store.manipulation) return
  const el = selectedElement.value
  const nodeId = el.getAttribute('data-node-id')
  if (!nodeId) return

  const classes = newClassName.value.split(' ').filter(Boolean)
  classes.forEach((c) => {
    el.classList.add(c)
    // Automatically create a rule for this class in the target source
    addNewRule(`.${c}`)
  })
  newClassName.value = ''
  
  store.manipulation.setAttribute(nodeId, 'class', el.className)
}

function updateId(newId) {
  if (!selectedElement.value || !store.manipulation) return
  const el = selectedElement.value
  const nodeId = el.getAttribute('data-node-id')
  if (!nodeId) return

  store.manipulation.setAttribute(nodeId, 'id', newId)
}

function unlinkRule(tab) {
  if (!selectedElement.value || !store.manipulation) return
  const el = selectedElement.value
  const nodeId = el.getAttribute('data-node-id')
  if (!nodeId) return

  // Extract base classes and IDs (strip pseudo-classes/states)
  // e.g., ".class1.class2:hover" -> [".class1", ".class2"]
  const baseSelector = tab.selector.split(':')[0]
  const classes = baseSelector.match(/\.[a-zA-Z0-9_-]+/g)?.map(c => c.substring(1)) || []
  const ids = baseSelector.match(/#[a-zA-Z0-9_-]+/g)?.map(i => i.substring(1)) || []

  let changed = false

  classes.forEach(cls => {
    if (el.classList.contains(cls)) {
      el.classList.remove(cls)
      changed = true
    }
  })

  ids.forEach(id => {
    if (el.id === id) {
      el.id = ''
      changed = true
    }
  })

  if (changed) {
    // Persist changes to AST/Manipulation Store
    store.manipulation.setAttribute(nodeId, 'class', el.className.trim())
    store.manipulation.setAttribute(nodeId, 'id', el.id || '')
    
    // Force a rule update if needed, though MutationObserver should handle it
    console.log('Rule unlinked from element attributes')
  }
}

function createCustomRule() {
  const selector = customSelector.value.trim()
  if (!selector) return

  console.log('Creating custom rule with selector:', selector)
  addNewRule(selector)
  customSelector.value = ''
  showCustomSelector.value = false
}

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

function wrapInAtRule(rule, type) {
  console.log('wrapInAtRule clicked', { ruleSelector: rule.selector, type })
  if (!rule.astNode || !styleStore.cssAst) return
  
  const logicTree = toRaw(styleStore.cssAst)
  
  // Helper to find parent logic node
  const findParentOfLogicNode = (nodes, targetId, parent = null) => {
    for (const node of nodes) {
      if (node.id === targetId) return parent
      if (node.children) {
        const found = findParentOfLogicNode(node.children, targetId, node)
        if (found) return found
      }
    }
    return null
  }

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

function unwrapFromAtRule(rule, contextItem) {
  console.log('unwrapFromAtRule clicked', { ruleSelector: rule.selector, contextItem })
  if (!styleStore.cssAst || !contextItem || !contextItem.astNode) return
  
  const logicTree = toRaw(styleStore.cssAst)
  
  // Helper to find parent of a node
  const findParentOfLogicNode = (nodes, targetId, parent = null) => {
    for (const node of nodes) {
      if (node.id === targetId) return parent
      if (node.children) {
        const found = findParentOfLogicNode(node.children, targetId, node)
        if (found) return found
      }
    }
    return null
  }

  const atRuleLogicNode = findCssNode(logicTree, contextItem.astNode.id || contextItem.wrapper) // We might need a better way to find the atrule logic node
  // Actually contextItem.astNode is the css-tree node. We need the logic node wrapping it.
  
  // Let's search by astNode identity
  const findLogicNodeByAstNode = (nodes, astNode) => {
    for (const node of nodes) {
      if (node.metadata?.astNode === astNode) return node
      if (node.children) {
        const found = findLogicNodeByAstNode(node.children, astNode)
        if (found) return found
      }
    }
    return null
  }

  const targetAtRuleLogicNode = findLogicNodeByAstNode(logicTree, contextItem.astNode)
  if (!targetAtRuleLogicNode) {
     console.error('Could not find logic node for at-rule to unwrap')
     return
  }

  const parentLogicNode = findParentOfLogicNode(logicTree, targetAtRuleLogicNode.id)
  if (!parentLogicNode) return

  const idx = parentLogicNode.children.indexOf(targetAtRuleLogicNode)
  if (idx !== -1) {
    // Insert all children of at-rule into parent before at-rule
    parentLogicNode.children.splice(idx, 1, ...targetAtRuleLogicNode.children)

    syncAstToStyles(styleStore.cssAst, activeDoc.value)
    styleStore.refreshCssAst(activeDoc.value)
    updateRules()
    console.log('Successfully unwrapped at-rule in logic tree')
  }
}


function deleteDeclaration(rule, decl) {
  console.log('Deleting declaration:', decl.prop)

  // Case 1: Inline Style (element.style)
  if (rule.selector === 'element.style' && selectedElement.value) {
    console.log('Action: Removing inline property from element.style')
    if (decl.disabled) {
      selectedElement.value.style.removeProperty('--disabled-' + decl.prop)
    } else {
      selectedElement.value.style.removeProperty(decl.prop)
    }
    updateRules()
    return
  }

  // Case 2: AST Rule
  if (!styleStore.cssAst || !rule.astNode || !decl.astNode) {
    console.error('Cannot delete declaration: missing AST nodes')
    return
  }

  const ast = toRaw(styleStore.cssAst)
  const ruleNode = toRaw(rule.astNode)
  const declNode = toRaw(decl.astNode)

  if (ruleNode.block && ruleNode.block.children) {
    const list = ruleNode.block.children

    // Find and remove the declaration node from the list
    if (list.head) {
      let item = list.head
      while (item) {
        if (item.data === declNode) {
          list.remove(item)
          console.log('✓ Declaration removed from AST')
          syncAstToStyles(ast, activeDoc.value)
          updateRules()
          return
        }
        item = item.next
      }
    } else if (Array.isArray(list)) {
      const idx = list.indexOf(declNode)
      if (idx !== -1) {
        list.splice(idx, 1)
        console.log('✓ Declaration removed from Array AST')
        syncAstToStyles(ast, activeDoc.value)
        updateRules()
        return
      }
    }
  }
  console.error('✗ Failed to delete declaration: node not found in parent block')
}

function toggleDeclaration(rule, decl) {
  // Toggle state immediately for UI responsiveness
  decl.disabled = !decl.disabled
  console.log('Toggling property:', decl.prop, 'New state disabled:', decl.disabled)

  if (rule.selector === 'element.style' && selectedElement.value) {
    if (decl.disabled) {
      // Was enabled, now we disable: remove from style and add to custom property
      selectedElement.value.style.removeProperty(decl.prop)
      selectedElement.value.style.setProperty('--disabled-' + decl.prop, decl.value)
    } else {
      // Was disabled, now we enable: remove from custom property and add back to style
      selectedElement.value.style.removeProperty('--disabled-' + decl.prop)
      selectedElement.value.style.setProperty(
        decl.prop,
        decl.value,
        decl.important ? 'important' : '',
      )
    }
  } else if (decl.astNode && rule.astNode) {
    const ast = toRaw(styleStore.cssAst)
    const ruleNode = toRaw(rule.astNode)
    const declNode = toRaw(decl.astNode)

    if (decl.disabled) {
      if (!declNode.property.startsWith('--disabled-')) {
        declNode.property = '--disabled-' + declNode.property
      }
    } else {
      declNode.property = declNode.property.replace('--disabled-', '')
    }
    syncAstToStyles(ast, activeDoc.value)
  }
  updateRules()
}

// Monitora mudanças no elemento selecionado para atualização em tempo real
const observer = new MutationObserver(updateRules)
watch(
  selectedElement,
  (newEl, oldEl) => {
    if (oldEl) observer.disconnect()
    if (newEl) {
      observer.observe(newEl, { attributes: true, attributeFilter: ['style', 'class', 'id'] })
      updateRules()
    }
  },
  { immediate: true },
)

function deleteRule(rule) {
  console.log('=== deleteRule START ===', rule.selector)
  if (!styleStore.cssAst || !rule.uid) return
  if (rule.selector === 'element.style') return

  const logicTree = toRaw(styleStore.cssAst)
  
  const findAndRemoveFromLogicTree = (nodes, targetId) => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === targetId) {
        nodes.splice(i, 1)
        return true
      }
      if (nodes[i].children && findAndRemoveFromLogicTree(nodes[i].children, targetId)) {
        return true
      }
    }
    return false
  }

  if (findAndRemoveFromLogicTree(logicTree, rule.uid)) {
    syncAstToStyles(styleStore.cssAst, activeDoc.value)
    styleStore.refreshCssAst(activeDoc.value)
    updateRules()
    console.log('Rule deleted from Logic Tree')
  }
}

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
    // Create new rule for pseudo-class
    addNewRule(targetSelector)
  }
}

watch([cssAst, viewport], updateRules)
watch(forceStatus, updateRules, { deep: true })
</script>

<template>
  <div
    class="inspector-panel-container h-full w-full bg-[#f3f3f3] text-[#202124] font-sans text-[12px] shadow-2xl border-l border-[#d1d1d1] flex flex-col overflow-hidden z-[1000] selection:bg-blue-500/30">
    <div class="inspector-header bg-[#f3f3f3] border-b border-[#d1d1d1] shrink-0">
      <div class="flex items-center px-1 min-h-[35px] py-1">
        <div class="flex border-r border-[#d1d1d1] pr-1 mr-1">
          <button v-for="tab in ['Styles', 'Computed']" :key="tab" @click="activeTab = tab" :class="[
            'px-3 py-1 text-[11px] font-medium transition-all relative border-b-2',
            activeTab === tab
              ? 'text-blue-600 border-blue-600 font-bold bg-white'
              : 'text-[#5f6368] border-transparent hover:text-[#202124] hover:bg-black/5',
          ]">
            {{ tab }}
          </button>
        </div>

        <div class="flex-1 flex items-center px-2 bg-white border border-[#d1d1d1] rounded h-6 group focus-within:border-blue-500 max-w-[140px]">
          <svg class="w-3 h-3 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            placeholder="Filter"
            class="bg-transparent border-none outline-none text-[10px] w-full"
          />
        </div>

        <div class="flex items-center gap-0.5 ml-2">
          <button @click="showClassManager = !showClassManager" :class="[
            'px-1.5 py-0.5 rounded transition-all text-[11px] border',
            showClassManager ? 'bg-blue-600 text-white border-blue-700' : 'text-[#5f6368] bg-white border-[#d1d1d1] hover:bg-black/5',
          ]" title="Toggle Class Manager">
            .cls
          </button>
          <button @click="showForceState = !showForceState" :class="[
            'px-1.5 py-0.5 rounded transition-all text-[11px] border',
            showForceState ? 'bg-blue-600 text-white border-blue-700' : 'text-[#444] bg-white border-[#d1d1d1] hover:bg-black/5',
          ]" title="Toggle Element State">
            :hov
          </button>
           <button @click="showCustomSelector = !showCustomSelector" :class="[
            'px-1.5 py-0.5 rounded transition-all text-[11px] border',
            showCustomSelector ? 'bg-blue-600 text-white border-blue-700' : 'text-[#5f6368] bg-white border-[#d1d1d1] hover:bg-black/5',
          ]" title="Custom Selector Rule">
            { }
          </button>
          <button @click="refreshAll" class="p-1 text-[#5f6368] hover:bg-black/5 rounded transition-colors"
            title="Refresh AST">
            <svg class="w-3 h-3 text-[#5f6368]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div class="flex-1"></div>

        <div class="flex items-center gap-1 ml-2 border-l border-[#d1d1d1] pl-2 h-6">
          <select
            v-model="selectedSource"
            class="bg-white border border-[#d1d1d1] px-1 py-0.5 rounded text-[10px] outline-none focus:border-blue-500 max-w-[80px] truncate"
            title="Target Source">
            <option v-for="source in availableSources" :key="`${source.origin}:${source.name}`" :value="source">
              {{ source.name }}
            </option>
          </select>
          <button @click="store.deactivate"
            class="p-1 text-[#5f6368] hover:bg-red-50 hover:text-red-500 rounded transition-colors" title="Close">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Rule Creator Drawer -->
    <div v-if="activeTab === 'Styles' && showCustomSelector"
      class="px-4 py-4 border-b border-[#d1d1d1] bg-slate-50 space-y-4 shadow-inner">
      
      <div v-if="suggestedSelectors.length" class="space-y-2">
        <label class="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">Sugestões de Seletor</label>
        <div class="flex flex-wrap gap-2">
          <button 
            v-for="s in suggestedSelectors" 
            :key="s.value"
            @click="addNewRule(s.value)"
            class="px-3 py-1 rounded-md border text-[11px] font-mono transition-all shadow-sm active:scale-95"
            :class="[
              s.type === 'id' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400' :
              s.type === 'class' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400' :
              'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
            ]"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">Seletor Personalizado</label>
        <div class="flex items-center gap-2">
          <input v-model="customSelector" @keydown.enter="createCustomRule" type="text"
            placeholder="Ex: .meu-card:hover"
            class="bg-white border border-[#d1d1d1] px-3 py-1.5 rounded-lg flex-1 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-[12px] font-mono shadow-sm" />
          <button @click.stop="createCustomRule"
            class="px-4 py-1.5 bg-blue-600 text-white text-[10px] rounded-lg hover:bg-blue-700 transition-all font-black uppercase tracking-tighter shadow-md">
            Criar
          </button>
        </div>
      </div>
    </div>

    <!-- State Forcer Drawer -->
    <div v-if="activeTab === 'Styles' && showForceState"
      class="px-4 py-3 border-b border-[#d1d1d1] bg-slate-50 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] shadow-inner">
      <label v-for="(val, key) in forceStatus" :key="key"
        class="flex items-center gap-2 cursor-pointer group hover:text-blue-600 transition-colors">
        <input type="checkbox" v-model="forceStatus[key]" class="accent-blue-600 w-3.5 h-3.5 rounded" />
        <span class="font-mono">:{{ key }}</span>
      </label>
    </div>

    <!-- Manager Drawer (Classes + Source) -->
    <div v-if="activeTab === 'Styles' && showClassManager && selectedElement"
      class="px-4 py-4 border-b border-[#d1d1d1] bg-slate-50 space-y-4 shadow-inner">
      
      <div class="space-y-3 pb-4 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <span class="text-slate-400 font-black uppercase tracking-tighter w-8 text-[9px]">ID</span>
          <input :value="selectedElement.id" @blur="(e) => updateId(e.target.value)" @keydown.enter="
            (e) => {
              updateId(e.target.value)
              e.target.blur()
            }
          " type="text"
            class="bg-white border border-[#d1d1d1] px-2.5 py-1 rounded-md flex-1 outline-none focus:border-blue-500 font-mono text-orange-700 shadow-sm"
            placeholder="Definir ID..." />
        </div>

        <div class="space-y-2">
          <span class="text-slate-400 font-black uppercase tracking-tighter text-[9px]">Classes</span>
          <div class="flex flex-wrap gap-2">
            <div v-for="cls in elementClasses" :key="cls"
              class="flex items-center gap-1.5 bg-blue-100/40 border border-blue-200 px-2 py-1 rounded-full hover:bg-blue-100 transition-all">
              <input type="checkbox" checked @change="toggleClass(cls)" class="accent-blue-600 w-3 h-3" />
              <span class="text-blue-700 font-bold font-mono text-[10px]">{{ cls }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input v-model="newClassName" @keydown.enter="addClass" type="text"
            class="bg-white border border-[#d1d1d1] px-3 py-1 rounded-lg flex-1 outline-none focus:border-blue-500 text-blue-600 font-mono"
            placeholder="Nova classe..." />
          <button @click="addClass"
            class="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700 transition-all shadow-md">
            ADD
          </button>
        </div>
      </div>

    </div>

    <!-- Empty State -->
    <div v-if="!store.selectedElement"
      class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50">
      <svg class="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
      <p class="text-[11px] uppercase tracking-widest font-bold text-gray-500">Select an element to inspect</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto font-mono leading-normal bg-white custom-scrollbar">
      <!-- STYLES TAB -->
      <div v-if="activeTab === 'Styles'" class="pb-32 flex flex-col h-full">
        
        <!-- Target Rule Navigation (Sticky Top) -->
        <div v-if="selectorTabs.length > 0" class="shrink-0 bg-[#f8f9fa] border-b border-[#d1d1d1] z-20">
          <div class="flex flex-wrap items-center gap-1 px-3 py-2">
            <button v-for="tab in selectorTabs" :key="tab.uid"
              @click="styleStore.setActiveRule(tab.uid)"
              :class="[
                'group/tab flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all border shrink-0 font-medium',
                styleStore.activeRuleNodeId === tab.uid 
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm' 
                  : 'bg-white text-gray-500 border-[#d1d1d1] hover:border-blue-300 hover:text-blue-600'
              ]"
              :title="tab.source"
            >
              <span v-if="tab.selector === 'element.style'" class="italic">element.style</span>
              <span v-else class="truncate max-w-[150px]">{{ tab.label }}</span>
              
              <span v-if="tab.isAttributeLinked" 
                @click.stop="unlinkRule(tab)"
                class="ml-1 opacity-0 group-hover/tab:opacity-100 hover:bg-white/20 rounded transition-all w-3 h-3 flex items-center justify-center text-[7px]"
                :class="styleStore.activeRuleNodeId === tab.uid ? 'text-white' : 'text-gray-400 hover:text-red-500'"
                title="Unlink from element"
              >✕</span>
            </button>
            
            <button @click="addNewRule()" class="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors shrink-0" title="Add New Rule">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </button>
          </div>

          <!-- Pseudo-classes Control -->
          <div v-if="styleStore.activeRuleNodeId && activeInspectorRule?.selector !== 'element.style'" 
            class="flex flex-wrap items-center gap-1 px-3 pb-2">
            <button v-for="state in ['hover', 'active', 'focus', 'visited', 'focus-within', 'focus-visible', 'target']" 
              :key="state"
              @click="handlePseudoToggle(state)"
              :class="[
                'px-1.5 py-0 rounded text-[9px] border transition-all font-mono',
                hasPseudo(state) ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-black/5'
              ]"
            >
              :{{ state }}
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto no-scrollbar">
          <div v-for="(group, gIdx) in filteredGroups" :key="gIdx" class="mb-4 last:mb-0">
            
            <!-- Inheritance Header (Only for non-target groups) -->
            <div v-if="!group.isTarget"
              class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-500 text-[10px] border-y border-gray-100 sticky top-0 z-[1] cursor-pointer"
              @click="toggleGroup(`group-${gIdx}-${group.tagName}`)">
              <svg class="w-2.5 h-2.5 transition-transform duration-200"
                :class="[expandedGroups.has(`group-${gIdx}-${group.tagName}`) ? 'rotate-90' : '']" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="font-bold whitespace-nowrap">Inherited from</span>
              <span class="text-blue-600 font-bold truncate">{{ group.tagName }}</span>
              <span v-if="group.id" class="text-orange-700 shrink-0">#{{ group.id }}</span>
            </div>

            <!-- Focused Rule Area (Target) OR Expanded Inherited Area -->
            <div v-show="group.isTarget || expandedGroups.has(`group-${gIdx}-${group.tagName}`)" 
              class="space-y-4 px-3 pt-3">
              
              <!-- Filter: If target group, only show activeInspectorRule -->
              <template v-for="(rule, i) in group.rules" :key="rule.uid || i">
                <div v-if="!group.isTarget || rule.uid === styleStore.activeRuleNodeId"
                  :ref="(el) => setRuleRef(el, rule)"
                  class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative group/rule overflow-hidden transition-all"
                  :class="{ 'ring-1 ring-blue-500/30 border-blue-100': group.isTarget }">
                  
                  <!-- Indicator for inline styles -->
                  <div v-if="rule.selector === 'element.style'" class="absolute top-0 left-0 right-0 h-1 bg-blue-500/50"></div>

                  <!-- Rule Header (Simple title) -->
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex flex-col flex-1">
                      <div v-if="rule.context && rule.context.length" class="flex flex-wrap items-center gap-1 mb-2">
                        <div v-for="(ctx, idx) in rule.context" :key="idx"
                          class="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 text-[9px] group/ctx">
                          <span class="opacity-60">@{{ ctx.name }}</span>
                          <span class="cursor-text hover:underline" contenteditable="true"
                            @blur="(e) => updateAtRule(rule, ctx, e.target.innerText)"
                            @keydown.enter.prevent="(e) => e.target.blur()">{{ ctx.prelude }}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-1">
                        <span :class="[
                          'text-orange-800 font-bold text-[12px] cursor-text hover:underline break-all font-mono',
                          !isEditable(rule, group) ? 'opacity-40 !cursor-not-allowed no-underline' : '',
                        ]" :contenteditable="rule.selector !== 'element.style' && isEditable(rule, group)"
                          @blur="(e) => updateSelector(rule, e.target.innerText)"
                          @keydown.enter.prevent="(e) => e.target.blur()">{{ rule.selector }}</span>
                        <span class="text-gray-300 font-normal ml-1">{</span>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight"
                      :class="[
                        rule.origin === 'external' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        rule.origin === 'on_page' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-blue-50 text-blue-600 border border-blue-100'
                      ]">
                       <span>{{ getOriginLabel(rule) }}</span>
                    </div>
                  </div>

                  <!-- Property List -->
                  <div class="pl-4 space-y-1.5 relative mb-2">
                    <div v-for="decl in rule.declarations" :key="decl.id || decl.prop"
                      class="flex items-start gap-2 group/item relative min-h-[20px]">
                      
                      <div class="flex-1 flex flex-wrap items-baseline gap-x-1.5 transition-all"
                        :class="{ 'opacity-30 line-through grayscale': decl.overridden || decl.disabled }">
                        
                        <input v-if="isEditable(rule, group)" type="checkbox" :checked="!decl.overridden && !decl.disabled"
                          @change.stop="toggleDeclaration(rule, decl)"
                          class="w-3.5 h-3.5 cursor-pointer accent-blue-600 rounded" />

                        <span class="text-rose-700 font-bold prop-name outline-none" 
                          :class="[isEditable(rule, group) ? 'cursor-text hover:bg-gray-50 px-0.5 rounded' : '']" 
                          :contenteditable="isEditable(rule, group)"
                          @blur="(e) => updateProperty(rule, decl, 'prop', e.target.innerText)"
                          @keydown.enter.prevent="(e) => focusValue(rule, decl, e)">{{ decl.prop }}</span>
                        
                        <span class="text-gray-300">:</span>
                        
                        <div class="flex items-center gap-1 min-w-0">
                          <span v-if="isColor(decl.value)"
                            class="shrink-0 w-3 h-3 rounded shadow-sm border border-black/10"
                            :style="{ backgroundColor: decl.value }"></span>
                          
                          <span class="text-indigo-900 font-medium prop-value outline-none px-1 rounded break-all transition-colors"
                            :class="[isEditable(rule, group) ? 'cursor-text hover:bg-blue-50' : '']"
                            :contenteditable="isEditable(rule, group)"
                            @blur="(e) => updateProperty(rule, decl, 'value', e.target.innerText)"
                            @keydown.enter.prevent="(e) => e.target.blur()">{{ decl.value }}</span>
                        </div>
                        
                        <span v-if="decl.important" class="text-amber-500 text-[8px] font-black uppercase tracking-tight ml-1">!important</span>
                        <span class="text-gray-300">;</span>
                      </div>

                      <button v-if="isEditable(rule, group)" @click.stop="deleteDeclaration(rule, decl)"
                        class="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>

                  <div class="text-gray-300 px-0.5 mb-2 font-normal">}</div>

                  <!-- Rule Action Footer -->
                  <div v-if="isEditable(rule, group)" 
                    class="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
                     <button @click.stop="addNewProperty(rule)" class="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#166534] bg-[#dcfce7] hover:bg-green-200 px-3 py-1 rounded-lg border border-[#bbf7d0] transition-all">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Prop
                     </button>
                     <div class="flex-1"></div>
                     <template v-if="rule.selector !== 'element.style'">
                        <button @click.stop="wrapInAtRule(rule, 'media')" class="text-[9px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-transparent transition-all">@media</button>
                        <button @click.stop="wrapInAtRule(rule, 'container')" class="text-[9px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-transparent transition-all">@container</button>
                     </template>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'Computed'" class="p-4 space-y-4">
        <!-- Box Model Diagram -->
        <div class="flex justify-center p-4">
          <div class="relative p-6 border border-dashed border-gray-400 bg-orange-50/30 text-center min-w-[200px]">
            <span class="absolute top-1 left-2 text-[9px] uppercase text-gray-400">margin</span>
            <span class="absolute top-1 left-1/2 -translate-x-1/2 text-[10px]">{{ boxModel.margin.top }}</span>
            <span class="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px]">{{ boxModel.margin.bottom }}</span>

            <div class="relative p-6 border border-gray-300 bg-amber-50/30">
              <span class="absolute top-1 left-2 text-[9px] uppercase text-gray-400">border</span>
              <span class="absolute top-1 left-1/2 -translate-x-1/2 text-[10px]">{{ boxModel.border.top }}</span>

              <div class="relative p-6 border border-gray-300 bg-emerald-50/30">
                <span class="absolute top-1 left-2 text-[9px] uppercase text-gray-400">padding</span>
                <span class="absolute top-1 left-1/2 -translate-x-1/2 text-[10px]">{{ boxModel.padding.top }}</span>

                <div class="relative p-2 border border-blue-400 bg-blue-100/30 text-center flex items-center justify-center">
                  <span class="text-[10px] font-bold">{{ boxModel.content.width }} x {{ boxModel.content.height }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-0.5 border-t border-slate-50 pt-6">
          <div v-for="prop in filteredComputedProps" :key="prop.name"
            class="flex items-baseline justify-between py-1 group hover:bg-slate-50 px-3 rounded transition-colors border-b border-slate-50/50">
            <span class="text-rose-800 font-bold text-[11px] tracking-tight selection:bg-rose-100">{{ prop.name }}</span>
            <span class="text-indigo-900 text-right text-[10px] truncate max-w-[210px] font-mono font-medium opacity-80 group-hover:opacity-100" :title="prop.value">{{ prop.value }}</span>
          </div>
        </div>
      </div>



  </div>
</div>
</template>

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
.inspector-panel-container {
  scrollbar-gutter: stable;
}

/* Chrome DevTools Hide Scrollbar on Header Tools */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
