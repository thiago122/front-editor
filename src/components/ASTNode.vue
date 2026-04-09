<script setup>
// ASTNode.vue

import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useExplorerDragDrop } from '@/composables/useExplorerDragDrop'
import NodeToolbar from './NodeToolbar.vue'
import { DRAG_RESTRICTED_TAGS } from '@/editor/html/constants'

const EditorStore = useEditorStore()
const { startDrag, explorerDragState } = useExplorerDragDrop()

const isDragging    = computed(() => explorerDragState.nodeId.value === props.node.nodeId)

const isDragAllowed = computed(() =>
  props.node.type === 'element' &&
  !DRAG_RESTRICTED_TAGS.has(props.node.tag?.toLowerCase())
)

const emit = defineEmits(['select'])

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  selectedNodeId: String,
  openPath: {
    type: Array,
    default: () => [],
  },
  showTextNodes: {
    type: Boolean,
    default: true
  },
  showCommentNodes: {
    type: Boolean,
    default: true
  }
})

/**
 * LOCAL STATE
 */
const openedManually = ref(false)
const closedManually = ref(false) // Override explícito: fecha mesmo se o nó está selecionado

/**
 * COMPUTED FLAGS
 */
const isSelected = computed(() => props.node.nodeId === props.selectedNodeId)

const attributes = computed(() => {
  if (props.node.type !== 'element' || !props.node.attrs) return []
  return Object.entries(props.node.attrs).map(([name, value]) => ({ name, value }))
})

// Quick access to important attributes for display
const idAttr = computed(() => props.node.attrs?.id)
const classAttr = computed(() => props.node.attrs?.class)

/**
 * TREE HELPERS
 */
function containsNode(root, nodeId) {
  if (!nodeId) return false
  if (root.nodeId === nodeId) return true
  return root.children?.some((child) => containsNode(child, nodeId))
}

const visibleChildren = computed(() => {
  if (!props.node.children) return []
  return props.node.children.filter(child => {
    const type = child.type?.toLowerCase()
    if (type === 'element') return true
    if (type === 'text') return props.showTextNodes
    if (type === 'comment') return props.showCommentNodes
    return true
  })
})

/**
 * OPEN LOGIC
 */
const isOpen = computed(() => {
  // Se o usuário fechou explicitamente, respeita isso acima de tudo
  if (closedManually.value) return false
  return (
    openedManually.value ||
    props.openPath.includes(props.node.nodeId) ||
    containsNode(props.node, props.selectedNodeId)
  )
})

/**
 * UI EVENTS
 */
function onMouseEnter() {
  const id = props.node.nodeId
  EditorStore.handleHover({ id: id, source: 'explorer' })
}

function onMouseLeave() {
  EditorStore.handleHover({ id: null, source: null })
}

function onToggle(e) {
  e.stopPropagation()
  if (isOpen.value) {
    // Fechar: marca como fechado manualmente (override)
    closedManually.value = true
    openedManually.value = false
  } else {
    // Abrir: limpa o override de fechamento
    closedManually.value = false
    openedManually.value = true
  }
}

function onSelect() {
  EditorStore.selectNode(props.node.nodeId)
}
</script>

<template>
  <div class="ast-node relative select-none" :class="{ 'has-children': node.children?.length }">
    <!-- NODE ROW -->
    <div
      :data-ast-node-id="node.nodeId"
      :data-tag="node.tag"
      class="node-row flex items-center h-6 cursor-pointer rounded-sm px-1.5 group transition-all duration-75"
      :class="{ 
        'bg-blue-100 text-blue-900 shadow-sm': isSelected,
        'hover:bg-gray-50': !isSelected,
        'has-children': visibleChildren.length,
        'opacity-40': isDragging,
      }"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @click.stop="onSelect"
    >
      <!-- DRAG HANDLE — visível no hover, só para elementos arrastáveis -->
      <div
        v-if="isDragAllowed"
        class="w-3.5 h-4 flex items-center justify-center mr-0.5 rounded opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-opacity shrink-0"
        title="Arrastar"
        @mousedown.stop="startDrag(node.nodeId, $event)"
      >
        <!-- ⠿ grip icon -->
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
          <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
          <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
        </svg>
      </div>
      <div v-else class="w-3.5 shrink-0" />
      <!-- TOGGLE ICON -->
      <div
        v-if="visibleChildren.length"
        class="w-4 h-4 flex items-center justify-center mr-0.5 hover:bg-black/5 rounded transition-transform duration-200"
        :class="{ 'rotate-90': isOpen }"
        @click="onToggle"
      >
        <svg class="w-2.5 h-2.5 text-gray-400 group-hover:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div v-else class="w-4" />

      <!-- CONTENT -->
      <div class="flex items-center gap-1.5 font-mono text-[11px] overflow-hidden">
        <!-- ELEMENT TAG -->
        <template v-if="node.type === 'element'">
          <span class="text-indigo-600 font-bold">{{ node.tag }}</span>
          
          <!-- ID PREVIEW -->
          <span v-if="idAttr" class="text-orange-600 opacity-90">#{{ idAttr }}</span>

          <!-- CLASS PREVIEW -->
          <span v-if="classAttr" class="text-blue-600 opacity-80 truncate max-w-[150px]">.{{ classAttr.split(' ').join('.') }}</span>
        </template>

        <!-- TEXT NODE -->
        <template v-else-if="node.type === 'text'">
          <span class="text-gray-500 italic truncate max-w-[200px]">"{{ node.value?.trim() }}"</span>
        </template>

        <!-- COMMENT -->
        <template v-else-if="node.type === 'comment'">
          <span class="text-green-600 opacity-80">&lt;!-- {{ node.value?.trim() }} --&gt;</span>
        </template>
        <template v-else>
           <span class="text-gray-400">{{ node.type }}</span>
        </template>
      </div>

      <!-- NODE ACTIONS TOOLBAR -->
      <div 
        v-if="node.type === 'element'"
        class="ml-auto pl-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        :class="{ 'opacity-100': isSelected }"
      >
        <NodeToolbar :node-id="node.nodeId" variant="explorer" />
      </div>

    </div>

    <!-- CHILDREN (with Indentation Guide) -->
    <div v-show="isOpen" class="ml-[7px] border-l border-gray-100/80 pl-2 mt-0.5">
      <ASTNode
        v-for="child in visibleChildren"
        :key="child.nodeId"
        :node="child"
        :selectedNodeId="selectedNodeId"
        :openPath="openPath"
        :show-text-nodes="showTextNodes"
        :show-comment-nodes="showCommentNodes"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.ast-node {
  font-family: 'JetBrains Mono', 'Fira Code', 'Roboto Mono', 'Source Code Pro', monospace;
}

[data-ast-node-id][data-editor-hovered]:not(.bg-blue-100) {
  background-color: #fff7ed !important; /* bg-orange-50 */
  border-radius: 2px;
}

.node-row {
  white-space: nowrap;
}

/* Subtle line on hover for siblings */
.ast-node.has-children > div:last-child {
  transition: border-color 0.2s;
}

.ast-node.has-children:hover > div:last-child {
  border-left-color: #e5e7eb;
}
</style>
