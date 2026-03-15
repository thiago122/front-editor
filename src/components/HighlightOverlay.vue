<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'

const props = defineProps({
  mode: {
    type: String,
    default: 'hover', // 'hover' | 'selection'
  },
})

const EditorStore = useEditorStore()

// Ticker reativo: scroll e resize não são reativos — precisamos de listeners manuais.
const layoutTick = ref(0)

// ── Listeners no iframe ───────────────────────────────────────────────────────

let iframeWin      = null
let resizeObserver = null

function onLayout() { layoutTick.value++ }

function attachScrollListener(iframe) {
  try { iframeWin?.removeEventListener('scroll', onLayout) } catch { /* ignore */ }
  try {
    iframeWin = iframe.contentWindow
    iframeWin?.addEventListener('scroll', onLayout, { passive: true })
  } catch { /* cross-origin */ }
}

function attachIframeListeners(iframe) {
  detachIframeListeners()
  if (!iframe) return
  attachScrollListener(iframe)
  iframe.addEventListener('load', () => attachScrollListener(iframe))
  resizeObserver = new ResizeObserver(onLayout)
  resizeObserver.observe(iframe)
}

function detachIframeListeners() {
  try { iframeWin?.removeEventListener('scroll', onLayout) } catch { /* ignore */ }
  iframeWin = null
  resizeObserver?.disconnect()
  resizeObserver = null
}

watch(() => EditorStore.iframe, (iframe) => {
  attachIframeListeners(iframe)
}, { immediate: true })

onBeforeUnmount(detachIframeListeners)

// ── Rect ─────────────────────────────────────────────────────────────────────
// Coordenadas relativas ao previewContainer (position: relative).
// O overflow: hidden do container recorta o overlay naturalmente,
// sem necessidade de clip-path ou z-index fixo.

const rect = computed(() => {
  void layoutTick.value
  const el        = props.mode === 'hover' ? EditorStore.hoveredElement : EditorStore.selectedElement
  const container = EditorStore.previewContainer
  if (!el || !EditorStore.iframe || !container) return null

  const elRect        = el.getBoundingClientRect()
  const iframeRect    = EditorStore.iframe.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  const top  = elRect.top  + iframeRect.top  - containerRect.top  + container.scrollTop
  const left = elRect.left + iframeRect.left - containerRect.left + container.scrollLeft

  // Clamp to container's visible size so the overlay never expands the scrollable area.
  // Without this, selecting a large element (e.g. body) causes unwanted vertical scroll.
  const maxW = container.clientWidth
  const maxH = container.clientHeight + container.scrollTop

  return {
    top:    Math.max(0, top),
    left:   Math.max(0, left),
    width:  Math.min(elRect.width,  maxW - Math.max(0, left)),
    height: Math.min(elRect.height, maxH - Math.max(0, top)),
  }
})

const label = computed(() => {
  const el = props.mode === 'hover' ? EditorStore.hoveredElement : EditorStore.selectedElement
  if (!el) return ''
  return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
})

/**
 * Lê margin e padding do elemento selecionado via getComputedStyle.
 * Usa a janela do iframe para que os valores reflitam os estilos aplicados.
 * Retorna null fora do modo 'selection' ou se não houver elemento.
 */
const boxSpacing = computed(() => {
  void layoutTick.value
  if (props.mode !== 'selection') return null
  if (!EditorStore.showBoxModel) return null       // ← respeita preferência do usuário
  const el = EditorStore.selectedElement
  if (!el) return null

  const win = EditorStore.iframe?.contentWindow
  if (!win) return null
  const style = win.getComputedStyle(el)
  const px    = (prop) => Math.round(parseFloat(style.getPropertyValue(prop))) || 0

  return {
    margin:  { top: px('margin-top'),  right: px('margin-right'),  bottom: px('margin-bottom'),  left: px('margin-left')  },
    padding: { top: px('padding-top'), right: px('padding-right'), bottom: px('padding-bottom'), left: px('padding-left') },
  }
})
</script>

