<script setup>
import { history } from '@/editor/history/HistoryManager'
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import IconUndo from '@/components/icons/IconUndo.vue'
import IconRedo from '@/components/icons/IconRedo.vue'

const EditorStore = useEditorStore()
const styleStore  = useStyleStore()

// ── HTML history ────────────────────────────────────────────────────────────
const canUndo = computed(() => history.undoStack.length > 0)
const canRedo = computed(() => history.redoStack.length > 0)
const undo = () => EditorStore.undo()
const redo = () => EditorStore.redo()

// ── CSS history ─────────────────────────────────────────────────────────────
const cssUndo = () => styleStore.cssUndo(EditorStore.getIframeDoc())
const cssRedo = () => styleStore.cssRedo(EditorStore.getIframeDoc())
</script>

<template>
  <div class="flex items-center gap-1">

    <!-- HTML Undo/Redo -->
    <button
      @click="undo"
      :disabled="!canUndo"
      class="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-all text-text-tertiary hover:text-text-secondary"
      title="HTML: Desfazer (Ctrl+Z)"
    >
      <IconUndo />
    </button>
    <button
      @click="redo"
      :disabled="!canRedo"
      class="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-all text-text-tertiary hover:text-text-secondary"
      title="HTML: Refazer (Ctrl+Y)"
    >
      <IconRedo />
    </button>

    <!-- Separador visual -->
    <span class="w-px h-4 bg-gray-200 mx-1" />

    <!-- CSS Undo/Redo -->
    <button
      @click="cssUndo"
      :disabled="!styleStore.canCssUndo"
      class="p-1.5 rounded-md hover:bg-purple-50 disabled:opacity-30 transition-all text-purple-400 hover:text-purple-600"
      title="CSS: Desfazer"
    >
      <IconUndo />
    </button>
    <button
      @click="cssRedo"
      :disabled="!styleStore.canCssRedo"
      class="p-1.5 rounded-md hover:bg-purple-50 disabled:opacity-30 transition-all text-purple-400 hover:text-purple-600"
      title="CSS: Refazer"
    >
      <IconRedo />
    </button>

  </div>
</template>
