<template>
  <div class="flex justify-center p-4">
    <div class="relative p-6 border border-dashed border-gray-400 bg-orange-50/30 text-center min-w-[200px]">
      <span class="absolute top-1 left-2 text-[9px] uppercase text-gray-400">margin</span>
      <span class="absolute top-1 left-1/2 -translate-x-1/2 text-[10px]">{{ model.margin.top }}</span>
      <span class="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px]">{{ model.margin.bottom }}</span>
      <span class="absolute top-1/2 left-1 -translate-y-1/2 text-[10px]">{{ model.margin.left }}</span>
      <span class="absolute top-1/2 right-1 -translate-y-1/2 text-[10px]">{{ model.margin.right }}</span>

      <div class="relative p-6 border border-gray-300 bg-amber-50/30">
        <span class="absolute top-1 left-2 text-[9px] uppercase text-gray-400">border</span>
        <span class="absolute top-1 left-1/2 -translate-x-1/2 text-[10px]">{{ model.border.top }}</span>
        <span class="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px]">{{ model.border.bottom }}</span>
        <span class="absolute top-1/2 left-1 -translate-y-1/2 text-[10px]">{{ model.border.left }}</span>
        <span class="absolute top-1/2 right-1 -translate-y-1/2 text-[10px]">{{ model.border.right }}</span>

        <div class="relative p-6 border border-gray-300 bg-emerald-50/30">
          <span class="absolute top-1 left-2 text-[9px] uppercase text-gray-400">padding</span>
          <span class="absolute top-1 left-1/2 -translate-x-1/2 text-[10px]">{{ model.padding.top }}</span>
          <span class="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px]">{{ model.padding.bottom }}</span>
          <span class="absolute top-1/2 left-1 -translate-y-1/2 text-[10px]">{{ model.padding.left }}</span>
          <span class="absolute top-1/2 right-1 -translate-y-1/2 text-[10px]">{{ model.padding.right }}</span>

          <div class="relative p-2 border border-blue-400 bg-blue-100/30 text-center flex items-center justify-center">
            <span class="text-[10px] font-bold">{{ model.content.width }} x {{ model.content.height }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'

const store = useEditorStore()
const selectedElement = computed(() => store.selectedElement)

const model = ref({
  margin: { top: '-', right: '-', bottom: '-', left: '-' },
  border: { top: '-', right: '-', bottom: '-', left: '-' },
  padding: { top: '-', right: '-', bottom: '-', left: '-' },
  content: { width: '-', height: '-' },
})

function updateBoxModel() {
  if (!selectedElement.value) return
  const style = window.getComputedStyle(selectedElement.value)
  const getVal = (prop) => Math.round(parseFloat(style.getPropertyValue(prop))) || '-'

  model.value = {
    margin: {
      top: getVal('margin-top'),
      right: getVal('margin-right'),
      bottom: getVal('margin-bottom'),
      left: getVal('margin-left'),
    },
    border: {
      top: getVal('border-top-width'),
      right: getVal('border-right-width'),
      bottom: getVal('border-bottom-width'),
      left: getVal('border-left-width'),
    },
    padding: {
      top: getVal('padding-top'),
      right: getVal('padding-right'),
      bottom: getVal('padding-bottom'),
      left: getVal('padding-left'),
    },
    content: {
      width: getVal('width'),
      height: getVal('height'),
    },
  }
}

watch(selectedElement, updateBoxModel, { immediate: true })
</script>
