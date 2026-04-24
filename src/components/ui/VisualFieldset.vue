<script setup>
import { ref } from 'vue'

const props = defineProps({
  label:       { type: String,  required: true },
  help:        { type: String,  default: '' },
  disabled:    { type: Boolean, default: false },
  collapsible: { type: Boolean, default: false },
  defaultOpen: { type: Boolean, default: true },
  hasValue:    { type: Boolean, default: false },
})

const isOpen = ref(props.defaultOpen)

function toggle() {
  if (props.collapsible && !props.disabled) {
    isOpen.value = !isOpen.value
  }
}
</script>

<template>
  <div
    class="relative px-2 pt-4 bg-gray-50/50 mt-4 group/fieldset transition-all"
    :class="[
      disabled ? 'opacity-60' : '',
      collapsible && !isOpen
        ? [
            'border-t pb-0',
            disabled ? 'border-t-gray-300' : 'border-t-blue-500'
          ]
        : [
            'border rounded pb-3',
            disabled ? 'border-gray-300' : 'border-blue-500'
          ]
    ]"
  >
    <!-- Framed Label -->
    <div
      class="absolute -top-2 left-2 px-1.5 bg-white text-[11px] font-normal border rounded flex items-center gap-1.5 select-none z-10 transition-colors"
      :class="[
        disabled ? 'text-gray-400 border-gray-300' : 'text-blue-700 border-blue-500',
        collapsible && !disabled ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''
      ]"
      :title="help"
      @click="toggle"
    >
      <!-- Chevron (collapsible only) -->
      <svg
        v-if="collapsible"
        class="w-2.5 h-2.5 transition-transform duration-200 shrink-0"
        :class="isOpen ? 'rotate-0' : '-rotate-90'"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>

      <span>{{ label }}</span>

      <!-- Has-value dot indicator -->
      <span
        v-if="hasValue"
        class="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 transition-opacity"
        title="Possui valores configurados"
      ></span>

      <slot name="badge"></slot>
    </div>

    <!-- Glass Overlay -->
    <div class="absolute inset-0 bg-white/20 pointer-events-none rounded z-0"></div>

    <!-- Disabled Overlay -->
    <div
      v-if="disabled"
      class="absolute inset-0 rounded z-20 pointer-events-none cursor-not-allowed"
    ></div>

    <!-- Content Wrapper (collapsible with smooth transition) -->
    <div
      class="relative z-10 flex flex-col gap-2.5 overflow-hidden transition-all duration-200 ease-in-out"
      :class="[
        disabled ? 'pointer-events-none select-none' : '',
        collapsible && !isOpen ? 'max-h-0 opacity-0 mt-0' : 'max-h-[2000px] opacity-100'
      ]"
    >
      <slot></slot>
    </div>
  </div>
</template>
