<template>
  <div class="pb-32 flex flex-col h-full">
    <AttributeManager 
      :attributes="selectorNav.attributes" 
      :activeRuleId="activeRuleId"
    />

    <SelectorNavigation 
      :attributes="selectorNav.attributes"
      :rules="selectorNav.rules"
      :activeRuleId="activeRuleId"
      :isInlineActive="isInlineActive"
      :activePseudos="activePseudos"
    />

    <div class="flex-1 overflow-y-auto no-scrollbar">
      <TargetRuleGroup 
        v-if="targetGroup"
        :group="targetGroup"
        :activeRuleId="activeRuleId"
      />

      <InheritedRuleGroup 
        v-for="(group, gIdx) in inheritedGroups" 
        :key="group.id || gIdx" 
        :group="group"
        :activeRuleId="activeRuleId"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SelectorNavigation from './SelectorNavigation.vue'
import TargetRuleGroup from './TargetRuleGroup.vue'
import InheritedRuleGroup from './InheritedRuleGroup.vue'
import AttributeManager from '@/components/InspectorCss/StylesTab/AttributeManager.vue'

const props = defineProps({
  groups: { type: Array, required: true },
  activeRuleId: { type: String, default: null },
  selectorNav: { type: Object, required: true },
  activePseudos: { type: Set, default: () => new Set() },
})

const targetGroup = computed(() => props.groups.find(g => g.isTarget))
const inheritedGroups = computed(() => props.groups.filter(g => !g.isTarget))

const isInlineActive = computed(() => {
  if (!props.activeRuleId) return false
  const active = props.groups.flatMap(g => g.rules).find(r => r.uid === props.activeRuleId)
  return !!active && active.selector === 'element.style'
})
</script>
