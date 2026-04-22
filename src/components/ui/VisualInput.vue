<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue:  { type: [Number, String], default: '' },
  unit:        { type: String, default: 'px' },
  label:       { type: String, default: '' },
  min:         { type: Number, default: 0 },
  max:         { type: Number, default: 9999 },
  step:        { type: Number, default: 1 },
  // Passa um array de strings; use '' para a opção "sem unidade" → exibe '—'
  units:       { type: Array, default: () => ['px', 'rem', 'em', '%', 'vh', 'vw', 'ch'] },
  keywords:    { type: Array, default: () => ['auto', 'inherit', 'initial', 'revert', 'revert-layer', 'unset', 'max-content', 'min-content', 'fit-content'] },
  allowNoUnit: { type: Boolean, default: false },
  allowNegative: { type: Boolean, default: false }
})

const realMin = computed(() => props.allowNegative ? -9999 : props.min)


const emit = defineEmits(['update:modelValue', 'update:unit'])

import { useCssAutocomplete } from '@/composables/useCssAutocomplete'
import CssAutocompleteDropdown from '@/components/CssAutocompleteDropdown.vue'

const ac = useCssAutocomplete()
const nativeInput = ref(null)

// ── Var mode ──────────────────────────────────────────────────────────────────
// When the value starts with 'var(' we are in CSS variable mode
const isVarValue = computed(() => String(props.modelValue ?? '').trimStart().startsWith('var('))
const varMode = ref(isVarValue.value)
const varText = ref(isVarValue.value ? String(props.modelValue) : '')

// Keep var mode in sync when prop changes from outside
watch(isVarValue, (isVar) => {
  if (isVar && !varMode.value) {
    varMode.value = true
    varText.value = String(props.modelValue)
  }
})

function toggleVarMode() {
  varMode.value = !varMode.value
  if (varMode.value) {
    // entering var mode: pre-fill with current raw value
    varText.value = String(props.modelValue ?? '')
  } else {
    // leaving var mode: clear
    emit('update:modelValue', '')
    varText.value = ''
  }
}

function handleVarInput(e) {
  varText.value = e.target.value
  emit('update:modelValue', e.target.value)
}

// ── Scrubbing ─────────────────────────────────────────────────────────────────
const isDragging = ref(false)
let startX = 0
let startVal = 0

function onMouseDown(e) {
  if (varMode.value) return
  isDragging.value = true
  startX = e.clientX
  startVal = parseFloat(props.modelValue) || 0
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = 'ew-resize'
}

function onMouseMove(e) {
  if (!isDragging.value) return
  const delta = e.clientX - startX
  const newVal = Math.min(props.max, Math.max(realMin.value, startVal + delta * props.step))
  emit('update:modelValue', Math.round(newVal * 100) / 100)

}

function onMouseUp() {
  isDragging.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  document.body.style.cursor = ''
}

function handleInput(e) {
  const val = e.target.value
  
  if (props.keywords?.length > 0) {
    ac.updateQuery(val)
    if (!ac.isActive.value) {
      ac.openCustom(e.target, props.keywords, val, accepted => {
        emit('update:modelValue', accepted)
      })
    }
  }

  if (val === '') {
    emit('update:modelValue', '')
  } else if (!isNaN(val) && val.trim() !== '') {
    emit('update:modelValue', Number(val))
  } else {
    emit('update:modelValue', val)
  }
}

function onFocus(e) {
  const val = String(e.target.value || '').trim()
  const isNumeric = val !== '' && !isNaN(val)

  // Only open autocomplete if NOT numeric (match Chrome behavior)
  if (props.keywords?.length > 0 && !isNumeric) {
    ac.openCustom(e.target, props.keywords, val, accepted => {
      emit('update:modelValue', accepted)
    })
  }
  // Select all functionality for convenience
  e.target.select()
}

function onBlur(e) {
  setTimeout(() => {
    ac.close()
  }, 120)
}

