<script setup>
import { unifiedHistory } from '@/editor/history/UnifiedHistoryManager'
import { useEditorStore } from '@/stores/EditorStore'
import IconUndo from '@/components/icons/IconUndo.vue'
import IconRedo from '@/components/icons/IconRedo.vue'

const EditorStore = useEditorStore()

// Um único par de botões — HTML e CSS compartilham a mesma pilha cronológica
const undo = () => EditorStore.undo()
const redo = () => EditorStore.redo()
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      @click="undo"
      :disabled="!unifiedHistory.canUndo"
      class="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-all text-text-tertiary hover:text-text-secondary"
      title="Desfazer (Ctrl+Z)"
    >
      <IconUndo />
    </button>
    <button
      @click="redo"
      :disabled="!unifiedHistory.canRedo"
      class="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-all text-text-tertiary hover:text-text-secondary"
      title="Refazer (Ctrl+Y)"
    >
      <IconRedo />
    </button>
  </div>
</template>
