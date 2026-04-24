<!--
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  BorderEditor.vue — Visão Geral                                              ║
  ╠══════════════════════════════════════════════════════════════════════════════╣
  ║  Editor visual de bordas CSS. Permite editar border de forma unificada       ║
  ║  (todos os lados) ou individualmente (top, right, bottom, left).             ║
  ║                                                                              ║
  ║  Botão [S] — Shorthand                                                       ║
  ║  ┌─ Modo linked  → gera `border: 2px solid red`                              ║
  ║  └─ Modo unlinked → gera `border-top: 2px solid red` por lado                ║
  ║                                                                              ║
  ║  Botão 🔗 — Link/Unlink                                                      ║
  ║  ┌─ Linked   → edita os 4 lados com as mesmas props                          ║
  ║  └─ Unlinked → cada lado tem campos e shorthand independentes                ║
  ╚══════════════════════════════════════════════════════════════════════════════╝

  ──────────────────────────────────────────────────────────────────────────────
  DOCUMENTAÇÃO TÉCNICA
  ──────────────────────────────────────────────────────────────────────────────

  PROPS
  ─────
  · ruleGetter: Function  →  getter que retorna o objeto rule ativo do CSS Logic
    Tree. É reativo: quando o usuário seleciona outro elemento, retorna um novo
    objeto, o que aciona o watch de detecção de estado.

  ESTADO DA UI  (não persiste — vive somente enquanto o componente está montado)
  ──────────────
  · isBorderLinked    ref<boolean>   — true = todos os lados / false = por lado
  · isBorderShorthand ref<boolean>   — true = escreve `border:` / false = split
  · sideShorthand     reactive<obj>  — { Top, Right, Bottom, Left }: boolean
    cada key controla se aquele lado usa `border-top:` ou split em 3 props.

  DETECÇÃO AUTOMÁTICA (detectInitialState)
  ────────────────────
  Chamada ao montar e sempre que `getRule()` retorna uma identidade diferente
  (novo elemento selecionado). Lê o CSS existente e configura:
  · border.raw.value                  → isBorderShorthand = true
  · border-top/right/bottom/left      → isBorderLinked = false, sideShorthand[lado] = true
  · border-top-width/style/color etc. → isBorderLinked = false, sideShorthand[lado] = false
  · border-width/style/color          → isBorderLinked = true, isBorderShorthand = false

  DISPLAY COMPUTEDS  (para manter campos visíveis independente do modo)
  ─────────────────
  · borderDisplayParsed  — parseia `border.raw.value` quando [S] ON
  · bdW / bdU / bdS / bdC — leem do parseado (modo S) ou das props individuais
  · sideDisplay(side, field) — equivalente por lado

  PARSER  parseBorderSh(raw)
  ──────
  Divide o valor do shorthand `border` em 4 tokens:
    w  = width    → keyword (thin/medium/thick) ou numérico (1px, 0.5rem)
    u  = unit     → '' para keywords, 'px'/'rem'/etc para numéricos
    s  = style    → um dos 10 valores CSS de border-style
    c  = color    → tudo o que sobrar (hex, rgb, hsl, variáveis CSS, etc.)
  Prioridade de correspondência: BORDER_WIDTHS → BORDER_STYLES → /^\d/ → color

  SETTERS  setBorderField / setSideBorderField
  ────────
  Controlam ONDE o CSS é escrito com base no modo ativo:
    [S] ON  → escreve APENAS na prop shorthand  (ex: `border`)
    [S] OFF → escreve APENAS nas props split    (ex: `border-width`, etc.)
              e remove o shorthand se existir

  LINK/UNLINK TOGGLE  toggleBorderLink
  ─────────────────
  Ao alternar entre modos, salva os valores atuais em `borderBackup` (em memória)
  para que possam ser restaurados ao retornar. O CSS do modo abandonado é
  completamente removido para evitar conflitos de especificidade.

  FIDELIDADE AO CSS REAL
  ──────────────────────
  Todas as escritas usam useCssProperty.set() via useProp(), que garante que o
  valor seja inserido/atualizado/removido diretamente no CSS Logic Tree, sem
  intermediários. A função fmtVal() replica a mesma lógica de formatação de
  useCssProperty para garantir o valor correto antes de compor o shorthand.
-->

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSelect from '@/components/ui/VisualSelect.vue'
import VisualFieldset from '@/components/ui/VisualFieldset.vue'
import ColorVarInput from '@/components/ui/ColorVarInput.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})
const getRule = () => props.ruleGetter()

const BORDER_PROPS = [
  'border', 'border-width', 'border-style', 'border-color',
  'border-top',    'border-right',    'border-bottom',    'border-left',
  'border-top-width',    'border-right-width',    'border-bottom-width',    'border-left-width',
  'border-top-style',    'border-right-style',    'border-bottom-style',    'border-left-style',
  'border-top-color',    'border-right-color',    'border-bottom-color',    'border-left-color',
]

