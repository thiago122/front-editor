<template>
  <div class="inspector-header bg-[#f3f3f3] border-b border-[#d1d1d1] shrink-0">
    <div class="flex items-center px-1 min-h-[35px] py-1">
      <div class="flex border-r border-[#d1d1d1] pr-1 mr-1">
        <button 
          v-for="tab in ['Styles', 'Computed']" 
          :key="tab" 
          @click="$emit('update:activeTab', tab)" 
          :class="[
            'px-3 py-1 text-[11px] font-medium transition-all relative border-b-2',
            activeTab === tab
              ? 'text-blue-600 border-blue-600 font-bold bg-white'
              : 'text-[#5f6368] border-transparent hover:text-[#202124] hover:bg-black/5',
          ]">
          {{ tab }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeTab: {
    type: String,
    required: true
  }
})

defineEmits(['update:activeTab'])
</script>
