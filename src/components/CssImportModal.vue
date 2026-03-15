<script setup>
/**
 * CssImportModal
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal simples para o usuário colar CSS bruto e importá-lo para um arquivo
 * específico da Logic Tree.
 *
 * Props:
 *   isOpen   — controla a visibilidade do modal
 *   fileName — nome do arquivo de destino (exibido no título)
 *
 * Eventos emitidos:
 *   @import(cssString) — o CSS que o usuário colou, pronto para importar
 *   @close             — fechar o modal sem importar
 * ─────────────────────────────────────────────────────────────────────────────
 */

defineProps({
  isOpen:   { type: Boolean, required: true  },
  fileName: { type: String,  default: 'style' },
})

const emit = defineEmits(['import', 'close'])

import { ref } from 'vue'

const cssInput = ref('')

function handleImport() {
  const css = cssInput.value.trim()
  if (!css) return
  emit('import', css)
  cssInput.value = ''
  emit('close')
}

function close() {
  cssInput.value = ''
  emit('close')
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8"
  >
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden">

      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Importar CSS</h2>
          <p class="text-xs text-slate-500 mt-1">
            Cole o CSS abaixo — ele será adicionado ao arquivo
            <strong>{{ fileName }}</strong>.
          </p>
        </div>
        <button
          @click="close"
          class="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-white rounded-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <textarea
          v-model="cssInput"
          placeholder=".minha-classe { color: red; }&#10;&#10;@media (max-width: 768px) { ... }"
          class="w-full h-[400px] p-6 font-mono text-sm bg-slate-900 text-emerald-400 rounded-xl border-2 border-slate-800 focus:border-indigo-500 focus:outline-none transition-all shadow-inner resize-none"
        />
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
          @click="handleImport"
          :disabled="!cssInput.trim()"
          class="px-8 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          Importar CSS
        </button>
      </div>

    </div>
  </div>
</template>
