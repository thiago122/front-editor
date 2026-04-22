<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue:  { type: [String, Number], default: '' },
  options:     { type: Array, required: true },
  label:       { type: String, default: '' },
  placeholder: { type: String, default: 'Select...' }
})



// ── Var mode ──────────────────────────────────────────────────────────────────
const isVarValue = computed(() => String(props.modelValue ?? '').trimStart().startsWith('var('))
const varMode = ref(isVarValue.value)
const varText = ref(isVarValue.value ? String(props.modelValue) : '')

watch(isVarValue, (isVar) => {
  if (isVar && !varMode.value) {
    varMode.value = true
    varText.value = String(props.modelValue)
  }
})

const emit = defineEmits(['update:modelValue'])

function toggleVarMode() {
  varMode.value = !varMode.value
  if (varMode.value) {
    varText.value = String(props.modelValue ?? '')
  } else {
    emit('update:modelValue', '')
    varText.value = ''
  }
}

function handleVarInput(e) {
  varText.value = e.target.value
  emit('update:modelValue', e.target.value)
}
</script>

<template>
  <div class="flex items-center gap-1">
    <div v-if="label" class="text-[10px] text-gray-500 font-medium uppercase tracking-tight min-w-[30px] select-none">
      {{ label }}
    </div>
    <div class="flex-1 relative h-6 flex items-center">
      <!-- VAR MODE -->
      <input 
        v-if="varMode"
        type="text"
        :value="varText"
        @input="handleVarInput"
        class="w-full h-full bg-purple-50 border border-purple-300 rounded px-1.5 text-[10px] font-mono text-purple-700 outline-none placeholder-purple-300 pr-7"
        placeholder="var(--name)"
        spellcheck="false"
      />

      <!-- NORMAL MODE -->
      <template v-else>
        <select 
          :value="modelValue"
          @change="e => $emit('update:modelValue', e.target.value)"
          class="w-full h-full bg-gray-100 border border-transparent rounded px-1.5 text-[11px] font-medium text-gray-800 outline-none hover:border-gray-200 focus:border-blue-400 focus:bg-white transition-all appearance-none cursor-pointer pr-7"
        >
          <option v-if="placeholder" value="" disabled selected>{{ placeholder }}</option>
          <option 
            v-for="opt in options" 
            :key="typeof opt === 'string' ? opt : opt.value" 
            :value="typeof opt === 'string' ? opt : opt.value"
          >{{ typeof opt === 'string' ? opt : opt.label }}</option>
        </select>
        <!-- Custom arrow -->
        <div class="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </template>

      <!-- Var toggle button (sempre visível no canto direito) -->
      <button
        @click="toggleVarMode"
        class="absolute right-0 top-0 h-full px-1.5 flex items-center justify-center text-[8px] font-mono font-bold rounded-r border-l transition-colors"
        :class="varMode 
          ? 'text-purple-500 bg-purple-100 border-purple-200' 
          : 'text-gray-300 border-transparent hover:text-purple-400 hover:bg-purple-50'"
        title="Toggle CSS variable mode"
      >{}</button>
    </div>
  </div>
</template>
