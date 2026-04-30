<script setup>
import { ref, computed, watch } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { getVariableTypeFromName } from '@/composables/useCssVariableTypes'

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

// Lógica do Painel de Variáveis (Modo Link)
const styleStore = useStyleStore()

const availableColors = computed(() => {
  const globals = styleStore.globalVariables || []
  const locals = styleStore.localVariables || []
  
  // Combina e filtra apenas os tipos de cor
  const allVars = [...locals, ...globals]
  const uniqueVars = new Map()
  
  allVars.forEach(v => {
    const type = getVariableTypeFromName(v.name)
    if ((type === 'color' || type === 'gradient') && !uniqueVars.has(v.name)) {
      uniqueVars.set(v.name, v)
    }
  })
  
  return Array.from(uniqueVars.values())
})

function onVarSelect(e) {
  const name = e.target.value
  if (name) {
    emit('update', `var(${name})`)
    varText.value = `var(${name})`
  } else {
    emit('update', '')
    varText.value = ''
  }
}
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

    <!-- Text input: hex or Select (var mode) -->
    <template v-if="!varMode">
      <input 
        type="text" 
        :value="value"
        @input="e => emit('update', e.target.value)"
        class="flex-1 bg-transparent border-none outline-none text-[10px] font-mono px-1.5 min-w-0 text-gray-700"
        placeholder="#000000"
        spellcheck="false"
      />
    </template>
    <template v-else>
      <select
        class="flex-1 bg-transparent border-none outline-none text-[10px] font-mono px-1 min-w-0 text-purple-700 cursor-pointer"
        @change="onVarSelect"
      >
        <option value="" disabled :selected="!varText.includes('var(')">-- Escolha uma cor --</option>
        <option 
          v-for="token in availableColors" 
          :key="token.name" 
          :value="token.name"
          :selected="varText === `var(${token.name})`"
        >
          {{ token.name }}
        </option>
      </select>
    </template>

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