<template>
  <div
    v-if="rect"
    class="pointer-events-none absolute transition-all duration-75"
    :style="{
      top:    rect.top    + 'px',
      left:   rect.left   + 'px',
      width:  rect.width  + 'px',
      height: rect.height + 'px',
    }"
  >

    <!-- ── Camada de MARGIN (laranja) — expande para fora do rect ── -->
    <template v-if="boxSpacing">
      <div
        class="absolute"
        :style="{
          top:    -boxSpacing.margin.top    + 'px',
          left:   -boxSpacing.margin.left   + 'px',
          right:  -boxSpacing.margin.right  + 'px',
          bottom: -boxSpacing.margin.bottom + 'px',
          background: 'rgba(246,178,107,0.35)',
          outline: '1px solid rgba(246,178,107,0.8)',
        }"
      >
        <!-- Labels de margin -->
        <span v-if="boxSpacing.margin.top"
          class="absolute left-1/2 -translate-x-1/2 text-[9px] font-mono text-orange-800 bg-orange-100/70 px-0.5 rounded leading-none"
          :style="{ top: '1px' }">{{ boxSpacing.margin.top }}</span>
        <span v-if="boxSpacing.margin.bottom"
          class="absolute left-1/2 -translate-x-1/2 text-[9px] font-mono text-orange-800 bg-orange-100/70 px-0.5 rounded leading-none"
          :style="{ bottom: '1px' }">{{ boxSpacing.margin.bottom }}</span>
        <span v-if="boxSpacing.margin.left"
          class="absolute top-1/2 -translate-y-1/2 text-[9px] font-mono text-orange-800 bg-orange-100/70 px-0.5 rounded leading-none"
          :style="{ left: '1px' }">{{ boxSpacing.margin.left }}</span>
        <span v-if="boxSpacing.margin.right"
          class="absolute top-1/2 -translate-y-1/2 text-[9px] font-mono text-orange-800 bg-orange-100/70 px-0.5 rounded leading-none"
          :style="{ right: '1px' }">{{ boxSpacing.margin.right }}</span>
      </div>
    </template>

    <!-- ── Borda do elemento (azul tracejado no selection) ── -->
    <div
      class="absolute inset-0 border"
      :class="mode === 'hover'
        ? 'border-blue-500 bg-blue-500/10'
        : 'border-blue-600 border-dashed bg-blue-500/5'"
    >

      <!-- ── Camada de PADDING (verde) — dentro do elemento ── -->
      <template v-if="boxSpacing">
        <div
          class="absolute"
          :style="{
            top:    boxSpacing.padding.top    + 'px',
            left:   boxSpacing.padding.left   + 'px',
            right:  boxSpacing.padding.right  + 'px',
            bottom: boxSpacing.padding.bottom + 'px',
            background: 'rgba(147,196,125,0.3)',
            outline: '1px solid rgba(100,180,100,0.7)',
          }"
        />
        <!-- Labels de padding -->
        <span v-if="boxSpacing.padding.top"
          class="absolute left-1/2 -translate-x-1/2 text-[9px] font-mono text-green-800 bg-green-100/70 px-0.5 rounded leading-none"
          :style="{ top: boxSpacing.padding.top / 2 - 6 + 'px' }">{{ boxSpacing.padding.top }}</span>
        <span v-if="boxSpacing.padding.bottom"
          class="absolute left-1/2 -translate-x-1/2 text-[9px] font-mono text-green-800 bg-green-100/70 px-0.5 rounded leading-none"
          :style="{ bottom: boxSpacing.padding.bottom / 2 - 6 + 'px' }">{{ boxSpacing.padding.bottom }}</span>
        <span v-if="boxSpacing.padding.left"
          class="absolute top-1/2 -translate-y-1/2 text-[9px] font-mono text-green-800 bg-green-100/70 px-0.5 rounded leading-none"
          :style="{ left: boxSpacing.padding.left / 2 - 6 + 'px' }">{{ boxSpacing.padding.left }}</span>
        <span v-if="boxSpacing.padding.right"
          class="absolute top-1/2 -translate-y-1/2 text-[9px] font-mono text-green-800 bg-green-100/70 px-0.5 rounded leading-none"
          :style="{ right: boxSpacing.padding.right / 2 - 6 + 'px' }">{{ boxSpacing.padding.right }}</span>
      </template>

    </div>

    <!-- ── Tag Label (estilo DevTools) ── -->
    <div
      v-if="label"
      class="absolute bottom-full left-0 mb-1 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded flex items-center gap-1 whitespace-nowrap shadow-sm"
    >
      <span class="opacity-80">{{ label }}</span>
      <span class="font-mono text-[9px] opacity-60">{{ Math.round(rect.width) }} × {{ Math.round(rect.height) }}</span>
    </div>

  </div>
</template>
