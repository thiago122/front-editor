<script setup>
const props = defineProps({
  title: String,
})
</script>

<template>
  <button
    class="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-150 group relative hover:bg-gray-200 text-text-primary"
  >
    <slot />
    <span
      class="absolute left-full ml-2 px-2 py-1 bg-white border border-gray-300 rounded-md text-xs font-medium text-text-primary opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md"
      >{{ title }}</span
    >
  </button>
</template>
