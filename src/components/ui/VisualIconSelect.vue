<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options:    { type: Array, required: true }, // [{ value, label, icon }]
  label:      { type: String, default: '' },
  placeholder:{ type: String, default: 'Select...' },
})

const emit = defineEmits(['update:modelValue'])

const open    = ref(false)
const rootRef = ref(null)

const active = computed(() => props.options.find(o => o.value === props.modelValue))

function select(value) {
  // Toggle: clicking the active option removes it
  if (props.modelValue === value) {
    emit('update:modelValue', null)
  } else {
    emit('update:modelValue', value)
  }
  open.value = false
}

function handleOutside(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleOutside))
</script>

<template>
  <div class="flex items-center gap-1" ref="rootRef">
    <!-- Label -->
    <div v-if="label" class="text-[10px] text-gray-500 font-medium uppercase tracking-tight min-w-[10px] select-none">
      {{ label }}
    </div>

    <!-- Trigger button -->
    <div class="relative flex-1">
      <button
        @click="open = !open"
        class="w-full flex items-center gap-1.5 h-6 bg-gray-100 hover:bg-gray-200 border border-transparent hover:border-gray-200 rounded px-1.5 transition-all text-left"
        :class="open ? 'border-blue-300 bg-white' : ''"
      >
        <!-- Current icon -->
        <span v-if="active?.icon" v-html="active.icon" class="w-4 h-4 shrink-0 text-gray-600 flex items-center"></span>
        <span class="flex-1 text-[10px] font-medium text-gray-700 truncate">
          {{ active?.label ?? placeholder }}
        </span>
        <svg class="w-2.5 h-2.5 text-gray-400 shrink-0 transition-transform" :class="open ? 'rotate-180' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown panel -->
      <div 
        v-if="open"
        class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-[9999] py-1 min-w-full"
      >
        <button
          v-for="opt in options" :key="opt.value"
          @click="select(opt.value)"
          class="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-gray-50 transition-colors"
          :class="modelValue === opt.value ? 'text-blue-600 bg-blue-50' : 'text-gray-700'"
        >
          <!-- Checkmark -->
          <svg v-if="modelValue === opt.value" class="w-3 h-3 shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L5.53 12.7a.996.996 0 10-1.41 1.41l4.18 4.18c.39.39 1.02.39 1.41 0L20.29 7.71a.996.996 0 10-1.41-1.41L9 16.17z"/>
          </svg>
          <span v-else class="w-3 h-3 shrink-0"></span>

          <!-- Icon -->
          <span v-if="opt.icon" v-html="opt.icon" class="w-4 h-4 shrink-0 text-gray-500"></span>

          <!-- Label -->
          <span class="text-[11px] font-medium">{{ opt.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
