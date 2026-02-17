<template>
  <div class="p-4 space-y-4">
    <!-- BoxModel manages its own state now -->
    <BoxModel />

    <div class="space-y-0.5 border-t border-slate-50 pt-6">
      <div v-for="prop in computedProperties" :key="prop.name"
        class="flex items-baseline justify-between py-1 group hover:bg-slate-50 px-3 rounded transition-colors border-b border-slate-50/50">
        <span class="text-rose-800 font-bold text-[11px] tracking-tight selection:bg-rose-100">{{ prop.name }}</span>
        <span class="text-indigo-900 text-right text-[10px] truncate max-w-[210px] font-mono font-medium opacity-80 group-hover:opacity-100" :title="prop.value">{{ prop.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import BoxModel from './BoxModel.vue'

const store = useEditorStore()
const computedProperties = ref([])

function updateComputedProperties() {
  const selectedElement = store.selectedElement
  if (!selectedElement) {
    computedProperties.value = []
    return
  }
  
  const style = window.getComputedStyle(selectedElement)
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

// Watch for element changes
watch(() => store.selectedElement, () => {
  updateComputedProperties()
}, { immediate: true })
</script>
