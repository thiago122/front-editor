<script setup>
import { computed, watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSelect from '@/components/ui/VisualSelect.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const POSITION_PROPS = [
  'position', 'top', 'right', 'bottom', 'left', 'z-index'
]

const { hasAnyValue, useProp } = useVisualSection(() => props.ruleGetter(), POSITION_PROPS)

const emit = defineEmits(['has-value'])
watch(hasAnyValue, (v) => emit('has-value', v), { immediate: true })

const position = useProp('position')
const top      = useProp('top')
const right    = useProp('right')
const bottom   = useProp('bottom')
const left     = useProp('left')
const zIndex   = useProp('z-index')

const posOptions = ['static', 'relative', 'absolute', 'fixed', 'sticky']
const units = ['px', 'rem', 'em', '%', 'vh', 'vw']

const isStatic = computed(() => !position.raw.value || position.raw.value === 'static')

defineExpose({ hasAnyValue })
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <VisualSelect
        label="Pos"
        help="position: Define o método de posicionamento (static, relative, absolute, etc.)"
        :modelValue="position.raw.value"
        @update:modelValue="v => position.set(v)"
        :options="posOptions"
        placeholder="static"
      />
      <VisualInput
        label="Z"
        help="z-index: Controla a ordem de empilhamento vertical (camadas)"
        :modelValue="zIndex.raw.value"
        @update:modelValue="v => zIndex.set(v)"
        placeholder="0"
        :units="[]"
        :keywords="['auto', 'inherit', 'initial']"
        allow-negative
      />

    </div>

    <!-- Offsets -->
    <div class="grid grid-cols-2 gap-x-3 gap-y-2 mt-1">
      <VisualInput label="T" help="top: Deslocamento em relação ao topo" :modelValue="top.value.value" :unit="top.unit.value" :units="units" :keywords="['auto', 'inherit']" allow-negative @update:modelValue="v => top.set(v, top.unit.value)" @update:unit="u => top.set(top.value.value, u)" placeholder="auto" />
      <VisualInput label="R" help="right: Deslocamento em relação à direita" :modelValue="right.value.value" :unit="right.unit.value" :units="units" :keywords="['auto', 'inherit']" allow-negative @update:modelValue="v => right.set(v, right.unit.value)" @update:unit="u => right.set(right.value.value, u)" placeholder="auto" />
      <VisualInput label="B" help="bottom: Deslocamento em relação à base" :modelValue="bottom.value.value" :unit="bottom.unit.value" :units="units" :keywords="['auto', 'inherit']" allow-negative @update:modelValue="v => bottom.set(v, bottom.unit.value)" @update:unit="u => bottom.set(bottom.value.value, u)" placeholder="auto" />
      <VisualInput label="L" help="left: Deslocamento em relação à esquerda" :modelValue="left.value.value" :unit="left.unit.value" :units="units" :keywords="['auto', 'inherit']" allow-negative @update:modelValue="v => left.set(v, left.unit.value)" @update:unit="u => left.set(left.value.value, u)" placeholder="auto" />

    </div>
  </div>
</template>
