<script setup>
import { ref, computed, watch } from 'vue'
import { useCssProperty } from '@/composables/useCssProperty'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualToggleGroup from '@/components/ui/VisualToggleGroup.vue'
import ColorVarInput from '@/components/ui/ColorVarInput.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const getRule = () => props.ruleGetter()
const boxShadowProp = useCssProperty(getRule, 'box-shadow')

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Splits a CSS box-shadow string into individual shadow strings,
 * correctly handling commas inside rgba() functions.
 */
function splitShadows(value) {
  if (!value || value === 'none' || value === '') return []
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of value) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/**
 * Parses a single box-shadow token into { x, y, blur, spread, color, inset }.
 * box-shadow: [inset]? offset-x offset-y [blur-radius [spread-radius]?]? color
 */
function parseSingleShadow(raw) {
  let rest = raw.trim().toLowerCase()
  let inset = false
  
  if (rest.includes('inset')) {
    inset = true
    rest = rest.replace('inset', '').trim()
  }

  let color = 'rgba(0,0,0,0.5)'
  // Extract color: try rgba/rgb/hsl/hex
  const colorMatch = rest.match(/rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}/)

  if (colorMatch) {
    color = colorMatch[0]
    rest = rest.replace(color, '').trim()
  }

  // Find numeric values
  const nums = rest.match(/([+-]?\d*\.?\d+)(px|em|rem|%)?/gi)?.filter(Boolean) ?? []
  
  const parseNum = (s) => s ? parseFloat(s) : 0
  const parseUnit = (s) => s ? (s.replace(/[+-]?\d*\.?\d+/, '') || 'px') : 'px'

  return {
    x:        parseNum(nums[0]),
    xUnit:    parseUnit(nums[0] ?? '0px'),
    y:        parseNum(nums[1]),
    yUnit:    parseUnit(nums[1] ?? '0px'),
    blur:     parseNum(nums[2]),
    blurUnit: parseUnit(nums[2] ?? '0px'),
    spread:   parseNum(nums[3]),
    spreadUnit: parseUnit(nums[3] ?? '0px'),
    color,
    inset,
    enabled: true,
  }
}

function serializeShadow(s) {
  let res = []
  if (s.inset) res.push('inset')
  res.push(`${s.x}${s.xUnit}`)
  res.push(`${s.y}${s.yUnit}`)
  if (s.blur !== 0 || s.spread !== 0) {
    res.push(`${s.blur}${s.blurUnit}`)
    if (s.spread !== 0) {
      res.push(`${s.spread}${s.spreadUnit}`)
    }
  }
  res.push(s.color)
  return res.join(' ')
}

// ── State ──────────────────────────────────────────────────────────────────────

const shadows = ref([])
const expandedIndex = ref(null)

// Sync from CSS prop
watch(() => boxShadowProp.raw.value, (val) => {
  // Evita loop infinito: só atualizamos se o valor mudou vindo de fora
  const newShadows = splitShadows(val ?? '').map(parseSingleShadow)
  // Comparação rasa de strings para não disparar se fomos nós que setamos
  if (JSON.stringify(newShadows) !== JSON.stringify(shadows.value)) {
    shadows.value = newShadows
  }
}, { immediate: true })

// ── Helpers ───────────────────────────────────────────────────────────────────

function commitShadows() {
  const enabled = shadows.value.filter(s => s.enabled)
  if (!enabled.length) {
    boxShadowProp.set(null)
  } else {
    boxShadowProp.set(enabled.map(serializeShadow).join(', '), '')
  }
}

function addShadow() {
  shadows.value.push({
    x: 0, xUnit: 'px',
    y: 4, yUnit: 'px',
    blur: 10, blurUnit: 'px',
    spread: 0, spreadUnit: 'px',
    color: 'rgba(0,0,0,0.15)',
    inset: false,
    enabled: true,
  })
  expandedIndex.value = shadows.value.length - 1
  commitShadows()
}

function removeShadow(i) {
  shadows.value.splice(i, 1)
  if (expandedIndex.value >= shadows.value.length) expandedIndex.value = null
  commitShadows()
}

function toggleShadow(i) {
  shadows.value[i].enabled = !shadows.value[i].enabled
  commitShadows()
}

function updateField(i, field, value) {
  shadows.value[i][field] = value
  commitShadows()
}

