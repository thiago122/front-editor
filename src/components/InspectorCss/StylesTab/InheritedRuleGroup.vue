<template>
  <div class="mb-4 last:mb-0">
    <!-- Inheritance Header -->
    <div 
      class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-500 text-[10px] border-y border-gray-100 sticky top-0 z-[1] cursor-pointer"
      @click="toggleGroup">
      <svg class="w-2.5 h-2.5 transition-transform duration-200"
        :class="[isExpanded ? 'rotate-90' : '']" fill="none"
        stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span class="font-bold whitespace-nowrap">Inherited from</span>
      <span class="text-blue-600 font-bold truncate">{{ group.tagName }}</span>
      <span v-if="group.id" class="text-orange-700 shrink-0">#{{ group.id }}</span>
    </div>

    <!-- Rules List -->
    <div v-show="isExpanded" class="space-y-4 px-3 pt-3">
      <div v-for="(rule, i) in group.rules" :key="rule.uid || i">
        <CssRule 
          :ref="(el) => setRuleRef(el, rule)"
          :rule="rule" 
          :editable="false"
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
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
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

const isExpanded = ref(false)

const toggleGroup = () => {
  isExpanded.value = !isExpanded.value
}

// Auto-expand if a rule inside becomes active
watch(() => props.activeRuleId, (newId) => {
  if (newId && props.group.rules.some(r => r.uid === newId)) {
    isExpanded.value = true
  }
})

const setRuleRef = (el, rule) => {
  emit('set-rule-ref', el, rule)
}
</script>
