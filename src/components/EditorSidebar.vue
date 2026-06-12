<template>
  <IconSidebar style="position: relative; z-index: var(--z-panel)">
    <!-- Botão Inspect com dropdown de opções no hover -->
    <div class="relative group/inspect">
      <!-- Botão principal: ativa/desativa inspect mode -->
      <button
        class="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-150 hover:bg-gray-200 text-text-primary"
        :class="EditorStore.inspectMode ? 'bg-blue-100 text-blue-600' : ''"
        @click="EditorStore.inspectMode = !EditorStore.inspectMode"
        title="Inspect"
      >
        <IconInspect />
      </button>

      <!-- Dropdown: aparece no hover do botão — sem gap para não perder o hover -->
      <div
        class="absolute left-full top-0 pl-1 opacity-0 pointer-events-none group-hover/inspect:opacity-100 group-hover/inspect:pointer-events-auto transition-opacity duration-150 z-50"
      >
        <div class="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] text-xs">
          <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Cursor
          </div>

          <!-- Opção: Sem Box Model -->
          <button
            class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
            :class="!EditorStore.showBoxModel ? 'text-blue-600 font-semibold' : 'text-gray-700'"
            @click.stop="
              () => {
                EditorStore.showBoxModel = false
                EditorStore.inspectMode = true
              }
            "
          >
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2" />
            </svg>
            Sem Box Model
            <svg
              v-if="!EditorStore.showBoxModel"
              class="w-3 h-3 ml-auto text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>

          <!-- Opção: Com Box Model -->
          <button
            class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
            :class="EditorStore.showBoxModel ? 'text-blue-600 font-semibold' : 'text-gray-700'"
            @click.stop="
              () => {
                EditorStore.showBoxModel = true
                EditorStore.inspectMode = true
              }
            "
          >
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2" />
              <rect x="6" y="6" width="12" height="12" rx="1" stroke-width="1.5" opacity="0.5" />
              <rect x="9" y="9" width="6" height="6" rx="1" stroke-width="1.5" opacity="0.8" />
            </svg>
            Com Box Model
            <svg
              v-if="EditorStore.showBoxModel"
              class="w-3 h-3 ml-auto text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Outline Mode: revela os limites de todos os elementos -->
    <IconSidebarButton
      title="Outline Mode — revela limites de todos os elementos"
      @click="EditorStore.outlineMode = !EditorStore.outlineMode"
      :class="EditorStore.outlineMode ? 'bg-orange-100 text-orange-600' : ''"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="2" stroke-width="1.5" />
        <rect x="6" y="6" width="12" height="12" rx="1" stroke-width="1.5" opacity="0.6" />
        <rect x="10" y="10" width="4" height="4" rx="0.5" stroke-width="1.5" opacity="0.9" />
      </svg>
    </IconSidebarButton>

    <!-- Placeholder em elementos vazios -->
    <IconSidebarButton
      title="Mostrar placeholder em elementos vazios"
      @click="EditorStore.showEmptyPlaceholder = !EditorStore.showEmptyPlaceholder"
      :class="EditorStore.showEmptyPlaceholder ? 'bg-indigo-100 text-indigo-600' : ''"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" stroke-dasharray="3 2" />
        <line x1="9" y1="12" x2="15" y2="12" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </IconSidebarButton>

    <IconSidebarButton
      title="Layers (Alt+L)"
      @click="activeExplorer = activeExplorer === 'html' ? null : 'html'"
      :class="activeExplorer === 'html' ? 'bg-gray-200' : ''"
    >
      <IconLayer />
    </IconSidebarButton>

    <IconSidebarButton
      title="Componentes (Alt+C)"
      @click="activeExplorer = activeExplorer === 'components' ? null : 'components'"
      :class="activeExplorer === 'components' ? 'bg-gray-200' : ''"
    >
      <IconComponent />
    </IconSidebarButton>

    <IconSidebarButton
      title="HTML do Elemento"
      @click="
        EditorStore.selectedNodeId
          ? EditorStore.openCodeEditor('html', EditorStore.selectedNodeId)
          : null
      "
      :class="EditorStore.htmlEditor.show ? 'bg-gray-200' : ''"
    >
      <IconHTML />
    </IconSidebarButton>

    <IconSidebarButton
      title="Abrir arquivo do disco"
      @click="EditorStore.fileAccessSupported ? EditorStore.openFile() : $emit('open-import')"
    >
      <IconOpen class="w-5 h-5" />
    </IconSidebarButton>

    <!-- Salvar (Ctrl+S) -->
    <IconSidebarButton
      title="Salvar (Ctrl+S)"
      @click="$emit('save')"
      :class="
        EditorStore.currentDocument
          ? 'text-green-600 hover:bg-green-50'
          : EditorStore.fileHandle
            ? 'text-green-600 hover:bg-green-50'
            : 'text-gray-400'
      "
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
        />
      </svg>
    </IconSidebarButton>

    <!-- Salvar Como -->
    <IconSidebarButton
      v-if="EditorStore.fileAccessSupported"
      title="Salvar como..."
      @click="EditorStore.saveFileAs()"
      class="text-blue-500 hover:bg-blue-50"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3M9 11l3-3m0 0l3 3m-3-3v8"
        />
      </svg>
    </IconSidebarButton>

    <!-- Download CSS: baixa todos os stylesheets editáveis -->
    <IconSidebarButton
      title="Download CSS"
      @click="$emit('download-css')"
      class="text-blue-500 hover:bg-blue-50"
    >
      <IconCSS class="w-5 h-5" />
    </IconSidebarButton>

    <!-- Download HTML: baixa o HTML atual do iframe -->
    <IconSidebarButton
      title="Download HTML"
      @click="$emit('download-html')"
      class="text-blue-500 hover:bg-blue-50"
    >
      <IconHTML class="w-5 h-5" />
    </IconSidebarButton>

    <!-- Pixel Perfect: abre o painel de controles -->
    <IconSidebarButton
      title="Pixel Perfect — sobrepor imagem de referência"
      @click="EditorStore.pixelPerfectEditor.show = !EditorStore.pixelPerfectEditor.show"
      :class="
        EditorStore.pixelPerfectEditor.show
          ? 'bg-violet-100 text-violet-600'
          : pixelPerfect.enabled.value
            ? 'text-violet-500'
            : ''
      "
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="4" y="4" width="12" height="12" rx="2" stroke-width="1.5" />
        <rect x="8" y="8" width="12" height="12" rx="2" stroke-width="1.5" opacity="0.6" />
      </svg>
    </IconSidebarButton>

    <!-- Variáveis (Tokens) -->
    <IconSidebarButton
      title="Variáveis CSS (Tokens)"
      @click="EditorStore.variablesPanel.show = !EditorStore.variablesPanel.show"
      :class="
        EditorStore.variablesPanel.show
          ? 'bg-fuchsia-100 text-fuchsia-600'
          : 'text-gray-500 hover:text-fuchsia-500 hover:bg-fuchsia-50'
      "
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    </IconSidebarButton>

    <!-- Input oculto para selecionar arquivo de imagem -->
    <input
      ref="pixelPerfectFileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="(e) => pixelPerfect.loadImage(e.target.files?.[0])"
    />
  </IconSidebar>
</template>

<script setup>
import { useEditorStore } from '@/stores/EditorStore'
import { usePixelPerfect } from '@/composables/usePixelPerfect'

import IconSidebar from '@/components/IconSidebar.vue'
import IconSidebarButton from '@/components/IconSidebarButton.vue'
import IconLayer from '@/components/icons/iconLayer.vue'
import IconComponent from '@/components/icons/iconComponent.vue'
import IconHTML from '@/components/icons/IconHTML.vue'
import IconCSS from '@/components/icons/IconCSS.vue'
import IconInspect from '@/components/icons/iconInspect.vue'
import IconOpen from '@/components/icons/IconOpen.vue'

defineEmits(['open-import', 'save', 'download-css', 'download-html'])

const EditorStore = useEditorStore()
const pixelPerfect = usePixelPerfect()

// Painel lateral ativo ('html' | 'components' | null) — sincronizado com a
// view, que também o alterna via atalhos Alt+L / Alt+C.
const activeExplorer = defineModel('activeExplorer')
</script>