const showSection = ref(true)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- Header with Add button -->
    <div 
      class="flex items-center justify-between py-1 cursor-pointer select-none group"
      @click="showSection = !showSection"
    >
      <div class="flex items-center gap-1.5 overflow-hidden">
        <span 
          v-if="shadows.length > 0"
          class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"
        ></span>
        <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-500 transition-colors">Shadow Layers</span>
      </div>
      <div class="flex items-center gap-1">
        <button 
          @click.stop="addShadow"
          class="w-5 h-5 flex items-center justify-center rounded text-blue-500 hover:bg-blue-50 transition-colors font-bold text-lg leading-none"
          title="Adicionar nova camada de sombra"
        >+</button>
        <svg 
          class="w-3 h-3 text-gray-400 transition-transform"
          :class="showSection ? '' : '-rotate-90'"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        ><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>

    <!-- Shadow List -->
    <div v-show="showSection" class="flex flex-col gap-1.5">
      <div v-if="!shadows.length" class="text-[10px] text-gray-400 italic py-1 px-1">
        Nenhuma sombra aplicada
      </div>

      <div 
        v-for="(shadow, i) in shadows" 
        :key="i"
        class="rounded border border-gray-100 overflow-hidden bg-white"
      >
        <!-- Layer summary Row -->
        <div class="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
          <input 
            type="checkbox" 
            :checked="shadow.enabled"
            @change="toggleShadow(i)"
            class="w-3.5 h-3.5 accent-blue-500 cursor-pointer shrink-0"
          />
          <span 
            class="flex-1 text-[10px] font-medium text-gray-700 cursor-pointer truncate"
            @click="expandedIndex = expandedIndex === i ? null : i"
          >
            {{ shadow.inset ? 'Inset ' : '' }}{{ shadow.x }}{{ shadow.xUnit }} {{ shadow.y }}{{ shadow.yUnit }} ({{ shadow.blur }}{{ shadow.blurUnit }})
          </span>
          <div class="flex items-center gap-1 shrink-0">
            <button 
              @click="expandedIndex = expandedIndex === i ? null : i"
              class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-3 h-3 transition-transform" :class="expandedIndex === i ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button 
              @click="removeShadow(i)"
              class="w-5 h-5 flex items-center justify-center text-red-200 hover:text-red-500 transition-colors"
              title="Remover camada"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Expanded Controls -->
        <div 
          v-show="expandedIndex === i"
          class="p-2.5 flex flex-col gap-2.5 bg-white border-t border-gray-100 shadow-inner"
        >
          <!-- Type (Normal / Inset) -->
          <VisualToggleGroup 
            label="Type"
            :modelValue="shadow.inset ? 'inset' : 'outside'"
            @update:modelValue="v => updateField(i, 'inset', v === 'inset')"
            :options="[
              { label: 'Outside', value: 'outside' },
              { label: 'Inset', value: 'inset' }
            ]"
          />

          <!-- Offsets X & Y -->
          <div class="grid grid-cols-2 gap-2">
            <VisualInput 
              label="X"
              help="offset-x: Deslocamento horizontal da sombra"
              :modelValue="shadow.x"
              :unit="shadow.xUnit"
              allow-negative
              @update:modelValue="v => updateField(i, 'x', v)"
              @update:unit="u => updateField(i, 'xUnit', u)"
            />
            <VisualInput 
              label="Y"
              help="offset-y: Deslocamento vertical da sombra"
              :modelValue="shadow.y"
              :unit="shadow.yUnit"
              allow-negative
              @update:modelValue="v => updateField(i, 'y', v)"
              @update:unit="u => updateField(i, 'yUnit', u)"
            />
          </div>

          <!-- Blur & Spread -->
          <div class="grid grid-cols-2 gap-2">
            <VisualInput 
              label="Blur"
              help="blur-radius: Quanto maior o valor, mais esfumada a sombra fica"
              :modelValue="shadow.blur"
              :unit="shadow.blurUnit"
              :min="0"
              @update:modelValue="v => updateField(i, 'blur', v)"
              @update:unit="u => updateField(i, 'blurUnit', u)"
            />
            <VisualInput 
              label="Spread"
              help="spread-radius: Aumenta ou diminui o tamanho da sombra em todas as direções"
              :modelValue="shadow.spread"
              :unit="shadow.spreadUnit"
              allow-negative
              @update:modelValue="v => updateField(i, 'spread', v)"
              @update:unit="u => updateField(i, 'spreadUnit', u)"
            />
          </div>

          <!-- Color -->
          <div class="flex items-center gap-1">
            <div class="text-[11px] text-blue-700 font-normal min-w-[44px] whitespace-nowrap shrink-0">Color</div>
            <ColorVarInput 
              :value="shadow.color"
              @update="v => updateField(i, 'color', v)"
              class="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
