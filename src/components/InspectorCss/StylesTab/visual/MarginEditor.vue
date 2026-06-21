<script setup>
import { ref, computed, watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSectionHeader from '@/components/ui/VisualSectionHeader.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})
const getRule = () => props.ruleGetter()

const MARGIN_PROPS = [
  'margin',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left'
]

const { useProp } = useVisualSection(getRule, MARGIN_PROPS)

const margin = useProp('margin')
const marginT = useProp('margin-top')
const marginR = useProp('margin-right')
const marginB = useProp('margin-bottom')
const marginL = useProp('margin-left')

// ── UI State ──────────────────────────────────────────────────────────────────
const isLinked = ref(true)
const isShorthand = ref(true)

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseMarginSh(raw) {
  if (!raw) return { t: '', r: '', b: '', l: '' }
  const parts = String(raw).trim().split(/\s+/)
  if (parts.length === 1) return { t: parts[0], r: parts[0], b: parts[0], l: parts[0] }
  if (parts.length === 2) return { t: parts[0], r: parts[1], b: parts[0], l: parts[1] }
  if (parts.length === 3) return { t: parts[0], r: parts[1], b: parts[2], l: parts[1] }
  if (parts.length === 4) return { t: parts[0], r: parts[1], b: parts[2], l: parts[3] }
  return { t: '', r: '', b: '', l: '' }
}

function formatMarginSh(t, r, b, l) {
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
  const hasSh = !!margin.raw.value
  const hasIndiv = !!(marginT.raw.value || marginR.raw.value || marginB.raw.value || marginL.raw.value)

  isShorthand.value = hasSh || !hasIndiv

  if (!hasSh && hasIndiv) {
    const t = marginT.raw.value, r = marginR.raw.value, b = marginB.raw.value, l = marginL.raw.value
    isLinked.value = (t === r && t === b && t === l)
  } else if (hasSh) {
    const p = parseMarginSh(margin.raw.value)
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
  if (isShorthand.value && margin.raw.value) return parseMarginSh(margin.raw.value)
  return {
    t: marginT.raw.value || '',
    r: marginR.raw.value || '',
    b: marginB.raw.value || '',
    l: marginL.raw.value || ''
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
    margin.set(formatMarginSh(next.t, next.r, next.b, next.l))
    marginT.set(null); marginR.set(null); marginB.set(null); marginL.set(null)
  } else {
    marginT.set(next.t); marginR.set(next.r); marginB.set(next.b); marginL.set(next.l)
    margin.set(null)
  }
}

function toggleShorthand() {
  const d = displayValues.value
  if (!isShorthand.value) {
    margin.set(formatMarginSh(d.t, d.r, d.b, d.l))
    marginT.set(null); marginR.set(null); marginB.set(null); marginL.set(null)
  } else {
    marginT.set(d.t); marginR.set(d.r); marginB.set(d.b); marginL.set(d.l)
    margin.set(null)
  }
  isShorthand.value = !isShorthand.value
}

function toggleLink() {
  isLinked.value = !isLinked.value
  if (isLinked.value) updateField('t', parseValueUnit(displayValues.value.t).value, parseValueUnit(displayValues.value.t).unit)
}

const units = ['px', 'rem', 'em', '%', 'auto']
const keywords = ['auto', 'inherit', 'initial', 'unset']
</script>

<template>
  <div class="flex flex-col gap-2">
    <VisualSectionHeader label="Margin" class="text-fuchsia-600">
      <template #actions>
        <button v-if="!isLinked" @click="toggleShorthand"
          class="px-1.5 h-4 rounded text-[9px] font-bold border transition-all"
          :class="isShorthand ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'">S</button>
        <button @click="toggleLink" class="p-0.5 rounded hover:bg-blue-100 transition-colors"
          :class="isLinked ? 'text-blue-600' : 'text-gray-400'">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path v-if="isLinked" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path v-if="isLinked" d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 00 7.07 7.07l1.71-1.71" />
            <path v-else d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </template>
    </VisualSectionHeader>

    <div v-if="isLinked" class="flex flex-col gap-2">
      <VisualInput :modelValue="parseValueUnit(displayValues.t).value" :unit="parseValueUnit(displayValues.t).unit"
        :units="units" :keywords="keywords" allow-negative
        @update:modelValue="v => updateField('t', v, parseValueUnit(displayValues.t).unit)"
        @update:unit="u => updateField('t', parseValueUnit(displayValues.t).value, u)" placeholder="0">
        <template #icon>
          <svg class="w-3.5 h-3.5 text-blue-500 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2">
            <rect x="2" y="2" width="20" height="20" stroke-dasharray="2 2" />
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </template>
      </VisualInput>
    </div>

    <div v-else class="grid grid-cols-2 gap-x-2 gap-y-2 p-1 bg-gray-50/50 rounded border border-gray-100">
      <div v-for="s in [{ id: 't', label: 'Top' }, { id: 'r', label: 'Right' }, { id: 'b', label: 'Bottom' }, { id: 'l', label: 'Left' }]"
        :key="s.id" class="flex flex-col gap-1">
        <span class="text-[9px] font-bold text-gray-400 uppercase px-0.5">{{ s.label }}</span>
        <VisualInput :modelValue="parseValueUnit(displayValues[s.id]).value"
          :unit="parseValueUnit(displayValues[s.id]).unit" :units="units" :keywords="keywords" allow-negative compact
          @update:modelValue="v => updateField(s.id, v, parseValueUnit(displayValues[s.id]).unit)"
          @update:unit="u => updateField(s.id, parseValueUnit(displayValues[s.id]).value, u)" placeholder="0" />
      </div>
    </div>
  </div>
</template>
