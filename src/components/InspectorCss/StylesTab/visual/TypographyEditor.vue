<script setup>
import { ref, computed } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSelect from '@/components/ui/VisualSelect.vue'
import VisualToggleGroup from '@/components/ui/VisualToggleGroup.vue'
import ColorVarInput from '@/components/ui/ColorVarInput.vue'
import TextShadowEditor from './TextShadowEditor.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const getRule = () => props.ruleGetter()

const TYPOGRAPHY_PROPS = [
  'font-family', 'font-weight', 'font-size', 'line-height', 'color',
  'text-align', 'text-decoration-line', 'letter-spacing', 'text-indent',
  'word-break', 'line-break', 'font-style', 'text-transform', 'direction',
  'white-space', 'text-overflow',
  '-webkit-text-stroke-width', '-webkit-text-stroke-color',
]

const { showContent, hasAnyValue, useProp } = useVisualSection(getRule, TYPOGRAPHY_PROPS)

// ── Properties (via useProp for auto-tracking) ────────────────────────────────
const font          = useProp('font-family')
const weight        = useProp('font-weight')
const size          = useProp('font-size')
const lineHeight    = useProp('line-height')
const color         = useProp('color')
const textAlign     = useProp('text-align')
const decoration    = useProp('text-decoration-line')
const letterSpacing = useProp('letter-spacing')
const textIndent    = useProp('text-indent')
const wordBreak     = useProp('word-break')
const lineBreak     = useProp('line-break')
const fontStyle     = useProp('font-style')
const textTransform = useProp('text-transform')
const direction     = useProp('direction')
const whiteSpace    = useProp('white-space')
const textOverflow  = useProp('text-overflow')
const strokeWidth   = useProp('-webkit-text-stroke-width')
const strokeColor   = useProp('-webkit-text-stroke-color')

// ── Options ──────────────────────────────────────────────────────────────────
const fontOptions = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'system-ui', 'serif', 'sans-serif', 'monospace']
const weightOptions = [
  { label: 'Thin (100)',       value: '100' },
  { label: 'Extra Light (200)',value: '200' },
  { label: 'Light (300)',      value: '300' },
  { label: 'Normal (400)',     value: '400' },
  { label: 'Medium (500)',     value: '500' },
  { label: 'Semi Bold (600)',  value: '600' },
  { label: 'Bold (700)',       value: '700' },
  { label: 'Extra Bold (800)', value: '800' },
  { label: 'Black (900)',      value: '900' },
]

