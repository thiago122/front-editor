<template>
  <div class="p-2 border-b border-gray-300">
    <div v-for="(rule, i) in group.rules" :key="rule.uid || i">
      <CssRule 
        :ref="(el) => inspector.setRuleRef(el, rule)"
        :rule="rule" 
        :editable="isEditable(rule)"
      />
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import CssRule from './CssRule.vue'

defineProps({
  group: { type: Object, required: true },
  activeRuleId: { type: String, default: null },
})

const inspector = inject('inspector')

const isEditable = (rule) => {
  if (!rule) return false
  if (rule.selector === 'element.style') return true
  return rule.origin !== 'external'
}
</script>
