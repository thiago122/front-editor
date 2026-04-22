<script setup>
import { ref, computed, watch } from 'vue'
import { useCssProperty } from '@/composables/useCssProperty'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})

const getRule = () => props.ruleGetter()
const textShadowProp = useCssProperty(getRule, 'text-shadow')

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Splits a CSS text-shadow string into individual shadow strings,
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
 * Parses a single text-shadow token into { x, y, blur, color }.
 * text-shadow: offset-x offset-y blur-radius color
 */
function parseSingleShadow(raw) {
  let rest = raw.trim()
  let color = 'rgba(0,0,0,0.5)'

  // Extract color: try rgba/rgb/hsl/hex first at any position
  const colorRx = /rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b/gi
  const colorMatch = rest.match(/rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}/)

  if (colorMatch) {
    color = colorMatch[0]
    rest = rest.replace(color, '').trim()
  }

  const nums = rest.match(/([+-]?\d*\.?\d+)(px|em|rem|%)?/gi)?.filter(Boolean) ?? []
  const parseNum = (s) => s ? parseFloat(s) : 0
  const parseUnit = (s) => s ? (s.replace(/[+-]?\d*\.?\d+/, '') || 'px') : 'px'

  return {
    x:     parseNum(nums[0]),
    xUnit: parseUnit(nums[0] ?? '0px'),
    y:     parseNum(nums[1]),
    yUnit: parseUnit(nums[1] ?? '0px'),
    blur:  parseNum(nums[2]),
    blurUnit: parseUnit(nums[2] ?? '0px'),
    color,
    enabled: true,
    raw,
  }
}

function serializeShadow(s) {
  return `${s.x}${s.xUnit} ${s.y}${s.yUnit} ${s.blur}${s.blurUnit} ${s.color}`
}

// ── State ──────────────────────────────────────────────────────────────────────

const shadows = ref([])
const expandedIndex = ref(null)

// Sync from CSS prop
watch(() => textShadowProp.raw.value, (val) => {
  shadows.value = splitShadows(val ?? '').map(parseSingleShadow)
}, { immediate: true })

// ── Helpers ───────────────────────────────────────────────────────────────────

function commitShadows() {
  const enabled = shadows.value.filter(s => s.enabled)
  if (!enabled.length) {
    textShadowProp.set(null)
  } else {
    textShadowProp.set(enabled.map(serializeShadow).join(', '), '')
  }
}

