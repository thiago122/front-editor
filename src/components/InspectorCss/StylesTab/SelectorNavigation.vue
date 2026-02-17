<template>
  <div v-if="attributes.length > 0 || rules.length > 0" class="shrink-0 bg-[#f8f9fa] border-b border-[#d1d1d1] z-20">
    
    <!-- Direct Attributes (Removable + Selectable) -->
    <div v-if="attributes.length > 0" class="flex flex-wrap items-center gap-1 px-3 pt-2 pb-1 border-b border-gray-100/50">
       <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span v-for="attr in attributes" :key="attr.label" 
            @click="selectRule(attr)"
            :class="[
              'group/attr flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-bold transition-all',
              attr.isExactMatch 
                ? 'bg-white border-gray-200 text-gray-600 cursor-pointer hover:border-blue-300 hover:bg-blue-50' 
                : attr.isUsed 
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-80'
                  : 'bg-red-50 !border-red-200 text-red-400 cursor-help', // Unused (red)
              activeRuleId === attr.uid ? '!border-blue-500 !bg-blue-50' : ''
            ]"
            :title="attr.isExactMatch ? 'Edit Rule' : attr.isUsed ? 'Used in compound rules (see below)' : 'No rule found (Click to create)'">
            {{ attr.uid }}
            <span :class="attr.type === 'id' ? 'text-orange-700' : 'text-blue-700'">{{ attr.label }}</span>
            <button @click.stop="$emit('remove-attribute', attr)" 
              class="opacity-40 group-hover/attr:opacity-100 hover:text-red-600 transition-all font-sans text-[8px]"
              title="Remove from element">✕</button>
          </span>
       </div>
    </div>

    <!-- Matched Rules (Selectable) -->
    <div class="flex flex-wrap items-center gap-1 px-3 py-2 overflow-x-auto no-scrollbar">
      <button v-for="tab in rules" :key="tab.uid"
        @click="selectRule(tab.uid)"
        :class="[
          'group/tab flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all border shrink-0 font-medium',
          activeRuleId === tab.uid 
            ? 'bg-blue-600 text-white border-blue-700 shadow-sm' 
            : 'bg-white text-gray-500 border-[#d1d1d1] hover:border-blue-300 hover:text-blue-600'
        ]"
        :title="tab.source"
      >
        <span v-if="tab.isInline" class="italic">element.style</span>
        <span v-else class="truncate max-w-[150px]">{{ tab.label }} {{ tab.uid }}</span>
      </button>
    </div>
  
    <!-- Pseudo-classes Control -->
    <div v-if="activeRuleId && !isInlineActive" 
      class="flex flex-wrap items-center gap-1 px-3 pb-2">
      <button v-for="state in ['hover', 'active', 'focus', 'visited', 'focus-within', 'focus-visible', 'target']" 
        :key="state"
        @click="$emit('toggle-pseudo', state)"
        :class="[
          'px-1.5 py-0 rounded text-[9px] border transition-all font-mono',
          hasPseudo(state) ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-black/5'
        ]"
      >
        :{{ state }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useStyleStore } from '@/stores/StyleStore'

const styleStore = useStyleStore()

const props = defineProps({
  attributes: {
    type: Array,
    default: () => []
  },
  rules: {
    type: Array,
    default: () => []
  },
  activeRuleId: {
    type: String,
    default: null
  },
  isInlineActive: {
    type: Boolean,
    default: false
  },
  hasPseudo: {
    type: Function,
    default: () => false
  }
})

const emit = defineEmits(['remove-attribute', 'toggle-pseudo', 'create-rule'])

// Direct store access but with confirmation for creation
function selectRule(attr) {
  if (attr.uid) {
    styleStore.setActiveRule(attr.uid)
  } else if (!attr.isUsed) {
    // No rule found (Red badge)
    // Suggest creating a new rule for this class/id
    if (confirm(`Create new rule for "${attr.label}"?`)) {
      // Emit event for parent to handle creation
      emit('create-rule', attr.label)
    }
  }
}
</script>
