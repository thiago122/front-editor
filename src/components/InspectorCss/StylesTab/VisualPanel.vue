<script setup>
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import FloatingWindow from '@/components/ui/FloatingWindow.vue'
import TypographyEditor from './visual/TypographyEditor.vue'
import LayoutEditor from './visual/LayoutEditor.vue'
import AdvancedLayoutEditor from './visual/AdvancedLayoutEditor.vue'
import AppearanceEditor from './visual/AppearanceEditor.vue'
import SizingEditor from './visual/SizingEditor.vue'
import SpacingEditor from './visual/SpacingEditor.vue'
import PositioningEditor from './visual/PositioningEditor.vue'
import VisualSection from '@/components/ui/VisualSection.vue'

defineProps({
  minimalist: {
    type: Boolean,
    default: true
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

const selectorName = computed(() => rule.value?.selector || 'No Rule')

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

// ── Sub-section Visibility ───────────────────────────────────────────────────
const showDisplay     = ref(true)
const showSizing      = ref(true)
const showSpacing     = ref(true)
const showPositioning = ref(true)
const showAdvanced    = ref(true)
const showTypography  = ref(true)
const showAppearance  = ref(true)

const hasValueDisplay     = ref(false)
const hasValueSizing      = ref(false)
const hasValueSpacing     = ref(false)
const hasValuePositioning = ref(false)
const hasValueAdvanced    = ref(false)
const hasValueTypography  = ref(false)
const hasValueAppearance  = ref(false)
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

      <div v-else class="flex flex-col">
        <VisualSection title="Layout" v-model:show="showDisplay" :hasAnyValue="hasValueDisplay">
          <LayoutEditor
            @has-value="v => hasValueDisplay = v"
            :key="activeRuleUid + '_layout'"
            :rule-getter="() => rule"
            :parent-display="parentDisplay"
          />
        </VisualSection>

        <VisualSection title="Sizing" v-model:show="showSizing" :hasAnyValue="hasValueSizing">
          <SizingEditor
            @has-value="v => hasValueSizing = v"
            :key="activeRuleUid + '_sizing'"
            :rule-getter="() => rule"
          />
        </VisualSection>

        <VisualSection title="Spacing" v-model:show="showSpacing" :hasAnyValue="hasValueSpacing">
          <SpacingEditor
            @has-value="v => hasValueSpacing = v"
            :key="activeRuleUid + '_spacing'"
            :rule-getter="() => rule"
          />
        </VisualSection>

        <VisualSection title="Positioning" v-model:show="showPositioning" :hasAnyValue="hasValuePositioning">
          <PositioningEditor
            @has-value="v => hasValuePositioning = v"
            :key="activeRuleUid + '_pos'"
            :rule-getter="() => rule"
          />
        </VisualSection>

        <VisualSection title="Advanced" v-model:show="showAdvanced" :hasAnyValue="hasValueAdvanced">
          <AdvancedLayoutEditor
            @has-value="v => hasValueAdvanced = v"
            :key="activeRuleUid + '_advanced'"
            :rule-getter="() => rule"
          />
        </VisualSection>

        <VisualSection title="Typography" v-model:show="showTypography" :hasAnyValue="hasValueTypography">
          <TypographyEditor
            @has-value="v => hasValueTypography = v"
            :key="activeRuleUid + '_typography'"
            :rule-getter="() => rule"
          />
        </VisualSection>

        <VisualSection title="Appearance" v-model:show="showAppearance" :hasAnyValue="hasValueAppearance">
          <AppearanceEditor
            @has-value="v => hasValueAppearance = v"
            :key="activeRuleUid + '_appearance'"
            :rule-getter="() => rule"
          />
        </VisualSection>
      </div>
    </div>
  </FloatingWindow>
</template>
