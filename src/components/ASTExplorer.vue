<script setup>
// ASTExplorer.vue

import { computed, ref } from 'vue'
import ASTNode from './ASTNode.vue'
import { useExplorerDragDrop } from '@/composables/useExplorerDragDrop'

const { explorerDragState } = useExplorerDragDrop()
const s = explorerDragState

const showTextNodes = ref(false)
const showCommentNodes = ref(false)

const props = defineProps({
  ast: Object,
  selectedNodeId: String,
})

function findPath(node, targetId, path = []) {
  if (!node) return null
  if (node.nodeId === targetId) return [...path, node.nodeId]
  for (const child of node.children || []) {
    const result = findPath(child, targetId, [...path, node.nodeId])
    if (result) return result
  }
  return null
}

const openPath = computed(() => {
  if (!props.selectedNodeId) return []
  return findPath(props.ast, props.selectedNodeId) || []
})
</script>

<template>
  <div class="ast-explorer-container flex flex-col h-full overflow-hidden">
    <!-- Filters Toolbar -->
    <div class="flex items-center gap-3 px-3 py-1.5 border-b border-gray-100 bg-gray-50/50 text-[10px] text-gray-500 font-medium shrink-0">
      <label class="flex items-center gap-1.5 cursor-pointer hover:text-gray-700 transition-colors">
        <input type="checkbox" v-model="showTextNodes" class="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0">
        Texto
      </label>
      <label class="flex items-center gap-1.5 cursor-pointer hover:text-gray-700 transition-colors">
        <input type="checkbox" v-model="showCommentNodes" class="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0">
        Comentários
      </label>
    </div>

    <!-- Tree Content -->
    <div class="flex-1 overflow-auto py-2 min-w-0">
      <div class="inline-block min-w-full">
        <ASTNode 
          :node="ast" 
          :selectedNodeId="selectedNodeId" 
          :openPath="openPath"
          :show-text-nodes="showTextNodes"
          :show-comment-nodes="showCommentNodes"
        />
      </div>
    </div>
  </div>

  <!-- Indicador de drop: linha azul durante drag no Explorer -->
  <Teleport to="body">
    <template v-if="s.active.value && s.indicator.value">
      <!-- Linha horizontal -->
      <div
        class="pointer-events-none"
        style="position: fixed; z-index: 9500; height: 2px; background: #3b82f6; transition: top 50ms ease"
        :style="{
          top:  (s.indicator.value.lineY - 1) + 'px',
          left:  s.indicator.value.lineX + 'px',
          width: s.indicator.value.lineW + 'px',
        }"
      />
      <!-- Triângulo no início da linha -->
      <div
        class="pointer-events-none"
        style="position: fixed; z-index: 9500"
        :style="{
          top:  (s.indicator.value.lineY - 5) + 'px',
          left: (s.indicator.value.lineX - 6) + 'px',
          width: 0,
          height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderLeft: '6px solid #3b82f6',
        }"
      />
    </template>
  </Teleport>
</template>
