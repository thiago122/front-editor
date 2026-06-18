<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import FloatingWindow from '@/components/ui/FloatingWindow.vue'
import VisualPanelSections from './VisualPanelSections.vue'
import DesignerSelectorBar from './DesignerSelectorBar.vue'

const props = defineProps({
  minimalist: {
    type: Boolean,
    default: true
  },
  // Docado (Designer mode): preenche a coluna do inspector, sempre visível,
  // sem chrome de janela flutuante. Default false = janela flutuante (Dev).
  docked: {
    type: Boolean,
    default: false
  }
})

const editorStore = useEditorStore()
const styleStore  = useStyleStore()

// ── Parent Context Detection ──────────────────────────────────────────────────
const parentDisplay = computed(() => {
  const el = editorStore.selectedElement
  if (!el || !el.parentElement) return 'block'
  const win = editorStore.getIframeDoc()?.defaultView
  if (!win) return 'block'
  try {
    return win.getComputedStyle(el.parentElement).display
  } catch (e) {
    return 'block'
  }
})

// ── Panel State (janela única) ────────────────────────────────────────────────
const panelState = computed(() => editorStore.visualEditor.panel)

// ── Rule Context ──────────────────────────────────────────────────────────────
const activeRuleUid = computed(() => editorStore.visualEditor.activeRuleUid)

/**
 * Busca a rule do ruleGroups (Inspector), que já tem .declarations formatado.
 * É reativo: atualiza automaticamente quando ruleGroups ou activeRuleUid muda.
 */
const rule = computed(() => {
  if (!activeRuleUid.value) return null
  for (const group of styleStore.ruleGroups) {
    const found = group.rules?.find(r => r.uid === activeRuleUid.value)
    if (found) return found
  }
  return null
})
const ruleGetter = () => rule.value

const selectorName = computed(() => rule.value?.selector || 'No Rule')

// ── Active breakpoint label (transparência do Designer) ───────────────────────
const breakpointLabel = computed(() => {
  const bp = editorStore.previewBreakpoint
  if (!bp || bp.unit !== 'px') return 'Base'
  return `${bp.width}px`
})

// ── Handlers (janela flutuante) ───────────────────────────────────────────────
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
  <!-- ── Designer mode: docado na coluna do inspector ──────────────────────── -->
  <div v-if="docked" class="h-full flex flex-col bg-white">
    <!-- Header docado: chooser de seletores (chips) + breakpoint ativo -->
    <div class="flex items-start gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
      <DesignerSelectorBar :active-selector="selectorName" class="flex-1 min-w-0" />
      <span
        class="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
        :class="breakpointLabel === 'Base'
          ? 'bg-gray-200 text-gray-600'
          : 'bg-blue-100 text-blue-700'"
        :title="breakpointLabel === 'Base'
          ? 'Editando o estilo base (todos os tamanhos)'
          : `Editando só neste breakpoint (${breakpointLabel})`"
      >{{ breakpointLabel }}</span>
    </div>

    <div class="flex-1 overflow-y-auto bg-gray-50/30 p-1">
      <div v-if="!activeRuleUid || !rule" class="flex flex-col items-center justify-center h-full text-gray-400 px-4 text-center">
        <p class="text-[11px]">Selecione um elemento no canvas para começar a editar.</p>
      </div>
      <VisualPanelSections
        v-else
        :rule-getter="ruleGetter"
        :active-rule-uid="activeRuleUid"
        :parent-display="parentDisplay"
        :minimalist="minimalist"
      />
    </div>
  </div>

  <!-- ── Dev mode: janela flutuante (comportamento atual) ──────────────────── -->
  <FloatingWindow
    v-else
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
    @focus="editorStore.bringPanelToTop()"
  >
    <!-- Custom Header -->
    <template #header-left>
      <div class="flex items-center gap-2 overflow-hidden">
        <!-- Indicator -->
        <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-500"></span>

        <div class="flex flex-col leading-tight overflow-hidden">
          <span
            v-if="!minimalist"
            class="text-[10px] font-black uppercase tracking-wider opacity-70"
          >
            Edição Visual
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
      <div v-if="!activeRuleUid || !rule" class="flex flex-col items-center justify-center h-full text-gray-400">
        <p :class="minimalist ? 'text-[10px]' : 'text-sm'">Selecione uma regra para editar</p>
      </div>

      <VisualPanelSections
        v-else
        :rule-getter="ruleGetter"
        :active-rule-uid="activeRuleUid"
        :parent-display="parentDisplay"
        :minimalist="minimalist"
      />
    </div>
  </FloatingWindow>
</template>
