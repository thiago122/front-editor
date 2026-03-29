<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'
import TagAutocomplete from '@/components/TagAutocomplete.vue'
import { tagToHtml } from '@/editor/html/htmlTags'

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

let iframeWin         = null
let resizeObserver    = null   // observa o iframe (viewport resize)
let elResizeObserver  = null   // observa o elemento selecionado/hovereado (CSS layout)
let mutationObserver  = null   // observa o body do iframe (DOM mutations)
let rafDebounce       = null   // id do requestAnimationFrame pendente

/**
 * Pede atualização na próxima pintura do browser.
 * Usando rAF em vez de setTimeout para sincronizar com o ciclo de layout.
 */
function scheduleLayout() {
  if (rafDebounce) return
  rafDebounce = requestAnimationFrame(() => {
    rafDebounce = null
    layoutTick.value++
  })
}

function onLayout() { scheduleLayout() }

function attachScrollListener(iframe) {
  try { iframeWin?.removeEventListener('scroll', onLayout) } catch { /* ignore */ }
  try { iframeWin?.removeEventListener('keydown', handleGlobalKeydown) } catch { /* ignore */ }
  try {
    iframeWin = iframe.contentWindow
    iframeWin?.addEventListener('scroll', onLayout, { passive: true })
    // Ctrl+Space: foco pode estar no iframe, então escuta lá também
    iframeWin?.addEventListener('keydown', handleGlobalKeydown)

    // ── MutationObserver no body do iframe ─────────────────────────────────
    // Detecta: adições/remoções de nós, mudanças de atributos (class, style...),
    // e alterações em style tags (CSS changes → layout reflow)
    mutationObserver?.disconnect()
    const iframeDoc = iframe.contentDocument
    if (iframeDoc?.body) {
      mutationObserver = new MutationObserver(onLayout)
      // body: DOM mutations (childList, attributes)
      mutationObserver.observe(iframeDoc.body, {
        childList:     true,
        subtree:       true,
        attributes:    true,
        characterData: false,
      })
      // head: CSS text changes (style tag textContent changes)
      if (iframeDoc.head) {
        mutationObserver.observe(iframeDoc.head, {
          childList:     true,
          subtree:       true,
          characterData: true,  // detecta mudanças no texto dos <style> tags
        })
      }
    }
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
  try { iframeWin?.removeEventListener('keydown', handleGlobalKeydown) } catch { /* ignore */ }
  iframeWin = null
  resizeObserver?.disconnect();   resizeObserver  = null
  elResizeObserver?.disconnect(); elResizeObserver = null
  mutationObserver?.disconnect(); mutationObserver = null
  if (rafDebounce) { cancelAnimationFrame(rafDebounce); rafDebounce = null }
}

watch(() => EditorStore.iframe, (iframe) => {
  attachIframeListeners(iframe)
}, { immediate: true })

// Também precisa recompor quando o previewContainer faz scroll
watch(() => EditorStore.previewContainer, (container) => {
  if (!container) return
  container.addEventListener('scroll', onLayout, { passive: true })
}, { immediate: true })

// ── ResizeObserver no elemento selecionado/hovereado ─────────────────────────
// Detecta mudanças de TAMANHO causadas por CSS (sem depender do MutationObserver)
// Isso cobre casos onde o CSS muda width/height/padding/margin do próprio elemento.
watch(
  () => props.mode === 'hover' ? EditorStore.hoveredElement : EditorStore.selectedElement,
  (el) => {
    elResizeObserver?.disconnect()
    if (!el) return
    elResizeObserver = new ResizeObserver(onLayout)
    elResizeObserver.observe(el)
  },
  { immediate: true },
)

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

function moveUp()        { if (canMoveUp.value)   NodeDispatcher.moveNode(selNodeId.value, -1) }
function moveDown()      { if (canMoveDown.value) NodeDispatcher.moveNode(selNodeId.value,  1) }
function deleteNode()    { if (selNodeId.value) NodeDispatcher.deleteNode(selNodeId.value) }
function duplicateNode() { if (selNodeId.value) NodeDispatcher.duplicateNode(selNodeId.value) }

// ── Autocomplete de tags (botões + e ↳) ──────────────────────────────────────

const showAutocomplete  = ref(false)
const autocompleteStyle = ref({})
// 'after' = inserir como irmão após | 'child' = inserir como último filho
const insertMode        = ref('after')

/** Abre o autocomplete posicionado abaixo do botão clicado */
function openAutocomplete(event, mode = 'after') {
  const rect = event.currentTarget.getBoundingClientRect()
  openAutocompleteAt(rect.bottom + 4, rect.left, mode)
}

/**
 * Abre o autocomplete em coordenadas fixas.
 * Usado tanto pelo clique nos botões quanto pelos atalhos de teclado.
 */
function openAutocompleteAt(top, left, mode = 'after') {
  insertMode.value        = mode
  autocompleteStyle.value = { top: `${top}px`, left: `${left}px` }
  showAutocomplete.value  = true
}

// ── Atalhos de teclado ────────────────────────────────────────────────────────
// Ctrl+Space       → inserir irmão após (+)
// Ctrl+Shift+Space → inserir como último filho (↳)

function handleGlobalKeydown(e) {
  if (!e.ctrlKey || e.key !== ' ') return
  if (props.mode !== 'selection') return
  if (!selNodeId.value) return

  e.preventDefault()

  const mode = e.shiftKey ? 'child' : 'after'

  // Toggle: fecha se já estiver aberto no mesmo modo
  if (showAutocomplete.value && insertMode.value === mode) {
    showAutocomplete.value = false
    return
  }

  const el     = EditorStore.selectedElement
  const iframe = EditorStore.iframe

  if (el && iframe) {
    const elRect     = el.getBoundingClientRect()
    const iframeRect = iframe.getBoundingClientRect()
    openAutocompleteAt(
      elRect.bottom + iframeRect.top + 6,
      elRect.left   + iframeRect.left,
      mode,
    )
  } else {
    openAutocompleteAt(window.innerHeight / 2 - 60, window.innerWidth / 2 - 90, mode)
  }
}

onMounted(()      => window.addEventListener('keydown', handleGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalKeydown))

/** Usuário selecionou uma tag no autocomplete */
function onTagSelected(tag) {
  showAutocomplete.value = false
  if (!selNodeId.value) return
  if (insertMode.value === 'child') {
    NodeDispatcher.appendElement(selNodeId.value, tagToHtml(tag))
  } else {
    NodeDispatcher.insertAfter(selNodeId.value, tagToHtml(tag))
  }
}

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
    class="pointer-events-none absolute border border-blue-500"
    :class="{ 'overlay-blink': props.mode === 'selection' && EditorStore.isBlinking }"
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

          <!-- Inserir irmão após (+) -->
          <button
            @click.stop="openAutocomplete($event, 'after')"
            class="px-1.5 py-0.5 hover:bg-blue-700 transition-colors font-bold"
            title="Inserir tag após este elemento (Ctrl+Space)"
          >+</button>

          <!-- Inserir como último filho (↳) -->
          <button
            @click.stop="openAutocomplete($event, 'child')"
            class="px-1.5 py-0.5 hover:bg-blue-700 transition-colors font-bold"
            title="Inserir tag dentro como último filho (Ctrl+Shift+Space)"
          >↳</button>

          <!-- Duplicar -->
          <button
            @click.stop="duplicateNode"
            class="px-1.5 py-0.5 hover:bg-blue-700 transition-colors"
            title="Duplicar elemento"
          >⧉</button>

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

  <!-- Autocomplete de tags: abre ao clicar no botão + da barra de seleção -->
  <TagAutocomplete
    v-if="showAutocomplete"
    :style="autocompleteStyle"
    @select="onTagSelected"
    @close="showAutocomplete = false"
  />

</template>



<style scoped>
/* Pulso colorido — ativado por 3s após inserção de elemento */
@keyframes overlayBlink {
  0%   { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.35);  }  /* verde */
  33%  { border-color: #f97316; box-shadow: 0 0 0 5px rgba(249,115,22,0.30); }  /* laranja */
  66%  { border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168,85,247,0.30); }  /* roxo */
  100% { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.35);  }  /* verde */
}

.overlay-blink {
  animation: overlayBlink 0.65s ease-in-out infinite;
}
</style>
