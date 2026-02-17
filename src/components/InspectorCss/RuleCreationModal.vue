<template>
  <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-[400px] overflow-hidden border border-gray-200">
      <div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-700">Create New CSS Rule</h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <!-- Reuse Existing RuleCreator with specialized style overrides if needed -->
      <!-- We pass initialSelector and listen for success -->
      <RuleCreator 
        :initialSelector="selector" 
        class="!border-none !shadow-none !bg-white"
        @rule-added="onRuleAdded"
      />
      
      <div class="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 text-center">
        Select a source file to add the rule to.
      </div>
    </div>
  </div>
</template>

<script setup>
import RuleCreator from './RuleCreator.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selector: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'rule-added'])

const onRuleAdded = (rule) => {
  emit('rule-added', rule)
  emit('close')
}
</script>
