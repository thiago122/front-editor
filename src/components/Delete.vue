<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'

const props = defineProps({
  // ID do nó a ser removido (Opcional: se nulo, usa o da Store)
  nodeId: {
    type: String,
    default: null,
  },
  // Estilo: apenas ícone ou com texto
  iconOnly: {
    type: Boolean,
    default: false,
  },
  // Classe extra para customização de layout
  customClass: {
    type: String,
    default: '',
  },
})

const EditorStore = useEditorStore()

/**
 * Prioridade:
 * 1. O ID do elemento a ser deletado vindo pela Prop
 */
const targetId = computed(() => props.nodeId)

/**
 * Só habilita se houver um alvo e não estivermos em modo de inspeção puro
 */
const canDelete = computed(() => !!targetId.value)

function confirmAndDelete() {
  if (!canDelete.value) return

  const parent = EditorStore.getParent(targetId.value)

  const tagName = EditorStore.selectedNode.tag || ''

  if (!parent) {
    console.warn('Não é permitido remover.')
    return
  }

  if (!parent || ['body', 'html', 'document', 'head'].includes(tagName)) {
    console.warn('Não é permitido remover.')
    return
  }

  // O Dispatcher trata de tudo: AST, DOM Sync e Histórico (Undo/Redo)
  NodeDispatcher.deleteNode(targetId.value)
  EditorStore.selectNode(parent.nodeId)
}
</script>

<template>
  <button
    @click.stop="confirmAndDelete"
    :disabled="!canDelete"
    class="inline-flex items-center justify-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200"
    :class="[
      canDelete
        ? 'text-red-500 hover:bg-red-50 active:bg-red-100'
        : 'text-gray-300 cursor-not-allowed opacity-50',
      customClass,
    ]"
    :title="canDelete ? 'Remover Elemento' : 'Nenhum elemento selecionado'"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 6h18"></path>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>

    <span v-if="!iconOnly" class="text-xs font-semibold uppercase tracking-wider"> Eliminar </span>
  </button>
</template>
