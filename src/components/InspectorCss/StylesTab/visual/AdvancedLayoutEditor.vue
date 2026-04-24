<script setup>
import { watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualSelect from '@/components/ui/VisualSelect.vue'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualToggleGroup from '@/components/ui/VisualToggleGroup.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const ADVANCED_PROPS = [
  'box-sizing', 'object-fit', 'aspect-ratio'
]

const { hasAnyValue, useProp } = useVisualSection(() => props.ruleGetter(), ADVANCED_PROPS)

const emit = defineEmits(['has-value'])
watch(hasAnyValue, (v) => emit('has-value', v), { immediate: true })

const boxSizing   = useProp('box-sizing')
const objectFit   = useProp('object-fit')
const aspectRatio = useProp('aspect-ratio')

const boxSizingOptions = [
  { value: 'border-box',  label: 'Border Box' },
  { value: 'content-box', label: 'Content Box' },
]

const objectFitOptions = [
  { value: 'cover',   label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill',    label: 'Fill' },
  { value: 'none',    label: 'None' },
  { value: 'scale-down', label: 'Scale Down' },
]

defineExpose({ hasAnyValue })
</script>

<template>
  <div class="flex flex-col gap-3">
    <VisualSelect 
      label="Box Model" 
      help="box-sizing: Define como a largura e altura totais do elemento são calculadas"
      :modelValue="boxSizing.raw.value" 
      @update:modelValue="v => boxSizing.set(v)" 
      :options="boxSizingOptions"
      placeholder="Default"
    />

    <VisualSelect 
      label="Object Fit" 
      help="object-fit: Controla como o conteúdo de um elemento (como <img> ou <video>) se ajusta ao seu container"
      :modelValue="objectFit.raw.value" 
      @update:modelValue="v => objectFit.set(v)" 
      :options="objectFitOptions"
      placeholder="Default"
    />

    <VisualInput 
      label="Ratio" 
      help="aspect-ratio: Define uma proporção preferencial para o elemento (ex: 16/9)"
      :modelValue="aspectRatio.raw.value" 
      @update:modelValue="v => aspectRatio.set(v)" 
      :units="[]"
      placeholder="16/9, 1/1..."
    />
  </div>
</template>
