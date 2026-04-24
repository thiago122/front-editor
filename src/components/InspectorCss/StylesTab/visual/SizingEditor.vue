<script setup>
import { watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualToggleGroup from '@/components/ui/VisualToggleGroup.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const SIZING_PROPS = [
  'width', 'height',
  'min-width', 'min-height',
  'max-width', 'max-height',
  'overflow-x', 'overflow-y'
]

const { hasAnyValue, useProp } = useVisualSection(() => props.ruleGetter(), SIZING_PROPS)

const emit = defineEmits(['has-value'])
watch(hasAnyValue, (v) => emit('has-value', v), { immediate: true })

const width      = useProp('width')
const height     = useProp('height')
const minWidth   = useProp('min-width')
const minHeight  = useProp('min-height')
const maxWidth   = useProp('max-width')
const maxHeight  = useProp('max-height')
const overflowX  = useProp('overflow-x')
const overflowY  = useProp('overflow-y')

const units = ['px', 'rem', 'em', '%', 'vh', 'vw', 'fit-content', 'auto']

const overflowOptions = [
  { value: 'visible', label: 'Visible', icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="12" height="12"/><path d="M2 2l16 16M18 2L2 18" stroke-opacity=".2"/></svg>` },
  { value: 'hidden',  label: 'Hidden',  icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="12" height="12" stroke-dasharray="2 2"/><path d="M7 7l6 6M13 7l-6 6"/></svg>` },
  { value: 'scroll',  label: 'Scroll',  icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="12" height="12"/><path d="M16 6v8M6 16h8"/></svg>` },
  { value: 'auto',    label: 'Auto',    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M10 4v12M4 10h12" stroke-dasharray="2 2"/></svg>` },
]

defineExpose({ hasAnyValue })
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Width / Height -->
    <div class="grid grid-cols-2 gap-2">
      <VisualInput
        label="W"
        help="width: Define a largura do elemento"
        :modelValue="width.value.value"
        :unit="width.unit.value"
        :units="units"
        :keywords="['auto', 'min-content', 'max-content', 'fit-content', 'inherit']"
        @update:modelValue="v => width.set(v, width.unit.value)"
        @update:unit="u => width.set(width.value.value, u)"
        placeholder="auto"
      />
      <VisualInput
        label="H"
        help="height: Define a altura do elemento"
        :modelValue="height.value.value"
        :unit="height.unit.value"
        :units="units"
        :keywords="['auto', 'min-content', 'max-content', 'fit-content', 'inherit']"
        @update:modelValue="v => height.set(v, height.unit.value)"
        @update:unit="u => height.set(height.value.value, u)"
        placeholder="auto"
      />
    </div>

    <!-- Min Width / Height -->
    <div class="grid grid-cols-2 gap-2">
      <VisualInput
        label="Min W"
        help="min-width: Garante que o elemento não seja menor que este valor"
        :modelValue="minWidth.value.value"
        :unit="minWidth.unit.value"
        :units="units"
        :keywords="['auto', 'min-content', 'max-content', 'fit-content']"
        @update:modelValue="v => minWidth.set(v, minWidth.unit.value)"
        @update:unit="u => minWidth.set(minWidth.value.value, u)"
        placeholder="0"
      />
      <VisualInput
        label="Min H"
        help="min-height: Garante que o elemento não seja mais baixo que este valor"
        :modelValue="minHeight.value.value"
        :unit="minHeight.unit.value"
        :units="units"
        :keywords="['auto', 'min-content', 'max-content', 'fit-content']"
        @update:modelValue="v => minHeight.set(v, minHeight.unit.value)"
        @update:unit="u => minHeight.set(minHeight.value.value, u)"
        placeholder="0"
      />
    </div>

    <!-- Max Width / Height -->
    <div class="grid grid-cols-2 gap-2">
      <VisualInput
        label="Max W"
        help="max-width: Impede que o elemento cresça além desta largura"
        :modelValue="maxWidth.value.value"
        :unit="maxWidth.unit.value"
        :units="units"
        :keywords="['none', 'max-content', 'min-content', 'fit-content']"
        @update:modelValue="v => maxWidth.set(v, maxWidth.unit.value)"
        @update:unit="u => maxWidth.set(maxWidth.value.value, u)"
        placeholder="none"
      />
      <VisualInput
        label="Max H"
        help="max-height: Impede que o elemento cresça além desta altura"
        :modelValue="maxHeight.value.value"
        :unit="maxHeight.unit.value"
        :units="units"
        :keywords="['none', 'max-content', 'min-content', 'fit-content']"
        @update:modelValue="v => maxHeight.set(v, maxHeight.unit.value)"
        @update:unit="u => maxHeight.set(maxHeight.value.value, u)"
        placeholder="none"
      />
    </div>
    <!-- Overflow -->
    <div class="flex flex-col gap-2 pt-2 border-t border-gray-100 mt-1">
      <div class="text-[12px] text-blue-700 font-normal" title="overflow: Controla como o conteúdo transbordado é tratado">Overflow</div>
      <VisualToggleGroup 
        label="X" 
        help="overflow-x: Comportamento de transbordamento horizontal"
        :modelValue="overflowX.raw.value" 
        @update:modelValue="v => overflowX.set(v)" 
        :options="overflowOptions" 
      />
      <VisualToggleGroup 
        label="Y" 
        help="overflow-y: Comportamento de transbordamento vertical"
        :modelValue="overflowY.raw.value" 
        @update:modelValue="v => overflowY.set(v)" 
        :options="overflowOptions" 
      />
    </div>
  </div>
</template>
