<!-- src/components/DropIndicator.vue
     Linha azul de inserção que aparece durante o drag.
     Renderizado via Teleport no body para ficar acima de tudo.
-->
<script setup>
import { dragState } from '@/composables/useDragDrop'
const s = dragState
</script>

<template>
  <Teleport to="body">
    <template v-if="s.active.value && s.indicator.value">
      <!-- Linha horizontal de inserção -->
      <div
        class="pointer-events-none"
        style="position: fixed; z-index: 9500; transition: top 60ms ease, left 60ms ease"
        :style="{
          top:   (s.indicator.value.lineY - 1) + 'px',
          left:   s.indicator.value.lineX + 'px',
          width:  s.indicator.value.lineW + 'px',
          height: '2px',
          background: '#3b82f6',
        }"
      />
      <!-- Triângulo indicador no início da linha -->
      <div
        class="pointer-events-none"
        style="position: fixed; z-index: 9500"
        :style="{
          top:   (s.indicator.value.lineY - 5) + 'px',
          left:  (s.indicator.value.lineX - 6) + 'px',
          width: 0,
          height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderLeft: '6px solid #3b82f6',
        }"
      />
    </template>
  </Teleport>
</template>
