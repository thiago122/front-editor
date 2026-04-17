<template>
  <div class="h-full flex flex-col bg-white text-[12px] text-gray-900 select-none font-mono">

    <!-- Header with Tab Navigation -->
    <div class="flex items-center border-b border-gray-200 bg-gray-50 min-w-0 pr-1">
      <!-- Botão toggle CSS Explorer: primeiro item agora -->
      <button
        class="shrink-0 w-8 h-8 flex items-center justify-center transition-colors border-r border-gray-200"
        :class="editorStore.showCssExplorer ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'"
        title="CSS Explorer (Alt+E)"
        @click="editorStore.showCssExplorer = !editorStore.showCssExplorer"
      >
        <IconExplorer class="w-4 h-4" />
      </button>

      <!-- Abas: overflow-hidden para não vazar quando a coluna for estreita -->
      <div class="flex overflow-hidden min-w-0">
        <button v-for="tab in TABS" :key="tab"
          @click="activeTab = tab"
          :class="['px-3 py-2 text-[11px] font-medium transition-colors shrink-0',
            activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-800 text-top-tab']">
          {{ tab }}
        </button>
      </div>
    </div>


    <!-- Banner: confirmar rename de .class / #id no elemento -->
    <Transition name="rename-banner">
      <div v-if="editorStore.selectorRenameConfirm.show" class="rename-banner">
        <span class="rename-banner__text">
          Renomear
          <code>{{ editorStore.selectorRenameConfirm.type === 'class' ? '.' : '#' }}{{ editorStore.selectorRenameConfirm.oldName }}</code>
          para
          <code>{{ editorStore.selectorRenameConfirm.type === 'class' ? '.' : '#' }}{{ editorStore.selectorRenameConfirm.newName }}</code>
          no elemento?
        </span>
        <div class="rename-banner__actions">
          <button class="rename-banner__btn rename-banner__btn--yes" @click="applyAttrRename">Sim</button>
          <button class="rename-banner__btn rename-banner__btn--no" @click="editorStore.selectorRenameConfirm.show = false">Não</button>
        </div>
      </div>
    </Transition>

    <!-- HEAD TAB (sempre acessível, independente de elemento selecionado) -->
    <template v-if="activeTab === 'Head'">
      <HeadManager class="flex-1 overflow-hidden" />
    </template>

    <!-- STYLES / COMPUTED TABS (só para elementos do body) -->
    <template v-else>
      <!-- Empty State -->
      <InspectorEmptyState v-if="!editorStore.selectedElement && !(styleStore.inspectorSource === 'explorer' && styleStore.ruleGroups.length)" />

      <div v-else class="flex-1 overflow-y-auto font-mono leading-normal bg-white custom-scrollbar">

        <!-- STYLES TAB -->
        <template v-if="activeTab === 'Styles'">
          <!-- Rule Creator Drawer -->
          <RuleCreator ref="ruleCreatorRef" />

          <PseudoStateTabBar />

          <div class="overflow-y-auto no-scrollbar">
            <TargetRuleGroup v-if="targetGroup" :group="targetGroup" />

            <InheritedRuleGroup
              v-for="(group, gIdx) in inheritedGroups"
              :key="group.id || gIdx"
              :group="group"
            />
          </div>
        </template>

        <!-- COMPUTED TAB -->
        <ComputedTab v-else-if="activeTab === 'Computed'" />
      </div>
    </template>

    <!-- ── QUICK ATTRIBUTES ACCORDION (Bottom) ────────────────────────── -->
    <div 
      v-if="editorStore.selectedElement" 
      class="border-t-2 border-blue-500 bg-white flex flex-col shrink-0 min-h-0 relative"
      style="box-shadow: 0 -4px 12px rgba(0,0,0,0.08);"
    >
      <!-- Header / Summary Bar -->
      <div 
        @click="editorStore.quickAttributesOpen = !editorStore.quickAttributesOpen"
        class="px-3 py-2 flex items-center justify-between cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors group border-b border-gray-200"
        title="Gerenciar atributos (Alt+C para adicionar classe)"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span :class="editorStore.quickAttributesOpen ? 'rotate-90' : ''" class="text-[8px] text-slate-500 transition-transform">▶</span>
          <span class="text-blue-600 font-bold">&lt;{{ editorStore.selectedElement.tagName.toLowerCase() }}&gt;</span>
          
          <!-- Summary chips (only when closed) -->
          <div v-if="!editorStore.quickAttributesOpen" class="flex gap-1 overflow-hidden">
            <template v-for="cls in summaryClasses" :key="cls">
              <span class="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate">.{{ cls }}</span>
            </template>
            <span v-if="editorStore.selectedElement.id" class="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 truncate">#{{ editorStore.selectedElement.id }}</span>
          </div>
        </div>
        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wide group-hover:text-blue-600 transition-colors">Atributos</span>
      </div>

      <!-- Expandable Content -->
      <div v-if="editorStore.quickAttributesOpen" class="flex-1 overflow-hidden h-[200px] border-t border-gray-100 bg-white">
        <AttributeManager ref="quickAttributesRef" @close="editorStore.quickAttributesOpen = false" />
      </div>
    </div>

    <!-- ── VISUAL EDITING PANELS (L, T, A, D) ────────────────────────── -->
    <VisualPanel category="layout" />
    <VisualPanel category="typography" />
    <VisualPanel category="appearance" />
    <VisualPanel category="dynamics" />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { editorHooks } from '@/editor/HookManager'

