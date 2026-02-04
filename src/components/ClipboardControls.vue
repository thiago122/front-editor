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
  <div class="flex gap-1">
    <button
      class="p-2 rounded-md transition-colors bg-surface-hover text-text-primary"
      @click="copy"
      :disabled="!hasSelection"
    >
      <IconCopy />
    </button>

    <button
      class="p-2 rounded-md transition-colors bg-surface-hover text-text-primary"
      @click="paste"
      :disabled="!canPaste"
    >
      <IconPaste />
    </button>

    <button
      class="p-2 rounded-md transition-colors bg-surface-hover text-text-primary"
      @click="duplicate"
      :disabled="!hasSelection"
    >
      <IconDuplicate />
    </button>
  </div>
</template>
