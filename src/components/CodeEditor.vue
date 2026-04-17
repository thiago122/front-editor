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

import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick, toRaw } from 'vue'
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
import { CssExportService } from '@/editor/css/export/CssExportService.js'

const props = defineProps({
  mode:           { type: String,  default: 'html' }, // 'html' | 'css'
  targetId:       { type: String,  default: null },
  show:           { type: Boolean, default: false },
  hideHeader:     { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const EditorStore = useEditorStore()
const styleStore  = useStyleStore()

// --- ESTADOS ---
const editorContainer = ref(null)
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
let view = null

// Trava para evitar loops entre o watcher e o evento de digitação
let isUpdatingFromStore = false

const targetNode = computed(() => {
  if (!props.targetId) return null
  if (props.mode === 'html') return EditorStore.getNode(props.targetId)
  return findCssNode(toRaw(styleStore.cssLogicTree), props.targetId)
})

/** Indica se estamos no modo de edição de ARQUIVO completo (onde o save é manual) */
const isBulkMode = computed(() => {
  const node = targetNode.value
  return props.mode === 'css' && (node?.type === 'file' || node?.type === 'root')
})

const editorLabel = computed(() => {
  if (props.mode === 'html') return 'Código HTML'
  const node = targetNode.value
  if (!node) return 'Editor de CSS'

  if (node.type === 'file' || node.type === 'root') {
    return `Arquivo: ${node.label || 'Sem nome'}`
  }

  if (node.type === 'selector' || node.type === 'at-rule') {
    return `Regra: ${node.label}`
  }

  return 'Regra CSS'
})

// --- MÉTODOS ---
const initEditor = () => {
  if (!editorContainer.value) return
  
  view = new EditorView({
    doc: '',
    extensions: [
      basicSetup,
      oneDark,
      new Compartment().of(props.mode === 'html' ? html() : css()),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isUpdatingFromStore) {
          handleCodeChange(update.state.doc.toString())
        }
      }),
      // Atalho Ctrl+S para salvar
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

onMounted(() => {
  if (editorContainer.value && !view) {
    initEditor()
    syncCodeFromStore()
  }
})

/** Sincroniza o conteúdo do editor com base no MODO e no ALVO */
const syncCodeFromStore = () => {
  if (!view) return 
  const targetId = props.targetId
  if (!targetId) return

  try {
    let content = ''

    if (props.mode === 'html') {
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
        // Se estivermos no processo de salvamento/rebuild, evitamos mostrar erro de "não encontrado"
        // para prevenir o flicker ou limpeza do editor enquanto a árvore é remontada.
        if (isSaving.value) return

        content = `/* Regra ou Arquivo ${targetId} não encontrado */`
      }
    }

    // Só despacha se o conteúdo mudou para evitar loop infinito ou perda de cursor
    if (view.state.doc.toString() !== content) {
      if (view.hasFocus && isBulkMode.value) {
        return
      }

      isUpdatingFromStore = true
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      })
      isUpdatingFromStore = false
      hasUnsavedChanges.value = false // Reseta ao carregar novo alvo
    }
  } catch (e) {
    console.error('[CodeEditor] Falha ao sincronizar:', e)
    isUpdatingFromStore = false
  }
}

// Watcher para mudança de modo ou alvo
watch(
  [
    () => props.mode, 
    () => props.targetId,
    () => styleStore.cssLogicTree
  ], 
  ([mode, targetId, tree]) => {
    if (!props.show) return

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
  const targetId = props.targetId
  if (!targetId) return
  if (props.mode === 'html') {
    EditorStore.manipulation.updateInnerContent(targetId, code)
    hasUnsavedChanges.value = false
  } else {
    const rawTree = toRaw(styleStore.cssLogicTree)
    const node = findCssNode(rawTree, targetId)
    
    if (node?.type === 'file' || node?.type === 'root') {
      // No modo arquivo, o update real só acontece via handleSave().
    } else {
      styleStore.updateRuleDeclarationsFromCSS(targetId, code)
      hasUnsavedChanges.value = false
    }
  }
}, 400)

function handleCodeChange(code) {
  hasUnsavedChanges.value = true
  
  if (!isBulkMode.value) {
    debouncedUpdate(code)
  }
}

async function handleSave() {
  if (!view || !hasUnsavedChanges.value) return
  
  const targetId = props.targetId
  if (!targetId) return

  isSaving.value = true
  const code = view.state.doc.toString()

  try {
    if (props.mode === 'html') {
      EditorStore.manipulation.updateInnerContent(targetId, code)
    } else {
      const rawTree = toRaw(styleStore.cssLogicTree)
      const node = findCssNode(rawTree, targetId)
      
      if (node?.type === 'file' || node?.type === 'root') {
        styleStore.updateFileFromCSS(targetId, code)
      } else {
        styleStore.updateRuleDeclarationsFromCSS(targetId, code)
      }
    }
    hasUnsavedChanges.value = false
  } catch (err) {
    console.error('[CodeEditor] Erro ao salvar:', err)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  initEditor()
})

defineExpose({
  handleSave,
  hasUnsavedChanges,
  isBulkMode,
  isSaving
})
</script>

<template>
  <div class="h-full w-full flex flex-col bg-[#282c34] overflow-hidden">
    <!-- Header Simples e Independente -->
    <div v-if="!hideHeader" class="flex items-center justify-between px-3 h-9 bg-[#21252b] border-b border-gray-800 shrink-0">
      <div class="flex h-full items-center gap-3">
        <!-- Indicador de Modo -->
        <div 
          class="flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest"
          :class="props.mode === 'html' 
            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'"
        >
          <span class="w-2 h-2 rounded-full animate-pulse" :class="props.mode === 'html' ? 'bg-indigo-400' : 'bg-amber-400'"></span>
          Editor de {{ editorLabel }}
        </div>
        
        <div class="h-4 w-[1px] bg-gray-700"></div>

        <span v-if="props.targetId" class="text-[10px] text-gray-500 font-mono">
          ID: {{ props.targetId.length > 15 ? props.targetId.substring(0,12) + '...' : props.targetId }}
        </span>

        <!-- Indicador de Alterações no modo real-time -->
        <span v-if="!isBulkMode && hasUnsavedChanges" class="text-[9px] text-amber-500 italic flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
          Auto-salvando...
        </span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Botão Salvar (Apenas modo Arquivo ou quando há mudanças) -->
        <button
          v-if="isBulkMode"
          @click="handleSave"
          :disabled="!hasUnsavedChanges || isSaving"
          class="flex items-center gap-2 px-3 h-6 rounded text-[11px] font-bold transition-all"
          :class="hasUnsavedChanges 
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg' 
            : 'bg-gray-800 text-gray-500 cursor-default'"
        >
          <svg v-if="isSaving" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          {{ isSaving ? 'Salvando...' : hasUnsavedChanges ? 'Salvar' : 'Salvo' }}
        </button>

        <button 
          @click="emit('close')"
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
