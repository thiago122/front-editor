<script setup>
import { ref } from 'vue'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'load'])

const htmlInput = ref('')

const handleLoad = () => {
  if (htmlInput.value.trim()) {
    emit('load', htmlInput.value)
    htmlInput.value = '' // Clear after load
    emit('close')
  }
}

const close = () => {
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Abrir Novo HTML</h2>
          <p class="text-xs text-slate-500 mt-1">Cole o código HTML completo ou um fragmento para carregar no editor.</p>
        </div>
        <button @click="close" class="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-white rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <textarea 
          v-model="htmlInput"
          placeholder="<html>...</html>"
          class="w-full h-[400px] p-6 font-mono text-sm bg-slate-900 text-emerald-400 rounded-xl border-2 border-slate-800 focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
        ></textarea>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
        <button 
          @click="close" 
          class="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-all"
        >
          Cancelar
        </button>
        <button 
          @click="handleLoad" 
          class="px-8 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="!htmlInput.trim()"
        >
          Carregar Código
        </button>
      </div>
    </div>
  </div>
</template>
