<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSelect from '@/components/ui/VisualSelect.vue'
import VisualToggleGroup from '@/components/ui/VisualToggleGroup.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const getRule = () => props.ruleGetter()

// ── Properties ────────────────────────────────────────────────────────────────
const LAYOUT_PROPS = [
  'display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content',
  'gap', 'column-gap', 'row-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'justify-items',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'position', 'top', 'right', 'bottom', 'left', 'z-index'
]

const { showContent, hasAnyValue, useProp } = useVisualSection(getRule, LAYOUT_PROPS)

const display        = useProp('display')
const flexDirection  = useProp('flex-direction')
const flexWrap       = useProp('flex-wrap')
const justifyContent = useProp('justify-content')
const alignItems     = useProp('align-items')
const alignContent   = useProp('align-content')
const gap            = useProp('gap')
const columnGap      = useProp('column-gap')
const rowGap         = useProp('row-gap')
const gridCols       = useProp('grid-template-columns')
const gridRows       = useProp('grid-template-rows')
const gridFlow       = useProp('grid-auto-flow')
const justifyItems   = useProp('justify-items')

// ── Display Control ───────────────────────────────────────────────────────────
const showMoreDisplay = ref(false)
const moreDisplayRef  = ref(null)

const QUICK_DISPLAY = [
  { value: 'block',  label: 'Block' },
  { value: 'flex',   label: 'Flex' },
  { value: 'grid',   label: 'Grid' },
  { value: 'none',   label: 'None' },
]

