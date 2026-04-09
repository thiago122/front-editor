<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  loading: Boolean
})

const emit = defineEmits(['close', 'confirm'])

const folderName = ref('')
const inputRef = ref(null)

const handleConfirm = () => {
  if (folderName.value.trim() && !props.loading) {
    emit('confirm', folderName.value.trim())
  }
}

const close = () => {
  if (!props.loading) {
    emit('close')
    folderName.value = ''
  }
}

const onKeyDown = (e) => {
  if (e.key === 'Escape') close()
  if (e.key === 'Enter') handleConfirm()
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

watch(() => props.isOpen, (val) => {
  if (val) {
    setTimeout(() => {
      inputRef.value?.focus()
    }, 100)
  }
})
</script>

<template>
  <div v-if="isOpen" 
       class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
    
    <!-- Overlay -->
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] transition-opacity duration-300"
         @click="close"></div>
    
    <!-- Modal Container -->
    <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
      
      <!-- Header -->
      <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 class="text-lg font-bold text-slate-800">Nova Pasta / Projeto</h2>
          <p class="text-[11px] text-slate-500 mt-0.5">Crie uma nova subpasta para organizar seus documentos.</p>
        </div>
        <button @click="close" 
                class="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
                :disabled="loading">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome da Pasta</label>
        <div class="relative">
          <input 
            ref="inputRef"
            v-model="folderName"
            type="text"
            placeholder="ex: Landing Pages"
            class="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-700 font-medium 
                   focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-sm"
            @keydown.enter="handleConfirm"
            :disabled="loading"
          />
        </div>
        <p class="mt-2 text-[10px] text-slate-400">Você pode usar subpastas adicionais separando por barra (ex: projetos/site1).</p>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
        <button 
          @click="close" 
          class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          :disabled="loading"
        >
          Cancelar
        </button>
        <button 
          @click="handleConfirm" 
          class="px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg font-bold hover:bg-indigo-700 
                 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 
                 disabled:pointer-events-none flex items-center gap-2"
          :disabled="!folderName.trim() || loading"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          {{ loading ? 'Criando...' : 'Criar Pasta' }}
        </button>
      </div>
    </div>
  </div>
</template>
