<template>
  <div v-if="rules.length > 0" class="border-b border-gray-300 p-2">
    
    <span class="text-red-500 text-[12px]">CSS Rules:</span>
    <div class="flex flex-wrap items-center gap-1 py-2 overflow-x-auto no-scrollbar">
      <button v-for="tab in rules" :key="tab.uid"
        @click="selectRule(tab.uid)"
        :class="[
          'flex items-center gap-1 px-2 py-0.5 text-[11px] transition-all border shrink-0 font-medium leading-none',
          activeRuleId === tab.uid 
            ? 'bg-blue-500 text-white border border-blue-500' 
            : 'bg-white border-[#d1d1d1] hover:border-blue-300 hover:text-blue-600'
        ]"
        :title="tab.source"
      >
        <span v-if="tab.isInline" class="italic">element.style</span>
        <span v-else class="truncate max-w-[150px]">{{ tab.label }}</span>
      </button>
    </div>
  
    <div v-if="activeRuleId && !isInlineActive" class="flex flex-wrap items-center gap-1">
      <button 
        v-for="state in PSEUDO_STATES" 
        :key="state"
        @click="inspector.handlePseudoToggle(state)"
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
import { inject } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'

const styleStore = useStyleStore()
const inspector = inject('inspector')

const PSEUDO_STATES = ['hover', 'active', 'focus', 'visited', 'focus-within', 'focus-visible', 'target']

defineProps({
  attributes: { type: Array, default: () => [] },
  rules: { type: Array, default: () => [] },
  activeRuleId: { type: String, default: null },
  isInlineActive: { type: Boolean, default: false },
  activePseudos: { type: Set, default: () => new Set() },
})

function selectRule(uid) {
  if (uid) styleStore.selectRule(uid)
}
</script>
