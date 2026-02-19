<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { CssLogicTreeService } from '@/composables/CssLogicTreeService'
import CssTreeItem from './CssTreeItem.vue'

const styleStore = useStyleStore()
const editorStore = useEditorStore()

// ============================================
// LOCAL UI STATE — Tree expansion
// (Kept here because this is purely Explorer UI, not global state)
// ============================================

const toggledNodes = ref(new Set())

function toggleNode(id) {
  const next = new Set(toggledNodes.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  toggledNodes.value = next
}

function isExpanded(node) {
  if (!node) return false
  if (node.type === 'root') return true
  return toggledNodes.value.has(node.id)
}

function expandToNode(id) {
  // Find ALL ancestors (root → file → @media → ...) and expand each one
  // so the target node becomes visible regardless of nesting depth.
  const ancestors = CssLogicTreeService.findAncestors(styleStore.cssLogicTree || [], id)
  for (const ancestor of ancestors) {
    if (!isExpanded(ancestor)) {
      toggleNode(ancestor.id)
    }
  }
}

// When the selected rule changes, expand all its ancestors so it becomes
// visible in the tree — works at any nesting depth (root > file > @media > selector).
watch(() => styleStore.selectedRuleId, (id) => {
  if (id) expandToNode(id)
})

// ============================================
// SCROLLING & VIRTUALISATION
// ============================================

const containerRef = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(400)
const ROW_HEIGHT = 22

const handleScroll = (e) => {
  scrollTop.value = e.target.scrollTop
}

const updateDimensions = () => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

onMounted(() => {
  updateDimensions()
  window.addEventListener('resize', updateDimensions)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions)
})

// ============================================
// ACTIONS
// ============================================

const addNewRule = async () => {
  const selector = window.prompt('Enter selector:', '.new-rule')
  if (!selector) return

  if (!styleStore.cssLogicTree) return

  let targetOrigin = 'on_page'
  let targetSource = 'style'

  const targetRoot = styleStore.cssLogicTree.find(n => n.metadata.origin !== 'external')
  if (targetRoot) {
    targetOrigin = targetRoot.metadata.origin
    if (targetRoot.children.length > 0) {
      targetSource = targetRoot.children[0].label
    }
  }

  const newLogicNode = CssLogicTreeService.addRule(styleStore.cssLogicTree, selector, targetOrigin, targetSource)

  if (newLogicNode) {
    const doc = document.querySelector('iframe')?.contentDocument
    CssLogicTreeService.syncToDOM(styleStore.cssLogicTree, doc)
    await styleStore.refreshCssAst(doc)
    styleStore.selectRule(newLogicNode.id)
  } else {
    alert('Invalid selector or failed to create rule')
  }
}

const refresh = async () => {
  const doc = document.querySelector('iframe')?.contentDocument
  await styleStore.refreshCssAst(doc)
}

// ============================================
// VIRTUAL LIST
// ============================================

/**
 * Flat list of visible nodes based on local expansion state.
 * Depends on astMutationKey to re-compute when the AST is mutated,
 * and on toggledNodes to re-compute when a node is expanded/collapsed.
 */
const visibleNodes = computed(() => {
  // Depend on mutation key to trigger re-computation when tree structure changes
  void styleStore.astMutationKey

  // Depend on toggledNodes to trigger re-computation when expansion changes
  void toggledNodes.value

  const flat = []
  const roots = styleStore.cssLogicTree || []

  const traverse = (nodes, depth = 0) => {
    for (const node of nodes) {
      flat.push({ ...node, depth })
      if (isExpanded(node) && node.children?.length > 0) {
        const nextDepth = node.type === 'root' ? 0 : depth + 1
        traverse(node.children, nextDepth)
      }
    }
  }

  traverse(roots)
  return flat
})

const totalHeight = computed(() => visibleNodes.value.length * ROW_HEIGHT)
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - 5))
const endIndex = computed(() => Math.min(visibleNodes.value.length, Math.ceil((scrollTop.value + containerHeight.value) / ROW_HEIGHT) + 5))

const displayedNodes = computed(() => {
  return visibleNodes.value.slice(startIndex.value, endIndex.value).map((node, index) => ({
    ...node,
    virtualIndex: startIndex.value + index,
    isExpanded: isExpanded(node),
    onToggle: () => toggleNode(node.id),
  }))
})

const itemsOffset = computed(() => startIndex.value * ROW_HEIGHT)
</script>



<template>
    <div class="flex flex-col h-full bg-white border-r border-[#d1d1d1]">
        <!-- Header -->
        <div class="px-3 py-2 bg-[#f3f3f3] border-b border-[#d1d1d1] flex items-center justify-between shrink-0">
            <span class="text-xs font-bold text-gray-700">CSS Explorer</span>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-gray-400">{{ visibleNodes.length }} nodes</span>
                <button @click="refresh" class="text-gray-500 hover:text-black" title="Refresh AST">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </button>
                <button @click="addNewRule" class="text-blue-600 hover:text-blue-700 font-bold text-lg leading-none" title="Create New Rule">
                    +
                </button>
            </div>
        </div>

        <!-- Virtualized List Container -->
        <div 
            ref="containerRef"
            class="flex-1 overflow-y-auto custom-scrollbar bg-white relative"
            @scroll="handleScroll"
        >
            <div v-if="visibleNodes.length" :style="{ height: totalHeight + 'px' }" class="relative">
                <div 
                    class="absolute top-0 left-0 w-full" 
                    :style="{ transform: `translateY(${itemsOffset}px)` }"
                >
                    <CssTreeItem 
                        v-for="node in displayedNodes" 
                        :key="node.id" 
                        :node="node" 
                        :depth="node.depth" 
                        style="height: 22px;"
                    />
                </div>
            </div>
            <div v-else class="p-4 text-center text-gray-400 text-xs">
                No CSS AST loaded.<br>
                Try clicking refresh.
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}
</style>

