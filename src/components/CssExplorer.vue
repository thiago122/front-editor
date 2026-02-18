<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { CssLogicTreeService } from '@/composables/CssLogicTreeService'
import CssTreeItem from './CssTreeItem.vue'

const styleStore = useStyleStore()
const editorStore = useEditorStore()

const containerRef = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(400) 
const ROW_HEIGHT = 22

const addNewRule = async () => {
    const selector = window.prompt('Enter selector:', '.new-rule')
    if (!selector) return

    if (!styleStore.cssAst) return

    // Default to 'on_page' if no other origin found, or find first acceptable one
    let targetOrigin = 'on_page'
    let targetSource = 'style'
    
    // Try to find first internal non-external root
    const targetRoot = styleStore.cssAst.find(n => n.metadata.origin !== 'external')
    if (targetRoot) {
        targetOrigin = targetRoot.metadata.origin
        // Try to find a file
        if (targetRoot.children.length > 0) {
            targetSource = targetRoot.children[0].label
        }
    }

    const newLogicNode = CssLogicTreeService.addRule(styleStore.cssAst, selector, targetOrigin, targetSource)

    if (newLogicNode) {
        const doc = document.querySelector('iframe')?.contentDocument
        CssLogicTreeService.syncToDOM(styleStore.cssAst, doc)
        await styleStore.refreshCssAst(doc)
        styleStore.setActiveRule(newLogicNode.id)
    } else {
        alert('Invalid selector or failed to create rule')
    }
}

const handleScroll = (e) => {
    scrollTop.value = e.target.scrollTop
}

// Initial measurement and resize handling
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

// Function to refresh the AST (re-parse)
const refresh = async () => {
    const doc = document.querySelector('iframe')?.contentDocument
    await styleStore.refreshCssAst(doc)
}

/**
 * Builds a flat list of nodes that should be visible based on collapsedNodes state.
 * Depends on astMutationKey to re-compute when AST is mutated (without deep reactivity overhead)
 */
const visibleNodes = computed(() => {
    // Depend on mutation key to trigger re-computation
    styleStore.astMutationKey.value // eslint-disable-line no-unused-expressions
    
    const flat = []
    const roots = styleStore.cssAst || []
    
    const traverse = (nodes, depth = 0) => {
        for (const node of nodes) {
            flat.push({
                ...node,
                depth
            })

            if (styleStore.isExpanded(node) && node.children && node.children.length > 0) {
                // Files and other nodes under 'root' stay at depth 0
                const nextDepth = node.type === 'root' ? 0 : depth + 1
                traverse(node.children, nextDepth)
            }
        }
    }

    traverse(roots)
    return flat
})

const totalHeight = computed(() => visibleNodes.value.length * ROW_HEIGHT)

/**
 * Only render what's in the viewport + small buffer
 */
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - 5))
const endIndex = computed(() => Math.min(visibleNodes.value.length, Math.ceil((scrollTop.value + containerHeight.value) / ROW_HEIGHT) + 5))

const displayedNodes = computed(() => {
    return visibleNodes.value.slice(startIndex.value, endIndex.value).map((node, index) => ({
        ...node,
        virtualIndex: startIndex.value + index
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
