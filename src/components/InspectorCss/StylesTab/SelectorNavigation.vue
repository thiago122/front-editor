<template>
  <div v-if="selectorNavRules.length > 0" class="border-b border-gray-300 p-2">

    <span class="text-[12px] font-semibold text-gray-600">CSS Rules:</span>
    <div class="flex flex-wrap items-center gap-1 py-2 overflow-x-auto no-scrollbar">
      <button v-for="tab in selectorNavRules" :key="tab.uid"
        @click="styleStore.selectRule(tab.uid)"
        :class="[
          'flex items-center gap-1 px-2 py-0.5 text-[11px] transition-all border shrink-0 font-medium leading-none',
          styleStore.selectedRuleId === tab.uid
            ? 'bg-blue-500 text-white border border-blue-500'
            : 'bg-white border-[#d1d1d1] hover:border-blue-300 hover:text-blue-600'
        ]"
        :title="tab.source"
      >
        <span v-if="tab.isInline" class="italic">element.style</span>
        <span v-else class="truncate max-w-[150px]">{{ tab.label }}</span>
      </button>
    </div>

    <div v-if="styleStore.selectedRuleId && !isInlineActive" class="flex flex-wrap items-center gap-1">
      <button
        v-for="state in PSEUDO_STATES"
        :key="state"
        @click="handlePseudoToggle(state)"
        :class="[
          'px-1.5 py-0 text-[11px] transition-all font-mono border',
          activePseudos.has(state)
            ? 'bg-blue-500 text-white border-blue-500'
            : 'text-gray-400 border-gray-300 hover:text-white hover:border-blue-500 hover:bg-blue-500'
        ]"
      >
        :{{ state }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { createRule } from '@/editor/css/actions/cssRuleActions'

const PSEUDO_STATES = ['hover', 'active', 'focus', 'visited', 'focus-within', 'focus-visible', 'target']

const styleStore = useStyleStore()

const targetGroup = computed(() => styleStore.ruleGroups.find(g => g.isTarget))

// Rules to show as tabs for each rule of the target element
const selectorNavRules = computed(() => {
  if (!targetGroup.value) return []
  const rules = targetGroup.value.rules
  const counts = {}
  rules.forEach(r => { counts[r.selector] = (counts[r.selector] || 0) + 1 })
  return rules.map(rule => ({
    uid: rule.uid,
    selector: rule.selector,
    label: counts[rule.selector] > 1 && rule.selector !== 'element.style'
      ? `${rule.selector} [${rule.sourceName || 'style'}]`
      : rule.selector,
    source: rule.sourceName || 'style',
    origin: rule.origin,
    isInline: rule.selector === 'element.style',
  }))
})

const isInlineActive = computed(() => {
  const id = styleStore.selectedRuleId
  if (!id) return false
  const active = styleStore.ruleGroups.flatMap(g => g.rules).find(r => r.uid === id)
  return !!active && active.selector === 'element.style'
})

const activePseudos = computed(() => {
  const id = styleStore.selectedRuleId
  if (!id || !targetGroup.value) return new Set()
  const active = targetGroup.value.rules.find(r => r.uid === id)
  if (!active) return new Set()
  const base = active.selector.split(':')[0]
  const result = new Set()
  PSEUDO_STATES.forEach(state => {
    if (targetGroup.value.rules.some(r => r.selector === `${base}:${state}`)) {
      result.add(state)
    }
  })
  return result
})

function handlePseudoToggle(state) {
  const id = styleStore.selectedRuleId
  if (!id) return

  let activeRule = null
  for (const group of styleStore.ruleGroups) {
    const found = group.rules.find(r => r.uid === id)
    if (found) { activeRule = found; break }
  }
  if (!activeRule) return

  const base = activeRule.selector.split(':')[0]
  const targetSelector = `${base}:${state}`
  const existing = targetGroup.value?.rules.find(r => r.selector === targetSelector)

  if (existing) {
    styleStore.selectRule(existing.uid)
  } else {
    createRule(targetSelector, activeRule.origin || 'on_page', activeRule.sourceName || 'style')
  }
}
</script>
