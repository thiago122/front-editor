<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  show:                { type: Boolean, default: false },
  title:               { type: String,  default: 'Window' },
  initialX:            { type: Number,  default: 0 },
  initialY:            { type: Number,  default: 0 },
  initialWidth:        { type: Number,  default: 400 },
  initialHeight:       { type: Number,  default: 300 },
  minWidth:            { type: Number,  default: 100 },
  minHeight:           { type: Number,  default: 100 },
  blueIndicator:       { type: Boolean, default: false },
  closable:            { type: Boolean, default: true },
  closeOnClickOutside: { type: Boolean, default: true },
  theme:               { type: String,  default: 'dark' }, // 'dark' | 'light'
  minimizable:         { type: Boolean, default: true },
  minimalist:          { type: Boolean, default: false },
  zIndex:              { type: Number,  default: 10000 },
})

const emit = defineEmits(['close', 'move', 'resize', 'focus'])

const container  = ref(null)
const dragHandle = ref(null)
const pos        = ref({ x: props.initialX, y: props.initialY })
const size       = ref({ width: props.initialWidth, height: props.initialHeight })
const isDragging  = ref(false)
const isResizing  = ref(false)
const isMinimized = ref(false)

let dragOffset      = { x: 0, y: 0 }
let resizeStartSize = { w: 0, h: 0 }
let resizeStartPos  = { x: 0, y: 0 }

const positionStyle = computed(() => ({
  left:   `${pos.value.x}px`,
  top:    `${pos.value.y}px`,
  width:  `${size.value.width}px`,
  height: isMinimized.value ? 'auto' : `${size.value.height}px`,
  zIndex: props.zIndex,
}))

const themeClasses = computed(() => {
  if (props.theme === 'light') {
    return {
      container:  'bg-white/95 backdrop-blur-md border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.15)]',
      header:     'bg-gray-50/80 border-black/[0.05]',
      title:      'text-blue-600',
      body:       'bg-white/50',
      footer:     'bg-gray-50/80 border-black/[0.05]',
      closeBtn:   'text-gray-400 hover:text-red-500 hover:bg-red-50',
      minimizeBtn:'text-gray-400 hover:text-blue-500 hover:bg-blue-50',
      resizeIcon: 'text-gray-300 hover:text-blue-400',
    }
  }
  return {
    container:  'bg-[#282c34] border-gray-100/10 shadow-2xl',
    header:     'bg-[#21252b] border-gray-800',
    title:      'text-blue-400',
    body:       'bg-[#282c34]',
    footer:     'bg-[#1e2227] border-gray-800',
    closeBtn:   'text-gray-500 hover:text-red-400 hover:bg-red-900/30',
    minimizeBtn:'text-gray-500 hover:text-blue-400 hover:bg-white/5',
    resizeIcon: 'text-gray-700 hover:text-blue-500',
  }
})

// ── DRAG ──────────────────────────────────────────────────────────────────────
function startDrag(e) {
  // Não inicia drag se clicou num botão de controle
  if (e.target.closest('button')) return

  isDragging.value = true
  emit('focus')

  const rect = container.value.getBoundingClientRect()
  dragOffset = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }

  e.currentTarget.setPointerCapture(e.pointerId)
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup',   stopDrag)
}

function onDrag(e) {
  if (!isDragging.value) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  pos.value = {
    x: Math.max(-size.value.width + 50,  Math.min(e.clientX - dragOffset.x, vw - 50)),
    y: Math.max(0, Math.min(e.clientY - dragOffset.y, vh - 40)),
  }
  emit('move', pos.value)
}

function stopDrag() {
  isDragging.value = false
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup',   stopDrag)
}

// ── RESIZE ────────────────────────────────────────────────────────────────────
function startResize(e) {
  isResizing.value = true
  resizeStartSize  = { w: size.value.width,  h: size.value.height }
  resizeStartPos   = { x: e.clientX, y: e.clientY }

  e.currentTarget.setPointerCapture(e.pointerId)
  window.addEventListener('pointermove', onResize)
  window.addEventListener('pointerup',   stopResize)
  e.preventDefault()
  e.stopPropagation()
}

function onResize(e) {
  if (!isResizing.value) return
  size.value = {
    width:  Math.max(props.minWidth,  resizeStartSize.w + (e.clientX - resizeStartPos.x)),
    height: Math.max(props.minHeight, resizeStartSize.h + (e.clientY - resizeStartPos.y)),
  }
  emit('resize', size.value)
}

function stopResize() {
  isResizing.value = false
  window.removeEventListener('pointermove', onResize)
  window.removeEventListener('pointerup',   stopResize)
}

// ── MINIMIZE / CLOSE ──────────────────────────────────────────────────────────
function toggleMinimize() {
  isMinimized.value = !isMinimized.value
}

