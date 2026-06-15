<template>
  <div class="pseudo-tab-bar">

    <!-- Row 1: Group tabs -->
    <div class="pseudo-tab-bar__groups">
      <button
        class="pseudo-tab-bar__group"
        :class="{ 'is-active': activeGroup === 'default' }"
        @click="selectGroup('default')"
      >
        Default
      </button>
      <button
        class="pseudo-tab-bar__group"
        :class="{ 'is-active': activeGroup === 'state' }"
        @click="selectGroup('state')"
      >
        States
      </button>
      <button
        class="pseudo-tab-bar__group"
        :class="{ 'is-active': activeGroup === 'element' }"
        @click="selectGroup('element')"
      >
        Pseudo-Elements
      </button>

      <!-- Write-target por breakpoint: ON = edições gravam no @media do bp
           ativo; OFF = edita a regra visível no lugar. Mode tornado visível
           aqui (perto das regras) p/ matar o erro-de-modo da toolbar. -->
      <button
        class="pseudo-tab-bar__bp-toggle"
        :class="{ 'is-on': styleStore.routeEditsToBreakpoint, 'is-armed': styleStore.routeEditsToBreakpoint && !isBaseActive }"
        :title="bpToggleTitle"
        @click="styleStore.setRouteEditsToBreakpoint(!styleStore.routeEditsToBreakpoint)"
      >
        <span class="pseudo-tab-bar__bp-dot"></span>
        <span class="pseudo-tab-bar__bp-text">{{ bpToggleLabel }}</span>
      </button>
    </div>

    <!-- Row 2: Item tabs (only when a group with children is active) -->
    <div v-if="activeGroup !== 'default'" class="pseudo-tab-bar__items">
      <button
        v-for="tab in activeGroupTabs"
        :key="tab.id"
        class="pseudo-tab-bar__item"
        :class="[`is-${activeGroup}`, { 'is-active': styleStore.activePseudoTab.id === tab.id }]"
        @click="styleStore.setActivePseudoTab(tab)"
      >
        {{ tab.label }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { useEditorStore } from '@/stores/EditorStore'
import { PSEUDO_STATE_TABS } from '@/editor/css/shared/cssConstants'
import { isBaseBreakpoint, conditionForBreakpoint } from '@/editor/css/shared/breakpointStrategy'

const styleStore = useStyleStore()
const editorStore = useEditorStore()

const activeGroup = ref('default')

// ── Toggle de write-target por breakpoint ───────────────────────────────────

/** Largura do botão de breakpoint ativo (null = modo full/%). */
const activeBpWidth = computed(() =>
  editorStore.previewBreakpoint?.unit === 'px' ? editorStore.previewBreakpoint.width : null
)

/** Breakpoint ativo é a base da estratégia? (edições não roteiam de qualquer forma) */
const isBaseActive = computed(() =>
  isBaseBreakpoint(activeBpWidth.value, styleStore.resolvedDirection, styleStore.projectBreakpoints)
)

/** Condição @media que as edições roteadas vão gerar/usar. */
const targetCondition = computed(() =>
  activeBpWidth.value != null
    ? conditionForBreakpoint(activeBpWidth.value, styleStore.resolvedDirection)
    : null
)

const bpToggleLabel = computed(() => {
  if (!styleStore.routeEditsToBreakpoint) return 'No lugar'
  return isBaseActive.value ? 'Responsivo' : `→ ${targetCondition.value}`
})

const bpToggleTitle = computed(() => {
  if (!styleStore.routeEditsToBreakpoint) {
    return 'Edição no lugar: altera a regra visível. Clique para gravar edições no breakpoint ativo.'
  }
  if (isBaseActive.value) {
    return 'Modo responsivo ON, mas o breakpoint ativo é a base — edições vão pra regra base. Selecione um breakpoint p/ gerar override. Clique para desligar.'
  }
  return `Modo responsivo ON: editar um valor cria/atualiza o override em @media ${targetCondition.value} (regra base intacta). Clique para editar no lugar.`
})

const stateTabs   = PSEUDO_STATE_TABS.filter(t => t.group === 'state')
const elementTabs = PSEUDO_STATE_TABS.filter(t => t.group === 'element')
const defaultTab  = PSEUDO_STATE_TABS.find(t => t.group === 'default')

const activeGroupTabs = computed(() =>
  activeGroup.value === 'state' ? stateTabs : elementTabs
)

function selectGroup(group) {
  activeGroup.value = group
  if (group === 'default') {
    styleStore.setActivePseudoTab(defaultTab)
  } else {
    // Auto-select first item in the group
    const first = group === 'state' ? stateTabs[0] : elementTabs[0]
    if (first) styleStore.setActivePseudoTab(first)
  }
}
</script>

<style scoped>
.pseudo-tab-bar {
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

/* ── Row 1: Groups ────────────────────────────────────────── */
.pseudo-tab-bar__groups {
  display: flex;
  gap: 0;
}

.pseudo-tab-bar__group {
  flex: 1;
  padding: 5px 4px;
  font-size: 10px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.12s;
  letter-spacing: 0.01em;
}

.pseudo-tab-bar__group:hover {
  color: #374151;
  background: #f3f4f6;
}

.pseudo-tab-bar__group.is-active {
  color: #1d4ed8;
  border-bottom-color: #3b82f6;
  background: #eff6ff;
  font-weight: 600;
}

/* ── Toggle write-target por breakpoint ──────────────────── */
.pseudo-tab-bar__bp-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  margin: 0 4px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 600;
  font-family: monospace;
  color: #6b7280;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}

.pseudo-tab-bar__bp-toggle:hover {
  border-color: #9ca3af;
  color: #374151;
}

.pseudo-tab-bar__bp-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #d1d5db;
  transition: background 0.12s;
}

/* ON mas no breakpoint base — sem efeito agora (estado neutro) */
.pseudo-tab-bar__bp-toggle.is-on {
  color: #374151;
  border-color: #cbd5e1;
}
.pseudo-tab-bar__bp-toggle.is-on .pseudo-tab-bar__bp-dot {
  background: #94a3b8;
}

/* ON e armado (bp ativo ≠ base) — edições vão rotear: âmbar, igual ao badge */
.pseudo-tab-bar__bp-toggle.is-armed {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}
.pseudo-tab-bar__bp-toggle.is-armed .pseudo-tab-bar__bp-dot {
  background: #f59e0b;
}

/* ── Row 2: Items ────────────────────────────────────────── */
.pseudo-tab-bar__items {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px 6px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

.pseudo-tab-bar__item {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-family: monospace;
  color: #6b7280;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}

.pseudo-tab-bar__item:hover {
  color: #374151;
  background: #f3f4f6;
  border-color: #d1d5db;
}

/* State items active */
.pseudo-tab-bar__item.is-state.is-active {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
  font-weight: 600;
}

/* Element items active */
.pseudo-tab-bar__item.is-element.is-active {
  color: #7c3aed;
  background: #f5f3ff;
  border-color: #ddd6fe;
  font-weight: 600;
}
</style>