import ComputedTab from '@/components/InspectorCss/ComputedTab/ComputedTab.vue'
import RuleCreator from '@/components/InspectorCss/RuleCreator.vue'
import InspectorEmptyState from '@/components/InspectorCss/InspectorEmptyState.vue'
import AttributeManager from '@/components/InspectorCss/StylesTab/AttributeManager.vue'
import PseudoStateTabBar from '@/components/InspectorCss/StylesTab/PseudoStateTabBar.vue'
import TargetRuleGroup from '@/components/InspectorCss/StylesTab/TargetRuleGroup.vue'
import InheritedRuleGroup from '@/components/InspectorCss/StylesTab/InheritedRuleGroup.vue'
import HeadManager from '@/components/InspectorCss/HeadManager.vue'
import IconExplorer from '@/components/icons/IconExplorer.vue'
import VisualPanel from '@/components/InspectorCss/StylesTab/VisualPanel.vue'

const TABS = ['Styles', 'Computed', 'Head']
const activeTab = ref('Styles')

const editorStore = useEditorStore()
const styleStore = useStyleStore()

// ── Quick Selector (Ctrl+K e auto-open após inserção) ───────────────────────────

const ruleCreatorRef = ref(null)
const quickAttributesRef = ref(null)

/**
 * Muda para a aba Styles e abre o RuleCreator com foco no input de seletor.
 * Chamado pelo Ctrl+K e automaticamente após inserir tag.
 */
function openRuleCreator() {
  activeTab.value = 'Styles'
  nextTick(() => ruleCreatorRef.value?.open())
}

/**
 * Abre o acordeão de atributos (Quick Attributes) e foca no campo de adicionar classe.
 */
function openQuickClass() {
  editorStore.quickAttributesOpen = true
  nextTick(() => {
    quickAttributesRef.value?.startAddClass()
  })
}

// Alt+K global → abre Quick Selector
// Alt+C global → abre Quick Class (Atributos)
function onKeydown(e) {
  if (e.altKey && e.key === 'k') {
    e.preventDefault()
    openRuleCreator()
  } else if (e.altKey && e.key === 'c') {
    e.preventDefault()
    openQuickClass()
  } else if (e.key === 'Escape') {
    if (editorStore.quickAttributesOpen) {
      editorStore.quickAttributesOpen = false
    }
  }
}

