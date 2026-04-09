<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  title: String,
  message: String,
  confirmText: { type: String, default: 'Confirmar' },
  cancelText: { type: String, default: 'Cancelar' },
  type: { type: String, default: 'primary' } // 'primary' | 'danger' | 'success'
})

const emit = defineEmits(['close', 'confirm'])

const close = () => emit('close')
const confirm = () => {
  emit('confirm')
  emit('close')
}

const onKeyDown = (e) => {
  if (e.key === 'Escape') close()
  if (e.key === 'Enter') confirm()
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

const typeClasses = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
  danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
  success: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[1001] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" @click="close"></div>
    
    <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
      <div class="p-6">
        <h3 class="text-lg font-bold text-slate-800">{{ title }}</h3>
        <p class="mt-2 text-sm text-slate-500 leading-relaxed">{{ message }}</p>
      </div>
      
      <div class="px-6 py-4 bg-slate-50 flex justify-end gap-2">
        <button @click="close" class="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200 rounded-lg transition-all">
          {{ cancelText }}
        </button>
        <button @click="confirm" 
                :class="['px-6 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-lg active:scale-95', typeClasses[type]]">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
