<script setup>
import { ref, watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualToggleGroup from '@/components/ui/VisualToggleGroup.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const getRule = () => props.ruleGetter()

const OVERFLOW_PROPS = ['overflow', 'overflow-x', 'overflow-y']
const { useProp } = useVisualSection(getRule, OVERFLOW_PROPS)

const overflow  = useProp('overflow')
const overflowX = useProp('overflow-x')
const overflowY = useProp('overflow-y')

// ── UI State ──────────────────────────────────────────────────────────────────
const isLinked = ref(true)

// Backup stores values to restore them when switching modes
const backup = ref({
  linked: null,
  unlinked: { x: null, y: null }
})

const overflowOptions = [
  { value: 'visible', label: 'Visible', icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="12" height="12"/><path d="M2 2l16 16M18 2L2 18" stroke-opacity=".2"/></svg>` },
  { value: 'hidden',  label: 'Hidden',  icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="12" height="12" stroke-dasharray="2 2"/><path d="M7 7l6 6M13 7l-6 6"/></svg>` },
  { value: 'clip',    label: 'Clip',    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 0V9a3 3 0 0 1 3-3h12m-6 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 6v6a3 3 0 0 1-3 3H3" /></svg>` },
  { value: 'scroll',  label: 'Scroll',  icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="12" height="12"/><path d="M16 6v8M6 16h8"/></svg>` },
  { value: 'auto',    label: 'Auto',    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M10 4v12M4 10h12" stroke-dasharray="2 2"/></svg>` },
]

// ── Logic ─────────────────────────────────────────────────────────────────────

function detectInitialState() {
  const hasSh = !!overflow.raw.value
  const hasIndiv = !!(overflowX.raw.value || overflowY.raw.value)

  // If we have individual props but no shorthand, it's unlinked
  if (hasIndiv && !hasSh) {
    isLinked.value = false
  } else {
    isLinked.value = true
  }
}

watch(() => {
  const rule = getRule()
  return rule?.id ?? rule?.selector ?? null
}, (newId, oldId) => {
  if (newId !== oldId) detectInitialState()
}, { immediate: true })

function toggleLink() {
  if (isLinked.value) {
    // Linked -> Unlinked
    backup.value.linked = overflow.raw.value
    overflow.set(null)
    
    if (backup.value.unlinked.x || backup.value.unlinked.y) {
      overflowX.set(backup.value.unlinked.x)
      overflowY.set(backup.value.unlinked.y)
    }
    isLinked.value = false
  } else {
    // Unlinked -> Linked
    backup.value.unlinked = { x: overflowX.raw.value, y: overflowY.raw.value }
    overflowX.set(null)
    overflowY.set(null)
    
    if (backup.value.linked) {
      overflow.set(backup.value.linked)
    }
    isLinked.value = true
  }
}

// Keep backup updated while typing
watch(() => overflow.raw.value, (v) => { if (isLinked.value && v) backup.value.linked = v })
watch([() => overflowX.raw.value, () => overflowY.raw.value], ([x, y]) => {
  if (!isLinked.value) backup.value.unlinked = { x, y }
})

</script>

<template>
  <div class="flex flex-col gap-1.5 pt-2 border-t border-gray-100 mt-1">
    <!-- Header Minimalista -->
    <div class="flex items-center gap-2 mb-0.5">
      <span class="text-[10px] text-blue-700 font-semibold uppercase opacity-70 tracking-tight">Overflow</span>
      <button 
        @click="toggleLink" 
        class="p-0.5 rounded hover:bg-blue-100 transition-colors"
        :class="isLinked ? 'text-blue-600' : 'text-gray-400'"
        title="Vincular/Desvincular eixos"
      >
        <svg v-if="isLinked" viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <svg v-else viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 11V7a4 4 0 1 1 8 0m0 4v2m-8-2v3m-2 5h12a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2Z"/></svg>
      </button>
    </div>

    <!-- Linked State: Single toggle for both -->
    <div v-if="isLinked">
      <VisualToggleGroup 
        help="overflow: Controla ambos os eixos simultaneamente"
        :modelValue="overflow.raw.value" 
        @update:modelValue="v => overflow.set(v)" 
        :options="overflowOptions" 
      />
    </div>

    <!-- Unlinked State: Independent X and Y -->
    <div v-else class="flex flex-col gap-2">
      <VisualToggleGroup 
        label="X" 
        help="overflow-x: Comportamento horizontal"
        :modelValue="overflowX.raw.value" 
        @update:modelValue="v => overflowX.set(v)" 
        :options="overflowOptions" 
      />
      <VisualToggleGroup 
        label="Y" 
        help="overflow-y: Comportamento vertical"
        :modelValue="overflowY.raw.value" 
        @update:modelValue="v => overflowY.set(v)" 
        :options="overflowOptions" 
      />
    </div>
  </div>
</template>
