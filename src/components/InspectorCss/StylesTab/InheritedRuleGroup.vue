<template>
  <div class="mb-4 last:mb-0">
    <div 
      class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-500 text-[10px] border-y border-gray-100 sticky top-0 z-[1] cursor-pointer"
      @click="isExpanded = !isExpanded">
      <svg class="w-2.5 h-2.5 transition-transform duration-200"
        :class="[isExpanded ? 'rotate-90' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span class="font-bold whitespace-nowrap">Inherited from</span>
      <span class="text-blue-600 font-bold truncate">{{ group.tagName }}</span>
      <span v-if="group.id" class="text-orange-700 shrink-0">#{{ group.id }}</span>
    </div>

    <div v-show="isExpanded" class="space-y-4 px-3 pt-3">
      <div v-for="(rule, i) in group.rules" :key="rule.uid || i">
        <CssRule 
          :ref="(el) => inspector.setRuleRef(el, rule)"
          :rule="rule" 
          :editable="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, inject } from 'vue'
import CssRule from './CssRule.vue'

const props = defineProps({
  group: { type: Object, required: true },
  activeRuleId: { type: String, default: null },
})

const inspector = inject('inspector')
const isExpanded = ref(false)

watch(() => props.activeRuleId, (newId) => {
  if (newId && props.group.rules.some(r => r.uid === newId)) {
    isExpanded.value = true
  }
})
</script>
