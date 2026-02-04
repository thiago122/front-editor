<script setup>
import { history } from '@/editor/history/HistoryManager'
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import IconUndo from '@/components/icons/IconUndo.vue'
import IconRedo from '@/components/icons/IconRedo.vue'
// Como o history é exportado como uma instância reativa:
// export const history = reactive(new HistoryManager())

const canUndo = computed(() => history.undoStack.length > 0)
const canRedo = computed(() => history.redoStack.length > 0)

const undo = () => useEditorStore().undo()
const redo = () => useEditorStore().redo()
</script>

<template>
  <div class="flex gap-2">
    <button
      @click="undo"
      :disabled="!canUndo"
      class="p-2 hover:bg-gray-100 disabled:opacity-30 transition-opacity p-2 rounded-md hover:bg-surface-hover text-text-tertiary hover:text-text-secondary transition-colors"
      title="Desfazer (Ctrl+Z)"
    >
      <iconUndo />
    </button>

    <button
      @click="redo"
      :disabled="!canRedo"
      class="p-2 hover:bg-gray-100 disabled:opacity-30 transition-opacity"
      title="Refazer (Ctrl+Y)"
    >
      <iconRedo />
    </button>
  </div>
</template>
