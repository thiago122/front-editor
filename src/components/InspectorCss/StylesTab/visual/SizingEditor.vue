<script setup>
import { watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import OverflowEditor from './OverflowEditor.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const SIZING_PROPS = [
  'width', 'height',
  'min-width', 'min-height',
  'max-width', 'max-height'
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

const units = ['px', 'rem', 'em', '%', 'vh', 'vw', 'fit-content', 'auto']

defineExpose({ hasAnyValue })
</script>

<template>
  <div class="flex flex-col gap-1.5">
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

    <!-- Overflow Modular -->
    <OverflowEditor :rule-getter="props.ruleGetter" />
  </div>
</template>