function onKeydown(e) {
  const val = String(props.modelValue ?? '').trim()
  const isNumeric = val !== '' && !isNaN(val)

  // 1. Numeric Stepping (prioritize over autocomplete arrow navigation if we already have a number)
  if (isNumeric && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault()
    ac.close() // Close list if it was open (match Chrome behavior)
    
    let stepAmount = props.step
    if (e.shiftKey) stepAmount *= 10
    if (e.altKey) stepAmount *= 0.1
    
    const current = parseFloat(props.modelValue) || 0
    let next = e.key === 'ArrowUp' ? current + stepAmount : current - stepAmount
    
    // Clamp and Round
    next = Math.min(props.max, Math.max(realMin.value, next))
    emit('update:modelValue', Math.round(next * 100) / 100)
    return

  }

  // 2. Empty Field Special Arrows (match Chrome behavior)
  if (val === '') {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      emit('update:modelValue', 0)
      ac.close()
      return
    }
    if (e.key === 'ArrowDown' && !ac.isActive.value) {
      e.preventDefault()
      ac.openCustom(e.target, props.keywords, '', accepted => {
        emit('update:modelValue', accepted)
      })
      return
    }
  }

  // 3. Autocomplete fallback (Navigation/Selection)
  if (ac.onKeydown(e)) return

  // 4. Defaults
  if (e.key === 'Escape') {
    e.target.blur()
  } else if (e.key === 'Enter') {
    e.target.blur()
    ac.close()
  }
}
</script>

<template>
  <div class="flex items-center gap-1 group relative">
    <!-- Label (Scrubbable) -->
    <div 
      v-if="label"
      class="text-[10px] text-gray-500 font-medium uppercase tracking-tight select-none py-1 min-w-[30px]"
      :class="varMode ? 'cursor-default' : 'cursor-ew-resize hover:text-blue-500 transition-colors'"
      @mousedown="onMouseDown"
    >
      {{ label }}
    </div>

    <!-- Input Area -->
    <div 
      class="border border-dark flex items-center bg-gray-100 rounded  focus-within:bg-white transition-all overflow-hidden h-6 flex-1"
      :class="varMode 
        ? 'border-purple-300 focus-within:border-purple-400 bg-purple-50/60' 
        : 'border-blue-200 focus-within:border-blue-400'"
    >
      <!-- VAR MODE: text input -->
      <input 
        v-if="varMode"
        type="text"
        :value="varText"
        @input="handleVarInput"
        class="grow min-w-0 bg-transparent border-none outline-none px-1.5 text-[10px] font-mono text-purple-700 placeholder-purple-300"
        placeholder="var(--name)"
        spellcheck="false"
      />

      <!-- NORMAL MODE: number + unit -->
      <template v-else>
        
        <input 
          ref="nativeInput"
          type="text" 
          :value="modelValue"
          @input="handleInput"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onKeydown"
          class=" h-full grow min-w-0 bg-transparent border-none outline-none px-1 text-[11px] font-medium text-gray-800 text-left"
          :placeholder="label ? '' : 'auto'"
        />
        <!-- Autocomplete Dropdown -->
        <CssAutocompleteDropdown :ac="ac" :anchor="nativeInput" v-if="ac.isActive.value" />
        <!-- Unit picker -->
        <select 
          v-if="units.length > 1 || units.includes('')"
          :value="unit"
          @change="e => $emit('update:unit', e.target.value)"
          class="shrink-0 w-5 text-center h-full border-l border-r border-blue-200 hover:bg-blue-500 hover:text-white flex items-center justify-center  text-[8px] font-mono  transition-colors appearance-none uppercase"
        >
          <option 
            v-for="u in units" 
            :key="u === '' ? '__none__' : u" 
            :value="u"
          >{{ u === '' ? '—' : u }}</option>
        </select>
      </template>

      <!-- Var toggle button -->
      <button
        @click="toggleVarMode"
        class="shrink-0  w-5 h-full flex items-center justify-center  text-[8px] text-black font-mono  transition-colors "
        :class="varMode 
          ? 'text-purple-500 bg-purple-100 border-purple-200' 
          : 'text-black hover:bg-purple-500 hover:text-white'"
        title="Toggle CSS variable mode"
      >{}</button>
    </div>
  </div>
</template>
