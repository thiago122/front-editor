<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'

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

// Também precisa recompor quando o previewContainer faz scroll
watch(() => EditorStore.previewContainer, (container) => {
  if (!container) return
  container.addEventListener('scroll', onLayout, { passive: true })
}, { immediate: true })

onBeforeUnmount(detachIframeListeners)

// ── Rect em coordenadas de scroll-content (position: absolute dentro do container) ──
// O container tem overflow:auto + position:relative — clipa o overlay naturalmente.
// Não clampamos top/left: valores negativos ficam acima do container e somem.
// Isso evita o efeito de "overlay fixo no topo" ao scrollar.

const rect = computed(() => {
  void layoutTick.value
  const el        = props.mode === 'hover' ? EditorStore.hoveredElement : EditorStore.selectedElement
  const container = EditorStore.previewContainer
  if (!el || !EditorStore.iframe || !container) return null

  const elRect        = el.getBoundingClientRect()
  const iframeRect    = EditorStore.iframe.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  // Coordenadas no espaço de scroll-content do container
  const top  = elRect.top  + iframeRect.top  - containerRect.top  + container.scrollTop
  const left = elRect.left + iframeRect.left - containerRect.left + container.scrollLeft

  // Clampamos apenas o tamanho (para evitar expansão da scroll area em elementos grandes)
  const maxW = container.clientWidth
  const maxH = container.clientHeight + container.scrollTop

  return {
    top,
    left,
    width:  Math.min(elRect.width,  maxW),
    height: Math.min(elRect.height, maxH),
  }
})

// ── Controles de seleção (apenas mode=selection) ─────────────────────────────

const selNodeId = computed(() => props.mode === 'selection' ? EditorStore.selectedNodeId : null)

const selParent = computed(() =>
  selNodeId.value ? EditorStore.getParent(selNodeId.value) : null
)

const selIndex = computed(() => {
  if (!selParent.value?.children || !selNodeId.value) return -1
  return selParent.value.children.findIndex(c => c.nodeId === selNodeId.value)
})

const canMoveUp   = computed(() => selIndex.value > 0)
const canMoveDown = computed(() =>
  selParent.value && selIndex.value < selParent.value.children.length - 1
)

function selectParent() {
  if (selParent.value) EditorStore.selectParent()
}

function moveUp()   { if (canMoveUp.value)   NodeDispatcher.moveNode(selNodeId.value, -1) }
function moveDown() { if (canMoveDown.value) NodeDispatcher.moveNode(selNodeId.value,  1) }
function deleteNode() { if (selNodeId.value) NodeDispatcher.deleteNode(selNodeId.value) }

const label = computed(() => {
  const el = props.mode === 'hover' ? EditorStore.hoveredElement : EditorStore.selectedElement
  if (!el) return ''
  return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
})

/** Quando o elemento está muito próximo do topo, move a barra para baixo */
const labelBelow = computed(() => !!rect.value && rect.value.top < 30)
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
    class="pointer-events-none absolute transition-all duration-75 border border-blue-500"
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

    <!-- ── Borda do elemento — hover sempre, selection só com box model ── -->
    <div class="absolute inset-0 " v-if="mode === 'hover' || boxSpacing">

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

    <!-- ── Tag Label barra de controles (estilo DevTools) ── -->
    <div
      v-if="label"
      class="absolute left-[-1px] bg-blue-600 text-white text-[10px] font-bold flex items-center whitespace-nowrap pointer-events-auto"
      :class="labelBelow ? 'top-full' : 'bottom-full'"
    >
      <!-- Tag + dimensões -->
      <div class="flex items-center gap-1 px-1.5 py-0.5">
        <span class="opacity-80">{{ label }}</span>
        <span class="font-mono text-[10px] opacity-60">{{ Math.round(rect.width) }} × {{ Math.round(rect.height) }}</span>
      </div>

      <!-- Controles: apenas no modo selection -->
      <template v-if="mode === 'selection' && selNodeId">
        <div class="flex items-center border-l border-blue-500">
          <!-- Ir para pai -->
          <button
            v-if="selParent"
            @click.stop="selectParent"
            class="px-1.5 py-0.5 hover:bg-blue-700 transition-colors"
            title="Selecionar pai"
          >↑</button>

          <!-- Mover acima -->
          <button
            @click.stop="moveUp"
            :disabled="!canMoveUp"
            class="px-1.5 py-0.5 hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mover acima"
          >▲</button>

          <!-- Mover abaixo -->
          <button
            @click.stop="moveDown"
            :disabled="!canMoveDown"
            class="px-1.5 py-0.5 hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mover abaixo"
          >▼</button>

          <!-- Deletar -->
          <button
            @click.stop="deleteNode"
            class="px-1.5 py-0.5 hover:bg-red-600 transition-colors"
            title="Deletar elemento"
          >×</button>
        </div>
      </template>
    </div>

  </div>
</template>
