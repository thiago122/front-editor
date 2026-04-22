<script setup>
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const SIZING_PROPS = [
  'width', 'height',
  'min-width', 'min-height',
  'max-width', 'max-height',
]

const { showContent, hasAnyValue, useProp } = useVisualSection(() => props.ruleGetter(), SIZING_PROPS)

const width     = useProp('width')
const height    = useProp('height')
const minWidth  = useProp('min-width')
const minHeight = useProp('min-height')
const maxWidth  = useProp('max-width')
const maxHeight = useProp('max-height')

const units = ['px', 'rem', 'em', '%', 'vh', 'vw', 'fit-content', 'auto']
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div
      class="flex items-center justify-between border-b border-gray-100 pb-1 cursor-pointer select-none"
      @click="showContent = !showContent"
    >
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sizing</span>
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
      <!-- Width / Height -->
      <div class="grid grid-cols-2 gap-2">
        <VisualInput
          label="W"
          :modelValue="width.value.value"
          :unit="width.unit.value"
          :units="units"
          @update:modelValue="v => width.set(v, width.unit.value)"
          @update:unit="u => width.set(width.value.value, u)"
          placeholder="auto"
        />
        <VisualInput
          label="H"
          :modelValue="height.value.value"
          :unit="height.unit.value"
          :units="units"
          @update:modelValue="v => height.set(v, height.unit.value)"
          @update:unit="u => height.set(height.value.value, u)"
          placeholder="auto"
        />
      </div>

      <!-- Min Width / Height -->
      <div class="grid grid-cols-2 gap-2">
        <VisualInput
          label="Min W"
          :modelValue="minWidth.value.value"
          :unit="minWidth.unit.value"
          :units="units"
          @update:modelValue="v => minWidth.set(v, minWidth.unit.value)"
          @update:unit="u => minWidth.set(minWidth.value.value, u)"
          placeholder="0"
        />
        <VisualInput
          label="Min H"
          :modelValue="minHeight.value.value"
          :unit="minHeight.unit.value"
          :units="units"
          @update:modelValue="v => minHeight.set(v, minHeight.unit.value)"
          @update:unit="u => minHeight.set(minHeight.value.value, u)"
          placeholder="0"
        />
      </div>

      <!-- Max Width / Height -->
      <div class="grid grid-cols-2 gap-2">
        <VisualInput
          label="Max W"
          :modelValue="maxWidth.value.value"
          :unit="maxWidth.unit.value"
          :units="units"
          @update:modelValue="v => maxWidth.set(v, maxWidth.unit.value)"
          @update:unit="u => maxWidth.set(maxWidth.value.value, u)"
          placeholder="none"
        />
        <VisualInput
          label="Max H"
          :modelValue="maxHeight.value.value"
          :unit="maxHeight.unit.value"
          :units="units"
          @update:modelValue="v => maxHeight.set(v, maxHeight.unit.value)"
          @update:unit="u => maxHeight.set(maxHeight.value.value, u)"
          placeholder="none"
        />
      </div>
    </div>
  </div>
</template>