const { useProp } = useVisualSection(getRule, BORDER_PROPS)

const hasAnyBorderValue = computed(() =>
  BORDER_PROPS.some(p => !!useProp(p).raw.value)
)

const border       = useProp('border')
const borderW      = useProp('border-width')
const borderS      = useProp('border-style')
const borderC      = useProp('border-color')
const borderTop    = useProp('border-top')
const borderRight  = useProp('border-right')
const borderBottom = useProp('border-bottom')
const borderLeft   = useProp('border-left')

// ── Helpers ──────────────────────────────────────────────────────────────────

const BORDER_WIDTHS = ['thin', 'medium', 'thick']
const BORDER_STYLES = ['none','hidden','solid','dashed','dotted','double','groove','ridge','inset','outset']

function parseBorderSh(raw) {
  if (!raw) return { w: '', u: '', s: '', c: '' }
  const parts = raw.trim().split(/\s+/)
  let w = '', u = '', s = '', cParts = []
  for (const p of parts) {
    if (BORDER_WIDTHS.includes(p))  { w = p }                                              // keyword width
    else if (BORDER_STYLES.includes(p)) { s = p }                                          // style
    else if (/^[\d.]/.test(p))         { const m = p.match(/^([\d.]+)(.*)/); w = m[1]; u = m[2] || 'px' } // numeric width
    else { cParts.push(p) }                                                                // color
  }
  return { w, u, s, c: cParts.join(' ') }
}

function fmtVal(value, unit) {
  if (!value && value !== 0) return null
  const isNum = !isNaN(value)
  return (unit && isNum) ? `${value}${unit}` : `${value}`
}

// ── Per-side prop accessors ───────────────────────────────────────────────────

const sidePropMap = {
  Top:    { width: 'border-top-width',    style: 'border-top-style',    color: 'border-top-color' },
  Right:  { width: 'border-right-width',  style: 'border-right-style',  color: 'border-right-color' },
  Bottom: { width: 'border-bottom-width', style: 'border-bottom-style', color: 'border-bottom-color' },
  Left:   { width: 'border-left-width',   style: 'border-left-style',   color: 'border-left-color' }
}
const sideProps = (side, type) => useProp(sidePropMap[side][type])
const sideProp  = (side) => ({ Top: borderTop, Right: borderRight, Bottom: borderBottom, Left: borderLeft }[side])

// ── Linked mode state ─────────────────────────────────────────────────────────

const isBorderLinked    = ref(true)
const isBorderShorthand = ref(false)
const sideShorthand     = reactive({ Top: false, Right: false, Bottom: false, Left: false })

// Auto-detect mode from existing CSS when element is selected
function detectInitialState() {
  const hasSh              = !!border.raw.value
  const hasLinkedIndividual = !!(borderW.raw.value || borderS.raw.value || borderC.raw.value)
  const hasUnlinkedSide    = ['Top','Right','Bottom','Left'].some(sd =>
    sideProp(sd).raw.value ||
    sideProps(sd,'width').raw.value || sideProps(sd,'style').raw.value || sideProps(sd,'color').raw.value
  )

  // Linked vs Unlinked
  isBorderLinked.value = !(hasUnlinkedSide && !hasSh && !hasLinkedIndividual)

  // Shorthand vs individual (linked mode)
  isBorderShorthand.value = hasSh && !hasLinkedIndividual

  // Per-side shorthand detection
  ;['Top','Right','Bottom','Left'].forEach(sd => {
    sideShorthand[sd] = !!sideProp(sd).raw.value
  })
}

// Re-detect only when the selected element/rule actually changes (not on panel refreshes).
// We use `rule.id` (or selector as fallback) as the stable identity — panel refreshes
// return a new object reference for the same rule, which would incorrectly trigger
// detectInitialState and reset the UI state mid-edit.
watch(() => {
  const rule = getRule()
  return rule?.id ?? rule?.selector ?? null
}, (newId, oldId) => {
  if (newId !== oldId) {
    detectInitialState()
  }
}, { immediate: true })

// Display computeds: read from shorthand when [S] ON, individual props when OFF
const borderDisplayParsed = computed(() => isBorderShorthand.value ? parseBorderSh(border.raw.value) : null)
const bdW = computed(() => borderDisplayParsed.value ? borderDisplayParsed.value.w : borderW.value.value)
const bdU = computed(() => borderDisplayParsed.value ? borderDisplayParsed.value.u : borderW.unit.value)
const bdS = computed(() => borderDisplayParsed.value ? borderDisplayParsed.value.s : borderS.raw.value)
const bdC = computed(() => borderDisplayParsed.value ? borderDisplayParsed.value.c : borderC.raw.value)

