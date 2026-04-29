<script setup>
import { watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import MarginEditor from './MarginEditor.vue'
import PaddingEditor from './PaddingEditor.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const SPACING_PROPS = [
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'
]

const { hasAnyValue } = useVisualSection(() => props.ruleGetter(), SPACING_PROPS)

const emit = defineEmits(['has-value'])
watch(hasAnyValue, (v) => emit('has-value', v), { immediate: true })

defineExpose({ hasAnyValue })
</script>

<template>
  <div class="flex flex-col gap-5 pt-1">
    <!-- Componente de Margem Modular -->
    <MarginEditor :rule-getter="props.ruleGetter" />

    <!-- Componente de Preenchimento Modular -->
    <PaddingEditor :rule-getter="props.ruleGetter" />
  </div>
</template>
