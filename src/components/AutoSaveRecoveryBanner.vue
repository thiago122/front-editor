<script setup>
/**
 * AutoSaveRecoveryBanner
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Exibe um aviso no topo do editor quando existe uma sessão salva no
 * localStorage, permitindo ao usuário restaurá-la ou descartá-la.
 *
 * Props:
 *   save — objeto retornado por AutoSaveService.load()
 *          { html: string, savedAt: string }
 *
 * Eventos emitidos:
 *   @restore  — usuário clicou em "Restaurar" (payload: html string)
 *   @discard  — usuário clicou em "Descartar"
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { AutoSaveService } from '@/editor/css/export/AutoSaveService.js'

const props = defineProps({
  /** Objeto { html, savedAt } retornado por AutoSaveService.load() */
  save: { type: Object, required: true },
})

const emit = defineEmits(['restore', 'discard'])

function handleRestore() {
  emit('restore', props.save.html)
}

function handleDiscard() {
  AutoSaveService.clear()
  emit('discard')
}
</script>

<template>
  <div
    role="alert"
    class="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-sm"
  >
    <!-- Ícone -->
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
    </svg>

    <!-- Mensagem -->
    <span class="text-amber-800 grow">
      Sessão recuperada salva em
      <strong>{{ AutoSaveService.formatDate(save.savedAt) }}</strong>.
      Deseja restaurá-la?
    </span>

    <!-- Ações -->
    <div class="flex gap-2 shrink-0">
      <button
        @click="handleDiscard"
        class="px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 rounded transition-colors"
      >
        Descartar
      </button>
      <button
        @click="handleRestore"
        class="px-3 py-1 text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 rounded transition-colors"
      >
        Restaurar
      </button>
    </div>
  </div>
</template>
