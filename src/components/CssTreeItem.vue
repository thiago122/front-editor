<script setup>
import { computed, ref, nextTick, toRaw } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'

const styleStore = useStyleStore()

const props = defineProps({
  node:         { type: Object,  required: true },
  depth:        { type: Number,  default: 0 },
  isDragging:   { type: Boolean, default: false },
  dropPosition: { type: String,  default: null },
})

const emit = defineEmits(['dragstart', 'dragover', 'drop', 'dragend'])

const hasChildren = computed(() => props.node.children?.length > 0)
const isExpanded  = computed(() => props.node.isExpanded ?? false)
const isSelected  = computed(() => styleStore.selectedRuleId === props.node.id)
const isDraggable = computed(() => props.node.type !== 'root')

// ── Inline editing ────────────────────────────────────────────────────────────

const editing  = ref(false)
const draft    = ref('')
const inputRef = ref(null)

const isEditable = computed(() =>
  props.node.type === 'selector' ||
  props.node.type === 'at-rule'  ||
  props.node.type === 'declaration'
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

function cancelEdit() {
  editing.value = false
}

function saveEdit() {
  const val = draft.value.trim()
  if (!val) { cancelEdit(); return }

  const raw     = toRaw(props.node)
  const astNode = toRaw(raw.metadata?.astNode)
  const t       = raw.type

  if (t === 'selector') {
    if (astNode) astNode.prelude = { type: 'Raw', value: val }
    raw.label = val
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
    raw.label = condition ? `@${atName} ${condition}` : `@${atName}`
  }
  else if (t === 'declaration') {
    const ci   = val.indexOf(':')
    const prop = ci !== -1 ? val.slice(0, ci).trim() : val
    const valu = ci !== -1 ? val.slice(ci + 1).trim() : ''
    if (astNode) {
      astNode.property = prop
      astNode.value    = { type: 'Raw', value: valu }
    }
    raw.label = prop
    raw.value = valu
  }

  const doc = document.querySelector('iframe')?.contentDocument
  styleStore.applyMutation(doc)
  editing.value = false
}

// ── Click handling ────────────────────────────────────────────────────────────

const handleClick = (e) => {
  if (props.node.type === 'root') return

  // Ctrl+Click → inline edit
  if (e.ctrlKey && isEditable.value) {
    e.stopPropagation()
    startEdit()
    return
  }

  if (hasChildren.value) props.node.onToggle?.()
  if (props.node.type === 'selector' || props.node.type === 'at-rule') {
    styleStore.selectRule(props.node.id)
  }
}

// Classes de estilo por tipo
const rowClass = computed(() => {
  const t = props.node.type
  if (t === 'root')        return 'bg-[#f0f0f0] border-y border-[#d1d1d1] font-bold text-[10px] text-gray-600 sticky top-0 z-10'
  if (t === 'file')        return 'bg-white font-medium text-gray-600'
  if (t === 'selector')    return 'text-blue-700 font-medium'
  if (t === 'at-rule')     return 'text-purple-700 font-bold'
  if (t === 'declaration') return 'text-gray-500'
  return ''
})
</script>


<template>
  <div
    class="relative font-mono text-[11px] select-none border-b border-gray-50/50"
    :class="[
      rowClass,
      isSelected   ? 'bg-blue-50 !border-blue-200' : (node.type !== 'root' ? 'hover:bg-gray-50' : ''),
      isDragging   ? 'opacity-40' : '',
      isDraggable  ? 'cursor-grab active:cursor-grabbing' : '',
    ]"
    :draggable="isDraggable"
    @click="handleClick"
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

    <div
      class="flex items-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap"
      :style="{ paddingLeft: node.type === 'root' ? '8px' : (depth * 10) + 'px', height: '22px' }"
    >
      <!-- Toggle arrow -->
      <div class="toggle-area w-4 h-4 flex items-center justify-center shrink-0" :class="node.type !== 'root' ? 'hover:bg-black/5 rounded' : ''">
        <svg v-if="hasChildren && node.type !== 'root'"
          class="w-2.5 h-2.5 text-gray-400 transition-transform duration-150"
          :class="isExpanded ? 'rotate-90' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
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
        <span class="truncate" :class="{ 'uppercase tracking-wide': node.type === 'root' }" :title="node.label">{{ node.label }}</span>
        <span v-if="node.value" class="text-gray-400 font-normal truncate">: {{ node.value }}</span>
      </div>
    </div>

    <!-- Indicador de drop APÓS -->
    <div
      v-if="dropPosition === 'after'"
      class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-20 pointer-events-none"
    />
  </div>
</template>


