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

import { ref, watch, onMounted, onBeforeUnmount, nextTick, toRaw } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { getCleanNode } from '@/utils/ast'
import { debounce } from 'lodash-es'
// CodeMirror 6 imports
import { EditorView, basicSetup } from 'codemirror'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { Compartment } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { findCssNode } from '@/editor/css/tree/_logicTreeHelpers.js'

const EditorStore = useEditorStore()
const styleStore  = useStyleStore()

// --- ESTADOS ---
const editorContainer = ref(null)
let view = null

// Trava para evitar loops entre o watcher e o evento de digitação
let isUpdatingFromStore = false

// --- MÉTODOS ---
const initEditor = () => {
  if (!editorContainer.value) return
  
  // A extensão de linguagem agora é reativa (dentro de uma função ou recriada)
  // Para simplicidade, vamos recriar o editor ou re-configurar as extensões
  view = new EditorView({
    doc: '',
    extensions: [
      basicSetup,
      oneDark,
      new Compartment().of(EditorStore.codeEditorMode === 'html' ? html() : css()),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isUpdatingFromStore) {
          handleCodeChange(update.state.doc.toString())
        }
      }),
    ],
    parent: editorContainer.value,
  })
}

onMounted(() => {
  if (editorContainer.value && !view) {
    initEditor()
    syncCodeFromStore()
  }
})

/** Sincroniza o conteúdo do editor com base no MODO e no ALVO */
const syncCodeFromStore = () => {
  if (!EditorStore.showCodeEditor || !view) return 
  const targetId = EditorStore.codeEditorTargetId
  if (!targetId) return

  try {
    let content = ''

    if (EditorStore.codeEditorMode === 'html') {
      const node = EditorStore.getNode(targetId)
      if (node) {
        const children = node.children || []
        const childrenHtml = children.map((child) => EditorStore.pipeline.astToCode(child)).join('')
        content = childrenHtml.replace(/\sdata-node-id="[^"]*"/gi, '')
      }
    } else {
      // Modo CSS
      const rawTree = toRaw(styleStore.cssLogicTree)
      const node = findCssNode(rawTree, targetId)
      
      if (node) {
        if (node.type === 'file' || node.type === 'root') {
          // Edição de arquivo completo: usamos o CssExportService para gerar o bloco
          const sheet = CssExportService.generateOne(rawTree, `${node.metadata?.origin}::${node.label}`)
          content = sheet ? sheet.css : '/* Erro ao gerar CSS do arquivo */'
        } else {
          // Edição de uma regra específica: mostrar apenas declarações
          const declarations = (node.children || [])
            .filter(c => c.type === 'declaration')
            .map(decl => `${decl.label}: ${decl.value};`)
          
          content = declarations.join('\n')
          
          if (content.trim() === '' && node.type === 'selector') {
            content = '/* Digite suas propriedades aqui (ex: color: red;) */\n'
          }
        }
      } else {
        content = `/* Regra ou Arquivo ${targetId} não encontrado */`
      }
    }

    // Só despacha se o conteúdo mudou para evitar loop infinito ou perda de cursor
    if (view.state.doc.toString() !== content) {
      isUpdatingFromStore = true
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      })
      isUpdatingFromStore = false
    }
  } catch (e) {
    console.error('[CodeEditor] Falha ao sincronizar:', e)
    isUpdatingFromStore = false
  }
}

// Watcher para mudança de modo ou alvo
watch(
  [
    () => EditorStore.codeEditorMode, 
    () => EditorStore.codeEditorTargetId,
    () => styleStore.cssLogicTree
  ], 
  ([mode, targetId, tree]) => {
    if (!EditorStore.showCodeEditor) return

    if (editorContainer.value) {
      if (!view) {
        initEditor()
      } else if (targetId !== lastSyncedId) {
        editorContainer.value.innerHTML = ''
        initEditor()
      }
      
      nextTick(() => {
        syncCodeFromStore()
        lastSyncedId = targetId
      })
    }
  }, 
  { immediate: false, deep: false }
)

// Variável para evitar re-init desnecessário/loop
let lastSyncedId = null

// O watcher antigo de showCodeEditor foi removido pois o onMounted e o multi-watch
// agora cobrem todos os cenários de abertura e troca de alvo.

// Update logic
const debouncedUpdate = debounce((code) => {
  const targetId = EditorStore.codeEditorTargetId
  if (!targetId) return

  if (EditorStore.codeEditorMode === 'html') {
    EditorStore.manipulation.updateInnerContent(targetId, code)
  } else {
    // Busca o nó para saber se é arquivo ou seletor
    const rawTree = toRaw(styleStore.cssLogicTree)
    const node = findCssNode(rawTree, targetId)
    
    if (node?.type === 'file' || node?.type === 'root') {
      styleStore.updateFileFromCSS(targetId, code)
    } else {
      styleStore.updateRuleDeclarationsFromCSS(targetId, code)
    }
  }
}, 400)

function handleCodeChange(code) {
  debouncedUpdate(code)
}

onMounted(() => {
  initEditor()
})
</script>

<template>
  <div class="h-full w-full flex flex-col bg-[#282c34] border-t border-gray-700 overflow-hidden shadow-2xl">
    <!-- Header Simples e Independente -->
    <div class="flex items-center justify-between px-3 h-9 bg-[#21252b] border-b border-gray-800 shrink-0">
      <div class="flex h-full items-center gap-3">
        <!-- Indicador de Modo -->
        <div 
          class="flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest"
          :class="EditorStore.codeEditorMode === 'html' 
            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'"
        >
          <span class="w-2 h-2 rounded-full animate-pulse" :class="EditorStore.codeEditorMode === 'html' ? 'bg-indigo-400' : 'bg-amber-400'"></span>
          Editor de {{ EditorStore.codeEditorMode === 'html' ? 'HTML' : 'Regra CSS' }}
        </div>
        
        <div class="h-4 w-[1px] bg-gray-700"></div>

        <span class="text-[10px] text-gray-500 font-mono">
          ID: {{ EditorStore.codeEditorTargetId }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button 
          @click="EditorStore.showCodeEditor = false"
          class="text-gray-500 hover:text-white transition-colors p-1"
          title="Fechar Editor"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Viewport do Editor -->
    <div class="flex-1 overflow-hidden relative">
      <div ref="editorContainer" class="h-full w-full font-mono text-sm"></div>
    </div>
  </div>
</template>

<style>
/* Customização do CodeMirror */
.cm-editor {
  height: 100% !important;
  outline: none !important;
}
.cm-scroller {
  overflow: auto !important;
}
.cm-gutter {
  background-color: #21252b !important;
}
</style>
