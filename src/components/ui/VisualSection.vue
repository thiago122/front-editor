<script setup>
const props = defineProps({
  title: { type: String, required: true },
  show: { type: Boolean, default: false },
  hasAnyValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:show'])

function toggle() {
  emit('update:show', !props.show)
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Header -->
    <div
      class="flex items-center justify-between border-b border-blue-300 bg-blue-100 p-2 cursor-pointer select-none"
      @click="toggle"
    >
      <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{{ title }}</span>
      <div class="flex items-center gap-1.5">
        <span
          v-if="hasAnyValue"
          class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"
          :title="`This rule has active ${title.toLowerCase()} properties`"
        ></span>
        <svg 
          class="w-3 h-3 text-gray-400 transition-transform" 
          :class="show ? '' : '-rotate-90'"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <!-- Content -->
    <div v-show="show" class="p-2 border-b border-blue-300">
      <slot />
    </div>
  </div>
</template>
