<script setup>
const props = defineProps({
  title: String,
  subtitle: String,
})
</script>
<template>
  <div
    class="border-r border-gray-300 bg-white w-64 h-full max-h-full bg-surface-elevated flex flex-col"
  >
    <div class="p-2 border-b border-gray-300 grow-0 shrink-1">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-semibold text-text-primary" v-if="title">{{ title }}</h2>
      </div>
      <p class="text-xs text-text-tertiary mt-0.5" v-if="subtitle">{{ subtitle }}</p>
      <slot name="header" v-if="$slots.header" />
    </div>
    <div class="grow overflow-y-auto p-2">
      <slot />
    </div>
  </div>
</template>
