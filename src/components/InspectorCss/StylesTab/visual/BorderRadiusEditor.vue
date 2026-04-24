<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualFieldset from '@/components/ui/VisualFieldset.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})
const getRule = () => props.ruleGetter()

const RADIUS_PROPS = [
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius'
]

const { useProp } = useVisualSection(getRule, RADIUS_PROPS)

const radius   = useProp('border-radius')
const radiusTL = useProp('border-top-left-radius')
const radiusTR = useProp('border-top-right-radius')
const radiusBR = useProp('border-bottom-right-radius')
const radiusBL = useProp('border-bottom-left-radius')

const hasAnyRadiusValue = computed(() => 
  RADIUS_PROPS.some(p => !!useProp(p).raw.value)
)

// ── UI State ──────────────────────────────────────────────────────────────────

const isRadiusLinked = ref(true)

// Backup for preserving values during transitions
const radiusBackup = ref({
  linked: { value: null, unit: 'px' },
  unlinked: {
    tl: { value: null, unit: 'px' },
    tr: { value: null, unit: 'px' },
    br: { value: null, unit: 'px' },
    bl: { value: null, unit: 'px' }
  }
})

// ── Logic ─────────────────────────────────────────────────────────────────────

function detectInitialState() {
  const hasSh = !!radius.raw.value
  const hasIndiv = !!(radiusTL.raw.value || radiusTR.raw.value || radiusBR.raw.value || radiusBL.raw.value)

  if (hasIndiv && !hasSh) {
    isRadiusLinked.value = false
  } else {
    isRadiusLinked.value = true
  }
}

// Watch for element changes to re-detect state
watch(() => {
  const rule = getRule()
  return rule?.id ?? rule?.selector ?? null
}, (newId, oldId) => {
  if (newId !== oldId) {
    detectInitialState()
  }
}, { immediate: true })

function toggleRadiusLink() {
  if (isRadiusLinked.value) {
    // Switching to Unlinked: Save current shorthand and set individuals
    radiusBackup.value.linked = { value: radius.value.value, unit: radius.unit.value }
    
    // Clear shorthand from CSS
    radius.set(null)
    
    // Restore individuals from backup
    const bk = radiusBackup.value.unlinked
    radiusTL.set(bk.tl.value, bk.tl.unit)
    radiusTR.set(bk.tr.value, bk.tr.unit)
    radiusBR.set(bk.br.value, bk.br.unit)
    radiusBL.set(bk.bl.value, bk.bl.unit)
    
    isRadiusLinked.value = false
  } else {
    // Switching to Linked: Save individuals and set shorthand
    const bk = radiusBackup.value.unlinked
    bk.tl = { value: radiusTL.value.value, unit: radiusTL.unit.value }
    bk.tr = { value: radiusTR.value.value, unit: radiusTR.unit.value }
    bk.br = { value: radiusBR.value.value, unit: radiusBR.unit.value }
    bk.bl = { value: radiusBL.value.value, unit: radiusBL.unit.value }
    
    // Clear individuals from CSS
    radiusTL.set(null); radiusTR.set(null); radiusBR.set(null); radiusBL.set(null)
    
    // Restore shorthand from backup
    const lb = radiusBackup.value.linked
    radius.set(lb.value, lb.unit)
    
    isRadiusLinked.value = true
  }
}

// Helper to keep backup updated while typing (to preserve values on toggle even without toggle event)
// Note: In toggleRadiusLink we already save, but saving on every change ensures the backup is always fresh.
watch([radius.raw], () => {
  if (isRadiusLinked.value) {
    radiusBackup.value.linked = { value: radius.value.value, unit: radius.unit.value }
  }
})
watch([radiusTL.raw, radiusTR.raw, radiusBR.raw, radiusBL.raw], () => {
  if (!isRadiusLinked.value) {
    radiusBackup.value.unlinked = {
      tl: { value: radiusTL.value.value, unit: radiusTL.unit.value },
      tr: { value: radiusTR.value.value, unit: radiusTR.unit.value },
      br: { value: radiusBR.value.value, unit: radiusBR.unit.value },
      bl: { value: radiusBL.value.value, unit: radiusBL.unit.value }
    }
  }
})

</script>

<template>
  <VisualFieldset label="Radius" collapsible :default-open="hasAnyRadiusValue" :has-value="hasAnyRadiusValue">
    <template #badge>
      <button @click="toggleRadiusLink" class="p-0.5 rounded hover:bg-blue-100 transition-colors" :class="isRadiusLinked ? 'text-blue-600' : 'text-gray-400'">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path v-if="isRadiusLinked" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path v-if="isRadiusLinked" d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 00 7.07 7.07l1.71-1.71" />
          <path v-else d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </template>

    <div v-if="isRadiusLinked" class="flex flex-col gap-2">
      <VisualInput 
        label="Radius" 
        :modelValue="radius.value.value" 
        :unit="radius.unit.value" 
        :units="['px', '%', 'rem', 'em']" 
        @update:modelValue="v => radius.set(v, radius.unit.value)" 
        @update:unit="u => radius.set(radius.value.value, u)" 
        placeholder="0" 
      >
        <template #icon>
          <svg class="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="4" />
          </svg>
        </template>
      </VisualInput>
    </div>

    <div v-else class="grid grid-cols-2 gap-3 p-1 bg-gray-50/50 rounded-lg border border-gray-100">
      <div v-for="c in [
        { id: 'tl', label: 'TL', prop: radiusTL, icon: 'M4 20V8a4 4 0 0 1 4-4h12' },
        { id: 'tr', label: 'TR', prop: radiusTR, icon: 'M4 4h12a4 4 0 0 1 4 4v12' },
        { id: 'bl', label: 'BL', prop: radiusBL, icon: 'M20 20H8a4 4 0 0 1-4-4V4' },
        { id: 'br', label: 'BR', prop: radiusBR, icon: 'M4 20h12a4 4 0 0 0 4-4V4' }
      ]" :key="c.id" class="flex flex-col gap-1">
        <div class="flex items-center gap-1.5 px-0.5">
          <svg class="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path :d="c.icon" />
          </svg>
          <span class="text-[9px] font-bold text-gray-400 uppercase leading-none">{{c.label}}</span>
        </div>
        <VisualInput 
          :modelValue="c.prop.value.value" 
          :unit="c.prop.unit.value" 
          :units="['px', '%', 'rem']"
          @update:modelValue="v => c.prop.set(v, c.prop.unit.value)" 
          @update:unit="u => c.prop.set(c.prop.value.value, u)" 
          placeholder="0"
          compact
        />
      </div>
    </div>
  </VisualFieldset>
</template>