const alignOptions = [
  { label: 'Left',    value: 'left',    icon: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z"/></svg>' },
  { label: 'Center',  value: 'center',  icon: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm3 4h12v2H6V7zm-3 4h18v2H3v-2zm3 4h12v2H6v-2zm-3 4h18v2H3v-2z"/></svg>' },
  { label: 'Right',   value: 'right',   icon: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm9 4h9v2h-9V7zm-9 4h18v2H3v-2zm9 4h9v2h-9v-2zm-9 4h18v2H3v-2z"/></svg>' },
  { label: 'Justify', value: 'justify', icon: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>' },
]

const decorOptions = [
  { label: 'None',          value: 'none',         icon: '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>' },
  { label: 'Underline',     value: 'underline',    icon: '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3M3 21h18"/></svg>' },
  { label: 'Strikethrough', value: 'line-through', icon: '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M3 12h18M8 6s1-3 4-3 4 2 4 2M8 18s1 3 4 3 4-2 4-2"/></svg>' },
  { label: 'Overline',      value: 'overline',     icon: '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M3 3h18M8 6v9a4 4 0 008 0V6"/></svg>' },
]

const styleOptions = [
  { label: 'Normal', value: 'normal', icon: '<span style="font-style:normal;font-weight:700;font-size:12px">I</span>' },
  { label: 'Italic', value: 'italic', icon: '<span style="font-style:italic;font-weight:700;font-size:12px">I</span>' },
]

const transformOptions = [
  { label: 'None',       value: 'none',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><text x="4" y="16" font-size="11" font-family="serif" fill="currentColor" stroke="none" style="font-style:italic">T</text><line x1="5" y1="18" x2="20" y2="5" stroke-width="2"/></svg>' },
  { label: 'UPPERCASE',  value: 'uppercase',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><text x="2" y="15" font-size="10" font-weight="700" font-family="sans-serif">AA</text></svg>' },
  { label: 'Capitalize', value: 'capitalize',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><text x="2" y="14" font-size="12" font-weight="700" font-family="sans-serif">A</text><text x="13" y="17" font-size="9" font-family="sans-serif">a</text></svg>' },
  { label: 'lowercase',  value: 'lowercase',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><text x="2" y="17" font-size="11" font-family="sans-serif">aa</text></svg>' },
]

const directionOptions = [
  { label: 'LTR (left to right)', value: 'ltr', icon: '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M4 12h16M13 6l6 6-6 6"/></svg>' },
  { label: 'RTL (right to left)', value: 'rtl', icon: '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 12H4M11 6L5 12l6 6"/></svg>' },
]

const wordBreakOptions = [
  { label: 'Normal',    value: 'normal' },
  { label: 'Break All', value: 'break-all' },
  { label: 'Keep All',  value: 'keep-all' },
]

const lineBreakOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Auto',   value: 'auto' },
  { label: 'Loose',  value: 'loose' },
  { label: 'Strict', value: 'strict' },
]

const wrapOptions = [
  { label: 'Normal',    value: 'normal' },
  { label: 'No Wrap',   value: 'nowrap' },
  { label: 'Pre',       value: 'pre' },
  { label: 'Pre Wrap',  value: 'pre-wrap' },
  { label: 'Pre Line',  value: 'pre-line' },
]

const truncateOptions = [
  { label: 'Clip',     value: 'clip' },
  { label: 'Ellipsis', value: 'ellipsis' },
]
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <!-- ── Typography Header ──────────────────────────────────────────── -->
    <div 
      class="flex items-center justify-between border-b border-gray-100 pb-1 cursor-pointer select-none"
      @click="showContent = !showContent"
    >
      <span class="text-[11px] font-bold text-gray-700">Typography</span>
      <div class="flex items-center gap-1.5">
        <!-- Blue dot: indicates that at least one typography property is set -->
        <span 
          v-if="hasAnyValue"
          class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"
          title="This rule has typography properties"
        ></span>
        <svg class="w-3 h-3 text-gray-400 transition-transform" :class="showContent ? '' : '-rotate-90'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <div v-show="showContent" class="flex flex-col gap-2">
      <!-- Font Family -->
      <VisualSelect 
        label="Font" 
        :modelValue="font.raw.value" 
        @update:modelValue="v => font.set(v)"
        :options="fontOptions" 
        placeholder="Default"
      />

      <!-- Font Weight -->
      <VisualSelect 
        label="Weight" 
        :modelValue="weight.raw.value" 
        @update:modelValue="v => weight.set(v)"
        :options="weightOptions"
        placeholder="Regular"
      />

      <!-- Size & Line Height -->
      <div class="grid grid-cols-2 gap-2">
        <VisualInput label="Size" 
          :modelValue="size.value.value" :unit="size.unit.value"
          @update:modelValue="v => size.set(v, size.unit.value)"
          @update:unit="u => size.set(size.value.value, u)"
        />
        <VisualInput label="Height" 
          :modelValue="lineHeight.value.value" :unit="lineHeight.unit.value"
          :units="['', 'px', 'rem', 'em']" :step="0.1" :min="0" :max="10"
          @update:modelValue="v => lineHeight.set(v, lineHeight.unit.value)"
          @update:unit="u => lineHeight.set(lineHeight.value.value, u)"
        />
      </div>

      <!-- Color -->
      <div class="flex items-center gap-1">
        <div class="text-[10px] text-gray-500 font-medium uppercase min-w-[30px]">Color</div>
        <ColorVarInput 
          :value="color.raw.value"
          @update="v => color.set(v)"
        />
      </div>

      <!-- Align & Decoration -->
      <VisualToggleGroup label="Align" :modelValue="textAlign.raw.value" @update:modelValue="v => textAlign.set(v)" :options="alignOptions" />
      <VisualToggleGroup label="Decor" :modelValue="decoration.raw.value" @update:modelValue="v => decoration.set(v)" :options="decorOptions" />

      <!-- Separator -->
      <div class="border-t border-gray-100 mt-0.5 pt-1 flex flex-col gap-2">

        <!-- Letter Spacing & Text Indent -->
        <div class="grid grid-cols-2 gap-2">
          <VisualInput label="Spacing" 
            :modelValue="letterSpacing.value.value" :unit="letterSpacing.unit.value"
            :units="['px', 'em']"
            @update:modelValue="v => letterSpacing.set(v, letterSpacing.unit.value)"
            @update:unit="u => letterSpacing.set(letterSpacing.value.value, u)"
          />
          <VisualInput label="Indent" 
            :modelValue="textIndent.value.value" :unit="textIndent.unit.value"
            @update:modelValue="v => textIndent.set(v, textIndent.unit.value)"
            @update:unit="u => textIndent.set(textIndent.value.value, u)"
          />
        </div>

        <!-- Breaking: Word + Line -->
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-0.5">
            <VisualSelect :modelValue="wordBreak.raw.value" @update:modelValue="v => wordBreak.set(v)" :options="wordBreakOptions" placeholder="Normal" />
            <span class="text-[9px] text-gray-400 text-center">Word</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <VisualSelect :modelValue="lineBreak.raw.value" @update:modelValue="v => lineBreak.set(v)" :options="lineBreakOptions" placeholder="Normal" />
            <span class="text-[9px] text-gray-400 text-center">Line</span>
          </div>
        </div>

        <!-- Italic + Transform + Direction -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <VisualToggleGroup label="Style" :modelValue="fontStyle.raw.value" @update:modelValue="v => fontStyle.set(v)" :options="styleOptions" />
            <VisualToggleGroup label="Case" :modelValue="textTransform.raw.value" @update:modelValue="v => textTransform.set(v)" :options="transformOptions" />
            <VisualToggleGroup label="Dir" :modelValue="direction.raw.value" @update:modelValue="v => direction.set(v)" :options="directionOptions" />
          </div>
        </div>

        <!-- Wrap -->
        <VisualSelect label="Wrap" :modelValue="whiteSpace.raw.value" @update:modelValue="v => whiteSpace.set(v)" :options="wrapOptions" placeholder="Normal" />

        <!-- Truncate -->
        <div class="flex items-center gap-1">
          <div class="text-[10px] text-gray-500 font-medium uppercase min-w-[40px]">Truncate</div>
          <div class="flex flex-1 gap-1">
            <button 
              v-for="opt in truncateOptions" :key="opt.value"
              @click="textOverflow.raw.value === opt.value ? textOverflow.set(null) : textOverflow.set(opt.value)"
              class="flex-1 h-6 text-[10px] font-medium rounded border transition-all"
              :class="textOverflow.raw.value === opt.value 
                ? 'bg-blue-50 border-blue-300 text-blue-600' 
                : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Stroke -->
        <div class="flex items-center gap-2">
          <div class="text-[10px] text-gray-500 font-medium uppercase min-w-[40px]">Stroke</div>
          <VisualInput 
            :modelValue="strokeWidth.value.value" :unit="strokeWidth.unit.value"
            :units="['px', 'em']"
            @update:modelValue="v => strokeWidth.set(v, strokeWidth.unit.value)"
            @update:unit="u => strokeWidth.set(strokeWidth.value.value, u)"
          />
          <ColorVarInput 
            :value="strokeColor.raw.value"
            @update="v => strokeColor.set(v)"
            class="flex-1"
          />
        </div>

      </div><!-- /separator block -->
    </div><!-- /v-show Typography -->

    <!-- ── Text Shadow Section ───────────────────────────────────────── -->
    <TextShadowEditor :rule-getter="ruleGetter" />

  </div>
</template>
