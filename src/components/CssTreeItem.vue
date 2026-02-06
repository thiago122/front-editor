<script setup>
import { ref, computed } from 'vue'
import { generate } from 'css-tree'
import { useEditorStore } from '@/stores/EditorStore'

const store = useEditorStore()

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

const isOpen = ref(props.node.type === 'Atrule')

const hasChildren = computed(() => {
  return childrenArray.value.length > 0
})

const displayName = computed(() => {
  if (props.node.type === 'Rule') {
    return generate(props.node.prelude)
  }
  if (props.node.type === 'Atrule') {
    const prelude = props.node.prelude ? generate(props.node.prelude) : ''
    return `@${props.node.name} ${prelude}`
  }
  return props.node.type
})

const icon = computed(() => {
  if (props.node.type === 'Rule') return ''
  if (props.node.type === 'Atrule') {
    if (props.node.name === 'media') return '📱'
    if (props.node.name === 'layer') return '📦'
    if (props.node.name === 'keyframes') return '🎬'
    return '⚙️'
  }
  return '🔹'
})

const isSelected = computed(() => {
  return store.selectedCssRuleNodeId === props.node._nodeId
})

const handleClick = () => {
  store.selectedCssRuleNodeId = props.node._nodeId
  if (hasChildren.value) {
    isOpen.value = !isOpen.value
  }
}


// Helper to get array of children from css-tree List or Array
const childrenArray = computed(() => {
  if (!props.node.block || !props.node.block.children) return []
  const list = props.node.block.children
  const arr = list.toArray ? list.toArray() : list
  // Filter out Declarations (properties), keep only nested Rules or AtRules
  return arr.filter(n => n.type !== 'Declaration')
})
</script>

<template>
  <div class="font-mono text-[11px] select-none text-[#202124]">
    <div 
      class="flex items-center gap-1.5 py-1 px-2 cursor-pointer overflow-hidden whitespace-nowrap border-l-2"
      :class="isSelected ? 'bg-blue-100 border-blue-600' : 'hover:bg-blue-50 border-transparent'"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click.stop="handleClick"
    >
      <!-- Expander Arrow -->
      <span v-if="hasChildren" 
        class="text-gray-400 text-[8px] transform transition-transform"
        :class="isOpen ? 'rotate-90' : ''">
        ▶
      </span>
      <span v-else class="w-2"></span>

      <!-- Icon -->
      <span class="opacity-80 text-xs">{{ icon }}</span>

      <!-- Label -->
      <span class="truncate" :title="displayName"
        :class="node.type === 'Rule' ? 'text-blue-700 font-medium' : 'text-purple-700 font-bold'">
        {{ displayName }}
      </span>
    </div>

    <!-- Recursive Children -->
    <div v-if="isOpen && hasChildren">
      <CssTreeItem 
        v-for="(child, i) in childrenArray" 
        :key="child._nodeId || i" 
        :node="child" 
        :depth="depth + 1" 
      />
    </div>
  </div>
</template>
