<template>
  <div class="px-4 py-4 border-b border-[#d1d1d1] bg-slate-50 shadow-inner">
    <div class="flex flex-col gap-1">
      <div> 
        <label class="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">New selector</label>
        <div class="flex items-center gap-2">
          <input 
            v-model="customSelector" 
            @keydown.enter="createRule" 
            type="text"
            placeholder="Ex: .meu-card:hover"
            class="bg-white border border-[#d1d1d1] px-1 py-0.5 rounded text-[10px] outline-none focus:border-blue-500 block w-full" 
          />
        </div>          
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="selectedSource"
          class="bg-white border border-[#d1d1d1] px-1 py-0.5 rounded text-[10px] outline-none focus:border-blue-500 block w-full truncate"
          title="Target Source">
          <option :value="null">Select Source (required)</option>
          <option v-for="source in availableSources" :key="`${source.origin}:${source.name}`" :value="source">
            {{ source.name }}
          </option>
        </select>
        <button @mousedown.prevent="createRule"
              class="h-[22px] px-4 py-0.5 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 transition-all tracking-tighter">
              add
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, toRaw, nextTick } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { CssLogicTreeService } from '@/composables/CssLogicTreeService'

const props = defineProps({
  initialSelector: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['rule-added', 'cancel'])

const store = useEditorStore()
const styleStore = useStyleStore()



const activeDoc = computed(() => store.selectedElement?.ownerDocument || document)
const selectedElement = computed(() => store.selectedElement)

const customSelector = ref('')
const selectedSource = ref(null)

// Watch initialSelector to pre-fill input
watch(() => props.initialSelector, (val) => {
  if (val) customSelector.value = val
}, { immediate: true })

// --- Active CSS Source Selection ---
const availableSources = computed(() => {
  if (!styleStore.cssLogicTree) return [{ origin: 'on_page', name: 'style' }]
  const sources = []
  
  // Always ensure on_page style exists for new rules
  sources.push({ origin: 'on_page', name: 'style' })

  styleStore.cssLogicTree.forEach(root => {
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

// Initialize selectedSource
watch(availableSources, (sources) => {
  if (!selectedSource.value && sources.length > 0) {
    selectedSource.value = sources[0]
  }
}, { immediate: true })


/**
 * Automatically applies classes/IDs from a selector to the selected element
 * Handles simple selectors like .class, #id, .class1.class2, etc.
 * Ignores complex selectors (combinators, pseudo-classes, pseudo-elements)
 */
const applyRuleToElement = (selector) => {
  if (!selectedElement.value || !store.selectedNodeId || !store.manipulation) {
    console.log('⚠️ Não pode aplicar: elemento ou manipulation não disponível')
    return
  }

  // Remove pseudo-classes and pseudo-elements for parsing
  const cleanSelector = selector
    .replace(/:hover|:active|:focus|:visited|:focus-within|:focus-visible|:target/g, '')
    .replace(/::?[a-z-]+/g, '')
    .trim()

  console.log('🧹 Seletor limpo:', cleanSelector)

  // Check if it's a simple selector (no combinators like >, +, ~, space)
  if (/[\s>+~]/.test(cleanSelector)) {
    console.log('⚠️ Seletor complexo detectado, não aplicando automaticamente')
    return
  }

  // Extract classes (all .class patterns)
  const classMatches = cleanSelector.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g)
  const newClasses = classMatches ? classMatches.map(c => c.substring(1)) : []

  // Extract ID (only the first #id)
  const idMatch = cleanSelector.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/)
  const newId = idMatch ? idMatch[0].substring(1) : null

  console.log('📋 Classes extraídas:', newClasses)
  console.log('🆔 ID extraído:', newId)

  // Apply classes (merge with existing)
  if (newClasses.length > 0) {
    const currentClasses = selectedElement.value.className.split(' ').filter(c => c.trim())
    const mergedClasses = [...new Set([...currentClasses, ...newClasses])].join(' ')
    
    console.log('✏️ Aplicando classes:', mergedClasses)
    store.manipulation.setAttribute(store.selectedNodeId, 'class', mergedClasses)
  }

  // Apply ID (replace existing)
  if (newId) {
    console.log('✏️ Aplicando ID:', newId)
    store.manipulation.setAttribute(store.selectedNodeId, 'id', newId)
  }

  if (newClasses.length === 0 && !newId) {
    console.log('ℹ️ Nenhuma classe ou ID para aplicar (pode ser seletor de elemento)')
  }
}


const createRule = () => {
  console.log('🚀 === createRule INICIADA ===')
  
  const selectorInput = customSelector.value.trim()
  
  if (!selectedElement.value || !styleStore.cssLogicTree) {
    console.warn('⚠️ ABORTADO: selectedElement ou cssLogicTree não existe')
    return
  }

  // Determine selector: custom input OR based on selected element
  const selector =
    selectorInput ||
    selectedElement.value.tagName.toLowerCase() +
    (selectedElement.value.id ? '#' + selectedElement.value.id : '')
  
  console.log('✅ Selector final determinado:', selector)

  if (!selectedSource.value) {
    console.error('❌ ABORTADO: Nenhuma fonte CSS selecionada')
    alert('Please select a CSS source (e.g., style, styles.css) before adding a rule.')
    return
  }

  const origin = selectedSource.value?.origin || 'on_page'
  const sourceName = selectedSource.value?.name || (origin === 'on_page' ? 'style' : 'styles.css')

  // Use LogicTreeManager
  // Use toRaw for passing raw AST to manager
  const newLogicNode = CssLogicTreeService.addRule(toRaw(styleStore.cssLogicTree), selector, origin, sourceName)

  if (newLogicNode) {
    console.log('✅ newLogicNode criado via CssLogicTreeService:', newLogicNode)

    // Sync and Refresh
    CssLogicTreeService.syncToDOM(styleStore.cssLogicTree, activeDoc.value)
    styleStore.notifyAstMutation()
    
    // Set the newly created rule as active
    styleStore.selectRule(newLogicNode.id)
    
    // Clear input
    customSelector.value = ''

    // Apply to element FIRST (synchronous DOM update)
    applyRuleToElement(selector)
    
    // Emit AFTER class is applied (nextTick ensures DOM is updated)
    nextTick(() => {
      emit('rule-added', newLogicNode)
      console.log('🎉 === createRule CONCLUÍDA COM SUCESSO ===')
    })
  } else {
    console.error('❌ FALHA: LogicTreeManager não conseguiu criar a regra para:', selector)
  }
}
</script>

