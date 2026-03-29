<script setup>
// PixelPerfectOverlay.vue
// Overlay da imagem ancorando ao CENTRO do container.
// offsetX é relativo ao centro — resize de painel não desloca a imagem.

import { usePixelPerfect } from '@/composables/usePixelPerfect'

const { enabled, imageUrl, offsetX, offsetY, opacityFraction, positionType, interactive } = usePixelPerfect()

// Drag da imagem inteira
let dragging = false
let startX = 0, startY = 0, startOX = 0, startOY = 0

function onDragStart(e) {
  if (!enabled.value || positionType.value === 'auto' || !interactive.value) return
  dragging = true
  startX  = e.clientX
  startY  = e.clientY
  startOX = offsetX.value
  startOY = offsetY.value
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup',   onDragEnd)
}

function onDragMove(e) {
  if (!dragging) return
  offsetX.value = startOX + (e.clientX - startX)
  offsetY.value = startOY + (e.clientY - startY)
}

function onDragEnd() {
  dragging = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup',   onDragEnd)
}
</script>

<template>
  <!--
    Âncora no topo central do container.
    left: 50% + transform: translateX(-50%) → sempre centrado.
    O offset X/Y desloca a partir deste ponto central.
    Resize de painel não afeta o alinhamento.
  -->
  <div
    v-if="imageUrl && enabled"
    :style="{
      position:      positionType === 'auto' ? 'static' : positionType,
      top:           '0px',
      left:          '50%',
      transform:     `translate(calc(-50% + ${offsetX}px), ${offsetY}px)`,
      zIndex:        500,
      pointerEvents: interactive ? 'auto' : 'none',
      cursor:        interactive ? 'move' : 'default',
      display:       'inline-block',
      userSelect:    'none',
    }"
    @mousedown.prevent="onDragStart"
  >
    <img
      :src="imageUrl"
      :style="{
        opacity:    opacityFraction,
        display:    'block',
        maxWidth:   'none',
        userSelect: 'none',
      }"
      draggable="false"
    />
  </div>
</template>
