<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'

import IconSelectParent from '@/components/icons/inconSelectParent.vue'

const store = useEditorStore()

const props = defineProps({
  nodeId: {
    type: String,
    required: false,
  },
})

const node = computed(() => (props.nodeId ? store.selectedNode : null))
const tagName = computed(() => node.value?.tag || '')

// Computa se pode mover baseada na posição do nó nos filhos do pai
const parent = computed(() => (props.nodeId ? store.getParent(props.nodeId) : null))

const nodeIndex = computed(() => {
  if (!parent.value || !parent.value.children) return -1
  return parent.value.children.findIndex((c) => c.nodeId === props.nodeId)
})

const canMoveUp = computed(() => {
  if (!props.nodeId || nodeIndex.value === -1) return false
  return nodeIndex.value > 0
})

const canMoveDown = computed(() => {
  if (!props.nodeId || !parent.value) return false
  return nodeIndex.value < parent.value.children.length - 1
})

const selectParent = () => {
  store.selectParent()
}

const moveUp = () => {
  if (canMoveUp.value) NodeDispatcher.moveNode(props.nodeId, -1)
}

const moveDown = () => {
  if (canMoveDown.value) NodeDispatcher.moveNode(props.nodeId, 1)
}
</script>

<template>
  <div v-if="nodeId" class="flex items-center gap-2">
    <div class="text-sm text-blue-600 bg-blue-100 px-2 rounded">{{ tagName }}</div>

    <div class="inline-block mr-2 pr-2 border-r border-gray-300"></div>
    <button
      @click="selectParent"
      class="px-2 py-1 hover:bg-white rounded border border-transparent hover:border-gray-200"
      title="Select Parent"
    >
      <IconSelectParent />
    </button>

    <div class="flex gap-1">
      <button
        @click="moveUp"
        :disabled="!canMoveUp"
        class="p-1 hover:bg-white rounded border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Move Up"
      >
        ↑
      </button>
      <button
        @click="moveDown"
        :disabled="!canMoveDown"
        class="p-1 hover:bg-white rounded border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Move Down"
      >
        ↓
      </button>
    </div>
  </div>
</template>
