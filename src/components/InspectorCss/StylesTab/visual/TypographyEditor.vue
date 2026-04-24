<script setup>
import { watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSelect from '@/components/ui/VisualSelect.vue'
import VisualToggleGroup from '@/components/ui/VisualToggleGroup.vue'
import VisualFieldset from '@/components/ui/VisualFieldset.vue'
import ColorVarInput from '@/components/ui/ColorVarInput.vue'
import TextShadowEditor from './TextShadowEditor.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const getRule = () => props.ruleGetter()

const TYPOGRAPHY_PROPS = [
  'font-family', 'font-weight', 'font-size', 'line-height', 'color',
  'text-align', 'vertical-align', 'text-decoration-line', 'letter-spacing', 'text-indent',
  'word-break', 'line-break', 'font-style', 'text-transform', 'direction',
  'white-space', 'text-overflow', 'hyphens', '-webkit-font-smoothing',
  '-webkit-text-stroke-width', '-webkit-text-stroke-color',
  'list-style-type', 'list-style-position'
]

const { hasAnyValue, useProp } = useVisualSection(getRule, TYPOGRAPHY_PROPS)

const emit = defineEmits(['has-value'])
watch(hasAnyValue, (v) => emit('has-value', v), { immediate: true })

// ── Properties (via useProp for auto-tracking) ────────────────────────────────
const font          = useProp('font-family')
const weight        = useProp('font-weight')
const size          = useProp('font-size')
const lineHeight    = useProp('line-height')
const color         = useProp('color')
const textAlign     = useProp('text-align')
const verticalAlign   = useProp('vertical-align')
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
const hyphens       = useProp('hyphens')
const smoothing     = useProp('-webkit-font-smoothing')
const strokeWidth   = useProp('-webkit-text-stroke-width')
const strokeColor   = useProp('-webkit-text-stroke-color')
const listType      = useProp('list-style-type')
const listPos       = useProp('list-style-position')

// ── Presets ───────────────────────────────────────────────────────────────────
function applyTruncatePreset() {
  whiteSpace.set('nowrap')
  textOverflow.set('ellipsis')
  // Nota: Não temos acesso direto ao overflow aqui, mas informamos no tooltip
}

function applyBreakAllPreset() {
  wordBreak.set('break-all')
  whiteSpace.set('normal')
  textOverflow.set('clip')
}

function applyPreservePreset() {
  whiteSpace.set('pre-wrap')
  wordBreak.set('normal')
}

// ── Font Family: lista de sugestões para datalist ─────────────────────────────
const FONT_SUGGESTIONS = [
  // System / Generic
  'system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
  // Google Fonts — mais populares
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito',
  'Raleway', 'Oswald', 'Merriweather', 'Playfair Display', 'Ubuntu',
  'Source Sans Pro', 'Noto Sans', 'Fira Code', 'PT Sans', 'DM Sans',
  'Outfit', 'Bebas Neue', 'Josefin Sans', 'Exo 2', 'Barlow',
  // Classic Web Safe
  'Arial', 'Verdana', 'Tahoma', 'Georgia', 'Times New Roman', 'Courier New',
  'Trebuchet MS', 'Impact',
]

// ── Options ──────────────────────────────────────────────────────────────────
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
  { label: 'Left',    value: 'left',    icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path d="M3 6h18M3 10h12M3 14h18M3 18h12"/></svg>' },
  { label: 'Center',  value: 'center',  icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path d="M3 6h18M6 10h12M3 14h18M6 18h12"/></svg>' },
  { label: 'Right',   value: 'right',   icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path d="M3 6h18M9 10h12M3 14h18M9 18h12"/></svg>' },
  { label: 'Justify', value: 'justify', icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path d="M3 6h18M3 10h18M3 14h18M3 18h18"/></svg>' },
]

const vAlignOptions = [
  { label: 'Baseline', value: 'baseline', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="3" y1="18" x2="21" y2="18" stroke-dasharray="2 2"/><rect x="7" y="8" width="10" height="10" rx="0.5"/></svg>' },
  { label: 'Top',      value: 'top',      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="3" y1="3" x2="21" y2="3"/><rect x="7" y="4" width="10" height="9" rx="0.5"/></svg>' },
  { label: 'Middle',   value: 'middle',   icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="3" y1="12" x2="21" y2="12"/><rect x="7" y="7.5" width="10" height="9" rx="0.5"/></svg>' },
  { label: 'Bottom',   value: 'bottom',   icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="3" y1="21" x2="21" y2="21"/><rect x="7" y="11" width="10" height="9" rx="0.5"/></svg>' },
]

const listTypeOptions = [
  { label: 'None',    value: 'none' },
  { label: 'Disc',    value: 'disc' },
  { label: 'Circle',  value: 'circle' },
  { label: 'Square',  value: 'square' },
  { label: 'Decimal', value: 'decimal' },
  { label: 'Lower Alpha', value: 'lower-alpha' },
]

const listPosOptions = [
  { label: 'Outside', value: 'outside' },
  { label: 'Inside',  value: 'inside' },
]

const smoothingOptions = [
  { label: 'Subpixel', value: 'subpixel-antialiased' },
  { label: 'Antialiased', value: 'antialiased' },
]

const decorOptions = [
  { label: 'None',          value: 'none',         icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24" stroke-opacity=".4"><path d="M18 6L6 18M6 6l12 12"/></svg>' },
  { label: 'Underline',     value: 'underline',    icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path d="M7 5v7a5 5 0 0010 0V5M4 20h16"/></svg>' },
  { label: 'Strikethrough', value: 'line-through', icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path d="M4 12h16M9 6s1-2 3-2 3 1.5 3 1.5M9 18s1 2 3 2 3-1.5 3-1.5"/></svg>' },
  { label: 'Overline',      value: 'overline',     icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path d="M4 4h16M8 8v7a4 4 0 008 0V8"/></svg>' },
]

const styleOptions = [
  { label: 'Normal', value: 'normal', icon: '<span style="font-style:normal;font-weight:400;font-size:12px">A</span>' },
  { label: 'Italic', value: 'italic', icon: '<span style="font-style:italic;font-weight:400;font-size:12px">A</span>' },
]

const transformOptions = [
  { label: 'None',       value: 'none',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M5 19L19 5M5 5l14 14" stroke-opacity=".3"/><text x="8" y="16" font-size="12" fill="currentColor" stroke="none">T</text></svg>' },
  { label: 'UPPERCASE',  value: 'uppercase',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><text x="3" y="16" font-size="12" font-weight="400" font-family="sans-serif">AA</text></svg>' },
  { label: 'Capitalize', value: 'capitalize',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><text x="3" y="16" font-size="12" font-weight="400" font-family="sans-serif">Aa</text></svg>' },
  { label: 'lowercase',  value: 'lowercase',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><text x="3" y="16" font-size="12" font-weight="400" font-family="sans-serif">aa</text></svg>' },
]

const directionOptions = [
  { label: 'LTR', value: 'ltr', icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M4 12h16M14 6l6 6-6 6"/></svg>' },
  { label: 'RTL', value: 'rtl', icon: '<svg fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M20 12H4M10 6L4 12l6 6"/></svg>' },
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

// ── Font Family: free input handler ──────────────────────────────────────────
const fontDatalistId = 'vp-font-family-list'

function handleFontInput(e) {
  font.set(e.target.value || null)
}
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div class="flex flex-col gap-2">

      <!-- ── Font Family (free input + datalist) ── -->
      <div class="flex items-center gap-1">
        <div 
          class="text-[11px] text-blue-700 font-normal tracking-tight min-w-[44px] whitespace-nowrap select-none shrink-0"
          title="font-family: Define a família tipográfica do elemento"
        >Font</div>
        <div class="border flex items-center bg-gray-100 rounded border-blue-200 focus-within:border-blue-400 focus-within:bg-white transition-all overflow-hidden h-6 flex-1">
          <input
            type="text"
            :value="font.raw.value ?? ''"
            @input="handleFontInput"
            :list="fontDatalistId"
            class="h-full grow min-w-0 bg-transparent border-none outline-none px-1.5 text-[11px] font-medium text-gray-800"
            placeholder="system-ui, sans-serif…"
            spellcheck="false"
            autocomplete="off"
          />
          <datalist :id="fontDatalistId">
            <option v-for="f in FONT_SUGGESTIONS" :key="f" :value="f" />
          </datalist>
        </div>
      </div>

      <!-- Size & Color -->
      <div class="grid grid-cols-2 gap-2">
        <VisualInput label="Size" 
          help="font-size: Controla o tamanho (altura) dos caracteres"
          :modelValue="size.value.value" :unit="size.unit.value"
          @update:modelValue="v => size.set(v, size.unit.value)"
          @update:unit="u => size.set(size.value.value, u)"
        />
        <div class="flex items-center gap-1">
          <div 
            class="text-[11px] text-blue-700 font-normal tracking-tight min-w-[44px] whitespace-nowrap select-none shrink-0"
            title="color: Define a cor do texto"
          >Color</div>
          <ColorVarInput 
            :value="color.raw.value"
            @update="v => color.set(v)"
            class="flex-1"
          />
        </div>
      </div>

      <!-- Weight & Line Height -->
      <div class="grid grid-cols-2 gap-2">
        <VisualSelect 
          label="Weight" 
          help="font-weight: Define a espessura/peso visual dos caracteres"
          :modelValue="weight.raw.value" 
          @update:modelValue="v => weight.set(v)"
          :options="weightOptions"
          placeholder="Regular"
        />
        <VisualInput label="Height" 
          help="line-height: Altura da linha. Controla o espaçamento vertical entre linhas"
          :modelValue="lineHeight.value.value" :unit="lineHeight.unit.value"
          :units="['', 'px', 'rem', 'em']" :keywords="['normal', 'inherit']" :step="0.1" :min="0" :max="10"
          @update:modelValue="v => lineHeight.set(v, lineHeight.unit.value)"
          @update:unit="u => lineHeight.set(lineHeight.value.value, u)"
        />
      </div>

      <!-- Align & Vertical Align -->
      <div class="grid grid-cols-2 gap-2">
        <VisualToggleGroup label="Align" help="text-align: Alinhamento horizontal do conteúdo de texto" :modelValue="textAlign.raw.value" @update:modelValue="v => textAlign.set(v)" :options="alignOptions" />
        <VisualToggleGroup label="V-Align" help="vertical-align: Alinhamento vertical. Nota: Só funciona em elementos inline, inline-block ou table-cell (não funciona em blocos puros)." :modelValue="verticalAlign.raw.value" @update:modelValue="v => verticalAlign.set(v)" :options="vAlignOptions" />
      </div>

      <!-- Decoration, Style, Case & Spacing -->
      <div class="flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-2">
          <VisualToggleGroup label="Decor" help="text-decoration-line: Adiciona linhas decorativas (sublinhado, riscados)" :modelValue="decoration.raw.value" @update:modelValue="v => decoration.set(v)" :options="decorOptions" />
          <VisualToggleGroup label="Style" help="font-style: Define se a fonte é normal ou itálica" :modelValue="fontStyle.raw.value" @update:modelValue="v => fontStyle.set(v)" :options="styleOptions" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <VisualToggleGroup label="Case" help="text-transform: Controla a capitalização (maiúsculas, minúsculas)" :modelValue="textTransform.raw.value" @update:modelValue="v => textTransform.set(v)" :options="transformOptions" />
          <VisualInput label="Spacing" 
            title="letter-spacing: Espaçamento horizontal entre as letras"
            help="letter-spacing: Espaçamento horizontal entre os caracteres"
            :modelValue="letterSpacing.value.value" :unit="letterSpacing.unit.value"
            :units="['px', 'em']"
            placeholder="0em"
            allow-negative
            @update:modelValue="v => letterSpacing.set(v, letterSpacing.unit.value)"
            @update:unit="u => letterSpacing.set(letterSpacing.value.value, u)"
          />
        </div>
      </div>

      <!-- List Style -->
      <VisualFieldset label="List Style" help="Propriedades de marcador de lista (list-style)">
        <div class="grid grid-cols-2 gap-2">
          <VisualSelect help="list-style-type: Define o tipo de marcador da lista" :modelValue="listType.raw.value" @update:modelValue="v => listType.set(v)" :options="listTypeOptions" placeholder="Default (Disc)" />
          <VisualSelect help="list-style-position: Define se o marcador fica dentro ou fora do fluxo" :modelValue="listPos.raw.value" @update:modelValue="v => listPos.set(v)" :options="listPosOptions" placeholder="Outside" />
        </div>
      </VisualFieldset>

      <!-- SECTION: Text Wrapping & Breaking -->
      <VisualFieldset label="Wrapping & Breaking" help="Configurações de quebra e fluxo de texto">
        <!-- Presets inside the group -->
        <div class="flex gap-1.5">
          <button @click="applyTruncatePreset" class="flex-1 py-1 px-2 text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded hover:bg-blue-100 transition-colors" title="Truncar uma linha (nowrap + ellipsis)">
            Single Line
          </button>
          <button @click="applyBreakAllPreset" class="flex-1 py-1 px-2 text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded hover:bg-blue-100 transition-colors" title="Quebra total (break-all)">
            Break Any
          </button>
          <button @click="applyPreservePreset" class="flex-1 py-1 px-2 text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded hover:bg-blue-100 transition-colors" title="Preservar espaços (pre-wrap)">
            Preserve
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-0.5">
          <VisualSelect label="Wrap" help="white-space: Controla quebras de linha automáticas." :modelValue="whiteSpace.raw.value" @update:modelValue="v => whiteSpace.set(v)" :options="wrapOptions" placeholder="Normal" />
          <VisualSelect label="Overflow" help="text-overflow: Adiciona reticências. Requer Wrap:Nowrap e Overflow:Hidden." :modelValue="textOverflow.raw.value" @update:modelValue="v => textOverflow.set(v)" :options="truncateOptions" placeholder="Clip" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <VisualSelect label="Word" help="word-break: Como as palavras quebram no final da linha." :modelValue="wordBreak.raw.value" @update:modelValue="v => wordBreak.set(v)" :options="wordBreakOptions" placeholder="Normal" />
          <VisualSelect label="Line" help="line-break: Regras de quebra (focado em CJK)." :modelValue="lineBreak.raw.value" @update:modelValue="v => lineBreak.set(v)" :options="lineBreakOptions" placeholder="Normal" />
        </div>

        <VisualSelect label="Hyph" help="hyphens: Hifenação automática." :modelValue="hyphens.raw.value" @update:modelValue="v => hyphens.set(v)" :options="[{label:'Auto',value:'auto'},{label:'None',value:'none'}]" placeholder="Manual" />
      </VisualFieldset>

      <!-- SECTION: Advanced Settings -->
      <VisualFieldset label="Advanced" help="Outros ajustes de tipografia">
        <div class="grid grid-cols-2 gap-2">
          <VisualToggleGroup label="Dir" help="direction: Direção do texto." :modelValue="direction.raw.value" @update:modelValue="v => direction.set(v)" :options="directionOptions" />
          <VisualSelect label="Smooth" help="-webkit-font-smoothing: Suavização de renderização de fonte. Antialiased = fontes mais finas e suaves; Subpixel = fontes mais nítidas." :modelValue="smoothing.raw.value" @update:modelValue="v => smoothing.set(v)" :options="smoothingOptions" placeholder="Default" />
        </div>

        <VisualInput label="Indent" 
          help="text-indent: Recuo da primeira linha."
          :modelValue="textIndent.value.value" :unit="textIndent.unit.value"
          placeholder="0px"
          allow-negative
          @update:modelValue="v => textIndent.set(v, textIndent.unit.value)"
          @update:unit="u => textIndent.set(textIndent.value.value, u)"
        />

        <!-- Stroke -->
        <div class="flex items-center gap-2">
          <div 
            class="text-[11px] text-blue-700 font-normal tracking-tight min-w-[44px] whitespace-nowrap select-none shrink-0"
            title="-webkit-text-stroke: Adiciona contorno aos caracteres"
          >Stroke</div>
          <VisualInput 
            help="-webkit-text-stroke-width: Espessura do contorno do texto"
            :modelValue="strokeWidth.value.value" :unit="strokeWidth.unit.value"
            :units="['px', 'em']"
            @update:modelValue="v => strokeWidth.set(v, strokeWidth.unit.value)"
            @update:unit="u => strokeWidth.set(strokeWidth.value.value, u)"
          />
          <ColorVarInput 
            title="-webkit-text-stroke-color: Cor do contorno do texto"
            :value="strokeColor.raw.value"
            @update="v => strokeColor.set(v)"
            class="flex-1"
          />
        </div>
      </VisualFieldset>

      <!-- ── Text Shadow ── -->
      <VisualFieldset label="Text Shadow" help="text-shadow: Adiciona sombras ao texto">
        <TextShadowEditor :rule-getter="getRule" />
      </VisualFieldset>
    </div>

  </div>
</template>
