<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSelect from '@/components/ui/VisualSelect.vue'
import VisualToggleGroup from '@/components/ui/VisualToggleGroup.vue'
import VisualFieldset from '@/components/ui/VisualFieldset.vue'

const props = defineProps({
  ruleGetter:    { type: Function, required: true },
  parentDisplay: { type: String,   default: 'block' }
})

const getRule = () => props.ruleGetter()

// ── All Properties ────────────────────────────────────────────────────────────
const ALL_PROPS = [
  'display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'gap',
  'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'justify-items',
  'align-self', 'justify-self', 'flex-grow', 'flex-shrink', 'flex-basis', 'order',
  'grid-column', 'grid-row'
]

const { hasAnyValue, useProp } = useVisualSection(getRule, ALL_PROPS)

const emit = defineEmits(['has-value'])
watch(hasAnyValue, (v) => emit('has-value', v), { immediate: true })

const display        = useProp('display')
const flexDirection  = useProp('flex-direction')
const flexWrap       = useProp('flex-wrap')
const justifyContent = useProp('justify-content')
const alignItems     = useProp('align-items')
const alignContent   = useProp('align-content')
const gap            = useProp('gap')
const rowGap         = useProp('row-gap')
const colGap         = useProp('column-gap')
const gridCols       = useProp('grid-template-columns')
const gridRows       = useProp('grid-template-rows')
const gridFlow       = useProp('grid-auto-flow')
const justifyItems   = useProp('justify-items')

// Item Props
const alignSelf      = useProp('align-self')
const justifySelf    = useProp('justify-self')
const flexGrow       = useProp('flex-grow')
const flexShrink     = useProp('flex-shrink')
const flexBasis      = useProp('flex-basis')
const order          = useProp('order')
const gridColumn     = useProp('grid-column')
const gridRow        = useProp('grid-row')

// Gap Link state
const isGapLinked = ref(true)

// ── Backup System ──────────────────────────────────────────────────────────────
// Stores values when switching display modes to avoid CSS junk while keeping state
const backup = ref({
  flex: {}, // flex-direction, flex-wrap
  grid: {}, // grid-template-columns, grid-template-rows, grid-auto-flow, justify-items
  alignment: {} // justify-content, align-items, align-content
})

// Gap-specific backup (preserved while editing the same element)
const gapBackup = ref({
  linked: { value: null, unit: 'px' },
  unlinked: { 
    rowValue: null, rowUnit: 'px',
    colValue: null, colUnit: 'px'
  }
})

const isFlexMode = (d) => ['flex', 'inline-flex'].includes(d)
const isGridMode = (d) => ['grid', 'inline-grid'].includes(d)

// Track display changes for backup logic
watch(() => display.raw.value, (newVal, oldVal) => {
  if (oldVal === newVal) return

  const rule = getRule()
  if (!rule) return

  // 1. BACKUP OLD STATE
  if (isFlexMode(oldVal)) {
    backup.value.flex = {
      'flex-direction': flexDirection.raw.value,
      'flex-wrap': flexWrap.raw.value
    }
    // Only delete if NOT switching to another layout mode that shares these? 
    // Actually items like flexDirection are flex-exclusive.
    flexDirection.set(null); flexWrap.set(null)
  } else if (isGridMode(oldVal)) {
    backup.value.grid = {
      'grid-template-columns': gridCols.raw.value,
      'grid-template-rows': gridRows.raw.value,
      'grid-auto-flow': gridFlow.raw.value,
      'justify-items': justifyItems.raw.value
    }
    gridCols.set(null); gridRows.set(null); gridFlow.set(null); justifyItems.set(null)
  }

  // Common alignment cleanup if switching to Basic mode (block, etc)
  if (!isFlexMode(newVal) && !isGridMode(newVal)) {
    backup.value.alignment = {
      'justify-content': justifyContent.raw.value,
      'align-items': alignItems.raw.value,
      'align-content': alignContent.raw.value
    }
    justifyContent.set(null); alignItems.set(null); alignContent.set(null)
  }

  // 2. RESTORE NEW STATE
  if (isFlexMode(newVal)) {
    if (backup.value.flex['flex-direction']) flexDirection.set(backup.value.flex['flex-direction'])
    if (backup.value.flex['flex-wrap']) flexWrap.set(backup.value.flex['flex-wrap'])
    // Restore alignment if it was backed up
    if (backup.value.alignment['justify-content']) justifyContent.set(backup.value.alignment['justify-content'])
    if (backup.value.alignment['align-items']) alignItems.set(backup.value.alignment['align-items'])
    if (backup.value.alignment['align-content']) alignContent.set(backup.value.alignment['align-content'])
  } else if (isGridMode(newVal)) {
    if (backup.value.grid['grid-template-columns']) gridCols.set(backup.value.grid['grid-template-columns'])
    if (backup.value.grid['grid-template-rows']) gridRows.set(backup.value.grid['grid-template-rows'])
    if (backup.value.grid['grid-auto-flow']) gridFlow.set(backup.value.grid['grid-auto-flow'])
    if (backup.value.grid['justify-items']) justifyItems.set(backup.value.grid['justify-items'])
    // Restore alignment
    if (backup.value.alignment['justify-content']) justifyContent.set(backup.value.alignment['justify-content'])
    if (backup.value.alignment['align-items']) alignItems.set(backup.value.alignment['align-items'])
    if (backup.value.alignment['align-content']) alignContent.set(backup.value.alignment['align-content'])
  }
})