function addShadow() {
  shadows.value.push({
    x: 0, xUnit: 'px',
    y: 2, yUnit: 'px',
    blur: 4, blurUnit: 'px',
    color: 'rgba(0,0,0,0.3)',
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
  <!-- Text Shadow Section Header -->
  <div 
    class="flex items-center justify-between border-b border-gray-100 py-1 cursor-pointer select-none"
    @click="showSection = !showSection"
  >
    <span class="text-[11px] font-bold text-blue-600">Text shadows</span>
    <div class="flex items-center gap-1.5">
      <!-- Blue dot: indicates shadows are defined -->
      <span 
        v-if="shadows.length > 0"
        class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"
        title="This rule has text shadows"
      ></span>
      <button 
        @click.stop="addShadow"
        class="w-5 h-5 flex items-center justify-center rounded text-blue-500 hover:bg-blue-50 transition-colors font-bold text-lg leading-none"
        title="Add shadow"
      >+</button>
      <svg 
        class="w-3 h-3 text-gray-400 transition-transform"
        :class="showSection ? '' : '-rotate-90'"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      ><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
    </div>
  </div>

  <!-- Shadow List -->
  <div v-show="showSection" class="flex flex-col gap-1">
    <div v-if="!shadows.length" class="text-[10px] text-gray-400 italic py-1">
      No text shadows defined
    </div>

    <div 
      v-for="(shadow, i) in shadows" 
      :key="i"
      class="rounded border border-gray-100 overflow-hidden"
    >
      <!-- Shadow row -->
      <div class="flex items-center gap-1 px-1.5 py-1 bg-gray-50 hover:bg-gray-100 transition-colors">
        <!-- Enable checkbox -->
        <input 
          type="checkbox" 
          :checked="shadow.enabled"
          @change="toggleShadow(i)"
          class="w-3 h-3 accent-blue-500 cursor-pointer shrink-0"
        />
        <!-- Summary label -->
        <span 
          class="flex-1 text-[10px] text-gray-600 cursor-pointer truncate"
          @click="expandedIndex = expandedIndex === i ? null : i"
        >
          Text shadow: {{ shadow.x }}{{ shadow.xUnit }} {{ shadow.y }}{{ shadow.yUnit }} {{ shadow.blur }}{{ shadow.blurUnit }}
        </span>
        <!-- Expand / Remove -->
        <button 
          @click="expandedIndex = expandedIndex === i ? null : i"
          class="text-gray-400 hover:text-gray-600 px-0.5"
        >
          <svg class="w-3 h-3 transition-transform" :class="expandedIndex === i ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button 
          @click="removeShadow(i)"
          class="text-red-300 hover:text-red-500 px-0.5 transition-colors"
          title="Remove shadow"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Expanded Controls -->
      <div 
        v-show="expandedIndex === i"
        class="p-2 flex flex-col gap-2 bg-white border-t border-gray-100"
      >
        <!-- X & Y -->
        <div class="grid grid-cols-2 gap-2">
          <div class="flex items-center gap-1 text-[10px]">
            <span class="text-gray-500 min-w-[10px]">X</span>
            <input 
              type="range" :min="-100" :max="100" :step="1"
              :value="shadow.x" @input="updateField(i, 'x', Number($event.target.value))"
              class="flex-1 h-1 accent-blue-500"
            />
            <input 
              type="number" :value="shadow.x" @input="updateField(i, 'x', Number($event.target.value))"
              class="w-10 bg-gray-100 rounded text-center text-[10px] border-none outline-none py-0.5"
            />
            <span class="text-gray-400">px</span>
          </div>
          <div class="flex items-center gap-1 text-[10px]">
            <span class="text-gray-500 min-w-[10px]">Y</span>
            <input 
              type="range" :min="-100" :max="100" :step="1"
              :value="shadow.y" @input="updateField(i, 'y', Number($event.target.value))"
              class="flex-1 h-1 accent-blue-500"
            />
            <input 
              type="number" :value="shadow.y" @input="updateField(i, 'y', Number($event.target.value))"
              class="w-10 bg-gray-100 rounded text-center text-[10px] border-none outline-none py-0.5"
            />
            <span class="text-gray-400">px</span>
          </div>
        </div>

        <!-- Blur -->
        <div class="flex items-center gap-1 text-[10px]">
          <span class="text-gray-500 w-8">Blur</span>
          <input 
            type="range" :min="0" :max="100" :step="1"
            :value="shadow.blur" @input="updateField(i, 'blur', Number($event.target.value))"
            class="flex-1 h-1 accent-blue-500"
          />
          <input 
            type="number" :value="shadow.blur" @input="updateField(i, 'blur', Number($event.target.value))"
            class="w-10 bg-gray-100 rounded text-center text-[10px] border-none outline-none py-0.5"
          />
          <span class="text-gray-400">px</span>
        </div>

        <!-- Color -->
        <div class="flex items-center gap-1 text-[10px]">
          <span class="text-gray-500 w-8">Color</span>
          <input 
            type="color" :value="shadow.color"
            @input="updateField(i, 'color', $event.target.value)"
            class="w-5 h-5 rounded border-none bg-transparent cursor-pointer"
          />
          <input 
            type="text" :value="shadow.color"
            @input="updateField(i, 'color', $event.target.value)"
            class="flex-1 bg-gray-100 rounded px-1.5 text-[10px] font-mono border-none outline-none py-0.5"
          />
        </div>
      </div>
    </div>
  </div>
</template>