function sideDisplay(side, field) {
  if (sideShorthand[side]) {
    const p = parseBorderSh(sideProp(side).raw.value)
    return field === 'w' ? p.w : field === 'u' ? p.u : field === 's' ? p.s : p.c
  }
  if (field === 'w') return sideProps(side, 'width').value.value
  if (field === 'u') return sideProps(side, 'width').unit.value
  if (field === 's') return sideProps(side, 'style').raw.value
  return sideProps(side, 'color').raw.value
}

// ── Shorthand toggles ─────────────────────────────────────────────────────────

function toggleBorderShorthand() {
  if (!isBorderShorthand.value) {
    const composed = [borderW.raw.value, borderS.raw.value, borderC.raw.value].filter(Boolean).join(' ')
    border.set(composed || null)
    borderW.set(null); borderS.set(null); borderC.set(null)
  } else {
    const raw = border.raw.value
    if (raw && !borderW.raw.value && !borderS.raw.value && !borderC.raw.value) {
      const { w, u, s, c } = parseBorderSh(raw)
      if (w) borderW.set(w, u)
      if (s) borderS.set(s)
      if (c) borderC.set(c)
    }
    border.set(null)
  }
  isBorderShorthand.value = !isBorderShorthand.value
}

function toggleSideShorthand(side) {
  const wp = sideProps(side, 'width')
  const sp = sideProps(side, 'style')
  const cp = sideProps(side, 'color')
  const sh = sideProp(side)
  if (!sideShorthand[side]) {
    const composed = [wp.raw.value, sp.raw.value, cp.raw.value].filter(Boolean).join(' ')
    sh.set(composed || null)
    wp.set(null); sp.set(null); cp.set(null)
  } else {
    const raw = sh.raw.value
    if (raw && !wp.raw.value && !sp.raw.value && !cp.raw.value) {
      const { w, u, s, c } = parseBorderSh(raw)
      if (w) wp.set(w, u)
      if (s) sp.set(s)
      if (c) cp.set(c)
    }
    sh.set(null)
  }
  sideShorthand[side] = !sideShorthand[side]
}

// ── Field setters ─────────────────────────────────────────────────────────────

function setBorderField(field, value, unit) {
  if (isBorderShorthand.value) {
    const w = field === 'w' ? fmtVal(value, unit || bdU.value) : border.raw.value ? parseBorderSh(border.raw.value).w + (parseBorderSh(border.raw.value).u) : ''
    const s = field === 's' ? value : bdS.value
    const c = field === 'c' ? value : bdC.value
    const wFmt = field === 'w' ? fmtVal(value, unit || bdU.value) : (bdW.value ? fmtVal(bdW.value, bdU.value) : null)
    border.set([wFmt, s, c].filter(Boolean).join(' ') || null)
  } else {
    if (field === 'w') borderW.set(value, unit || borderW.unit.value)
    else if (field === 's') borderS.set(value)
    else if (field === 'c') borderC.set(value)
    if (border.raw.value) border.set(null)
  }
}

function setSideBorderField(side, field, value, unit) {
  const wp = sideProps(side, 'width')
  const sp = sideProps(side, 'style')
  const cp = sideProps(side, 'color')
  if (sideShorthand[side]) {
    const w = field === 'w' ? fmtVal(value, unit || sideDisplay(side,'u')) : fmtVal(sideDisplay(side,'w'), sideDisplay(side,'u'))
    const s = field === 's' ? value : sideDisplay(side, 's')
    const c = field === 'c' ? value : sideDisplay(side, 'c')
    sideProp(side).set([w, s, c].filter(Boolean).join(' ') || null)
  } else {
    if (field === 'w') wp.set(value, unit || wp.unit.value)
    else if (field === 's') sp.set(value)
    else if (field === 'c') cp.set(value)
    if (sideProp(side).raw.value) sideProp(side).set(null)
  }
}

// ── Link/Unlink toggle (saves & restores CSS on switch) ───────────────────────

const borderBackup = ref({
  linked:   { sh: null, w: null, u: 'px', s: null, c: null },
  unlinked: { shTop: null, shRight: null, shBottom: null, shLeft: null,
               tw: null, tu: 'px', rw: null, ru: 'px', bw: null, bu: 'px', lw: null, lu: 'px',
               ts: null, rs: null, bs: null, ls: null,
               tc: null, rc: null, bc: null, lc: null }
})

