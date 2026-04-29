<script setup>
defineProps({
  label: { type: String, required: true }
})
</script>

<template>
  <div class="flex items-center gap-2 mb-1 group/vheader">
    <div class="flex items-center gap-1.5 shrink-0">
      <!-- Label -->
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none leading-none">
        {{ label }}
      </span>

      <!-- Actions Slot (e.g. [S], 🔗 buttons) -->
      <div v-if="$slots.actions" class="flex items-center gap-1 ml-0.5">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Decorative Line -->
    <div class="flex-1 border-t border-gray-100 mt-0.5 opacity-60 group-hover/vheader:opacity-100 transition-opacity"></div>
  </div>
</template>
