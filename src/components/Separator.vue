<script setup>
const props = defineProps({
  direction: {
    type: String,
    default: 'vertical',
  },
})
</script>
<template>
  <div
    class="inline-block h-full mr-2 pr-2 border-r border-gray-200"
    v-if="props.direction === 'vertical'"
  ></div>
  <div
    class="inline-block w-full mr-2 pr-2 border-b border-gray-200"
    v-if="props.direction === 'horizontal'"
  ></div>
</template>
