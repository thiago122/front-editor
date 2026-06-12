<template>
  <header
    class="flex items-center justify-between px-4 h-12 bg-white border-b border-gray-200 relative z-[99999] shrink-0"
  >
    <!-- Seção Esquerda: Navegação e Ferramentas -->
    <div class="flex items-center gap-3 flex-1">
      <!-- Voltar para Home -->
      <button
        v-if="EditorStore.currentDocument"
        @click="$router.push('/')"
        title="Voltar para documentos"
        class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 px-2 py-1.5 rounded-sm hover:bg-gray-100 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Docs
      </button>

      <div class="w-px h-4 bg-gray-200" v-if="EditorStore.currentDocument"></div>

      <!-- Histórico e Clipboard juntos -->
      <div class="flex items-center gap-1">
        <HistoryControls />
        <div class="w-px h-4 bg-gray-200 mx-1"></div>
        <ClipboardControls :nodeId="EditorStore.selectedNodeId" />
      </div>
    </div>

    <!-- Seção Central: Título e Responsividade -->
    <div class="flex items-center justify-center flex-1">
      <div class="flex items-center gap-2 bg-gray-50/80 px-1 py-1 border border-gray-100 h-8">
        <div
          class="flex items-center gap-2 px-2 border-r border-gray-200/60"
          v-if="EditorStore.fileName"
        >
          <svg
            class="w-3.5 h-3.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          <span
            class="text-[11px] font-semibold text-gray-700 max-w-[150px] truncate"
            :title="EditorStore.fileName"
          >
            {{ EditorStore.fileName }}
          </span>
        </div>

        <!-- Breakpoints control -->
        <BreakpointControl
          :previewWidth="previewWidth"
          :previewUnit="previewUnit"
          @update="
            (e) => {
              previewWidth = e.width
              previewUnit = e.unit
            }
          "
        />
      </div>
    </div>

    <!-- Seção Direita: Controles de Seleção e Atalhos -->
    <div class="flex items-center justify-end gap-3 flex-1">
      <SelectionControls :nodeId="EditorStore.selectedNodeId" />

      <div class="w-px h-4 bg-gray-200" v-if="EditorStore.selectedNodeId"></div>

      <Delete
        v-if="EditorStore.selectedNodeId"
        :nodeId="EditorStore.selectedNodeId"
        icon-only
        custom-class="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-sm transition-colors"
      />

      <div class="w-px h-4 bg-gray-200" v-if="EditorStore.selectedNodeId"></div>

      <div class="relative flex items-center">
        <button
          @click="isShortcutsModalOpen = !isShortcutsModalOpen"
          title="Ver Atalhos de Teclado"
          class="text-[11px] font-semibold text-gray-500 hover:text-indigo-600 flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
          :class="isShortcutsModalOpen ? 'bg-gray-100 border-gray-200 text-indigo-600' : ''"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            ></path>
          </svg>
          Atalhos
        </button>
        <ShortcutsDropdown :isOpen="isShortcutsModalOpen" @close="isShortcutsModalOpen = false" />
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'

import HistoryControls from '@/components/HistoryControls.vue'
import ClipboardControls from '@/components/ClipboardControls.vue'
import SelectionControls from '@/components/SelectionControls.vue'
import Delete from '@/components/Delete.vue'
import ShortcutsDropdown from '@/components/ShortcutsDropdown.vue'
import BreakpointControl from '@/components/icons/BreakpointControl.vue'

const EditorStore = useEditorStore()

// Largura/unidade do preview — o watch de usePreviewResize (na view)
// sincroniza com EditorStore.setPreviewBreakpoint quando estes mudam.
const previewWidth = defineModel('previewWidth')
const previewUnit = defineModel('previewUnit')

const isShortcutsModalOpen = ref(false)
</script>
