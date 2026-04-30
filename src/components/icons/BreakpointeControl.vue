<template>
  <div class="flex items-center gap-0.5">
    <button
      class="flex items-center justify-center p-1.5 rounded-sm transition-colors"
      @click="update(360, 'px')"
      :class="previewUnit === 'px' && previewWidth === 360 ? 'bg-white ring-1 ring-gray-200/60 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      title="Mobile (360px)"
    >
      <IconBreakpointXS />
    </button>

    <button
      class="flex items-center justify-center p-1.5 rounded-sm transition-colors"
      @click="update(640, 'px')"
      :class="previewUnit === 'px' && previewWidth === 640 ? 'bg-white ring-1 ring-gray-200/60 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      title="Mobile Landscape (640px)"
    >
      <IconBreakpointSM />
    </button>

    <button
      class="flex items-center justify-center p-1.5 rounded-sm transition-colors"
      @click="update(768, 'px')"
      :class="previewUnit === 'px' && previewWidth === 768 ? 'bg-white ring-1 ring-gray-200/60 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      title="Tablet (768px)"
    >
      <IconBreakpointMD />
    </button>

    <button
      class="flex items-center justify-center p-1.5 rounded-sm transition-colors"
      @click="update(1024, 'px')"
      :class="previewUnit === 'px' && previewWidth === 1024 ? 'bg-white ring-1 ring-gray-200/60 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      title="Laptop (1024px)"
    >
      <IconBreakpointLG />
    </button>

    <button
      class="flex items-center justify-center p-1.5 rounded-sm transition-colors"
      @click="update(1280, 'px')"
      :class="previewUnit === 'px' && previewWidth === 1280 ? 'bg-white ring-1 ring-gray-200/60 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      title="Desktop (1280px)"
    >
      <IconBreakpointXL />
    </button>

    <button
      class="flex items-center justify-center p-1.5 rounded-sm transition-colors"
      @click="update(1536, 'px')"
      :class="previewUnit === 'px' && previewWidth === 1536 ? 'bg-white ring-1 ring-gray-200/60 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      title="Wide (1536px)"
    >
      <IconBreakpoint2XL />
    </button>

    <button
      class="flex items-center justify-center p-1.5 rounded-sm transition-colors"
      @click="update(100, '%')"
      :class="previewUnit === '%' && previewWidth === 100 ? 'bg-white ring-1 ring-gray-200/60 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      title="Full Width (100%)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
    </button>

    <div class="ml-2 flex items-center bg-white border border-gray-200 rounded-md px-1.5 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/20 transition-all h-7">
      <input
        type="number"
        class="w-10 text-right bg-transparent text-[11px] outline-none font-mono font-medium text-gray-700"
        :value="previewWidth"
        @change="(e) => update(Number(e.target.value), 'px')"
      />
      <span class="text-[10px] font-semibold text-gray-400 ml-1">px</span>
    </div>
  </div>
</template>

<script setup>
import IconBreakpointXS from '@/components/icons/IconBreakpointXS.vue'
import IconBreakpointSM from '@/components/icons/IconBreakpointSM.vue'
import IconBreakpointMD from '@/components/icons/IconBreakpointMD.vue'
import IconBreakpointLG from '@/components/icons/IconBreakpointLG.vue'
import IconBreakpointXL from '@/components/icons/IconBreakpointXL.vue'
import IconBreakpoint2XL from '@/components/icons/IconBreakpoint2XL.vue'

const props = defineProps({
  previewWidth: {
    type: Number,
    default: 1280,
  },
  previewUnit: {
    type: String,
    default: 'px',
  },
})
const emit = defineEmits(['update'])

function update(width, unit) {
  emit('update', { width: width, unit: unit })
}
</script>
