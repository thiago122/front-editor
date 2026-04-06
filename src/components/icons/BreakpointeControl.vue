<template>
  <div class="flex gap-2">
    <div
      class="flex flex-col items-center hover:bg-gray-100 cursor-default p-1"
      @click="update(360, 'px')"
      :class="previewUnit === 'px' && previewWidth === 360 ? 'bg-gray-200' : ''"
    >
      <IconBreakpointXS /><span class="text-[10px]">360</span>
    </div>

    <div
      class="flex flex-col items-center hover:bg-gray-100 cursor-default p-1"
      @click="update(640, 'px')"
      :class="previewUnit === 'px' && previewWidth === 640 ? 'bg-gray-200' : ''"
    >
      <IconBreakpointSM /><span class="text-[10px]">640</span>
    </div>

    <div
      class="flex flex-col items-center hover:bg-gray-100 cursor-default p-1"
      @click="update(768, 'px')"
      :class="previewUnit === 'px' && previewWidth === 768 ? 'bg-gray-200' : ''"
    >
      <IconBreakpointMD /><span class="text-[10px]">768</span>
    </div>

    <div
      class="flex flex-col items-center hover:bg-gray-100 cursor-default p-1"
      @click="update(1024, 'px')"
      :class="previewUnit === 'px' && previewWidth === 1024 ? 'bg-gray-200' : ''"
    >
      <IconBreakpointLG /><span class="text-[10px]">1024</span>
    </div>

    <div
      class="flex flex-col items-center hover:bg-gray-100 cursor-default p-1"
      @click="update(1280, 'px')"
      :class="previewUnit === 'px' && previewWidth === 1280 ? 'bg-gray-200' : ''"
    >
      <IconBreakpointXL /><span class="text-[10px]">1280</span>
    </div>

    <div
      class="flex flex-col items-center hover:bg-gray-100 cursor-default p-1"
      @click="update(1536, 'px')"
      :class="previewUnit === 'px' && previewWidth === 1536 ? 'bg-gray-200' : ''"
    >
      <IconBreakpoint2XL /><span class="text-[10px]">1536</span>
    </div>

    <div
      class="flex flex-col items-center hover:bg-gray-100 cursor-default p-1"
      @click="update(100, '%')"
      :class="previewUnit === '%' && previewWidth === 100 ? 'bg-gray-200' : ''"
    >
      <IconBreakpoint2XL /><span class="text-[10px]">full</span>
    </div>

    <div class="ml-1 flex items-center bg-gray-100 rounded px-1.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-400 group h-full py-1">
      <input
        type="number"
        class="w-10 text-right bg-transparent text-[11px] outline-none font-mono text-gray-700"
        :value="previewWidth"
        @change="(e) => update(Number(e.target.value), 'px')"
      />
      <span class="text-[10px] text-gray-400 ml-0.5">px</span>
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
