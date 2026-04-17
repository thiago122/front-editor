<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { findCssNode } from '@/utils/astHelpers'
import FloatingWindow from '@/components/ui/FloatingWindow.vue'

const props = defineProps({
  category: {
    type: String, // 'layout' | 'typography' | 'appearance' | 'dynamics'
    required: true
  },
  minimalist: {
    type: Boolean,
    default: true
  }
})

const editorStore = useEditorStore()
const styleStore  = useStyleStore()

// ── Master Config ────────────────────────────────────────────────────────────
const CATEGORY_MAP = {
  layout:     { label: 'Layout & Structure', color: '#3b82f6' },
  typography: { label: 'Typography',         color: '#f59e0b' },
  appearance: { label: 'Appearance & Skin', color: '#ec4899' },
  dynamics:   { label: 'Motion & Feedback',  color: '#6366f1' },
}

const config = computed(() => CATEGORY_MAP[props.category])

const panelState = computed(() => editorStore.visualEditor.panels[props.category])

// ── Rule Context ──────────────────────────────────────────────────────────────
const activeRuleUid = computed(() => editorStore.visualEditor.activeRuleUid)

/** 
 * Encontra a regra atual no Logic Tree para exibir metadados no header.
 * Como o store é reativo, mudar o activeRuleUid no pai atualiza todos os painéis.
 */
const rule = computed(() => {
  if (!activeRuleUid.value) return null
  return findCssNode(styleStore.cssLogicTree, activeRuleUid.value)
})

const selectorName = computed(() => rule.value?.label || 'No Rule')

// ── Handlers ──────────────────────────────────────────────────────────────────
function onClose() {
  panelState.value.show = false
}

function onMove({ x, y }) {
  panelState.value.x = x
  panelState.value.y = y
}

function onResize({ width, height }) {
  panelState.value.width  = width
  panelState.value.height = height
}
</script>

<template>
  <FloatingWindow
    :show="panelState.show"
    :theme="'light'"
    :minimalist="minimalist"
    :initialX="panelState.x"
    :initialY="panelState.y"
    :initialWidth="panelState.width"
    :initialHeight="panelState.height"
    :zIndex="panelState.zIndex"
    :closable="true"
    :closeOnClickOutside="false"
    @close="onClose"
    @move="onMove"
    @resize="onResize"
    @focus="editorStore.bringPanelToTop(category)"
  >
    <!-- Custom Header -->
    <template #header-left>
      <div class="flex items-center gap-2 overflow-hidden">
        <!-- Dot color indicator -->
        <span 
          class="w-2.5 h-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: config.color }"
        ></span>
        
        <div class="flex flex-col leading-tight overflow-hidden">
          <span 
            v-if="!minimalist"
            class="text-[10px] font-black uppercase tracking-wider opacity-70"
          >
            {{ config.label }}
          </span>
          <div class="flex items-center gap-1.5 overflow-hidden">
            <span 
              class="font-bold text-gray-800 truncate"
              :class="minimalist ? 'text-[10px]' : 'text-[11px]'"
            >
              {{ selectorName }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- Body Content -->
    <div 
      class="h-full overflow-y-auto bg-gray-50/30"
      :class="minimalist ? 'p-1' : 'p-4'"
    >
       <div v-if="!activeRuleUid" class="flex flex-col items-center justify-center h-full text-gray-400">
         <p :class="minimalist ? 'text-[10px]' : 'text-sm'">Selecione uma regra para editar</p>
       </div>
       <div v-else>
         <!-- Placeholder para os futuros editores de propriedade -->
         <div :class="minimalist ? 'text-[10px]' : 'text-[11px]'" class="text-gray-500 italic">
           Editor de {{ config.label }} para {{ selectorName }}...
         </div>
       </div>
    </div>
  </FloatingWindow>
</template>
