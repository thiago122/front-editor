<script setup>
// CodeEditor.vue

/**
 * TODO: EVOLUÇÃO PARA "RECONCILIAÇÃO PARCIAL" (DOM DIFFING)
 * Atualmente, o innerHTML reconstrói todos os filhos, o que é seguro e simples.
 * * Limitação atual: Se houver um <iframe> ou <video> dentro deste nó,
 * ele será recarregado toda vez que o usuário digitar uma letra.
 * * Melhoria futura: Usar uma biblioteca como 'morphdom' ou implementar um
 * algoritmo de diffing para comparar a árvore atual com a nova e
 * aplicar apenas patches (mudanças mínimas), preservando o estado dos elementos.
 * verificar morphdom
 */

import { ref, watch, onMounted, computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { getCleanNode } from '@/utils/ast'
import { debounce } from 'lodash-es'
// CodeMirror 6 imports
import { EditorView, basicSetup } from 'codemirror'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'

const EditorStore = useEditorStore()

// --- ESTADOS ---
const isActive = ref(true)
const editorContainer = ref(null)
let view = null

// Trava para evitar loops entre o watcher e o evento de digitação
let isUpdatingFromStore = false

// --- COMPUTED ---
const selectedNode = computed(() => EditorStore.selectedNode)

// --- MÉTODOS ---
const initEditor = () => {
  view = new EditorView({
    doc: '',
    extensions: [
      basicSetup,
      html(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isUpdatingFromStore) {
          handleCodeChange(update.state.doc.toString())
        }
      }),
    ],
    parent: editorContainer.value,
  })
}

watch(
  () => EditorStore.selectedNodeId,
  (id) => {
    if (id && EditorStore.selectedNode) {
      // Pegamos apenas os filhos do nó selecionado e transformamos em código
      const children = EditorStore.selectedNode.children || []
      let childrenHtml = children.map((child) => EditorStore.pipeline.astToCode(child)).join('')

      // Limpeza de IDs via Regex (como discutimos) para o usuário não ver
      const cleanHtml = childrenHtml.replace(/\sdata-node-id="[^"]*"/gi, '')

      isUpdatingFromStore = true
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: cleanHtml },
      })
      isUpdatingFromStore = false
    }
  },
)

// Criamos uma versão "atrasada" da função de commit
const debouncedUpdate = debounce((code) => {
  EditorStore.manipulation.updateInnerContent(EditorStore.selectedNodeId, code)
}, 400) // 400ms de atraso

// No handleCodeChange:
function handleCodeChange(code) {
  if (!EditorStore.selectedNodeId) return

  // Se for um nó pequeno, podemos atualizar rápido.
  // Se for o body ou algo grande, o debounce salva a performance.
  debouncedUpdate(code)
}

onMounted(() => {
  initEditor()
})
</script>

<template>
  <div
    class="fixed bottom-0 right-0 transition-all duration-300 shadow-2xl z-50 flex flex-col bg-[#282c34]"
    :class="isActive ? 'w-[500px] h-[400px]' : 'w-10 h-10 overflow-hidden rounded-tl-lg'"
  >
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-gray-700 cursor-pointer bg-[#21252b]"
      @click="isActive = !isActive"
    >
      <span
        class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="EditorStore.selectedNodeId ? 'bg-green-500' : 'bg-red-500'"
        ></span>
        Code Inspector
      </span>
      <button class="text-gray-400 hover:text-white">{{ isActive ? '−' : '+' }}</button>
    </div>

    <div v-show="isActive" class="flex-1 overflow-hidden relative">
      <div
        v-if="!EditorStore.selectedNodeId"
        class="absolute inset-0 flex items-center justify-center bg-black/50 z-10 text-gray-400 text-xs"
      >
        Selecione um elemento para editar o código
      </div>
      <div ref="editorContainer" class="h-full w-full font-mono text-sm"></div>
    </div>
  </div>
</template>

<style>
/* Customização do CodeMirror para ocupar 100% */
.cm-editor {
  height: 100% !important;
}
.cm-scroller {
  overflow: auto !important;
}
</style>
