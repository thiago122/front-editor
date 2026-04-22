<script setup>
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options:    { type: Array, required: true }, // Array<{ label, value, icon }>
  label:      { type: String, default: '' },
  multiple:   { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

function toggle(value) {
  // Se clicar no botão já ativo → remove a declaração (null = deleteDeclaration)
  if (props.modelValue === value) {
    emit('update:modelValue', null)
  } else {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <div class="flex items-center gap-1">
    <div v-if="label" class="text-[10px] text-gray-500 font-medium uppercase tracking-tight min-w-[30px] select-none">
      {{ label }}
    </div>
    <div class="flex items-center bg-gray-100 rounded border border-transparent p-0.5 gap-0.5">
      <button 
        v-for="opt in options" 
        :key="opt.value"
        @click="toggle(opt.value)"
        class="w-6 h-5 flex items-center justify-center rounded transition-all transition-colors"
        :class="[
          modelValue === opt.value 
            ? 'bg-white text-blue-600 shadow-sm' 
            : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
        ]"
        :title="opt.label"
      >
        <span v-if="opt.icon" v-html="opt.icon" class="w-3.5 h-3.5 flex items-center justify-center"></span>
        <span v-else class="text-[9px] font-bold">{{ opt.label }}</span>
      </button>
    </div>
  </div>
</template>
