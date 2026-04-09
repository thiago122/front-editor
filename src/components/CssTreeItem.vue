<script setup>
import { computed, ref, nextTick, toRaw, watch } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { useEditorStore } from '@/stores/EditorStore'
import { findCssNode } from '@/utils/astHelpers'

const styleStore = useStyleStore()
const editorStore = useEditorStore()

const props = defineProps({
  node:           { type: Object,  required: true },
  depth:          { type: Number,  default: 0 },
  isDragging:     { type: Boolean, default: false },
  dropPosition:   { type: String,  default: null },
  editNodeId:     { type: String,  default: null },
  searchQuery:    { type: String,  default: '' },
  isActive:       { type: Boolean, default: true },
  inactiveReason: { type: String,  default: null },
  selectedNodeId: { type: String,  default: null },
})

const emit = defineEmits(['dragstart', 'dragover', 'drop', 'dragend', 'contextmenu', 'import-css', 'select'])

const hasChildren   = computed(() => props.node.children?.length > 0)
const isExpanded    = computed(() => props.node.isExpanded ?? false)
const isSelected    = computed(() => props.selectedNodeId === props.node.id)
const isHighlighted = computed(() => styleStore.explorerHighlightId === props.node.id)
const isDraggable   = computed(() => props.node.type !== 'root')

// node é markRaw — Vue não rastreia mutações internas.
// Dependendo de astMutationKey, estes computeds relêem label/value após saveEdit.
const nodeLabel = computed(() => {
  void styleStore.astMutationKey
  return props.node.label
})
const nodeValue = computed(() => {
  void styleStore.astMutationKey
  return props.node.value
})

// ── Inline editing ────────────────────────────────────────────────────────────

const editing  = ref(false)
const draft    = ref('')
const inputRef = ref(null)

const isExternal = computed(() => props.node.metadata?.origin === 'external')

const isEditable = computed(() =>
  !isExternal.value && (
    props.node.type === 'selector' ||
    props.node.type === 'at-rule'  ||
    props.node.type === 'declaration'
  )
)

function startEdit() {
  if (!isEditable.value) return
  const n = props.node
  draft.value = n.type === 'declaration' && n.value
    ? `${n.label}: ${n.value}`
    : n.label
  editing.value = true
  nextTick(() => { inputRef.value?.focus(); inputRef.value?.select() })
}

// Quando o CssExplorer cria um novo nó e passa seu ID via editNodeId,
// este item abre automaticamente em modo de edição inline.
watch(() => props.editNodeId, (id) => {
  if (id && id === props.node.id) startEdit()
})

function cancelEdit() {
  editing.value = false
}

function saveEdit() {
  const val = draft.value.trim()
  if (!val) { cancelEdit(); return }

  // Encontra o NÓ ORIGINAL na cssLogicTree (não a cópia spread de displayedNodes).
  // O spread { ...node, depth } em visibleNodes cria uma cópia shallow —
  // mutar raw.label na cópia não afeta o tree, e o valor antigo volta na próxima
  // recomputação de visibleNodes.
  const logicTree = toRaw(styleStore.cssLogicTree)
  const original  = findCssNode(logicTree, props.node.id)
  if (!original) { cancelEdit(); return }

  const astNode = toRaw(original.metadata?.astNode)
  const t       = original.type

  if (t === 'selector') {
    if (astNode) astNode.prelude = { type: 'Raw', value: val }
    original.label = val
  }
  else if (t === 'at-rule') {
    const withoutAt = val.startsWith('@') ? val.slice(1) : val
    const sp        = withoutAt.indexOf(' ')
    const atName    = sp !== -1 ? withoutAt.slice(0, sp) : withoutAt
    const condition = sp !== -1 ? withoutAt.slice(sp + 1).trim() : ''
    if (astNode) {
      astNode.name    = atName
      astNode.prelude = condition ? { type: 'Raw', value: condition } : null
    }
    original.label = condition ? `@${atName} ${condition}` : `@${atName}`
  }
  else if (t === 'declaration') {
    const ci   = val.indexOf(':')
    const prop = ci !== -1 ? val.slice(0, ci).trim() : val
    const valu = ci !== -1 ? val.slice(ci + 1).trim() : ''
    if (astNode) {
      astNode.property = prop
      astNode.value    = { type: 'Raw', value: valu }
    }
    original.label = prop
    original.value = valu
  }

  const doc = document.querySelector('iframe')?.contentDocument
  styleStore.applyMutation(doc)
  editing.value = false
}

// ── Click handling ────────────────────────────────────────────────────────────

