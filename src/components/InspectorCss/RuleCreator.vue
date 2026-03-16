<template>
  <div class="p-2 border-b border-gray-300">
    <label class="text-[12px] font-semibold text-gray-600 cursor-pointer mb-1" @click="showForm = !showForm">Create Selector +</label>
    <div v-if="showForm">
      <div class="flex items-center mb-2">
        <input
          v-model="customSelector"
          @keydown.enter="createRule"
          type="text"
          placeholder="Ex: .meu-card:hover"
          class="bg-white border border-[#d1d1d1] px-1 py-0.5 text-[11px] outline-none focus:border-blue-500 block w-full"
        />
      </div>
      <div class="flex items-center mb-2 gap-2">
        <select
          v-model="selectedSource"
          class="bg-white border border-[#d1d1d1] px-1 py-0.5 text-[11px] outline-none focus:border-blue-500 block w-full truncate"
          title="Target Source">
          <option :value="null">Select Source (required)</option>
          <option v-for="source in availableSources" :key="`${source.origin}:${source.name}`" :value="source">
            {{ source.name }}
          </option>
        </select>
        <button @mousedown.prevent="createRule"
              class="h-[22px] px-4 py-0.5 bg-blue-600 text-white text-[11px] hover:bg-blue-700 transition-all tracking-tighter">
              add
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { createRule as createCssRule } from '@/editor/css/actions/cssRuleActions'

const editorStore = useEditorStore()
const styleStore = useStyleStore()

const customSelector = ref('')
const selectedSource = ref(null)
const showForm = ref(false)

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
    alert('Please select a CSS source before adding a rule.')
    return
  }

  const origin = selectedSource.value?.origin || 'on_page'
  const sourceName = selectedSource.value?.name || 'style'

  // createCssRule handles applyMutation + selectRule internally
  const newNode = createCssRule(selector, origin, sourceName)

  if (newNode) {
    customSelector.value = ''
    applyRuleToElement(selector)
  }
}
</script>
