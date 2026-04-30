<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'

import IconSelectParent from '@/components/icons/inconSelectParent.vue'
import IconChevronUp from '@/components/icons/IconChevronUp.vue'
import IconChevronDown from '@/components/icons/IconChevronDown.vue'

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
  <div v-if="nodeId" class="flex items-center gap-1.5 bg-gray-50/80 px-1 py-1 border border-gray-100 h-8">
    <div class="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-sm">{{ tagName }}</div>

    <div class="w-px h-3 bg-gray-200 mx-0.5"></div>

    <div class="flex items-center gap-0.5">
      <button
        @click="selectParent"
        class="p-1 text-gray-500 hover:text-gray-800 hover:bg-white rounded-sm transition-colors"
        title="Selecionar Pai"
      >
        <IconSelectParent />
      </button>
      <button
        @click="moveUp"
        :disabled="!canMoveUp"
        class="p-1 text-gray-500 hover:text-gray-800 hover:bg-white rounded-sm transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        title="Mover para Cima"
      >
        <IconChevronUp />
      </button>
      <button
        @click="moveDown"
        :disabled="!canMoveDown"
        class="p-1 text-gray-500 hover:text-gray-800 hover:bg-white rounded-sm transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        title="Mover para Baixo"
      >
        <IconChevronDown />
      </button>
    </div>
  </div>
</template>
