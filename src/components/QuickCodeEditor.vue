<script setup>
import { ref, computed, watch, nextTick, toRaw, onBeforeUnmount, onMounted } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { debounce } from 'lodash-es'
// CodeMirror 6 imports
import { EditorView, basicSetup } from 'codemirror'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'
import { findCssNode } from '@/editor/css/tree/_logicTreeHelpers.js'
import FloatingWindow from './ui/FloatingWindow.vue'

const editorStore = useEditorStore()
const styleStore  = useStyleStore()

const editorContainer = ref(null)
let view = null
let isUpdatingFromStore = false

const targetId = computed(() => editorStore.quickCodeEditor.targetId)

const target = computed(() => {
  if (!targetId.value || !styleStore.cssLogicTree) return null
  return findCssNode(toRaw(styleStore.cssLogicTree), targetId.value)
})

const initEditor = () => {
  if (!editorContainer.value) return
  if (view) view.destroy()
  
  view = new EditorView({
    doc: '',
    extensions: [
      basicSetup,
      oneDark,
      css(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isUpdatingFromStore) {
          handleCodeChange(update.state.doc.toString())
        }
      }),
      EditorView.domEventHandlers({
        keydown: (event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault()
            handleSave()
          }
        }
      })
    ],
    parent: editorContainer.value,
  })
}

const syncCodeFromStore = () => {
  if (!view || !target.value) return
  
  try {
    const node = target.value
    const declarations = (node.children || [])
      .filter(c => c.type === 'declaration')
      .map(decl => `${decl.label}: ${decl.value};`)
    
    let content = declarations.join('\n')
    if (content.trim() === '' && node.type === 'selector') {
      content = '/* Digite suas propriedades aqui */\n'
    }

    if (view.state.doc.toString() !== content) {
      isUpdatingFromStore = true
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      })
      isUpdatingFromStore = false
    }
  } catch (e) {
    console.error('[QuickCodeEditor] sync error:', e)
  }
}

const debouncedUpdate = debounce((code) => {
  if (!targetId.value) return
  styleStore.updateRuleDeclarationsFromCSS(targetId.value, code)
}, 400)

function handleCodeChange(code) {
  debouncedUpdate(code)
}

function handleSave() {
  if (!view || !targetId.value) return
  styleStore.updateRuleDeclarationsFromCSS(targetId.value, view.state.doc.toString())
  close()
}

function close() {
  editorStore.quickCodeEditor.show = false
}

// Gatilho principal: toda vez que o updateKey mudar, reiniciamos o editor internamente
watch(() => editorStore.quickCodeEditor.updateKey, async () => {
  if (editorStore.quickCodeEditor.show) {
    await nextTick()
    initEditor()
    syncCodeFromStore()
    setTimeout(() => view?.focus(), 50)
  }
})

onMounted(() => {
  if (editorStore.quickCodeEditor.show) {
    nextTick(() => {
      initEditor()
      syncCodeFromStore()
      setTimeout(() => view?.focus(), 50)
    })
  }
})

// Observa mudanças no nó alvo (caso a árvore mude enquanto o editor está aberto)
watch(target, (newNode) => {
  if (editorStore.quickCodeEditor.show && newNode) {
    syncCodeFromStore()
  }
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})
</script>

<template>
  <FloatingWindow
    :show="editorStore.quickCodeEditor.show"
    title="Regra CSS"
    :blueIndicator="true"
    :initialX="editorStore.quickCodeEditor.x"
    :initialY="editorStore.quickCodeEditor.y"
    :initialWidth="400"
    :initialHeight="380"
    @close="close"
  >
    <template #header-left>
      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
      <span class="text-[10px] font-bold text-blue-400 uppercase tracking-widest shrink-0">Regra CSS</span>
      <div class="h-3 w-px bg-gray-700 mx-1"></div>
      <span class="text-[11px] text-gray-400 font-mono truncate max-w-[180px]" :title="target?.label">
        {{ target?.label }}
      </span>
    </template>

    <div class="h-full flex flex-col pt-0">
      <div v-show="!target" class="flex-1 flex items-center justify-center text-gray-500 text-xs italic">
        Carregando dados da regra...
      </div>
      <div v-show="target" ref="editorContainer" class="flex-1 font-mono text-sm overflow-hidden"></div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <div class="flex flex-col">
          <span class="text-[9px] text-gray-500 font-mono leading-tight">Auto-salvamento ativo</span>
          <span class="text-[9px] text-gray-600 font-mono leading-tight">Ctrl+S / Aplicar para fechar</span>
        </div>
        <div class="flex gap-2">
          <button 
            @click="close"
            class="px-3 py-1 text-gray-400 hover:text-white text-[11px] font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            @click="handleSave"
            class="px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded shadow-lg transition-all active:scale-95"
          >
            Aplicar
          </button>
        </div>
      </div>
    </template>
  </FloatingWindow>
</template>

<style>
/* Customização CodeMirror para o QuickEditor */
.cm-editor {
  height: 100% !important;
  outline: none !important;
}
.cm-gutter {
  background-color: #21252b !important;
}
</style>