function toggleBorderLink() {
  if (isBorderLinked.value) {
    borderBackup.value.linked = {
      sh: border.raw.value, w: borderW.value.value, u: borderW.unit.value,
      s: borderS.raw.value, c: borderC.raw.value
    }
    border.set(null); borderW.set(null); borderS.set(null); borderC.set(null)
    const bk = borderBackup.value.unlinked
    borderTop.set(bk.shTop); borderRight.set(bk.shRight)
    borderBottom.set(bk.shBottom); borderLeft.set(bk.shLeft)
    ;['Top','Right','Bottom','Left'].forEach(sd => {
      const k = sd[0].toLowerCase()
      sideProps(sd,'width').set(bk[`${k}w`], bk[`${k}u`])
      sideProps(sd,'style').set(bk[`${k}s`])
      sideProps(sd,'color').set(bk[`${k}c`])
    })
    isBorderLinked.value = false
  } else {
    const bk = borderBackup.value.unlinked
    bk.shTop = borderTop.raw.value; bk.shRight = borderRight.raw.value
    bk.shBottom = borderBottom.raw.value; bk.shLeft = borderLeft.raw.value
    ;['Top','Right','Bottom','Left'].forEach(sd => {
      const k = sd[0].toLowerCase()
      bk[`${k}w`] = sideProps(sd,'width').value.value; bk[`${k}u`] = sideProps(sd,'width').unit.value
      bk[`${k}s`] = sideProps(sd,'style').raw.value;   bk[`${k}c`] = sideProps(sd,'color').raw.value
    })
    borderTop.set(null); borderRight.set(null); borderBottom.set(null); borderLeft.set(null)
    ;['Top','Right','Bottom','Left'].forEach(sd => {
      sideProps(sd,'width').set(null); sideProps(sd,'style').set(null); sideProps(sd,'color').set(null)
    })
    const lb = borderBackup.value.linked
    if (lb.sh) border.set(lb.sh)
    else { borderW.set(lb.w, lb.u); borderS.set(lb.s); borderC.set(lb.c) }
    isBorderLinked.value = true
  }
}

// ── Options ───────────────────────────────────────────────────────────────────

const borderStyleOptions = [
  { value: 'none',   label: 'None' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'solid',  label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
  { value: 'groove', label: 'Groove' },
  { value: 'ridge',  label: 'Ridge' },
  { value: 'inset',  label: 'Inset' },
  { value: 'outset', label: 'Outset' },
]
</script>

<template>
  <VisualFieldset label="Border" collapsible :default-open="hasAnyBorderValue" :has-value="hasAnyBorderValue">
    <template #badge>
      <div class="flex items-center gap-1">
        <button v-if="isBorderLinked" @click="toggleBorderShorthand" class="px-1.5 h-4 rounded text-[9px] font-bold border transition-all" :class="isBorderShorthand ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'">S</button>
        <button @click="toggleBorderLink" class="p-0.5 rounded hover:bg-blue-100 transition-colors" :class="isBorderLinked ? 'text-blue-600' : 'text-gray-400'">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path v-if="isBorderLinked" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path v-if="isBorderLinked" d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 00 7.07 7.07l1.71-1.71" />
            <path v-else d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </template>

    <!-- Linked mode -->
    <div v-if="isBorderLinked" class="flex flex-col gap-2">
      <VisualInput label="Width" :modelValue="bdW" :unit="bdU" :units="['px', 'rem', 'em', '%']" :keywords="['thin', 'medium', 'thick']" @update:modelValue="v => setBorderField('w', v, bdU)" @update:unit="u => setBorderField('w', bdW, u)" />
      <VisualSelect label="Style" :modelValue="bdS" @update:modelValue="v => setBorderField('s', v)" :options="borderStyleOptions" placeholder="none" />
      <ColorVarInput :value="bdC" @update="v => setBorderField('c', v)" />
    </div>

    <!-- Unlinked: per side -->
    <div v-else class="flex flex-col gap-2">
      <div v-for="side in ['Top', 'Right', 'Bottom', 'Left']" :key="side" class="flex flex-col gap-1 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
        <div class="flex items-center gap-1.5">
          <span class="text-[9px] font-bold text-gray-400 uppercase leading-none">{{side}}</span>
          <button @click="toggleSideShorthand(side)" class="px-1.5 h-3.5 rounded text-[8px] font-bold border transition-all leading-none" :class="sideShorthand[side] ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'">S</button>
        </div>
        <VisualInput :modelValue="sideDisplay(side, 'w')" :unit="sideDisplay(side, 'u')" :units="['px', 'rem', 'em']" :keywords="['thin', 'medium', 'thick']" @update:modelValue="v => setSideBorderField(side, 'w', v, sideDisplay(side, 'u'))" @update:unit="u => setSideBorderField(side, 'w', sideDisplay(side, 'w'), u)" />
        <VisualSelect :modelValue="sideDisplay(side, 's')" @update:modelValue="v => setSideBorderField(side, 's', v)" :options="borderStyleOptions" placeholder="none" />
        <ColorVarInput :value="sideDisplay(side, 'c')" @update="v => setSideBorderField(side, 'c', v)" />
      </div>
    </div>
  </VisualFieldset>
</template>
