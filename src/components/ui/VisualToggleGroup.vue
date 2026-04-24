<script setup>
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options:    { type: Array, required: true }, // Array<{ label, value, icon }>
  label:      { type: String, default: '' },
  help:       { type: String, default: '' },
  multiple:   { type: Boolean, default: false },
  isItem:     { type: Boolean, default: false },
  warning:    { type: Boolean, default: false }
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
  <div class="flex items-center gap-1 group/toggle">
    <div v-if="label" 
      class="flex items-center gap-1 text-[11px] text-blue-700 font-normal tracking-tight min-w-[44px] whitespace-nowrap select-none shrink-0"
      :title="help || label"
    >
      {{ label }}
      <span v-if="warning" title="Esta propriedade pode não ter efeito sem o pai configurado adequadamente" class="text-amber-500 font-black cursor-help">!</span>
    </div>
    <div class="flex items-center bg-gray-100 rounded border border-transparent p-0.5 gap-0.5 flex-1 overflow-hidden">
      <button 
        v-for="opt in options" 
        :key="opt.value"
        @click="toggle(opt.value)"
        class="flex-1 h-5 flex items-center justify-center rounded transition-all transition-colors min-w-0"
        :class="[
          modelValue === opt.value 
            ? 'bg-white text-blue-600 shadow-sm' 
            : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
        ]"
        :title="opt.label"
      >
        <span v-if="opt.icon" v-html="opt.icon" class="w-3.5 h-3.5 flex items-center justify-center shrink-0"></span>
        <span v-else class="text-[9px] font-bold truncate px-0.5">{{ opt.label }}</span>
      </button>
    </div>
  </div>
</template>
