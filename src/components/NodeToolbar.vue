<script setup>
/**
 * NodeToolbar.vue
 * 
 * Shared toolbar for node actions (Select Parent, Insert, Duplicate, Edit, Delete).
 * Used by HighlightOverlay.vue and ASTNode.vue.
 */
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'
import TagAutocomplete from '@/components/TagAutocomplete.vue'
import { tagToHtml } from '@/editor/html/htmlTags'
import { TEXT_EDITABLE_TAGS } from '@/editor/html/htmlConstants'

const props = defineProps({
  nodeId: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: 'overlay', // 'overlay' | 'explorer'
  },
})

const EditorStore = useEditorStore()

// ── Checks ────────────────────────────────────────────────────────────────────

const isSelected = computed(() => EditorStore.selectedNodeId === props.nodeId)

const parent = computed(() => EditorStore.getParent(props.nodeId))

const canEditText = computed(() => {
  // We need to find the actual DOM element for this check if variant is explorer
  // But wait, we can just check the tag name from the node data if we had it.
  // ASTNode has the node data. Let's assume we might need to find the element
  // if variant is overlay, or just check the node's tag if we pass it.
  
  // For now, let's use the element from store IF it matches our nodeId
  const el = EditorStore.selectedNodeId === props.nodeId ? EditorStore.selectedElement : null
  if (!el) return false
  return TEXT_EDITABLE_TAGS.includes(el.tagName.toLowerCase())
})

// ── Actions ───────────────────────────────────────────────────────────────────

function selectParent() {
  if (parent.value) {
    EditorStore.selectNode(parent.value.nodeId)
  }
}

function deleteNode()    { NodeDispatcher.deleteNode(props.nodeId) }
function duplicateNode() { NodeDispatcher.duplicateNode(props.nodeId) }

function startTextEdit() {
  const el = EditorStore.selectedElement
  if (!el || EditorStore.selectedNodeId !== props.nodeId) return
  const trigger = EditorStore.triggerInlineEdit
  if (typeof trigger === 'function') {
    trigger(el)
  }
}

// ── Shared Auto-open Logic ──────────────────────────────────────────────────

function triggerAutocomplete(mode = 'after') {
  // Se for via atalho de teclado, não temos o evento de click.
  // Tentamos pegar o rect do elemento selecionado no preview.
  const el = EditorStore.selectedElement
  if (el) {
    const elRect = el.getBoundingClientRect()
    const iframe = EditorStore.iframe
    if (iframe) {
      const iframeRect = iframe.getBoundingClientRect()
      const combinedRect = {
        top:    elRect.top    + iframeRect.top,
        bottom: elRect.bottom + iframeRect.top,
        left:   elRect.left   + iframeRect.left,
      }
      openAutocompleteAt(combinedRect, mode)
      return
    }
  }
  
  // Fallback se não achar nada
  openAutocompleteAt({ top: 100, bottom: 100, left: 100 }, mode)
}

defineExpose({
  triggerAutocomplete
})

// ── Autocomplete Logic ────────────────────────────────────────────────────────

const showAutocomplete  = ref(false)
const autocompleteStyle = ref({})
const insertMode        = ref('after') // 'after' | 'child'

function openAutocomplete(event, mode = 'after') {
  const rect = event.currentTarget.getBoundingClientRect()
  openAutocompleteAt(rect, mode)
}

/**
 * Abre o autocomplete em coordenadas inteligentes.
 * @param {DOMRect|Object} anchorRect - Rect do elemento/botão que dispara o menu
 * @param {string} mode - 'after' | 'child'
 */
function openAutocompleteAt(anchorRect, mode = 'after') {
  const POPUP_HEIGHT = 280
  const MARGIN       = 6
  const windowH      = window.innerHeight

  let top = anchorRect.bottom + MARGIN

  // Se estoura o fundo da tela, abre para cima
  if (top + POPUP_HEIGHT > windowH) {
    top = anchorRect.top - POPUP_HEIGHT - MARGIN
  }

  insertMode.value        = mode
  autocompleteStyle.value = { top: `${top}px`, left: `${anchorRect.left}px` }
  showAutocomplete.value  = true
}

function onTagSelected(tag) {
  showAutocomplete.value = false
  if (insertMode.value === 'child') {
    NodeDispatcher.appendElement(props.nodeId, tagToHtml(tag))
  } else {
    NodeDispatcher.insertAfter(props.nodeId, tagToHtml(tag))
  }
}
</script>

<template>
  <div class="node-toolbar flex items-center h-full" :class="`variant-${variant}`" @click.stop>
    
    <!-- Select Parent -->
    <button
      v-if="parent"
      class="toolbar-btn"
      title="Selecionar pai"
      @click.stop="selectParent"
    >↑</button>

    <!-- Insert After -->
    <button
      class="toolbar-btn font-bold"
      title="Inserir tag após"
      @click.stop="openAutocomplete($event, 'after')"
    >+</button>

    <!-- Insert Child -->
    <button
      class="toolbar-btn font-bold"
      title="Inserir tag dentro"
      @click.stop="openAutocomplete($event, 'child')"
    >↳</button>

    <!-- Duplicate -->
    <button
      class="toolbar-btn text-amber-500"
      title="Duplicar"
      @click.stop="duplicateNode"
    >⧉</button>

    <!-- Code Editor Toggle -->
    <button
      class="toolbar-btn text-indigo-400 font-bold"
      title="Ver Código"
      @click.stop="EditorStore.openCodeEditor('html', props.nodeId)"
      :class="{ 'bg-indigo-600/20': EditorStore.showCodeEditor && EditorStore.codeEditorMode === 'html' }"
    >&lt;/&gt;</button>

    <!-- Edit Text -->
    <button
      v-if="canEditText"
      class="toolbar-btn font-bold font-mono"
      title="Editar texto"
      @click.stop="startTextEdit"
    >T</button>

    <!-- Delete -->
    <button
      class="toolbar-btn btn-danger"
      title="Deletar"
      @click.stop="deleteNode"
    >×</button>

    <!-- Autocomplete rendering -->
    <TagAutocomplete
      v-if="showAutocomplete"
      :style="autocompleteStyle"
      @select="onTagSelected"
      @close="showAutocomplete = false"
    />
  </div>
</template>

<style scoped>
.node-toolbar {
  display: inline-flex;
  pointer-events: auto;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 6px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: white;
  font-size: 10px;
}

.toolbar-btn:first-child {
  border-left: none;
}

/* Variant Overlay (estilo DevTools) */
.variant-overlay .toolbar-btn {
  background: transparent;
  color: white;
}
.variant-overlay .toolbar-btn:hover {
  background: rgba(255,255,255,0.15);
}
.variant-overlay .btn-danger:hover {
  background: #ef4444;
}

/* Variant Explorer (estilo compacto para a árvore) */
.variant-explorer {
  height: 18px;
  background: #f3f4f6; /* gray-100 */
  border: 1px solid #e5e7eb; /* gray-200 */
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.variant-explorer .toolbar-btn {
  padding: 0 4px;
  color: #4b5563; /* gray-600 */
  border-left-color: #e5e7eb;
}
.variant-explorer .toolbar-btn:hover {
  background: white;
  color: #4f46e5; /* indigo-600 */
}
.variant-explorer .btn-danger:hover {
  background: #fee2e2; /* red-100 */
  color: #dc2626; /* red-600 */
}
</style>
