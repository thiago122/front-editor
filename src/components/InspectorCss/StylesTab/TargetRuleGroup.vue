<template>
  <div class="mb-4 space-y-4 px-3 pt-3">
    <div v-for="(rule, i) in group.rules" :key="rule.uid || i">
      <CssRule 
        v-if="!group.isTarget || rule.uid === activeRuleId"
        :ref="(el) => setRuleRef(el, rule)"
        :rule="rule" 
        :editable="isEditable(rule)"
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
import CssRule from './CssRule.vue'

const props = defineProps({
  group: {
    type: Object,
    required: true
  },
  activeRuleId: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
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

const isEditable = (rule) => {
  if (!rule) return false
  if (rule.selector === 'element.style') return true
  return rule.origin !== 'external'
}

const setRuleRef = (el, rule) => {
  emit('set-rule-ref', el, rule)
}
</script>
