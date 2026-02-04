<script setup>
import { computed } from 'vue'

const props = defineProps({
  rect: {
    type: Object,
    default: null,
  },
  label: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div
    v-if="rect"
    class="pointer-events-none fixed z-[9999] border-2 border-blue-500 bg-blue-500/10 transition-all duration-75"
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
