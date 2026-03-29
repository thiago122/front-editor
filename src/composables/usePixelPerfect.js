// usePixelPerfect.js
// Gerencia o estado do overlay Pixel Perfect — imagem de referência sobre o canvas.

import { ref, computed } from 'vue'

const enabled      = ref(false)      // liga/desliga o overlay
const imageUrl     = ref(null)       // URL do objeto (URL.createObjectURL)
const opacity      = ref(50)         // 0–100
const offsetX      = ref(0)          // deslocamento horizontal em px (relativo ao centro)
const offsetY      = ref(0)          // deslocamento vertical em px
const positionType = ref('absolute') // 'absolute' | 'fixed' | 'auto'
const interactive  = ref(false)      // false = pointer-events:none (cliques passam pelo iframe)

/** Carrega uma imagem via input[type=file] */
function loadImage(file) {
  if (!file) return
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = URL.createObjectURL(file)
  enabled.value  = true
}

/** Centraliza horizontalmente (offsetX=0) e vai para o topo (offsetY=0) */
function center() {
  offsetX.value = 0
  offsetY.value = 0
}

/** Remove a imagem e reseta o estado */
function clear() {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value     = null
  enabled.value      = false
  offsetX.value      = 0
  offsetY.value      = 0
  opacity.value      = 50
  positionType.value = 'absolute'
  interactive.value  = false
}

const opacityFraction = computed(() => opacity.value / 100)

export function usePixelPerfect() {
  return {
    enabled,
    imageUrl,
    opacity,
    offsetX,
    offsetY,
    positionType,
    interactive,
    opacityFraction,
    loadImage,
    center,
    clear,
  }
}
