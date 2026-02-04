<script setup>
// Breadcrumbs.vue

// stores
import { computed, ref, watch, nextTick } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { findPath } from '@/utils/ast.js'
const EditorStore = useEditorStore()

const containerRef = ref(null)

const path = computed(() => {
  if (!EditorStore.ctx?.ast || !EditorStore.selectedNodeId) return []
  return findPath(EditorStore.ctx.ast, EditorStore.selectedNodeId) || []
})

// Auto-scroll to end when selection changes
watch(path, () => {
  nextTick(() => {
    if (containerRef.value) {
      containerRef.value.scrollLeft = containerRef.value.scrollWidth
    }
  })
}, { deep: true })

function label(node, parent) {
  if (node.type === 'element') {
    const idx = siblingIndex(node, parent)
    const id = node.attrs?.id ? `#${node.attrs.id}` : ''
    const cls = node.attrs?.class ? '.' + node.attrs.class.split(' ').join('.') : ''
    return idx ? `${node.tag}${id}${cls}(${idx})` : `${node.tag}${id}${cls}`
  }
  if (node.type === 'text') return '#text'
  if (node.type === 'comment') return '#comment'
  return node.type
}

function siblingIndex(node, parent) {
  if (!parent) return null
  const siblings = (parent.children || []).filter((n) => n.type === node.type && n.tag === node.tag)
  if (siblings.length <= 1) return null
  return siblings.findIndex((n) => n.nodeId === node.nodeId) + 1
}

function select(nodeId) {
  EditorStore.selectNode(nodeId)
}

function scroll(direction) {
  if (containerRef.value) {
    const amount = 100
    containerRef.value.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="breadcrumbs-wrapper flex items-center bg-[#f3f3f3] border-t border-[#ccc] text-[11px] h-7 px-1 text-[#555] select-none">
    <!-- Left Arrow -->
    <button @click="scroll(-1)" class="p-1 hover:bg-black/5 rounded transition-colors" title="Scroll left">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <!-- Scrollable content -->
    <div ref="containerRef" class="breadcrumbs-container flex items-center gap-0 overflow-x-auto whitespace-nowrap hide-scrollbar flex-1 h-full">
      <template v-for="(node, i) in path" :key="node.nodeId">
        <div 
          class="breadcrumb-item flex items-center h-full px-1.5 cursor-pointer hover:bg-black/5 hover:text-black transition-colors"
          :class="{ 'font-bold text-blue-600 bg-blue-50/50': i === path.length - 1 }"
          @click="select(node.nodeId)"
        >
          {{ label(node, path[i - 1]) }}
        </div>

        <span v-if="i < path.length - 1" class="text-gray-300 mx-0 pb-0.5 opacity-50">›</span>
      </template>
    </div>

    <!-- Right Arrow -->
    <button @click="scroll(1)" class="p-1 hover:bg-black/5 rounded transition-colors" title="Scroll right">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.breadcrumbs-wrapper {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.breadcrumb-item {
  position: relative;
}

/* Chrome-like subtle separator would be more complex, using '›' for now but spacing it tight */
</style>