function close() {
  emit('close')
}

// ── POSITION INIT ─────────────────────────────────────────────────────────────
function initializePosition() {
  if (!props.show) return
  pos.value = { x: props.initialX + 10, y: props.initialY + 10 }

  nextTick(() => {
    if (!container.value) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w  = container.value.offsetWidth
    const h  = container.value.offsetHeight
    if (pos.value.x + w > vw - 10) pos.value.x = Math.max(10, vw - w - 10)
    if (pos.value.y + h > vh - 10) pos.value.y = Math.max(10, vh - h - 10)
  })
}

watch(() => props.show, (newVal, oldVal) => {
  if (newVal && !oldVal) initializePosition()
})

// ── ESC KEY ───────────────────────────────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape' && props.show && props.closable) emit('close')
}

// ── CLICK OUTSIDE ─────────────────────────────────────────────────────────────
function handleClickOutside(e) {
  if (!props.show || !props.closable || !props.closeOnClickOutside) return
  if (e.target.closest('[data-quick-editor-trigger]')) return
  if (container.value && !container.value.contains(e.target)) emit('close')
}

onMounted(() => {
  window.addEventListener('keydown',      onKeydown)
  window.addEventListener('pointerdown',  handleClickOutside, true)
  if (props.show) initializePosition()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown',     onKeydown)
  window.removeEventListener('pointerdown', handleClickOutside, true)
  stopDrag()
  stopResize()
})
</script>

<template>
  <Teleport to="body">
    <!-- Overlay invisível durante drag/resize para bloquear iframes -->
    <div
      v-if="(isDragging || isResizing) && show"
      class="fixed inset-0 select-none"
      :style="{ zIndex: props.zIndex - 1, cursor: isDragging ? 'grabbing' : 'nwse-resize' }"
    ></div>

    <div
      v-show="show"
      ref="container"
      class="fixed rounded-lg border overflow-hidden flex flex-col"
      :class="[
        isDragging || isResizing
          ? 'transition-none select-none'
          : 'transition-[left,top,width,height] duration-200',
        themeClasses.container,
      ]"
      :style="positionStyle"
      @pointerdown="emit('focus')"
    >
      <!-- ── Header ── -->
      <div
        ref="dragHandle"
        class="flex items-center justify-between px-2 border-b shrink-0 select-none cursor-grab active:cursor-grabbing"
        :class="[themeClasses.header, minimalist ? 'h-7' : 'h-9']"
        @pointerdown="startDrag"
      >
        <!-- Left: title slot -->
        <div class="flex items-center gap-2 overflow-hidden pointer-events-none min-w-0 flex-1 mr-2">
          <slot name="header-left">
            <span v-if="blueIndicator" class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
            <span class="text-[11px] uppercase tracking-widest shrink-0 truncate" :class="themeClasses.title">
              {{ title }}
            </span>
          </slot>
        </div>

        <!-- Right: controls (pointer-events-none on drag handle is bypassed here via stop) -->
        <div class="flex items-center gap-0.5 shrink-0">
          <slot name="header-right"></slot>

          <!-- Minimize -->
          <button
            v-if="minimizable"
            type="button"
            class="w-6 h-6 flex items-center justify-center rounded transition-colors"
            :class="themeClasses.minimizeBtn"
            :title="isMinimized ? 'Expandir' : 'Minimizar'"
            @click.stop.prevent="toggleMinimize"
            @pointerdown.stop
          >
            <svg v-if="isMinimized" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
            </svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14" />
            </svg>
          </button>

          <!-- Close -->
          <button
            v-if="closable"
            type="button"
            class="w-6 h-6 flex items-center justify-center rounded transition-colors"
            :class="themeClasses.closeBtn"
            title="Fechar (Esc)"
            @click.stop.prevent="close"
            @pointerdown.stop
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- ── Body ── -->
      <div
        v-show="!isMinimized"
        class="flex-1 overflow-hidden relative"
        :class="[themeClasses.body, minimalist ? 'p-0' : '']"
      >
        <slot></slot>
      </div>

      <!-- ── Footer ── -->
      <div
        v-if="$slots.footer && !isMinimized"
        class="shrink-0 px-3 py-2 border-t"
        :class="themeClasses.footer"
      >
        <slot name="footer"></slot>
      </div>

      <!-- ── Resize Handle (larger, 16x16 hit area) ── -->
      <div
        v-show="!isMinimized"
        class="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-[10001] group"
        @pointerdown.stop="startResize"
      >
        <!-- Visual grip (3 diagonal dots) -->
        <svg
          class="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 transition-colors"
          :class="themeClasses.resizeIcon"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 14H20V12H22V14Z" />
        </svg>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cursor-nwse-resize {
  cursor: nwse-resize;
}
</style>
