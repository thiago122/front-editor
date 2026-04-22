<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  value: { type: String, default: '' }
})

const emit = defineEmits(['update'])

const isVarValue = computed(() => String(props.value ?? '').trimStart().startsWith('var('))
const varMode = ref(isVarValue.value)
const varText = ref(isVarValue.value ? String(props.value) : '')

watch(isVarValue, (isVar) => {
  if (isVar && !varMode.value) {
    varMode.value = true
    varText.value = String(props.value)
  }
})

function toggleVarMode() {
  varMode.value = !varMode.value
  if (varMode.value) {
    varText.value = String(props.value ?? '')
  } else {
    emit('update', '')
    varText.value = ''
  }
}

// Try to convert color value to #RRGGBB for native color picker
// (native picker only accepts 6-digit hex)
const pickerColor = computed(() => {
  const v = props.value ?? ''
  if (v.match(/^#[0-9a-fA-F]{6}$/)) return v
  // fallback
  return '#000000'
})
</script>

<template>
  <div 
    class="flex-1 flex items-center rounded overflow-hidden h-6 border transition-all"
    :class="varMode 
      ? 'bg-purple-50 border-purple-300' 
      : 'bg-gray-100 border-transparent'"
  >
    <!-- Color swatch (hidden in var mode) -->
    <input 
      v-if="!varMode"
      type="color" 
      :value="pickerColor"
      @input="e => emit('update', e.target.value)"
      class="w-5 h-full border-none bg-transparent cursor-pointer p-0 ml-1 shrink-0"
    />

    <!-- Text input: hex or var() -->
    <input 
      type="text" 
      :value="varMode ? varText : value"
      @input="e => { 
        if (varMode) { varText = e.target.value }
        emit('update', e.target.value) 
      }"
      class="flex-1 bg-transparent border-none outline-none text-[10px] font-mono px-1.5 min-w-0"
      :class="varMode ? 'text-purple-700 placeholder-purple-300' : 'text-gray-700'"
      :placeholder="varMode ? 'var(--name)' : '#000000'"
      spellcheck="false"
    />

    <!-- Var toggle -->
    <button
      @click="toggleVarMode"
      class="shrink-0 px-1 h-full flex items-center justify-center text-[8px] font-mono font-bold border-l transition-colors"
      :class="varMode 
        ? 'text-purple-500 bg-purple-100 border-purple-200' 
        : 'text-gray-300 border-transparent hover:text-purple-400 hover:bg-purple-50'"
      title="Toggle CSS variable mode"
    >{}</button>
  </div>
</template>