// ── Display Control ───────────────────────────────────────────────────────────
const DISPLAY_OPTIONS = [
  { value: 'block',        label: 'Block' },
  { value: 'flex',         label: 'Flex' },
  { value: 'grid',         label: 'Grid' },
  { value: 'inline-block', label: 'Inline-block' },
  { value: 'inline-flex',  label: 'Inline-flex' },
  { value: 'inline-grid',  label: 'Inline-grid' },
  { value: 'inline',       label: 'Inline' },
  { value: 'contents',     label: 'Contents' },
  { value: 'none',         label: 'None' },
]

function setDisplay(value) {
  display.set(value === display.raw.value ? null : value)
}

// ── Component Logic ────────────────────────────────────────────────────────
const isFlex = computed(() => isFlexMode(display.raw.value))
const isGrid = computed(() => isGridMode(display.raw.value))
const isParentFlex = computed(() => ['flex', 'inline-flex'].includes(props.parentDisplay))
const isParentGrid = computed(() => ['grid', 'inline-grid'].includes(props.parentDisplay))

// Icons & Options
const flexDirOptions = [
  { value: 'row',            label: 'Row',              icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12M13 7l3 3-3 3"/></svg>` },
  { value: 'column',         label: 'Column',           icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v12M7 13l3 3 3-3"/></svg>` },
  { value: 'row-reverse',    label: 'Row Rev',      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10H4M7 7L4 10l3 3"/></svg>` },
  { value: 'column-reverse', label: 'Col Rev',   icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16V4M7 7l3-3 3 3"/></svg>` },
]

const flexWrapOptions = [
  { value: 'nowrap',       label: 'No Wrap',     icon: `<svg viewBox="0 0 22 12" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="2" width="5" height="8" rx="0.5"/><rect x="8" y="2" width="5" height="8" rx="0.5"/><rect x="15" y="2" width="5" height="8" rx="0.5"/></svg>` },
  { value: 'wrap',         label: 'Wrap',         icon: `<svg viewBox="0 0 22 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="1" width="5" height="7" rx="0.5"/><rect x="8" y="1" width="5" height="7" rx="0.5"/><rect x="15" y="1" width="5" height="7" rx="0.5"/><rect x="1" y="11" width="5" height="7" rx="0.5" stroke-opacity=".3"/><rect x="8" y="11" width="5" height="7" rx="0.5" stroke-opacity=".3"/></svg>` },
  { value: 'wrap-reverse', label: 'Wrap Rev', icon: `<svg viewBox="0 0 22 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="11" width="5" height="7" rx="0.5"/><rect x="8" y="11" width="5" height="7" rx="0.5"/><rect x="15" y="11" width="5" height="7" rx="0.5"/><rect x="1" y="1" width="5" height="7" rx="0.5" stroke-opacity=".3"/><rect x="8" y="1" width="5" height="7" rx="0.5" stroke-opacity=".3"/></svg>` },
]

const justifyOptions = [
  { label: 'Start',         value: 'flex-start', icon: `<svg viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="6" height="12" rx="0.5"/><rect x="10" y="2" width="6" height="12" rx="0.5"/><rect x="18" y="2" width="6" height="12" rx="0.5"/></svg>` },
  { label: 'End',           value: 'flex-end',   icon: `<svg viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="8" y="2" width="6" height="12" rx="0.5"/><rect x="16" y="2" width="6" height="12" rx="0.5"/><rect x="24" y="2" width="6" height="12" rx="0.5"/></svg>` },
  { label: 'Center',        value: 'center',     icon: `<svg viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="6" y="2" width="6" height="12" rx="0.5"/><rect x="13" y="2" width="6" height="12" rx="0.5"/><rect x="20" y="2" width="6" height="12" rx="0.5"/></svg>` },
  { label: 'Between',       value: 'space-between', icon: `<svg viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="6" height="12" rx="0.5"/><rect x="13" y="2" width="6" height="12" rx="0.5"/><rect x="24" y="2" width="6" height="12" rx="0.5"/></svg>` },
  { label: 'Around',        value: 'space-around',  icon: `<svg viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="2" width="6" height="12" rx="0.5"/><rect x="13" y="2" width="6" height="12" rx="0.5"/><rect x="22" y="2" width="6" height="12" rx="0.5"/></svg>` },
  { label: 'Evenly',        value: 'space-evenly',  icon: `<svg viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="2" width="6" height="12" rx="0.5"/><rect x="13" y="2" width="6" height="12" rx="0.5"/><rect x="23" y="2" width="6" height="12" rx="0.5"/></svg>` },
]

const alignItemsOptions = [
  { label: 'Start',    value: 'flex-start', icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="3" width="4" height="12" rx="0.5"/><rect x="8" y="3" width="4" height="7" rx="0.5"/><rect x="14" y="3" width="4" height="9" rx="0.5"/><line x1="1" y1="1" x2="19" y2="1" stroke-dasharray="2 1" stroke-opacity=".5"/></svg>` },
  { label: 'Center',   value: 'center',     icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="3" width="4" height="12" rx="0.5"/><rect x="8" y="5.5" width="4" height="7" rx="0.5"/><rect x="14" y="4.5" width="4" height="9" rx="0.5"/><line x1="1" y1="9" x2="19" y2="9" stroke-dasharray="2 1" stroke-opacity=".2"/></svg>` },
  { label: 'End',      value: 'flex-end',   icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="3" width="4" height="12" rx="0.5"/><rect x="8" y="8" width="4" height="7" rx="0.5"/><rect x="14" y="6" width="4" height="9" rx="0.5"/><line x1="1" y1="17" x2="19" y2="17" stroke-dasharray="2 1" stroke-opacity=".5"/></svg>` },
  { label: 'Stretch',  value: 'stretch',    icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="1" width="4" height="16" rx="0.5"/><rect x="8" y="1" width="4" height="16" rx="0.5"/><rect x="14" y="1" width="4" height="16" rx="0.5"/></svg>` },
  { label: 'Baseline', value: 'baseline',   icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="8" width="4" height="7" rx="0.5"/><rect x="8" y="5" width="4" height="10" rx="0.5"/><rect x="14" y="10" width="4" height="5" rx="0.5"/><line x1="1" y1="15" x2="19" y2="15" stroke-dasharray="2 1" stroke-opacity=".5"/></svg>` },
]

const alignContentOptions = [
  { label: 'Start',    value: 'flex-start',    icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="16" height="4" rx="0.5"/><rect x="2" y="7" width="16" height="4" rx="0.5" stroke-opacity=".5"/><line x1="1" y1="1" x2="19" y2="1" stroke-dasharray="2 1" stroke-opacity=".5"/></svg>` },
  { label: 'Center',   value: 'center',        icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="5" width="16" height="4" rx="0.5"/><rect x="2" y="10" width="16" height="4" rx="0.5" stroke-opacity=".5"/><line x1="1" y1="9" x2="19" y2="9" stroke-dasharray="2 1" stroke-opacity=".3"/></svg>` },
  { label: 'End',      value: 'flex-end',      icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="12" width="16" height="4" rx="0.5"/><rect x="2" y="7" width="16" height="4" rx="0.5" stroke-opacity=".5"/><line x1="1" y1="17" x2="19" y2="17" stroke-dasharray="2 1" stroke-opacity=".5"/></svg>` },
  { label: 'Between',  value: 'space-between', icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="16" height="4" rx="0.5"/><rect x="2" y="12" width="16" height="4" rx="0.5"/><line x1="1" y1="1" x2="19" y2="1" stroke-dasharray="2 1" stroke-opacity=".2"/><line x1="1" y1="17" x2="19" y2="17" stroke-dasharray="2 1" stroke-opacity=".2"/></svg>` },
  { label: 'Around',   value: 'space-around',  icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="4" width="16" height="4" rx="0.5"/><rect x="2" y="10" width="16" height="4" rx="0.5"/></svg>` },
  { label: 'Stretch',  value: 'stretch',       icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="1" width="16" height="7" rx="0.5"/><rect x="2" y="10" width="16" height="7" rx="0.5"/></svg>` },
]

const gridFlowOptions = [
  { value: 'row',          label: 'Row',   icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="5" height="5" rx="0.5"/><rect x="11" y="4" width="5" height="5" rx="0.5"/><rect x="3" y="12" width="5" height="5" rx="0.5" stroke-opacity=".3"/><path d="M10 6h1m1 0-1-1m1 1-1 1" stroke-opacity=".5"/></svg>` },
  { value: 'column',       label: 'Col',   icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="3" width="5" height="5" rx="0.5"/><rect x="4" y="11" width="5" height="5" rx="0.5"/><rect x="12" y="3" width="5" height="5" rx="0.5" stroke-opacity=".3"/><path d="M6 10v1m0 1-1-1m1 1 1-1" stroke-opacity=".5"/></svg>` },
  { value: 'row dense',    label: 'R Dens', icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="5" height="5" rx="0.5"/><rect x="11" y="4" width="5" height="5" rx="0.5"/><rect x="3" y="12" width="5" height="5" rx="0.5" stroke-opacity=".3"/><circle cx="16" cy="14" r="2" fill="currentColor" fill-opacity=".3"/></svg>` },
  { value: 'column dense', label: 'C Dens', icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="3" width="5" height="5" rx="0.5"/><rect x="4" y="11" width="5" height="5" rx="0.5"/><rect x="12" y="3" width="5" height="5" rx="0.5" stroke-opacity=".3"/><circle cx="15" cy="14" r="2" fill="currentColor" fill-opacity=".3"/></svg>` },
]

// Grid Helpers
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

const alignSelfOptions = [
    { label: 'Auto', value: 'auto', icon: `<svg viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="9" r="6" stroke-dasharray="2 1"/></svg>` },
    ...alignItemsOptions
]

// ── Gap Preservation / Snapshot Logic ──────────────────────────────────────────────
function toggleGapLink() {
  if (isGapLinked.value) {
    // SWITCHING TO UNLINKED: Linked -> Unlinked
    // 1. Save current CSS Gap to backup
    gapBackup.value.linked.value = gap.value.value
    gapBackup.value.linked.unit  = gap.unit.value
    
    // 2. Remove Gap shortcut from CSS
    gap.set(null)
    
    // 3. Restore independent values from backup
    const b = gapBackup.value.unlinked
    if (b.rowValue !== null || b.colValue !== null) {
        rowGap.set(b.rowValue, b.rowUnit)
        colGap.set(b.colValue, b.colUnit)
    }
    
    isGapLinked.value = false
  } else {
    // SWITCHING TO LINKED: Unlinked -> Linked
    // 1. Save current Row/Col to backup
    gapBackup.value.unlinked.rowValue = rowGap.value.value
    gapBackup.value.unlinked.rowUnit  = rowGap.unit.value
    gapBackup.value.unlinked.colValue = colGap.value.value
    gapBackup.value.unlinked.colUnit  = colGap.unit.value
    
    // 2. Remove indepedent gaps from CSS
    rowGap.set(null)
    colGap.set(null)
    
    // 3. Restore unified gap from backup
    const b = gapBackup.value.linked
    if (b.value !== null) {
        gap.set(b.value, b.unit)
    }
    
    isGapLinked.value = true
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- DISPLAY SELECTION -->
    <VisualSelect
      label="Display"
      help="display: Define o comportamento de exibição do elemento (block, flex, grid, etc.)"
      :modelValue="display.raw.value"
      @update:modelValue="v => setDisplay(v)"
      :options="DISPLAY_OPTIONS"
      placeholder="Select display..."
    />

    <!-- FLEX CONTAINER (Conditional) -->
    <VisualFieldset v-if="isFlex" label="Flex Container" help="Propriedades do elemento como container flexível">
      <VisualToggleGroup label="Dir" help="flex-direction: Define a direção do eixo principal" :modelValue="flexDirection.raw.value" @update:modelValue="v => flexDirection.set(v)" :options="flexDirOptions" />
      <VisualToggleGroup label="Justify" help="justify-content: Alinhamento no eixo principal" :modelValue="justifyContent.raw.value" @update:modelValue="v => justifyContent.set(v)" :options="justifyOptions" />
      <VisualToggleGroup label="Align" help="align-items: Alinhamento no eixo transversal" :modelValue="alignItems.raw.value" @update:modelValue="v => alignItems.set(v)" :options="alignItemsOptions" />
      <VisualToggleGroup 
        label="Content" 
        help="align-content: Alinha as linhas do container no eixo transversal. ⚠️ Só funciona quando há mais de uma linha de itens — isso exige flex-wrap: wrap ou wrap-reverse. Com nowrap (padrão), todos os itens ficam em uma única linha e esta propriedade é ignorada pelo browser." 
        :modelValue="alignContent.raw.value" 
        @update:modelValue="v => alignContent.set(v)" 
        :options="alignContentOptions"
        :warning="!flexWrap.raw.value || flexWrap.raw.value === 'nowrap'"
      />
      <VisualToggleGroup label="Wrap" help="flex-wrap: Quebra de itens para novas linhas" :modelValue="flexWrap.raw.value" @update:modelValue="v => flexWrap.set(v)" :options="flexWrapOptions" />
      <div class="flex flex-col gap-2 mt-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] text-blue-700 font-semibold uppercase opacity-70">Gap</span>
          <button 
            @click="toggleGapLink" 
            class="p-0.5 rounded hover:bg-blue-100 transition-colors"
            :class="isGapLinked ? 'text-blue-600' : 'text-gray-400'"
            title="Vincular/Desvincular espaçamentos"
          >
            <svg v-if="isGapLinked" viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <svg v-else viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 11V7a4 4 0 1 1 8 0m0 4v2m-8-2v3m-2 5h12a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2Z"/></svg>
          </button>
        </div>

        <!-- Linked Mode -->
        <div v-if="isGapLinked" class="flex items-center gap-1">
          <span class="text-[10px] text-blue-700 font-normal min-w-[50px]">All Gap</span>
          <VisualInput help="gap: Espaçamento entre itens (geral)" :modelValue="gap.value.value" :unit="gap.unit.value" :units="['px', 'rem', 'em', '%']" :keywords="['normal']" @update:modelValue="v => { gap.set(v, gap.unit.value); rowGap.set(null); colGap.set(null); }" @update:unit="u => gap.set(gap.value.value, u)" placeholder="0" />
        </div>

        <!-- Unlinked Mode -->
        <template v-else>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-blue-700 font-normal min-w-[50px]">Row Gap</span>
            <VisualInput help="row-gap: Espaçamento entre linhas" :modelValue="rowGap.value.value" :unit="rowGap.unit.value" :units="['px', 'rem', 'em', '%']" :keywords="['normal']" @update:modelValue="v => rowGap.set(v, rowGap.unit.value)" @update:unit="u => rowGap.set(rowGap.value.value, u)" placeholder="0" />
          </div>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-blue-700 font-normal min-w-[50px]">Col Gap</span>
            <VisualInput help="column-gap: Espaçamento entre colunas" :modelValue="colGap.value.value" :unit="colGap.unit.value" :units="['px', 'rem', 'em', '%']" :keywords="['normal']" @update:modelValue="v => colGap.set(v, colGap.unit.value)" @update:unit="u => colGap.set(colGap.value.value, u)" placeholder="0" />
          </div>
        </template>
      </div>
    </VisualFieldset>

    <!-- GRID CONTAINER (Conditional) -->
    <VisualFieldset v-if="isGrid" label="Grid Container" help="Propriedades do elemento como container de grid">
      <!-- Grid Structure (Stacked for Sidebar compatibility) -->
      <div class="flex flex-col gap-1.5 ">
        <span class="text-[11px] text-blue-700 font-semibold uppercase tracking-tight opacity-70">Grid Structure</span>
        <div class="flex flex-col gap-2 bg-blue-50/50 p-2 rounded border border-blue-100/50">
          <!-- Columns -->
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 min-w-[60px]">
              <svg viewBox="0 0 20 20" class="w-3.5 h-3.5 text-blue-500 opacity-60" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="14" height="14" rx="1"/>
                <line x1="10" y1="3" x2="10" y2="17"/>
              </svg>
              <span class="text-[10px] text-blue-700 font-medium">Columns</span>
            </div>
            <VisualInput help="grid-template-columns: Quantidade de colunas" :modelValue="gridColsCount" @update:modelValue="v => setGridCols(v)" :units="[]" placeholder="—" />
          </div>
          
          <!-- Rows -->
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 min-w-[60px]">
              <svg viewBox="0 0 20 20" class="w-3.5 h-3.5 text-blue-500 opacity-60" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="14" height="14" rx="1"/>
                <line x1="3" y1="10" x2="17" y2="10"/>
              </svg>
              <span class="text-[10px] text-blue-700 font-medium">Rows</span>
            </div>
            <VisualInput help="grid-template-rows: Quantidade de linhas" :modelValue="gridRowsCount" @update:modelValue="v => setGridRows(v)" :units="[]" placeholder="—" />
          </div>
        </div>
      </div>
      <VisualToggleGroup label="Auto Flow" help="grid-auto-flow: Algoritmo de auto-posicionamento dos itens" :modelValue="gridFlow.raw.value" @update:modelValue="v => gridFlow.set(v)" :options="gridFlowOptions" />
      
      <div class="border-t border-gray-100 my-1.5"></div>

      <!-- Items Alignment (inside cells) -->
      <div class="flex flex-col gap-2">
        <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Items</span>
        <VisualToggleGroup label="J. Items" help="justify-items: Alinhamento horizontal dos itens dentro das células" :modelValue="justifyItems.raw.value" @update:modelValue="v => justifyItems.set(v)" :options="alignSelfOptions" />
        <VisualToggleGroup label="A. Items" help="align-items: Alinhamento vertical dos itens dentro das células" :modelValue="alignItems.raw.value" @update:modelValue="v => alignItems.set(v)" :options="alignItemsOptions" />
      </div>

      <div class="border-t border-gray-100 my-1.5"></div>

      <!-- Content Alignment (grid tracks) -->
      <div class="flex flex-col gap-2">
        <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tracks</span>
        <VisualToggleGroup label="J. Tracks" help="justify-content: Alinhamento das trilhas horizontalmente" :modelValue="justifyContent.raw.value" @update:modelValue="v => justifyContent.set(v)" :options="justifyOptions" />
        <VisualToggleGroup label="A. Tracks" help="align-content: Alinhamento das trilhas verticalmente" :modelValue="alignContent.raw.value" @update:modelValue="v => alignContent.set(v)" :options="alignContentOptions" />
      </div>

      <div class="flex flex-col gap-2 mt-2 border-t border-gray-100 pt-2">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] text-blue-700 font-semibold uppercase opacity-70">Gap</span>
          <button 
            @click="toggleGapLink" 
            class="p-0.5 rounded hover:bg-blue-100 transition-colors"
            :class="isGapLinked ? 'text-blue-600' : 'text-gray-400'"
            title="Vincular/Desvincular espaçamentos"
          >
            <svg v-if="isGapLinked" viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <svg v-else viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 11V7a4 4 0 1 1 8 0m0 4v2m-8-2v3m-2 5h12a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2Z"/></svg>
          </button>
        </div>

        <!-- Linked Mode -->
        <div v-if="isGapLinked" class="flex items-center gap-1">
          <span class="text-[10px] text-blue-700 font-normal min-w-[50px]">All Gap</span>
          <VisualInput help="gap: Espaçamento entre itens no grid (geral)" :modelValue="gap.value.value" :unit="gap.unit.value" :units="['px', 'rem', 'em', '%']" :keywords="['normal']" @update:modelValue="v => { gap.set(v, gap.unit.value); rowGap.set(null); colGap.set(null); }" @update:unit="u => gap.set(gap.value.value, u)" placeholder="0" />
        </div>

        <!-- Unlinked Mode -->
        <template v-else>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-blue-700 font-normal min-w-[50px]">Row Gap</span>
            <VisualInput help="row-gap: Espaçamento entre linhas no grid" :modelValue="rowGap.value.value" :unit="rowGap.unit.value" :units="['px', 'rem', 'em', '%']" :keywords="['normal']" @update:modelValue="v => rowGap.set(v, rowGap.unit.value)" @update:unit="u => rowGap.set(rowGap.value.value, u)" placeholder="0" />
          </div>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-blue-700 font-normal min-w-[50px]">Col Gap</span>
            <VisualInput help="column-gap: Espaçamento entre colunas no grid" :modelValue="colGap.value.value" :unit="colGap.unit.value" :units="['px', 'rem', 'em', '%']" :keywords="['normal']" @update:modelValue="v => colGap.set(v, colGap.unit.value)" @update:unit="u => colGap.set(colGap.value.value, u)" placeholder="0" />
          </div>
        </template>
      </div>
    </VisualFieldset>

    <!-- CHILD SETTINGS (Flex/Grid Item) -->
    <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
      <VisualFieldset :disabled="!isParentFlex" label="Flex Child" help="Propriedades do item dentro de um container Flex">
        <template #badge v-if="!isParentFlex">
          <span class="text-amber-500 font-bold" title="Requer pai com display: flex ou inline-flex">!</span>
        </template>
        <div class="flex flex-col gap-2">
          <div class="grid grid-cols-2 gap-2">
            <VisualInput label="Grow" help="flex-grow: Capacidade de crescimento" :modelValue="flexGrow.raw.value" @update:modelValue="v => flexGrow.set(v)" :units="[]" :keywords="['inherit', 'initial']" placeholder="0" />
            <VisualInput label="Shrink" help="flex-shrink: Capacidade de redução" :modelValue="flexShrink.raw.value" @update:modelValue="v => flexShrink.set(v)" :units="[]" :keywords="['inherit', 'initial']" placeholder="1" />
          </div>
          <VisualToggleGroup label="Align" help="align-self: Sobrescreve alinhamento vertical" :modelValue="alignSelf.raw.value" @update:modelValue="v => alignSelf.set(v)" :options="alignSelfOptions" />
          <VisualInput label="Basis" help="flex-basis: Tamanho base antes da distribuição" :modelValue="flexBasis.value.value" :unit="flexBasis.unit.value" :units="['px', 'rem', 'em', '%', 'auto']" :keywords="['auto', 'content', 'min-content', 'max-content', 'fit-content']" @update:modelValue="v => flexBasis.set(v, flexBasis.unit.value)" @update:unit="u => flexBasis.set(flexBasis.value.value, u)" placeholder="auto" />
          <VisualInput label="Order" help="order: Ordem visual no container" :modelValue="order.raw.value" @update:modelValue="v => order.set(v)" :units="[]" :keywords="['inherit', 'initial']" placeholder="0" />
        </div>
      </VisualFieldset>

      <VisualFieldset :disabled="!isParentGrid" label="Grid Child" help="Propriedades do item dentro de um container Grid">
        <template #badge v-if="!isParentGrid">
          <span class="text-amber-500 font-bold" title="Requer pai com display: grid ou inline-grid">!</span>
        </template>
        <div class="flex flex-col gap-2">
          <div class="grid grid-cols-2 gap-2">
            <VisualInput label="Col" help="grid-column: Início/fim das colunas (ex: 1 / 3)" :modelValue="gridColumn.raw.value" @update:modelValue="v => gridColumn.set(v)" :units="[]" :keywords="['auto', 'span']" placeholder="auto" />
            <VisualInput label="Row" help="grid-row: Início/fim das linhas (ex: 1 / span 2)" :modelValue="gridRow.raw.value" @update:modelValue="v => gridRow.set(v)" :units="[]" :keywords="['auto', 'span']" placeholder="auto" />
          </div>
          <VisualToggleGroup label="Align" help="align-self: Alinhamento vertical individual" :modelValue="alignSelf.raw.value" @update:modelValue="v => alignSelf.set(v)" :options="alignSelfOptions" />
          <VisualToggleGroup label="Just" help="justify-self: Alinhamento horizontal individual" :modelValue="justifySelf.raw.value" @update:modelValue="v => justifySelf.set(v)" :options="alignSelfOptions" />
        </div>
      </VisualFieldset>
    </div>
  </div>
</template>
