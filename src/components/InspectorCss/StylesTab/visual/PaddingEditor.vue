<script setup>
import { ref, computed, watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSectionHeader from '@/components/ui/VisualSectionHeader.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})
const getRule = () => props.ruleGetter()

const PADDING_PROPS = [
  'padding',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left'
]

const { useProp } = useVisualSection(getRule, PADDING_PROPS)

const padding  = useProp('padding')
const paddingT = useProp('padding-top')
const paddingR = useProp('padding-right')
const paddingB = useProp('padding-bottom')
const paddingL = useProp('padding-left')

// ── UI State ──────────────────────────────────────────────────────────────────
const isLinked    = ref(true)
const isShorthand = ref(true)

// ── Helpers ──────────────────────────────────────────────────────────────────

function parsePaddingSh(raw) {
  if (!raw) return { t: '', r: '', b: '', l: '' }
  const parts = String(raw).trim().split(/\s+/)
  if (parts.length === 1) return { t: parts[0], r: parts[0], b: parts[0], l: parts[0] }
  if (parts.length === 2) return { t: parts[0], r: parts[1], b: parts[0], l: parts[1] }
  if (parts.length === 3) return { t: parts[0], r: parts[1], b: parts[2], l: parts[1] }
  if (parts.length === 4) return { t: parts[0], r: parts[1], b: parts[2], l: parts[3] }
  return { t: '', r: '', b: '', l: '' }
}

function formatPaddingSh(t, r, b, l) {
  const vt = t || '0', vr = r || '0', vb = b || '0', vl = l || '0'
  if (vt === vr && vt === vb && vt === vl) return vt
  if (vt === vb && vr === vl) return `${vt} ${vr}`
  if (vr === vl) return `${vt} ${vr} ${vb}`
  return `${vt} ${vr} ${vb} ${vl}`
}

function parseValueUnit(raw) {
  if (!raw && raw !== 0) return { value: '', unit: 'px' }
  const s = String(raw).trim()
  if (s === 'auto') return { value: 'auto', unit: '' }
  const m = s.match(/^([+-]?[\d.]+)(.*)$/)
  if (m) return { value: m[1], unit: m[2].trim() || 'px' }
  return { value: s, unit: '' }
}

function fmtVal(v, u) {
  if (!v && v !== 0) return null
  return (isNaN(v) || v === '' || v === 'auto') ? v : `${v}${u || 'px'}`
}

// ── Logic ─────────────────────────────────────────────────────────────────────

function detectInitialState() {
  const hasSh = !!padding.raw.value
  const hasIndiv = !!(paddingT.raw.value || paddingR.raw.value || paddingB.raw.value || paddingL.raw.value)

  isShorthand.value = hasSh || !hasIndiv
  
  if (!hasSh && hasIndiv) {
    const t = paddingT.raw.value, r = paddingR.raw.value, b = paddingB.raw.value, l = paddingL.raw.value
    isLinked.value = (t === r && t === b && t === l)
  } else if (hasSh) {
    const p = parsePaddingSh(padding.raw.value)
    isLinked.value = (p.t === p.r && p.t === p.b && p.t === p.l)
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

const displayValues = computed(() => {
  if (isShorthand.value && padding.raw.value) return parsePaddingSh(padding.raw.value)
  return {
    t: paddingT.raw.value || '',
    r: paddingR.raw.value || '',
    b: paddingB.raw.value || '',
    l: paddingL.raw.value || ''
  }
})

function updateField(side, val, unit) {
  const v = fmtVal(val, unit)
  const next = { ...displayValues.value }
  if (isLinked.value) {
    next.t = v; next.r = v; next.b = v; next.l = v;
  } else {
    next[side] = v
  }

  if (isShorthand.value) {
    padding.set(formatPaddingSh(next.t, next.r, next.b, next.l))
    paddingT.set(null); paddingR.set(null); paddingB.set(null); paddingL.set(null)
  } else {
    paddingT.set(next.t); paddingR.set(next.r); paddingB.set(next.b); paddingL.set(next.l)
    padding.set(null)
  }
}

function toggleShorthand() {
  const d = displayValues.value
  if (!isShorthand.value) {
    padding.set(formatPaddingSh(d.t, d.r, d.b, d.l))
    paddingT.set(null); paddingR.set(null); paddingB.set(null); paddingL.set(null)
  } else {
    paddingT.set(d.t); paddingR.set(d.r); paddingB.set(d.b); paddingL.set(d.l)
    padding.set(null)
  }
  isShorthand.value = !isShorthand.value
}

function toggleLink() {
  isLinked.value = !isLinked.value
  if (isLinked.value) updateField('t', parseValueUnit(displayValues.value.t).value, parseValueUnit(displayValues.value.t).unit)
}

const units = ['px', 'rem', 'em', '%']
</script>

<template>
  <div class="flex flex-col gap-2">
    <VisualSectionHeader label="Padding">
      <template #actions>
        <button 
          v-if="!isLinked"
          @click="toggleShorthand" 
          class="px-1.5 h-4 rounded text-[9px] font-bold border transition-all" 
          :class="isShorthand ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'">S</button>
        <button @click="toggleLink" class="p-0.5 rounded hover:bg-blue-100 transition-colors" :class="isLinked ? 'text-blue-600' : 'text-gray-400'">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path v-if="isLinked" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path v-if="isLinked" d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 00 7.07 7.07l1.71-1.71" /><path v-else d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </template>
    </VisualSectionHeader>

    <div v-if="isLinked" class="flex flex-col gap-2">
      <VisualInput 
        :modelValue="parseValueUnit(displayValues.t).value" 
        :unit="parseValueUnit(displayValues.t).unit" 
        :units="units"
        @update:modelValue="v => updateField('t', v, parseValueUnit(displayValues.t).unit)" 
        @update:unit="u => updateField('t', parseValueUnit(displayValues.t).value, u)" 
        placeholder="0"
      >
        <template #icon>
           <svg class="w-3.5 h-3.5 text-blue-500 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" /><rect x="8" y="8" width="8" height="8" stroke-dasharray="2 2" /></svg>
        </template>
      </VisualInput>
    </div>

    <div v-else class="grid grid-cols-2 gap-x-2 gap-y-2 p-1 bg-gray-50/50 rounded border border-gray-100">
      <div v-for="s in [{id:'t',label:'Top'},{id:'r',label:'Right'},{id:'b',label:'Bottom'},{id:'l',label:'Left'}]" :key="s.id" class="flex flex-col gap-1">
        <span class="text-[9px] font-bold text-gray-400 uppercase px-0.5">{{ s.label }}</span>
        <VisualInput 
          :modelValue="parseValueUnit(displayValues[s.id]).value" 
          :unit="parseValueUnit(displayValues[s.id]).unit" 
          :units="units" compact
          @update:modelValue="v => updateField(s.id, v, parseValueUnit(displayValues[s.id]).unit)" 
          @update:unit="u => updateField(s.id, parseValueUnit(displayValues[s.id]).value, u)" 
          placeholder="0"
        />
      </div>
    </div>
  </div>
</template>
