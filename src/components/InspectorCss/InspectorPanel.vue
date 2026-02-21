<template>
  <div class="h-full flex flex-col bg-white text-[12px] text-gray-900 select-none font-mono">
    <!-- Header with Tab Navigation -->
    <div class="flex border-b border-gray-200 bg-gray-50">
      <button v-for="tab in TABS" :key="tab"
        @click="activeTab = tab"
        :class="['px-4 py-2 text-[11px] font-medium transition-colors',
          activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-800']">
        {{ tab }}
      </button>
    </div>

    <!-- Rule Creator Drawer -->
    <RuleCreator @rule-added="inspector.updateRules()" />

    <!-- Empty State -->
    <InspectorEmptyState v-if="!editorStore.selectedElement" />

    <div v-else class="flex-1 overflow-y-auto font-mono leading-normal bg-white custom-scrollbar">
      <!-- STYLES TAB -->
      <StylesTab 
        v-if="activeTab === 'Styles'"
        :groups="inspector.ruleGroups.value"
        :activeRuleId="styleStore.selectedRuleId"
        :selectorNav="inspector.selectorNav.value"
        :activePseudos="inspector.activePseudos.value"
      />

      <!-- COMPUTED TAB -->
      <ComputedTab v-else-if="activeTab === 'Computed'" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, toRaw, provide, onMounted, onBeforeUnmount } from 'vue'

// Stores
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'

// Components
import StylesTab from './StylesTab/StylesTab.vue'
import ComputedTab from './ComputedTab/ComputedTab.vue'
import RuleCreator from '@/components/InspectorCss/RuleCreator.vue'
import InspectorEmptyState from '@/components/InspectorCss/InspectorEmptyState.vue'

// Controller
import { InspectorController } from '@/composables/InspectorController'

const TABS = ['Styles', 'Computed']
const activeTab = ref('Styles')

const editorStore = useEditorStore()
const styleStore = useStyleStore()

// ── Single instance — owns all state and operations ───────────────────────────
const inspector = new InspectorController(editorStore, styleStore)

// ── Provide to all descendants ────────────────────────────────────────────────
provide('inspector', inspector)

// ── Triggers ─────────────────────────────────────────────────────────────────
watch(() => editorStore.selectedElement, () => inspector.updateRules())
watch(() => styleStore.astMutationKey, () => inspector.updateRules())
watch(() => styleStore.selectedRuleId, () => inspector.updateRules())
watch(() => editorStore.viewport, () => inspector.updateRules())

// ── MutationObserver (inline styles, class/id changes) ───────────────────────
let observer = null

watch(() => editorStore.selectedElement, (newEl, oldEl) => {
  if (observer) observer.disconnect()
  if (!newEl) return

  observer = new MutationObserver(() => inspector.updateRules())
  observer.observe(newEl, {
    attributes: true,
    attributeFilter: ['style', 'class', 'id'],
  })
}, { immediate: true })

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>
