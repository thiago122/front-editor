<script setup>
import { computed } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSelect from '@/components/ui/VisualSelect.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const POSITION_PROPS = [
  'position', 'top', 'right', 'bottom', 'left', 'z-index'
]

const { showContent, hasAnyValue, useProp } = useVisualSection(() => props.ruleGetter(), POSITION_PROPS)

const position = useProp('position')
const top      = useProp('top')
const right    = useProp('right')
const bottom   = useProp('bottom')
const left     = useProp('left')
const zIndex   = useProp('z-index')

const posOptions = ['static', 'relative', 'absolute', 'fixed', 'sticky']
const units = ['px', 'rem', 'em', '%', 'vh', 'vw']

const isStatic = computed(() => !position.raw.value || position.raw.value === 'static')
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div
      class="flex items-center justify-between border-b border-gray-100 pb-1 cursor-pointer select-none"
      @click="showContent = !showContent"
    >
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Positioning</span>
      <div class="flex items-center gap-1.5">
        <span
          v-if="hasAnyValue"
          class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"
        ></span>
        <svg class="w-3 h-3 text-gray-400 transition-transform" :class="showContent ? '' : '-rotate-90'"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <div v-show="showContent" class="flex flex-col gap-2 pt-1">
      <div class="flex items-center gap-2">
        <VisualSelect
          label="Pos"
          :modelValue="position.raw.value"
          @update:modelValue="v => position.set(v)"
          :options="posOptions"
          placeholder="static"
        />
        <VisualInput
          label="Z"
          :modelValue="zIndex.raw.value"
          @update:modelValue="v => zIndex.set(v)"
          placeholder="0"
          :units="[]"
          allow-negative
        />

      </div>

      <!-- Offsets -->
      <div class="grid grid-cols-2 gap-x-3 gap-y-2 mt-1">
        <VisualInput label="T" :modelValue="top.value.value" :unit="top.unit.value" :units="units" allow-negative @update:modelValue="v => top.set(v, top.unit.value)" @update:unit="u => top.set(top.value.value, u)" placeholder="auto" />
        <VisualInput label="R" :modelValue="right.value.value" :unit="right.unit.value" :units="units" allow-negative @update:modelValue="v => right.set(v, right.unit.value)" @update:unit="u => right.set(right.value.value, u)" placeholder="auto" />
        <VisualInput label="B" :modelValue="bottom.value.value" :unit="bottom.unit.value" :units="units" allow-negative @update:modelValue="v => bottom.set(v, bottom.unit.value)" @update:unit="u => bottom.set(bottom.value.value, u)" placeholder="auto" />
        <VisualInput label="L" :modelValue="left.value.value" :unit="left.unit.value" :units="units" allow-negative @update:modelValue="v => left.set(v, left.unit.value)" @update:unit="u => left.set(left.value.value, u)" placeholder="auto" />

      </div>
    </div>
  </div>
</template>
