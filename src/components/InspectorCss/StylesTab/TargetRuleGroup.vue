<template>
  <div class="p-2 border-b border-gray-300">
    <div v-for="(rule, i) in group.rules" :key="rule.uid || i" >
      <CssRule
        class="border-b border-[#b1b1b1] pb-[13px] mb-[6px]"
        :rule="rule"
        :editable="isEditable(rule)"
      />
    </div>
  </div>
</template>

<script setup>
import CssRule from './CssRule.vue'

defineProps({
  group: { type: Object, required: true },
})


function isEditable(rule) {
  if (!rule) return false
  if (rule.selector === 'element.style') return true
  return rule.origin !== 'external'
}
</script>
