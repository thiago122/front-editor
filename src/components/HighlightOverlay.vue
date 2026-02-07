<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'

const props = defineProps({
  mode: {
    type: String,
    default: 'hover', // 'hover' | 'selection'
  },
})

const EditorStore = useEditorStore()

const rect = computed(() => {
  const el = props.mode === 'hover' ? EditorStore.hoveredElement : EditorStore.selectedElement
  if (!el || !EditorStore.iframe) return null

  const rect = el.getBoundingClientRect()
  const iframeRect = EditorStore.iframe.getBoundingClientRect()

  return {
    top: rect.top + iframeRect.top,
    left: rect.left + iframeRect.left,
    width: rect.width,
    height: rect.height,
  }
})

const label = computed(() => {
  const el = props.mode === 'hover' ? EditorStore.hoveredElement : EditorStore.selectedElement
  if (!el) return ''
  return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
})
</script>

<template>
  <div
    v-if="rect"
    class="pointer-events-none fixed z-[9999] border-1 transition-all duration-75"
    :class="
      mode === 'hover'
        ? 'border-blue-500 bg-blue-500/10'
        : 'border-blue-600 border-dashed bg-transparent'
    "
    :style="{
      top: rect.top + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
    }"
  >
    <!-- Tag Label (estilo DevTools) -->
    <div
      v-if="label"
      class="absolute bottom-full left-0 mb-1 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded flex items-center gap-1 whitespace-nowrap shadow-sm"
    >
      <span class="opacity-80">{{ label }}</span>
      <span class="font-mono text-[9px] opacity-60"
        >{{ Math.round(rect.width) }} × {{ Math.round(rect.height) }}</span
      >
    </div>
  </div>
</template>
