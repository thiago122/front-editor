<script setup>
import { onMounted, computed, ref } from 'vue'
import { useComponentStore } from '@/stores/ComponentStore'
import { useEditorStore } from '@/stores/EditorStore'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'

const componentStore = useComponentStore()
const editorStore = useEditorStore()

const searchQuery = ref('')

const filteredComponents = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return componentStore.components
  return componentStore.components.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.path?.toLowerCase().includes(q)
  )
})

onMounted(() => {
  componentStore.loadComponents()
})

function insertComponent(component) {
  // Se houver um nó selecionado, insere dentro ou depois?
  // Por padrão, vamos inserir no final do body ou após a seleção se existir.
  const targetId = editorStore.selectedNodeId || 'body' // Simplificação: 'body' como fallback
  NodeDispatcher.insertAfter(targetId, component.html)
}

function handleDragStart(event, component) {
  event.dataTransfer.setData('application/json', JSON.stringify({
    type: 'component',
    name: component.name,
    html: component.html
  }))
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <div class="component-explorer flex flex-col h-full bg-white">
    <!-- Header/Search -->
    <div class="p-3 border-b border-gray-100 bg-gray-50/50">
      <div class="relative">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar componentes..." 
          class="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        <svg class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Component List -->
    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="componentStore.isLoading" class="flex flex-col items-center justify-center h-32 text-gray-400">
        <div class="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-2"></div>
        <span class="text-[10px]">Carregando...</span>
      </div>

      <div v-else-if="filteredComponents.length === 0" class="flex flex-col items-center justify-center h-32 text-gray-400 text-center px-4">
        <svg class="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span class="text-[10px]">Nenhum componente encontrado.</span>
      </div>

      <div v-else class="grid grid-cols-1 gap-2">
        <div 
          v-for="comp in filteredComponents" 
          :key="comp.name"
          draggable="true"
          @dragstart="handleDragStart($event, comp)"
          class="group relative bg-gray-50 border border-gray-100 rounded-lg p-3 hover:border-indigo-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[11px] font-bold text-gray-700 truncate mr-2">{{ comp.name }}</span>
            <button 
              @click.stop="insertComponent(comp)"
              class="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-100 text-indigo-600 rounded transition-all"
              title="Inserir no documento"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <!-- Preview (Placeholder for now) -->
          <div class="h-16 bg-white border border-gray-100 rounded flex items-center justify-center overflow-hidden">
             <!-- Aqui poderíamos ter um iframe mini ou um snapshot -->
             <div class="text-[9px] text-gray-300 font-mono scale-75 origin-center">
                &lt;{{ comp.name }} /&gt;
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State / Guide -->
    <div class="p-4 border-t border-gray-100 bg-gray-50/30">
      <p class="text-[10px] text-gray-400 leading-relaxed">
        <strong>Dica:</strong> Clique com o botão direito em qualquer elemento no explorer de camadas para criar um componente.
      </p>
    </div>
  </div>
</template>

<style scoped>
.component-explorer {
  user-select: none;
}
</style>
