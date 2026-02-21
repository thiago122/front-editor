<template>
  <div class="flex items-start group/item relative">
    
    <div class="flex-1 flex flex-wrap items-center  gap-x-1 transition-all"
      :class="{ 'opacity-30 line-through grayscale': decl.overridden || decl.disabled }">
      
      <input 
        v-if="editable" 
        type="checkbox" 
        :checked="!decl.overridden && !decl.disabled"
        @change.stop="$emit('toggle', decl)"
        class="w-3 h-3 cursor-pointer accent-blue-600 rounded" 
      />
      <span>
        <span 
          class="text-rose-500 prop-name outline-none" 
          :class="[editable ? 'cursor-text hover:bg-gray-50' : '']" 
          :contenteditable="editable"
          @blur="(e) => $emit('update', decl, 'prop', e.target.innerText)"
          @keydown.enter.prevent="(e) => $emit('focus-value', decl, e)"
        >{{ decl.prop }}</span>
        
        <span>:</span>
      </span>

      
      <div class="flex items-center gap-1 min-w-0">
        <span v-if="isColor(decl.value)"
          class="shrink-0 w-3 h-3 rounded shadow-sm border border-black/10"
          :style="{ backgroundColor: decl.value }"></span>
        
        <span 
          class=" prop-value outline-none  break-all transition-colors"
          :class="[editable ? 'cursor-text hover:bg-blue-50' : '']"
          :contenteditable="editable"
          @blur="(e) => $emit('update', decl, 'value', e.target.innerText)"
          @keydown.enter.prevent="(e) => e.target.blur()"
        >{{ decl.value }}</span>
      </div>
      
      <span v-if="decl.important" class="text-amber-500 text-[8px] font-black uppercase tracking-tight ml-1">!important</span>
      <span class="text-gray-300">;</span>
    </div>

    <button v-if="editable" @click.stop="$emit('delete', decl)"
      class="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  </div>
</template>

<script setup>
import { isColorValue } from '@/composables/cssUtils'

const props = defineProps({
  decl: {
    type: Object,
    required: true
  },
  editable: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle', 'update', 'delete', 'focus-value'])

const isColor = isColorValue
</script>
