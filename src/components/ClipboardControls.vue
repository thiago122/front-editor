<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'
import IconCopy from '@/components/icons/IconCopy.vue'
import IconPaste from '@/components/icons/IconPaste.vue'
import IconDuplicate from '@/components/icons/IconDuplicate.vue'

const store = useEditorStore()

const props = defineProps({
  nodeId: {
    type: String,
    required: false,
  },
})

// Validation Logic
const hasSelection = computed(() => !!props.nodeId)
const canPaste = computed(() => hasSelection.value && store.canPaste)

// Actions
const copy = () => {
  if (hasSelection.value) NodeDispatcher.copyNode(props.nodeId)
}

const paste = () => {
  if (canPaste.value) NodeDispatcher.pasteNode(props.nodeId)
}

const duplicate = () => {
  if (hasSelection.value) NodeDispatcher.duplicateNode(props.nodeId)
}
</script>

<template>
  <div class="flex items-center gap-0.5">
    <button
      class="p-1.5 rounded-sm transition-colors text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
      @click="copy"
      :disabled="!hasSelection"
      title="Copiar"
    >
      <IconCopy />
    </button>

    <button
      class="p-1.5 rounded-sm transition-colors text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
      @click="paste"
      :disabled="!canPaste"
      title="Colar"
    >
      <IconPaste />
    </button>

    <button
      class="p-1.5 rounded-sm transition-colors text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
      @click="duplicate"
      :disabled="!hasSelection"
      title="Duplicar"
    >
      <IconDuplicate />
    </button>
  </div>
</template>