const handleClick = (e) => {
  if (props.node.type === 'root') return

  // Ctrl + Shift + Click → força edição no Inspector
  if (e.ctrlKey && e.shiftKey) {
    e.stopPropagation()
    if (props.node.type === 'selector' || props.node.type === 'at-rule') {
      styleStore.selectRule(props.node.id, 'explorer')
    }
    emit('select', props.node)
    return
  }

  // Ctrl + Click → Inline edit local
  if (e.ctrlKey && isEditable.value) {
    e.stopPropagation()
    startEdit()
    return
  }

  if (hasChildren.value) props.node.onToggle?.()

  // Seleciona no explorer (todos os tipos de nó)
  emit('select', props.node)

  // Sincroniza com inspector (apenas selector/at-rule)
  if (props.node.type === 'selector' || props.node.type === 'at-rule') {
    styleStore.selectRule(props.node.id)
  }
}

// Classes de estilo por tipo
const rowClass = computed(() => {
  const t = props.node.type
  if (t === 'root')        return 'bg-[#f0f0f0] border-y border-[#d1d1d1] font-bold text-[10px] text-gray-600 sticky top-0 z-10'
  if (t === 'file')        return 'bg-white font-medium text-gray-600'
  if (t === 'selector')    return isExternal.value ? 'text-blue-400 font-medium'   : 'text-blue-700 font-medium'
  if (t === 'at-rule') {
    if (isExternal.value)      return 'text-purple-400 font-bold'
    if (!props.isActive)       return 'text-gray-400 font-bold'   // inactive @media
    return 'text-purple-700 font-bold'
  }
  if (t === 'declaration') return isExternal.value ? 'text-gray-400' : 'text-gray-500'
  return ''
})
// ── Search highlight ─────────────────────────────────────────────────────────

/**
 * Split a text string into segments for highlight rendering.
 * Returns an array of { text, highlight } objects.
 */
function highlightSegments(text, query) {
  if (!query || !text) return [{ text: text || '', highlight: false }]
  const q   = query.toLowerCase()
  const t   = text
  const idx = t.toLowerCase().indexOf(q)
  if (idx === -1) return [{ text, highlight: false }]
  return [
    { text: t.slice(0, idx),          highlight: false },
    { text: t.slice(idx, idx + q.length), highlight: true },
    { text: t.slice(idx + q.length),  highlight: false },
  ].filter(s => s.text !== '')
}
</script>