onMounted(()      => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// Escuta Alt+K também no iframe (foco vai para o iframe após clicar em elemento)
let _iframeWin = null
function attachIframeKeydown(iframe) {
  if (_iframeWin) _iframeWin.removeEventListener('keydown', onKeydown)
  _iframeWin = iframe?.contentWindow ?? null
  _iframeWin?.addEventListener('keydown', onKeydown)
}

watch(() => editorStore.iframe, (iframe) => {
  if (!iframe) return
  attachIframeKeydown(iframe)
  iframe.addEventListener('load', () => attachIframeKeydown(iframe))
}, { immediate: true })

onBeforeUnmount(() => {
  if (_iframeWin) _iframeWin.removeEventListener('keydown', onKeydown)
})

// Auto-open após qualquer inserção de nó (tag inserida pelo usuário)
editorHooks.on('node:afterInsert', () => {
  // Se o usuário está digitando no CodeEditor, não roubamos o foco!
  if (document.activeElement?.closest('.cm-editor')) return

  // nextTick duplo: 1º para o AST/DOM atualizar, 2º para o Vue renderizar o elemento
  nextTick(() => nextTick(() => openRuleCreator()))
})

/** Aplica o rename do atributo de .class ou #id no elemento selecionado. */
function applyAttrRename() {
  const rc    = editorStore.selectorRenameConfirm
  rc.show     = false
  const { type, oldName, newName } = rc
  const nodeId = editorStore.selectedNodeId
  if (!nodeId || !editorStore.manipulation) return
  if (type === 'class') {
    const el     = editorStore.selectedElement
    const merged = (el?.className ?? '')
      .split(/\s+/).filter(Boolean)
      .map(c => c === oldName ? newName : c)
      .join(' ')
    editorStore.manipulation.setAttribute(nodeId, 'class', merged)
  } else {
    editorStore.manipulation.setAttribute(nodeId, 'id', newName)
  }
}

// ── Rule groups ───────────────────────────────────────────────────────────────

const targetGroup = computed(() => styleStore.ruleGroups.find(g => g.isTarget))
const inheritedGroups = computed(() => styleStore.ruleGroups.filter(g => !g.isTarget))

const summaryClasses = computed(() => {
  mutationTick.value // dependência de reatividade para o MutationObserver
  if (!editorStore.selectedElement) return []
  return (editorStore.selectedElement.className || '').split(/\s+/).filter(Boolean).slice(0, 3)
})


// ── Refresh ───────────────────────────────────────────────────────────────────

function refresh() {
  console.log('[InspectorPanel] refresh() rodando. inspectorSource:', styleStore.inspectorSource, 'selectedRuleId:', styleStore.selectedRuleId)
  styleStore.updateInspectorRules(
    editorStore.selectedElement,
    editorStore.viewport,
    styleStore.selectedRuleId,
  )
}

watch(() => editorStore.selectedElement, refresh)
watch(() => styleStore.astMutationKey, refresh)
watch(() => editorStore.viewport, refresh)
watch(() => styleStore.activePseudoTab, refresh)
watch(() => styleStore.inspectorSource, refresh)
watch(() => styleStore.selectedRuleId, refresh)

// ── MutationObserver ──────────────────────────────────────────────────────────
// Watches class/id/style on the selected element directly in the DOM.
// Needed because AttributeManager modifies these attributes via manipulation.setAttribute(),
// which bypasses the StyleStore and never increments astMutationKey.
const mutationTick = ref(0)
let observer = null

watch(() => editorStore.selectedElement, (newEl) => {
  if (observer) observer.disconnect()
  if (!newEl) return
  observer = new MutationObserver(() => {
    mutationTick.value++
    refresh()
  })
  observer.observe(newEl, {
    attributes: true,
    attributeFilter: ['style', 'class', 'id'],
  })
}, { immediate: true })

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #6d1414; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ccc; }

/* Banner de rename de seletor CSS */
.rename-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 5px 8px;
  background: #fffbeb;
  border-bottom: 1px solid #fcd34d;
  font-size: 11px;
  color: #92400e;
  flex-shrink: 0;
}
.rename-banner__text { flex: 1; line-height: 1.4; }
.rename-banner__text code {
  font-family: monospace;
  background: #fef3c7;
  padding: 0 3px;
  border-radius: 3px;
}
.rename-banner__actions { display: flex; gap: 4px; flex-shrink: 0; }
.rename-banner__btn {
  padding: 2px 8px; border-radius: 4px; border: none;
  cursor: pointer; font-size: 11px; font-weight: 600;
}
.rename-banner__btn--yes { background: #d97706; color: white; }
.rename-banner__btn--yes:hover { background: #b45309; }
.rename-banner__btn--no  { background: #f3f4f6; color: #374151; }
.rename-banner__btn--no:hover  { background: #e5e7eb; }
.rename-banner-enter-active, .rename-banner-leave-active { transition: opacity .2s; }
.rename-banner-enter-from, .rename-banner-leave-to { opacity: 0; }
</style>