const MORE_DISPLAY = [
  { value: 'inline-block', label: 'Inline-block', icon: `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="4" width="14" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="6" width="4" height="4" rx=".5"/></svg>` },
  { value: 'inline-flex',  label: 'Inline-flex',  icon: `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="4" width="14" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="6" width="3" height="4" rx=".5"/><rect x="7" y="6" width="3" height="4" rx=".5"/></svg>` },
  { value: 'inline-grid',  label: 'Inline-grid',  icon: `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="4" width="14" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="4" x2="6" y2="12" stroke="currentColor" stroke-width="1"/><line x1="10" y1="4" x2="10" y2="12" stroke="currentColor" stroke-width="1"/><line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1"/></svg>` },
  { value: 'inline',       label: 'Inline',        icon: `<svg viewBox="0 0 16 16" fill="currentColor"><text x="1" y="12" font-size="9" font-weight="700" font-family="serif">Aa</text></svg>` },
  { value: 'contents',     label: 'Contents',      icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="14" height="14" rx="1" stroke-dasharray="3 2"/></svg>` },
]

function setDisplay(value) {
  if (display.raw.value === value) {
    display.set(null)
  } else {
    display.set(value)
  }
  showMoreDisplay.value = false
}

function closeMoreDisplay(e) {
  if (moreDisplayRef.value && !moreDisplayRef.value.contains(e.target)) {
    showMoreDisplay.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', closeMoreDisplay))
onBeforeUnmount(() => document.removeEventListener('mousedown', closeMoreDisplay))

const isFlex = computed(() => ['flex', 'inline-flex'].includes(display.raw.value))
const isGrid = computed(() => ['grid', 'inline-grid'].includes(display.raw.value))

// ── Icons & Options ───────────────────────────────────────────────────────────
const flexDirOptions = [
  { value: 'row',            label: 'Row (→)',              icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10h12M13 7l3 3-3 3"/></svg>` },
  { value: 'column',         label: 'Column (↓)',           icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 4v12M7 13l3 3 3-3"/></svg>` },
  { value: 'row-reverse',    label: 'Row Reverse (←)',      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 10H4M7 7L4 10l3 3"/></svg>` },
  { value: 'column-reverse', label: 'Column Reverse (↑)',   icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 16V4M7 7l3-3 3 3"/></svg>` },
]

const flexWrapOptions = [
  { value: 'nowrap',       label: 'No Wrap',     icon: `<svg viewBox="0 0 22 12" fill="currentColor"><rect x="0" y="1" width="5" height="10" rx="1"/><rect x="7" y="1" width="5" height="10" rx="1"/><rect x="14" y="1" width="5" height="10" rx="1"/></svg>` },
  { value: 'wrap',         label: 'Wrap',         icon: `<svg viewBox="0 0 22 20" fill="currentColor"><rect x="0" y="0" width="5" height="8" rx="1"/><rect x="7" y="0" width="5" height="8" rx="1"/><rect x="14" y="0" width="5" height="8" rx="1"/><rect x="0" y="11" width="5" height="8" rx="1" fill-opacity=".4"/><rect x="7" y="11" width="5" height="8" rx="1" fill-opacity=".4"/></svg>` },
  { value: 'wrap-reverse', label: 'Wrap Reverse', icon: `<svg viewBox="0 0 22 20" fill="currentColor"><rect x="0" y="11" width="5" height="8" rx="1"/><rect x="7" y="11" width="5" height="8" rx="1"/><rect x="14" y="11" width="5" height="8" rx="1"/><rect x="0" y="0" width="5" height="8" rx="1" fill-opacity=".4"/><rect x="7" y="0" width="5" height="8" rx="1" fill-opacity=".4"/></svg>` },
]

const isWrapping = computed(() => ['wrap', 'wrap-reverse'].includes(flexWrap.raw.value))

const justifyOptions = [
  { label: 'Start',         value: 'flex-start', icon: `<svg viewBox="0 0 32 16" fill="currentColor"><rect x="0" y="2" width="6" height="12" rx="1"/><rect x="8" y="2" width="6" height="12" rx="1"/><rect x="16" y="2" width="6" height="12" rx="1"/></svg>` },
  { label: 'End',           value: 'flex-end',   icon: `<svg viewBox="0 0 32 16" fill="currentColor"><rect x="10" y="2" width="6" height="12" rx="1"/><rect x="18" y="2" width="6" height="12" rx="1"/><rect x="26" y="2" width="6" height="12" rx="1"/></svg>` },
  { label: 'Center',        value: 'center',     icon: `<svg viewBox="0 0 32 16" fill="currentColor"><rect x="5" y="2" width="6" height="12" rx="1"/><rect x="13" y="2" width="6" height="12" rx="1"/><rect x="21" y="2" width="6" height="12" rx="1"/></svg>` },
  { label: 'Space between', value: 'space-between', icon: `<svg viewBox="0 0 32 16" fill="currentColor"><rect x="0" y="2" width="6" height="12" rx="1"/><rect x="13" y="2" width="6" height="12" rx="1"/><rect x="26" y="2" width="6" height="12" rx="1"/></svg>` },
  { label: 'Space around',  value: 'space-around', icon: `<svg viewBox="0 0 32 16" fill="currentColor"><rect x="3" y="2" width="6" height="12" rx="1"/><rect x="13" y="2" width="6" height="12" rx="1"/><rect x="23" y="2" width="6" height="12" rx="1"/></svg>` },
  { label: 'Space evenly',  value: 'space-evenly', icon: `<svg viewBox="0 0 32 16" fill="currentColor"><rect x="4" y="2" width="5" height="12" rx="1"/><rect x="13" y="2" width="5" height="12" rx="1"/><rect x="22" y="2" width="5" height="12" rx="1"/></svg>` },
  { label: 'Stretch',       value: 'stretch',    icon: `<svg viewBox="0 0 32 16" fill="currentColor"><rect x="0" y="2" width="9" height="12" rx="1"/><rect x="11" y="2" width="9" height="12" rx="1"/><rect x="23" y="2" width="9" height="12" rx="1"/></svg>` },
]

const alignItemsOptions = [
  { label: 'Start',    value: 'flex-start', icon: `<svg viewBox="0 0 20 18" fill="currentColor"><rect x="0" y="0" width="4" height="14" rx="1"/><rect x="6" y="0" width="4" height="9" rx="1"/><rect x="12" y="0" width="4" height="11" rx="1"/><line x1="0" y1="0" x2="20" y2="0" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/></svg>` },
  { label: 'Center',   value: 'center',     icon: `<svg viewBox="0 0 20 18" fill="currentColor"><rect x="0" y="2" width="4" height="14" rx="1"/><rect x="6" y="4.5" width="4" height="9" rx="1"/><rect x="12" y="3.5" width="4" height="11" rx="1"/></svg>` },
  { label: 'End',      value: 'flex-end',   icon: `<svg viewBox="0 0 20 18" fill="currentColor"><rect x="0" y="4" width="4" height="14" rx="1"/><rect x="6" y="9" width="4" height="9" rx="1"/><rect x="12" y="7" width="4" height="11" rx="1"/><line x1="0" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/></svg>` },
  { label: 'Stretch',  value: 'stretch',    icon: `<svg viewBox="0 0 20 18" fill="currentColor"><rect x="0" y="0" width="4" height="18" rx="1"/><rect x="6" y="0" width="4" height="18" rx="1"/><rect x="12" y="0" width="4" height="18" rx="1"/></svg>` },
  { label: 'Baseline', value: 'baseline',   icon: `<svg viewBox="0 0 20 18" fill="currentColor"><rect x="0" y="2" width="4" height="11" rx="1"/><rect x="6" y="0" width="4" height="13" rx="1"/><rect x="12" y="4" width="4" height="9" rx="1"/><line x1="0" y1="13" x2="20" y2="13" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/><text x="15" y="18" font-size="5" font-family="serif" fill="currentColor">A</text></svg>` },
]

const alignContentOptions = [
  { label: 'Start',         value: 'flex-start',    icon: `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="0" y="0" width="20" height="4" rx="1"/><rect x="0" y="6" width="14" height="4" rx="1"/><rect x="0" y="14" width="20" height="4" rx="1" fill-opacity=".15"/></svg>` },
  { label: 'End',           value: 'flex-end',      icon: `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="0" y="0" width="20" height="4" rx="1" fill-opacity=".15"/><rect x="0" y="10" width="20" height="4" rx="1"/><rect x="0" y="16" width="14" height="4" rx="1"/></svg>` },
  { label: 'Center',        value: 'center',        icon: `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="0" y="6" width="20" height="4" rx="1"/><rect x="0" y="12" width="14" height="4" rx="1"/></svg>` },
  { label: 'Space between', value: 'space-between', icon: `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="0" y="0" width="20" height="4" rx="1"/><rect x="0" y="8" width="14" height="4" rx="1"/><rect x="0" y="16" width="20" height="4" rx="1"/></svg>` },
  { label: 'Space around',  value: 'space-around',  icon: `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="0" y="2" width="20" height="4" rx="1"/><rect x="0" y="9" width="14" height="4" rx="1"/><rect x="0" y="16" width="20" height="3" rx="1"/></svg>` },
  { label: 'Stretch',       value: 'stretch',       icon: `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="0" y="0" width="20" height="9" rx="1"/><rect x="0" y="11" width="14" height="9" rx="1"/></svg>` },
]

const showMoreAlign = ref(false)
const gridColsCount = computed(() => {
  const v = gridCols.raw.value
  if (!v) return ''
  const m = v.match(/repeat\((\d+)/) || v.match(/(\d+)/)
  return m ? parseInt(m[1]) : ''
})
const gridRowsCount = computed(() => {
  const v = gridRows.raw.value
  if (!v) return ''
  const m = v.match(/repeat\((\d+)/) || v.match(/(\d+)/)
  return m ? parseInt(m[1]) : ''
})

function setGridCols(n) {
  const num = parseInt(n); if (!num || num < 1) { gridCols.set(null); return }
  gridCols.set(`repeat(${num}, 1fr)`, '')
}
function setGridRows(n) {
  const num = parseInt(n); if (!num || num < 1) { gridRows.set(null); return }
  gridRows.set(`repeat(${num}, 1fr)`, '')
}

const gridFlowOptions = [
  { value: 'row',    label: 'Row flow →', icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h5v5H3zm8 0h5v5h-5zM3 13h5"/><path d="M11 9h5M8 8.5l3 0m0 0-1.5-2M11 8.5l-1.5 2"/></svg>` },
  { value: 'column', label: 'Column flow ↓', icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h5v4H3zm8 0h5v4h-5zM3 10h5v4H3"/><path d="M13 7v4M13 11l-2-1.5M13 11l2-1.5"/></svg>` },
]

const gapLocked = ref(true)
function toggleGapLock() {
  gapLocked.value = !gapLocked.value
  if (!gapLocked.value) {
    const current = gap.raw.value
    if (current) { columnGap.set(current, ''); rowGap.set(current, '') }
    gap.set(null)
  } else {
    const val = columnGap.raw.value || rowGap.raw.value
    if (val) gap.set(val, '')
    columnGap.set(null); rowGap.set(null)
  }
}

const showDisplaySub = ref(true)
</script>

<template>
  <div class="flex flex-col gap-2.5 px-3 py-2 text-gray-700">
    <!-- ── Layout Panel Header ────────────────────────────────────────── -->
    <div
      class="flex items-center justify-between border-b border-gray-100 pb-1 cursor-pointer select-none"
      @click="showContent = !showContent"
    >
      <span class="text-[11px] font-bold text-blue-500 uppercase tracking-tight">Layout</span>
      <div class="flex items-center gap-1.5">
        <span v-if="hasAnyValue" class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
        <svg class="w-3 h-3 text-gray-400 transition-transform" :class="showContent ? '' : '-rotate-90'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <div v-show="showContent" class="flex flex-col gap-5">
      
      <!-- ── Sub Section: Display & Alignment ────────────────────────── -->
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center gap-1.5 cursor-pointer" @click="showDisplaySub = !showDisplaySub">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-1">Display & Alignment</span>
          <svg class="w-2.5 h-2.5 text-gray-400 transition-transform" :class="showDisplaySub ? '' : '-rotate-90'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div v-show="showDisplaySub" class="flex flex-col gap-2.5 pt-1">
          <!-- Display Select -->
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-gray-500 font-medium uppercase min-w-[40px]">Display</span>
            <div class="flex-1 flex items-center bg-gray-100 rounded p-0.5 gap-0.5">
              <button
                v-for="opt in QUICK_DISPLAY" :key="opt.value"
                @click="setDisplay(opt.value)"
                class="flex-1 h-5 text-[10px] font-medium rounded transition-all"
                :class="display.raw.value === opt.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              >{{ opt.label }}</button>
            </div>
            <div class="relative" ref="moreDisplayRef">
              <button @click.stop="showMoreDisplay = !showMoreDisplay" class="h-6 w-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg class="w-3 h-3 transition-transform" :class="showMoreDisplay ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div v-if="showMoreDisplay" class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-[100] py-1 min-w-[140px]">
                <button v-for="opt in MORE_DISPLAY" :key="opt.value" @click="setDisplay(opt.value)" class="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-gray-50 transition-colors" :class="display.raw.value === opt.value ? 'text-blue-600 bg-blue-50' : 'text-gray-700'">
                  <span v-if="opt.icon" v-html="opt.icon" class="w-4 h-4 shrink-0 text-gray-400"></span>
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Flex Controls -->
          <template v-if="isFlex">
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-gray-500 font-medium uppercase min-w-[40px]">Dir</span>
              <div class="flex items-center bg-gray-100 rounded p-0.5 gap-0.5">
                <button v-for="opt in flexDirOptions" :key="opt.value" @click="flexDirection.raw.value === opt.value ? flexDirection.set(null) : flexDirection.set(opt.value)" class="w-7 h-5 flex items-center justify-center rounded transition-all" :class="flexDirection.raw.value === opt.value ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'" :title="opt.label">
                  <span v-html="opt.icon" class="w-4 h-4 text-xs font-bold"></span>
                </button>
              </div>
            </div>
            <VisualToggleGroup label="justify-content" :modelValue="justifyContent.raw.value" @update:modelValue="v => justifyContent.set(v)" :options="justifyOptions" />
            <VisualToggleGroup label="align-items" :modelValue="alignItems.raw.value" @update:modelValue="v => alignItems.set(v)" :options="alignItemsOptions" />
            <VisualToggleGroup label="flex-wrap" :modelValue="flexWrap.raw.value" @update:modelValue="v => flexWrap.set(v)" :options="flexWrapOptions" />
            <VisualToggleGroup v-if="isWrapping" label="align-content" :modelValue="alignContent.raw.value" @update:modelValue="v => alignContent.set(v)" :options="alignContentOptions" />
            
            <!-- Flex Gap -->
            <div class="flex flex-col gap-1">
              <div v-if="gapLocked" class="flex items-center gap-1">
                <span class="text-[10px] text-gray-500 font-medium uppercase min-w-[40px]">Gap</span>
                <VisualInput :modelValue="gap.value.value" :unit="gap.unit.value" :units="['px', 'rem', 'em', '%']" @update:modelValue="v => gap.set(v, gap.unit.value)" @update:unit="u => gap.set(gap.value.value, u)" />
                <button @click="toggleGapLock" title="Split column/row gap" class="text-gray-400 hover:text-blue-500 transition-colors shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </button>
              </div>
              <div v-else class="flex flex-col">
                <div class="flex items-center gap-1">
                  <span class="text-[10px] text-gray-500 font-medium uppercase min-w-[40px]">Gap</span>
                  <VisualInput :modelValue="columnGap.value.value" :unit="columnGap.unit.value" :units="['px', 'rem', 'em', '%']" @update:modelValue="v => columnGap.set(v, columnGap.unit.value)" @update:unit="u => columnGap.set(columnGap.value.value, u)" />
                  <VisualInput :modelValue="rowGap.value.value" :unit="rowGap.unit.value" :units="['px', 'rem', 'em', '%']" @update:modelValue="v => rowGap.set(v, rowGap.unit.value)" @update:unit="u => rowGap.set(rowGap.value.value, u)" />
                  <button @click="toggleGapLock" title="Link column/row gap" class="text-blue-500 hover:text-gray-400 transition-colors shrink-0">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2z"/></svg>
                  </button>
                </div>
                <div class="flex justify-between px-1 mt-0.5 ml-10 mr-7">
                  <span class="text-[8px] text-gray-400 uppercase font-bold">Cols</span>
                  <span class="text-[8px] text-gray-400 uppercase font-bold">Rows</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Grid Controls -->
          <template v-if="isGrid">
              <div class="flex items-center gap-1">
                <span class="text-[10px] text-gray-500 font-medium uppercase min-w-[40px]">Grid</span>
                <div class="flex gap-2 flex-1">
                  <div class="flex flex-col gap-0.5 flex-1">
                    <VisualInput :modelValue="gridColsCount" @update:modelValue="v => setGridCols(v)" :units="[]" placeholder="—" />
                    <span class="text-[8px] text-gray-400 text-center font-bold uppercase">Cols</span>
                  </div>
                  <div class="flex flex-col gap-0.5 flex-1">
                    <VisualInput :modelValue="gridRowsCount" @update:modelValue="v => setGridRows(v)" :units="[]" placeholder="—" />
                    <span class="text-[8px] text-gray-400 text-center font-bold uppercase">Rows</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-[10px] text-gray-500 font-medium uppercase min-w-[40px]">Flow</span>
                <div class="flex items-center bg-gray-100 rounded p-0.5 gap-0.5">
                  <button v-for="opt in gridFlowOptions" :key="opt.value" @click="gridFlow.set(opt.value)" class="w-7 h-5 flex items-center justify-center rounded transition-all" :class="gridFlow.raw.value === opt.value ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'" :title="opt.label">
                    <span v-html="opt.icon" class="w-4 h-4"></span>
                  </button>
                </div>
              </div>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>
