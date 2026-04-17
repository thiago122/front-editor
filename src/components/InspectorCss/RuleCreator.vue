<template>
  <div class="px-2 py-1.5 flex items-center border-b border-gray-100 bg-gray-50/30">

    <button 
      ref="triggerRef"
      class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-all text-[10px] font-medium shadow-sm active:scale-95 group" 
      title="Alt + k" 
      @click="toggle">
      <span class="text-blue-500 font-bold group-hover:scale-125 transition-transform">+</span>
      <span>Selector</span>
    </button>
    
    <Teleport to="body">
      <div 
        v-if="showForm" 
        ref="formRef"
        class="fixed z-[10000] bg-white border border-gray-200 rounded-lg shadow-2xl p-3 w-[260px] animate-popover"
        :style="dropdownStyle">
        
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nova Regra CSS</span>
          <button @click="close" class="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50">
             <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
               <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
             </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="space-y-3">
          <div>
            <label class="block text-[9px] text-gray-500 font-bold mb-1 uppercase tracking-tight">Seletor</label>
            <input
              ref="selectorInput"
              v-model="customSelector"
              @keydown="onInputKeydown"
              type="text"
              placeholder="Ex: .meu-card:hover"
              class="bg-gray-50 border border-gray-200 px-2 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:bg-white block w-full rounded-md transition-all font-mono"
            />
          </div>
          
          <div>
            <label class="block text-[9px] text-gray-500 font-bold mb-1 uppercase tracking-tight">Arquivo de Destino</label>
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <select
                  ref="sourceSelect"
                  v-model="selectedSource"
                  @keydown="onSelectKeydown"
                  class="bg-gray-50 border border-gray-200 px-2 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:bg-white block w-full truncate rounded-md transition-all appearance-none pr-6 font-mono"
                  title="Target Source">
                  <option :value="null">Selecionar arquivo...</option>
                  <option v-for="source in availableSources" :key="`${source.origin}:${source.name}`" :value="source">
                    {{ source.name }}
                  </option>
                </select>
                <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <button
                @mousedown.prevent
                @click="createRule"
                class="shrink-0 h-[28px] px-4 bg-blue-600 text-white text-[11px] font-bold rounded-md hover:bg-blue-700 transition-all shadow-md active:scale-95">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { createRule as createCssRule } from '@/editor/css/actions/cssRuleActions'

const editorStore = useEditorStore()
const styleStore = useStyleStore()

const customSelector = ref('')
const selectedSource = ref(null)
const showForm = ref(false)

const triggerRef    = ref(null)
const formRef       = ref(null)
const selectorInput = ref(null)
const sourceSelect  = ref(null)

const dropdownStyle = ref({})

const selectedElement = computed(() => editorStore.selectedElement)

// Available sources: all non-external files in the Logic Tree
const availableSources = computed(() => {
  if (!styleStore.cssLogicTree) return [{ origin: 'on_page', name: 'style' }]
  const sources = [{ origin: 'on_page', name: 'style' }]

  styleStore.cssLogicTree.forEach(root => {
    if (root.metadata.origin === 'external') return
    root.children.forEach(file => {
      if (root.metadata.origin === 'on_page' && file.label === 'style') return
      sources.push({ origin: root.metadata.origin, name: file.label })
    })
  })

  const seen = new Set()
  return sources.filter(s => {
    const key = `${s.origin}:${s.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

watch(availableSources, sources => {
  if (!selectedSource.value && sources.length > 0) selectedSource.value = sources[0]
}, { immediate: true })

// ── Teclado no input de seletor ──────────────────────────────────────────────
function onInputKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    // Se só há uma fonte disponível, cria direto; senão foca o select
    if (availableSources.value.length <= 1) {
      createRule()
    } else {
      sourceSelect.value?.focus()
    }
    return
  }
}

// ── Teclado no select de arquivo ─────────────────────────────────────────────
function onSelectKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    createRule()
    return
  }
}

// ── Ciclo de vida do form ─────────────────────────────────────────────────────
function toggle() {
  if (showForm.value) {
    close()
  } else {
    open()
  }
}

function close() {
  showForm.value = false
  customSelector.value = ''
}

/**
 * Abre o form e foca o input de seletor.
 * Pode receber um seletor inicial (ex: tag do elemento recém-inserido).
 * Exposto via defineExpose para InspectorPanel chamar via ref.
 */
function open(initialSelector = '') {
  showForm.value = true
  customSelector.value = initialSelector
  updatePosition()
  nextTick(() => {
    updatePosition()
    selectorInput.value?.focus()
  })
}

function updatePosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  
  // Posiciona logo abaixo do botão, alinhado à esquerda
  // Adiciona um pequeno gap de 4px
  dropdownStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
}

// Click outside logic
function handleClickOutside(e) {
  if (!showForm.value) return
  if (formRef.value && !formRef.value.contains(e.target) && 
      triggerRef.value && !triggerRef.value.contains(e.target)) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})

/**
 * Apply simple selectors (.class, #id) to the selected element automatically.
 * Ignores complex selectors (descendant, pseudo-classes, etc.)
 */
function applyRuleToElement(selector) {
  if (!selectedElement.value || !editorStore.selectedNodeId || !editorStore.manipulation) return

  const clean = selector
    .replace(/:hover|:active|:focus|:visited|:focus-within|:focus-visible|:target/g, '')
    .replace(/::?[a-z-]+/g, '')
    .trim()

  if (/[\s>+~]/.test(clean)) return

  const classes = (clean.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).map(c => c.slice(1))
  const idMatch = clean.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/)
  const id = idMatch ? idMatch[0].slice(1) : null

  if (classes.length > 0) {
    const current = selectedElement.value.className.split(' ').filter(c => c.trim())
    const merged = [...new Set([...current, ...classes])].join(' ')
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'class', merged)
  }
  if (id) {
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'id', id)
  }
}

function createRule() {
  if (!selectedElement.value || !styleStore.cssLogicTree) return

  const selector = customSelector.value.trim() ||
    selectedElement.value.tagName.toLowerCase() +
    (selectedElement.value.id ? '#' + selectedElement.value.id : '')

  if (!selectedSource.value) {
    alert('Por favor selecione um arquivo de destino antes de adicionar a regra.')
    return
  }

  const origin = selectedSource.value?.origin || 'on_page'
  const sourceName = selectedSource.value?.name || 'style'

  // createCssRule handles applyMutation + selectRule internally
  const newNode = createCssRule(selector, origin, sourceName)

  if (newNode) {
    applyRuleToElement(selector)
    emit('rule-added', newNode)
    close()
  }
}

const emit = defineEmits(['rule-added'])

defineExpose({ open, close })
</script>

<style scoped>
@keyframes popover {
  from { opacity: 0; transform: translateY(-8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.animate-popover {
  animation: popover 0.15s ease-out;
  transform-origin: top left;
}
</style>
