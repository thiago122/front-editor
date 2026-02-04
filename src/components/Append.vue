<script setup>
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'

const props = defineProps({
  nodeId: {
    type: String,
    required: false, // Pode ser nulo se nada selecionado, mas idealmente desabilitamos
  },
  html: {
    type: String,
    default: '<div>Nova Div</div>',
  },
})

const append = () => {
  if (!props.nodeId) return
  NodeDispatcher.appendElement(props.nodeId, props.html)
}
</script>

<template>
  <button @click="append" :disabled="!nodeId">
    <slot>Append</slot>
  </button>
</template>
