<script setup>
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useCssParser } from '@/composables/useCssParser'
import CssTreeItem from './CssTreeItem.vue'

const store = useEditorStore()
const { extractCssAst } = useCssParser()

// Function to refresh the AST (re-parse)
const refresh = () => {
    // We need to re-run extraction. 
    // Ideally store should handle this, but for now we can trigger it here via logic or if the store has an action.
    // Looking at InspectorPanel, it calls store.initEngine or similar? 
    // Or simpler: just re-run extractCssAst and update store.cssAst
    const frame = document.querySelector('iframe')
    if (frame && frame.contentDocument) {
        store.cssAst = extractCssAst(frame.contentDocument)
    }
}

const collapsedFiles = ref(new Set())

const toggleFile = (key) => {
    if (collapsedFiles.value.has(key)) {
        collapsedFiles.value.delete(key)
    } else {
        collapsedFiles.value.add(key)
    }
}

// Group rules by file/source
const files = computed(() => {
    if (!store.cssAst || !store.cssAst.children) return []

    const groups = {}

    store.cssAst.children.forEach(node => {
        // Create unique key for the file
        const key = `${node.origin}::${node.sourceName}`
        
        if (!groups[key]) {
            groups[key] = {
                key, // Store key for toggling
                origin: node.origin,
                name: node.sourceName,
                children: [] 
            }
        }
        groups[key].children.push(node)
    })

    // Sort: Inline first, then Internal, then External
    return Object.values(groups).sort((a, b) => {
        const order = { 'inline': 10, 'on_page': 20, 'internal': 30, 'external': 40 }
        return (order[a.origin] || 99) - (order[b.origin] || 99)
    })
})

const getFileIcon = (origin) => {
    if (origin === 'external') return '🔗'
    if (origin === 'on_page' || origin === 'internal') return '📝'
    return '🔹'
}
</script>

<template>
    <div class="flex flex-col h-full bg-white border-r border-[#d1d1d1]">
        <!-- Header -->
        <div class="px-3 py-2 bg-[#f3f3f3] border-b border-[#d1d1d1] flex items-center justify-between shrink-0">
            <span class="text-xs font-bold text-gray-700">CSS Explorer</span>
            <button @click="refresh" class="text-gray-500 hover:text-black" title="Refresh AST">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
        </div>

        <!-- File List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
            <template v-if="files.length">
                <div v-for="(file, i) in files" :key="i" class="mb-2">
                    <!-- File Header -->
                    <div 
                        class="px-2 py-1.5 bg-gray-50 border-y border-gray-100 flex items-center gap-2 sticky top-0 z-10 cursor-pointer hover:bg-gray-100 transition-colors"
                        @click="toggleFile(file.key)"
                    >
                        <!-- Chevron -->
                        <svg class="w-3 h-3 text-gray-400 transform transition-transform duration-200"
                            :class="collapsedFiles.has(file.key) ? '' : 'rotate-90'"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>

                        <span class="text-xs opacity-70">{{ getFileIcon(file.origin) }}</span>
                        <span class="text-[10px] font-bold text-gray-600 uppercase tracking-wide truncate flex-1" :title="file.name">
                            {{ file.name }}
                        </span>
                        <span class="text-[9px] text-gray-400 bg-white border border-gray-200 px-1 rounded">
                            {{ file.origin }}
                        </span>
                    </div>

                    <!-- File Roots -->
                    <div v-if="!collapsedFiles.has(file.key)">
                        <CssTreeItem 
                            v-for="(node, idx) in file.children" 
                            :key="node._nodeId || idx" 
                            :node="node" 
                            :depth="0" 
                        />
                    </div>
                </div>
            </template>
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
