<script setup>
import { ref, computed, watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const getRule = () => props.ruleGetter()

// ─── All tracked props ─────────────────────────────────────────────────────────
const SPACING_PROPS = [
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding',
]

const { hasAnyValue, useProp } = useVisualSection(getRule, SPACING_PROPS)

const emit = defineEmits(['has-value'])
watch(hasAnyValue, (v) => emit('has-value', v), { immediate: true })

// ─── Individual sides ─────────────────────────────────────────────────────────
const mT = useProp('margin-top')
const mR = useProp('margin-right')
const mB = useProp('margin-bottom')
const mL = useProp('margin-left')

const pT = useProp('padding-top')
const pR = useProp('padding-right')
const pB = useProp('padding-bottom')
const pL = useProp('padding-left')

// ─── Shorthand props ─────────────────────────────────────────────────────────
const marginShorthand  = useProp('margin')
const paddingShorthand = useProp('padding')

// ─── Lock state ───────────────────────────────────────────────────────────────
const lockMargin  = ref(marginShorthand.exists.value)
const lockPadding = ref(paddingShorthand.exists.value)

watch(getRule, () => {
  lockMargin.value = marginShorthand.exists.value
  lockPadding.value = paddingShorthand.exists.value
})

const linkMargin  = ref(false)
const linkPadding = ref(false)

const units = ['px', 'rem', 'em', '%', 'auto']
const marginKeywords = ['auto', 'inherit', 'initial', 'revert', 'revert-layer', 'unset']
const paddingKeywords = ['inherit', 'initial', 'revert', 'revert-layer', 'unset']

// ─── Shorthand parsing helper ─────────────────────────────────────────────────
function parseShorthand(raw) {
  if (!raw) return { t: '', r: '', b: '', l: '' }
  const parts = raw.trim().split(/\s+/)
  const [t = '', r = t, b = t, l = r] = parts
  return { t, r, b, l }
}

function buildShorthand(tStr, rStr, bStr, lStr) {
  const t = (tStr && tStr !== '') ? tStr : '0'
  const r = (rStr && rStr !== '') ? rStr : '0'
  const b = (bStr && bStr !== '') ? bStr : '0'
  const l = (lStr && lStr !== '') ? lStr : '0'

  if (t === b && r === l && t === r) return t
  if (t === b && r === l) return `${t} ${r}`
  if (r === l) return `${t} ${r} ${b}`
  return `${t} ${r} ${b} ${l}`
}

/** Split '10px' → ['10', 'px'], 'auto' → ['auto', ''] */
function splitRaw(raw) {
  if (!raw) return ['', '']
  const m = raw.match(/^([+-]?\d*\.?\d+)(.*)$/)
  if (m) return [m[1], m[2].trim() || 'px']
  return [raw, '']
}

// ─── Toggle lock ──────────────────────────────────────────────────────────────
function toggleLockMargin() {
  lockMargin.value = !lockMargin.value
  if (lockMargin.value) {
    const sh = buildShorthand(
      mT.raw.value || '0', mR.raw.value || '0',
      mB.raw.value || '0', mL.raw.value || '0'
    )
    mT.set(null); mR.set(null); mB.set(null); mL.set(null)
    setTimeout(() => marginShorthand.set(sh, ''), 0)
  } else {
    const { t, r, b, l } = parseShorthand(marginShorthand.raw.value)
    marginShorthand.set(null)
    setTimeout(() => {
      if (t) mT.set(...splitRaw(t))
      if (r) mR.set(...splitRaw(r))
      if (b) mB.set(...splitRaw(b))
      if (l) mL.set(...splitRaw(l))
    }, 0)
  }
}

function toggleLockPadding() {
  lockPadding.value = !lockPadding.value
  if (lockPadding.value) {
    const sh = buildShorthand(
      pT.raw.value || '0', pR.raw.value || '0',
      pB.raw.value || '0', pL.raw.value || '0'
    )
    pT.set(null); pR.set(null); pB.set(null); pL.set(null)
    setTimeout(() => paddingShorthand.set(sh, ''), 0)
  } else {
    const { t, r, b, l } = parseShorthand(paddingShorthand.raw.value)
    paddingShorthand.set(null)
    setTimeout(() => {
      if (t) pT.set(...splitRaw(t))
      if (r) pR.set(...splitRaw(r))
      if (b) pB.set(...splitRaw(b))
      if (l) pL.set(...splitRaw(l))
    }, 0)
  }
}

function updateMarginShorthand(index, rawValue) {
  const { t, r, b, l } = parseShorthand(marginShorthand.raw.value)
  const parts = [t, r, b, l]
  const val = rawValue || '0'
  if (linkMargin.value) {
    parts[0] = val; parts[1] = val; parts[2] = val; parts[3] = val;
  } else {
    parts[index] = val
  }
  marginShorthand.set(buildShorthand(parts[0], parts[1], parts[2], parts[3]), '')
}

function updatePaddingShorthand(index, rawValue) {
  const { t, r, b, l } = parseShorthand(paddingShorthand.raw.value)
  const parts = [t, r, b, l]
  const val = rawValue || '0'
  if (linkPadding.value) {
    parts[0] = val; parts[1] = val; parts[2] = val; parts[3] = val;
  } else {
    parts[index] = val
  }
  paddingShorthand.set(buildShorthand(parts[0], parts[1], parts[2], parts[3]), '')
}

const mParts = computed(() => parseShorthand(marginShorthand.raw.value))
const pParts = computed(() => parseShorthand(paddingShorthand.raw.value))

function partValue(raw) {
  const m = raw.match(/^([+-]?\d*\.?\d+)(.*)$/)
  return m ? m[1] : raw || ''
}
function partUnit(raw) {
  const m = raw.match(/^([+-]?\d*\.?\d+)(.*)$/)
  return m ? (m[2].trim() || 'px') : ''
}

function updateMargin(value, side) {
  const u = side.unit.value
  if (linkMargin.value) {
    mT.set(value, u); mR.set(value, u); mB.set(value, u); mL.set(value, u)
  } else {
    side.set(value, u)
  }
}

function updatePadding(value, side) {
  const u = side.unit.value
  if (linkPadding.value) {
    pT.set(value, u); pR.set(value, u); pB.set(value, u); pL.set(value, u)
  } else {
    side.set(value, u)
  }
}

defineExpose({ hasAnyValue })
</script>

<template>
  <div class="flex flex-col gap-4 pt-1">
    <!-- MARGIN -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between px-0.5">
        <span class="text-[9px] font-bold text-black uppercase">Margin</span>
        <div class="flex items-center gap-1.5">
          <button @click="linkMargin = !linkMargin" class="transition-colors" :class="linkMargin ? 'text-blue-500' : 'text-gray-300 hover:text-gray-400'">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 11-5.656-5.656l-1.102 1.101" /></svg>
          </button>
          <button @click="toggleLockMargin" class="transition-colors px-1 py-0.5 rounded text-[8px] font-mono font-bold leading-none border" :class="lockMargin ? 'text-amber-600 bg-amber-50 border-amber-300' : 'text-gray-300 border-gray-200 hover:text-amber-500 hover:border-amber-200'">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path v-if="lockMargin" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/><path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-2">
        <VisualInput label="T" help="margin-top: Espaçamento externo superior" :modelValue="lockMargin ? partValue(mParts.t) : mT.value.value" :unit="lockMargin ? partUnit(mParts.t) : mT.unit.value" :units="units" :keywords="marginKeywords" allow-negative @update:modelValue="v => lockMargin ? updateMarginShorthand(0, (v === '' || isNaN(v)) ? v : v + (partUnit(mParts.t)||'')) : updateMargin(v, mT)" @update:unit="u => lockMargin ? updateMarginShorthand(0, (partValue(mParts.t)||'0') + u) : mT.set(mT.value.value, u)" placeholder="0" />
        <VisualInput label="R" help="margin-right: Espaçamento externo direito" :modelValue="lockMargin ? partValue(mParts.r) : mR.value.value" :unit="lockMargin ? partUnit(mParts.r) : mR.unit.value" :units="units" :keywords="marginKeywords" allow-negative @update:modelValue="v => lockMargin ? updateMarginShorthand(1, (v === '' || isNaN(v)) ? v : v + (partUnit(mParts.r)||'')) : updateMargin(v, mR)" @update:unit="u => lockMargin ? updateMarginShorthand(1, (partValue(mParts.r)||'0') + u) : mR.set(mR.value.value, u)" placeholder="0" />
        <VisualInput label="B" help="margin-bottom: Espaçamento externo inferior" :modelValue="lockMargin ? partValue(mParts.b) : mB.value.value" :unit="lockMargin ? partUnit(mParts.b) : mB.unit.value" :units="units" :keywords="marginKeywords" allow-negative @update:modelValue="v => lockMargin ? updateMarginShorthand(2, (v === '' || isNaN(v)) ? v : v + (partUnit(mParts.b)||'')) : updateMargin(v, mB)" @update:unit="u => lockMargin ? updateMarginShorthand(2, (partValue(mParts.b)||'0') + u) : mB.set(mB.value.value, u)" placeholder="0" />
        <VisualInput label="L" help="margin-left: Espaçamento externo esquerdo" :modelValue="lockMargin ? partValue(mParts.l) : mL.value.value" :unit="lockMargin ? partUnit(mParts.l) : mL.unit.value" :units="units" :keywords="marginKeywords" allow-negative @update:modelValue="v => lockMargin ? updateMarginShorthand(3, (v === '' || isNaN(v)) ? v : v + (partUnit(mParts.l)||'')) : updateMargin(v, mL)" @update:unit="u => lockMargin ? updateMarginShorthand(3, (partValue(mParts.l)||'0') + u) : mL.set(mL.value.value, u)" placeholder="0" />
      </div>
    </div>

    <!-- PADDING -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between px-0.5">
        <span class="text-[9px] font-bold text-black uppercase">Padding</span>
        <div class="flex items-center gap-1.5">
          <button @click="linkPadding = !linkPadding" class="transition-colors" :class="linkPadding ? 'text-blue-500' : 'text-gray-300 hover:text-gray-400'">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 11-5.656-5.656l-1.102 1.101" /></svg>
          </button>
          <button @click="toggleLockPadding" class="transition-colors px-1 py-0.5 rounded text-[8px] font-mono font-bold leading-none border" :class="lockPadding ? 'text-amber-600 bg-amber-50 border-amber-300' : 'text-gray-300 border-gray-200 hover:text-amber-500 hover:border-amber-200'">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path v-if="lockPadding" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/><path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-2">
        <VisualInput label="T" help="padding-top: Espaçamento interno superior" :modelValue="lockPadding ? partValue(pParts.t) : pT.value.value" :unit="lockPadding ? partUnit(pParts.t) : pT.unit.value" :units="units" :keywords="paddingKeywords" @update:modelValue="v => lockPadding ? updatePaddingShorthand(0, (v === '' || isNaN(v)) ? v : v + (partUnit(pParts.t)||'')) : updatePadding(v, pT)" @update:unit="u => lockPadding ? updatePaddingShorthand(0, (partValue(pParts.t)||'0') + u) : pT.set(pT.value.value, u)" placeholder="0" />
        <VisualInput label="R" help="padding-right: Espaçamento interno direito" :modelValue="lockPadding ? partValue(pParts.r) : pR.value.value" :unit="lockPadding ? partUnit(pParts.r) : pR.unit.value" :units="units" :keywords="paddingKeywords" @update:modelValue="v => lockPadding ? updatePaddingShorthand(1, (v === '' || isNaN(v)) ? v : v + (partUnit(pParts.r)||'')) : updatePadding(v, pR)" @update:unit="u => lockPadding ? updatePaddingShorthand(1, (partValue(pParts.r)||'0') + u) : pR.set(pR.value.value, u)" placeholder="0" />
        <VisualInput label="B" help="padding-bottom: Espaçamento interno inferior" :modelValue="lockPadding ? partValue(pParts.b) : pB.value.value" :unit="lockPadding ? partUnit(pParts.b) : pB.unit.value" :units="units" :keywords="paddingKeywords" @update:modelValue="v => lockPadding ? updatePaddingShorthand(2, (v === '' || isNaN(v)) ? v : v + (partUnit(pParts.b)||'')) : updatePadding(v, pB)" @update:unit="u => lockPadding ? updatePaddingShorthand(2, (partValue(pParts.b)||'0') + u) : pB.set(pB.value.value, u)" placeholder="0" />
        <VisualInput label="L" help="padding-left: Espaçamento interno esquerdo" :modelValue="lockPadding ? partValue(pParts.l) : pL.value.value" :unit="lockPadding ? partUnit(pParts.l) : pL.unit.value" :units="units" :keywords="paddingKeywords" @update:modelValue="v => lockPadding ? updatePaddingShorthand(3, (v === '' || isNaN(v)) ? v : v + (partUnit(pParts.l)||'')) : updatePadding(v, pL)" @update:unit="u => lockPadding ? updatePaddingShorthand(3, (partValue(pParts.l)||'0') + u) : pL.set(pL.value.value, u)" placeholder="0" />
      </div>
    </div>
  </div>
</template>
