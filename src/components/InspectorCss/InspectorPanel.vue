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
    <RuleCreator />

    <!-- Empty State -->
    <InspectorEmptyState v-if="!editorStore.selectedElement" />

    <div v-else class="flex-1 overflow-y-auto font-mono leading-normal bg-white custom-scrollbar">

      <!-- STYLES TAB -->
      <template v-if="activeTab === 'Styles'">
        <AttributeManager />

        <SelectorNavigation />

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
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'

import ComputedTab from './ComputedTab/ComputedTab.vue'
import RuleCreator from '@/components/InspectorCss/RuleCreator.vue'
import InspectorEmptyState from '@/components/InspectorCss/InspectorEmptyState.vue'
import AttributeManager from '@/components/InspectorCss/StylesTab/AttributeManager.vue'
import SelectorNavigation from '@/components/InspectorCss/StylesTab/SelectorNavigation.vue'
import TargetRuleGroup from '@/components/InspectorCss/StylesTab/TargetRuleGroup.vue'
import InheritedRuleGroup from '@/components/InspectorCss/StylesTab/InheritedRuleGroup.vue'

const TABS = ['Styles', 'Computed']
const activeTab = ref('Styles')

const editorStore = useEditorStore()
const styleStore = useStyleStore()

// ── Rule groups ───────────────────────────────────────────────────────────────

const targetGroup = computed(() => styleStore.ruleGroups.find(g => g.isTarget))
const inheritedGroups = computed(() => styleStore.ruleGroups.filter(g => !g.isTarget))


// ── Refresh ───────────────────────────────────────────────────────────────────

function refresh() {
  styleStore.updateInspectorRules(
    editorStore.selectedElement,
    editorStore.viewport,
    styleStore.selectedRuleId,
  )
}

// Note: selectedRuleId is intentionally NOT watched here.
// updateInspectorRules calls selectRule() internally — watching it would loop.
watch(() => editorStore.selectedElement, refresh)
watch(() => styleStore.astMutationKey, refresh)
watch(() => editorStore.viewport, refresh)

// ── MutationObserver ──────────────────────────────────────────────────────────
// Watches class/id/style on the selected element directly in the DOM.
// Needed because AttributeManager modifies these attributes via manipulation.setAttribute(),
// which bypasses the StyleStore and never increments astMutationKey.
let observer = null

watch(() => editorStore.selectedElement, (newEl) => {
  if (observer) observer.disconnect()
  if (!newEl) return
  observer = new MutationObserver(refresh)
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
</style>
