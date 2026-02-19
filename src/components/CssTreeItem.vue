<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'

const store = useEditorStore()
const styleStore = useStyleStore()

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  depth: {
    type: Number,
    default: 0,
  },
})

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const isExpanded = computed(() => props.node.isExpanded ?? false)

const isSelected = computed(() => {
  return styleStore.selectedRuleId === props.node.id
})

const handleClick = (e) => {
  if (props.node.type === 'root') return // Roots are static dividers

  const isToggleClick = e.target.closest('.toggle-area')
  
  if (isToggleClick || props.node.type === 'file' || props.node.type === 'selector') {
    if (hasChildren.value) {
      props.node.onToggle?.()
    }
  }

  // Selection: clicking a rule node selects it in Explorer + Inspector
  if (props.node.type === 'selector' || props.node.type === 'at-rule') {
    styleStore.selectRule(props.node.id)
  }
}

const getStyles = computed(() => {
  if (props.node.type === 'root') return 'bg-[#f0f0f0] border-y border-[#d1d1d1] font-bold text-[10px] text-gray-600 sticky top-0 z-10'
  if (props.node.type === 'file') return 'bg-white font-medium text-gray-600'
  if (props.node.type === 'selector') {
      let base = 'text-blue-700 font-medium'
      if (isExpanded.value && hasChildren.value) base += ' bg-blue-200'
      return base
  }
  if (props.node.type === 'at-rule') return 'text-purple-700 font-bold'
  if (props.node.type === 'declaration') return 'text-gray-600'
  return ''
})

const getIcon = computed(() => {
  if (props.node.type === 'root') {
      const origin = props.node.metadata?.origin
      if (origin === 'external') return '🔗'
      if (origin === 'on_page' || origin === 'internal') return '📝'
      return '🔹'
  }
  if (props.node.type === 'file') return '📄'
  if (props.node.type === 'at-rule') {
    const label = props.node.label.toLowerCase()
    if (label.includes('@media')) return '📱'
    if (label.includes('@layer')) return '📦'
    if (label.includes('@keyframes')) return '🎬'
    if (label.includes('@container')) return '🗄️'
    return '⚙️'
  }
  return ''
})
</script>

<template>
  <div 
    class="font-mono text-[11px] select-none text-[#202124] border-b border-gray-50/50"
    :class="[getStyles, isSelected ? 'bg-blue-50/50 !border-blue-200' : (node.type !== 'root' ? 'hover:bg-gray-50' : '')]"
    @click="handleClick"
  >
    <div 
      class="flex items-center gap-1.5 py-1 px-2 cursor-pointer overflow-hidden whitespace-nowrap"
      :style="{ paddingLeft: node.type === 'root' ? '8px' : (depth * 8) + 'px', height: '22px' }"
    >
      <!-- Toggle Arrow -->
      <div v-if="hasChildren && node.type !== 'selector' && node.type !== 'root'" class="toggle-area w-4 h-4 flex items-center justify-center shrink-0 hover:bg-black/5 rounded">
        <svg class="w-2.5 h-2.5 text-gray-500 transform transition-transform duration-200"
            :class="isExpanded ? 'rotate-90' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <!-- Icon (only if exists) -->
      <span v-if="getIcon" class="shrink-0">{{ getIcon }}</span>
      
      <div class="flex items-baseline gap-1.5 truncate">
        <span class="truncate" :class="{ 'uppercase tracking-wide': node.type === 'root' }" :title="node.label">{{ node.label }}</span>
        <span v-if="node.value" class="text-gray-400 font-normal truncate">: {{ node.value }}</span>
      </div>
    </div>
  </div>
</template>
