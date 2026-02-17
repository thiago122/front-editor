<template>
  <div class="pb-32 flex flex-col h-full">
    
    <!-- Target Rule Navigation (Sticky Top) -->
    <SelectorNavigation 
      :attributes="selectorNav.attributes"
      :rules="selectorNav.rules"
      :activeRuleId="activeRuleId"
      :isInlineActive="isInlineActive"
      :hasPseudo="hasPseudo"
      @remove-attribute="(attr) => $emit('remove-attribute', attr)"
      @toggle-pseudo="(state) => $emit('toggle-pseudo', state)"
      @create-rule="(selector) => $emit('create-rule', selector)"
    />

    <div class="flex-1 overflow-y-auto no-scrollbar">
      
      <!-- Target Group -->
      <TargetRuleGroup 
        v-if="targetGroup"
        :group="targetGroup"
        :activeRuleId="activeRuleId"
        
        @set-rule-ref="(...args) => $emit('set-rule-ref', ...args)"
        @update-at-rule="(...args) => $emit('update-at-rule', ...args)"
        @update-selector="(...args) => $emit('update-selector', ...args)"
        @toggle-declaration="(...args) => $emit('toggle-declaration', ...args)"
        @update-property="(...args) => $emit('update-property', ...args)"
        @delete-declaration="(...args) => $emit('delete-declaration', ...args)"
        @focus-value="(...args) => $emit('focus-value', ...args)"
        @add-property="(...args) => $emit('add-property', ...args)"
        @wrap-at-rule="(...args) => $emit('wrap-at-rule', ...args)"
      />

      <!-- Inherited Groups -->
      <InheritedRuleGroup 
        v-for="(group, gIdx) in inheritedGroups" 
        :key="group.id || gIdx" 
        :group="group"
        :activeRuleId="activeRuleId"
        
        @set-rule-ref="(...args) => $emit('set-rule-ref', ...args)"
        @update-at-rule="(...args) => $emit('update-at-rule', ...args)"
        @update-selector="(...args) => $emit('update-selector', ...args)"
        @toggle-declaration="(...args) => $emit('toggle-declaration', ...args)"
        @update-property="(...args) => $emit('update-property', ...args)"
        @delete-declaration="(...args) => $emit('delete-declaration', ...args)"
        @focus-value="(...args) => $emit('focus-value', ...args)"
        @add-property="(...args) => $emit('add-property', ...args)"
        @wrap-at-rule="(...args) => $emit('wrap-at-rule', ...args)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SelectorNavigation from './SelectorNavigation.vue'
import TargetRuleGroup from './TargetRuleGroup.vue'
import InheritedRuleGroup from './InheritedRuleGroup.vue'

const props = defineProps({
  groups: {
    type: Array,
    required: true
  },
  activeRuleId: {
    type: String,
    default: null
  },
  selectorNav: {
    type: Object,
    required: true
  },
  hasPseudo: {
    type: Function,
    required: true
  }
})

const targetGroup = computed(() => props.groups.find(g => g.isTarget))
const inheritedGroups = computed(() => props.groups.filter(g => !g.isTarget))

defineEmits([
  'remove-attribute', 
  'toggle-pseudo', 
  'create-rule',
  'set-rule-ref',
  'update-at-rule', 
  'update-selector', 
  'toggle-declaration', 
  'update-property', 
  'delete-declaration', 
  'focus-value', 
  'add-property', 
  'wrap-at-rule'
])

const isInlineActive = computed(() => {
  if (!props.activeRuleId) return false
  const activeRule = props.groups.flatMap(g => g.rules).find(r => r.uid === props.activeRuleId)
  return activeRule && activeRule.selector === 'element.style'
})
</script>
