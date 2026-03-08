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
import { PSEUDO_STATE_TABS } from '@/editor/css/shared/cssConstants'

const styleStore = useStyleStore()

const activeGroup = ref('default')

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