<template>
  <div
    class="relative font-mono text-[11px] select-none border-b border-gray-50/50"
    :class="[
      rowClass,
      isSelected    ? 'bg-blue-100 !border-blue-300 ring-1 ring-inset ring-blue-400/40' :
      isHighlighted ? 'bg-amber-50 !border-amber-300 ring-1 ring-amber-300 ring-inset' :
      (node.type !== 'root' ? 'hover:bg-gray-50' : ''),
      isDragging   ? 'opacity-40' : '',
      dropPosition === 'inside' ? 'ring-2 ring-inset ring-blue-400' : '',
    ]"
    @click="handleClick"
    @contextmenu.stop.prevent="(e) => emit('contextmenu', node, e)"
    @dragstart.stop="emit('dragstart', node)"
    @dragover.stop="(e) => emit('dragover', node, e)"
    @drop.stop="emit('drop', node)"
    @dragend.stop="emit('dragend')"
  >
    <!-- Indicador de drop ANTES -->
    <div
      v-if="dropPosition === 'before'"
      class="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-20 pointer-events-none"
    />

    <!-- Vertical guide lines (one per ancestor depth level, like ASTNode border-l) -->
    <template v-if="node.type !== 'root' && depth > 0">
      <div
        v-for="d in depth"
        :key="d"
        class="absolute top-0 bottom-0 w-px bg-gray-100 pointer-events-none"
        :style="{ left: ((d - 1) * 10 + 14) + 'px' }"
      />
    </template>

    <div
      class="group flex items-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap"
      :style="{ paddingLeft: node.type === 'root' ? '8px' : (depth * 10) + 'px', height: '22px' }"
    >
      <!-- DRAG HANDLE — visível no hover, só para nós arrastáveis -->
      <div
        v-if="isDraggable"
        draggable="true"
        class="w-3.5 h-4 flex items-center justify-center mr-0.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-opacity shrink-0"
        title="Arrastar"
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
          <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
          <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
        </svg>
      </div>
      <div v-else class="w-3.5 shrink-0" />

      <!-- Toggle arrow -->
      <div class="toggle-area w-4 h-4 flex items-center justify-center shrink-0" :class="node.type !== 'root' ? 'hover:bg-black/5 rounded' : ''">
        <!-- Solid triangle ► identical to ASTNode, rotates 90° when open -->
        <svg v-if="hasChildren && node.type !== 'root'"
          class="w-2.5 h-2.5 text-gray-400 transition-transform duration-150"
          :class="isExpanded ? 'rotate-90' : ''"
          fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      <!-- Ícones SVG por tipo -->
      <span class="shrink-0 text-gray-400">
        <svg v-if="node.type === 'root' && node.metadata?.origin === 'external'"
          class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1m-.758-4.9a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <svg v-else-if="node.type === 'root'"
          class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <svg v-else-if="node.type === 'file'"
          class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <svg v-else-if="node.type === 'at-rule' && node.label.includes('@media')"
          class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <svg v-else-if="node.type === 'at-rule' && node.label.includes('@keyframes')"
          class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else-if="node.type === 'at-rule' && node.label.includes('@layer')"
          class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <svg v-else-if="node.type === 'at-rule' && node.label.includes('@container')"
          class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        <svg v-else-if="node.type === 'at-rule'"
          class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
      </span>

      <!-- Lock icon: separate element, after the icon span, so it never conflicts with the v-else-if chain -->
      <svg
        v-if="isExternal && (node.type === 'file' || node.type === 'root')"
        class="w-2.5 h-2.5 text-red-400 shrink-0"
        title="External file — read only"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>

      <!-- Label + value  OU  input de edição inline -->
      <input
        v-if="editing"
        ref="inputRef"
        v-model="draft"
        class="flex-1 min-w-0 font-mono text-[11px] bg-white border border-blue-400 rounded px-1 outline-none ring-1 ring-blue-200"
        :class="node.type === 'at-rule' ? 'text-purple-700' : node.type === 'selector' ? 'text-blue-700' : 'text-gray-700'"
        @keydown.enter.stop="saveEdit"
        @keydown.esc.stop="cancelEdit"
        @blur="cancelEdit"
        @click.stop
        @dragstart.stop
      />
      <div v-else class="flex items-baseline gap-1.5 truncate">
        <!-- Label with optional search highlight -->
        <span class="truncate" :class="{ 'uppercase tracking-wide': node.type === 'root' }" :title="nodeLabel">
          <template v-if="searchQuery">
            <template v-for="seg in highlightSegments(nodeLabel, searchQuery)" :key="seg.text + seg.highlight">
              <mark v-if="seg.highlight" class="bg-yellow-200 text-inherit rounded-sm px-0">{{ seg.text }}</mark>
              <span v-else>{{ seg.text }}</span>
            </template>
          </template>
          <template v-else>{{ nodeLabel }}</template>
        </span>

        <!-- Inactive @media badge -->
        <span
          v-if="!isActive && node.type === 'at-rule'"
          class="shrink-0 text-[9px] font-semibold px-1 py-px rounded bg-amber-100 text-amber-600 leading-tight"
          :title="inactiveReason ?? 'Inactive at current viewport'"
        >inactive</span>

        <!-- Value with optional search highlight -->
        <span v-if="nodeValue" class="text-gray-400 font-normal truncate">
          :
          <template v-if="searchQuery">
            <template v-for="seg in highlightSegments(nodeValue, searchQuery)" :key="seg.text + seg.highlight">
              <mark v-if="seg.highlight" class="bg-yellow-200 text-inherit rounded-sm px-0">{{ seg.text }}</mark>
              <span v-else>{{ seg.text }}</span>
            </template>
          </template>
          <template v-else>{{ nodeValue }}</template>
        </span>
        <!-- Import icon: só visível no hover de nós file editáveis -->
        <button
          v-if="node.type === 'file' && !isExternal"
          class="ml-auto mr-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-500"
          title="Importar CSS"
          @click.stop="emit('import-css', node)"
          @dragstart.stop
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>

        <!-- Edit Code icon: for files, selectors and at-rules -->
        <button
          v-if="(node.type === 'file' || node.type === 'selector' || node.type === 'at-rule') && !isExternal"
          class="ml-auto mr-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-amber-500"
          title="Editar via Código"
          @click.stop="editorStore.openCodeEditor('css', node.id)"
          @dragstart.stop
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Indicador de drop APÓS -->
    <div
      v-if="dropPosition === 'after'"
      class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-20 pointer-events-none"
    />
    <!-- Indicador de drop DENTRO (container vazio) -->
    <div
      v-if="dropPosition === 'inside'"
      class="absolute inset-0 border-2 border-blue-400 border-dashed rounded pointer-events-none z-20 opacity-60"
    />
  </div>
</template>


