<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  show:            { type: Boolean, default: false },
  title:           { type: String,  default: 'Window' },
  initialX:        { type: Number,  default: 0 },
  initialY:        { type: Number,  default: 0 },
  initialWidth:    { type: Number,  default: 400 },
  initialHeight:   { type: Number,  default: 300 },
  minWidth:        { type: Number,  default: 300 },
  minHeight:       { type: Number,  default: 200 },
  blueIndicator:  { type: Boolean, default: false },
  closable:        { type: Boolean, default: true },
})

const emit = defineEmits(['close', 'move', 'resize'])

const container = ref(null)
const pos = ref({ x: props.initialX, y: props.initialY })
const size = ref({ width: props.initialWidth, height: props.initialHeight })
const isDragging = ref(false)
const isResizing = ref(false)

let dragOffset = { x: 0, y: 0 }
let resizeStartSize = { w: 0, h: 0 }
let resizeStartPos = { x: 0, y: 0 }

const positionStyle = computed(() => ({
  display: props.show ? 'flex' : 'none',
  left: `${pos.value.x}px`,
  top: `${pos.value.y}px`,
  width: `${size.value.width}px`,
  height: `${size.value.height}px`,
}))

// --- DRAG ---
function startDrag(e) {
  if (e.target.closest('button')) return
  
  isDragging.value = true
  const rect = container.value.getBoundingClientRect()
  dragOffset = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', stopDrag)
}

function onDrag(e) {
  if (!isDragging.value) return
  const newX = e.clientX - dragOffset.x
  const newY = e.clientY - dragOffset.y
  
  const vw = window.innerWidth
  const vh = window.innerHeight
  
  pos.value = {
    x: Math.max(-size.value.width + 50, Math.min(newX, vw - 50)),
    y: Math.max(0, Math.min(newY, vh - 40))
  }
  emit('move', pos.value)
}

function stopDrag() {
  isDragging.value = false
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', stopDrag)
}

// --- RESIZE ---
function startResize(e) {
  isResizing.value = true
  resizeStartSize = { w: size.value.width, h: size.value.height }
  resizeStartPos  = { x: e.clientX, y: e.clientY }
  window.addEventListener('pointermove', onResize)
  window.addEventListener('pointerup', stopResize)
  e.preventDefault()
  e.stopPropagation()
}

function onResize(e) {
  if (!isResizing.value) return
  const deltaX = e.clientX - resizeStartPos.x
  const deltaY = e.clientY - resizeStartPos.y
  
  size.value = {
    width:  Math.max(props.minWidth,  resizeStartSize.w + deltaX),
    height: Math.max(props.minHeight, resizeStartSize.h + deltaY)
  }
  emit('resize', size.value)
}

function stopResize() {
  isResizing.value = false
  window.removeEventListener('pointermove', onResize)
  window.removeEventListener('pointerup', stopResize)
}

const initializePosition = () => {
  if (!props.show) return
  // Adicionamos +10 como margem padrão do ponto de clique
  pos.value = { x: props.initialX + 10, y: props.initialY + 10 }
  
  nextTick(() => {
    if (!container.value) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = container.value.offsetWidth
    const h = container.value.offsetHeight
    
    // Bounds check
    if (pos.value.x + w > vw - 10) pos.value.x = Math.max(10, vw - w - 10)
    if (pos.value.y + h > vh - 10) pos.value.y = Math.max(10, vh - h - 10)
  })
}

watch(() => props.show, (newVal, oldVal) => {
  // SÓ inicializa posição se estiver vindo do estado FECHADO (false -> true)
  if (newVal && !oldVal) {
    initializePosition()
  }
})

// Tecla Esc
function onKeydown(e) {
  if (e.key === 'Escape' && props.show && props.closable) {
    emit('close')
  }
}

function handleClickOutside(e) {
  if (!props.show || !props.closable) return

  const target = e.target
  const isTrigger = target.closest('[data-quick-editor-trigger]')
  
  // Se o clique for em um botão que abre o editor, ignoramos o sinal de fechar!
  if (isTrigger) return

  if (container.value && !container.value.contains(target)) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('pointerdown', handleClickOutside, true)
  
  if (props.show) initializePosition()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('pointerdown', handleClickOutside, true)
  stopDrag()
  stopResize()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-show="show"
      ref="container"
      class="fixed z-[10000] bg-[#282c34] rounded-lg shadow-2xl border border-gray-100/10 overflow-hidden flex flex-col"
      :class="isDragging || isResizing ? 'transition-none select-none' : 'transition-[left,top,width,height] duration-200'"
      :style="positionStyle"
    >
      <!-- Title bar (Handle) -->
      <div 
        class="flex items-center justify-between px-3 h-9 bg-[#21252b] border-b border-gray-800 shrink-0 select-none cursor-grab active:cursor-grabbing"
        @pointerdown="startDrag"
      >
        <div class="flex items-center gap-2 pointer-events-none overflow-hidden">
          <slot name="header-left">
            <span v-if="blueIndicator" class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
            <span class="text-[10px] font-bold text-blue-400 uppercase tracking-widest shrink-0 truncate">{{ title }}</span>
          </slot>
        </div>
        
        <div class="flex items-center gap-2 shrink-0">
          <slot name="header-right"></slot>
          <button 
            v-if="closable"
            @click.stop="$emit('close')" 
            class="text-gray-500 hover:text-white transition-colors p-1 pointer-events-auto rounded hover:bg-white/5"
            title="Fechar (Esc)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Body -->
      <div class="flex-1 overflow-hidden relative bg-[#282c34]">
        <slot></slot>
      </div>

      <!-- Footer -->
      <div v-if="$slots.footer" class="shrink-0 px-3 py-2 bg-[#1e2227] border-t border-gray-800">
        <slot name="footer"></slot>
      </div>

      <!-- Resize Handle -->
      <div 
        class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-[10001] flex items-end justify-end p-0.5 group"
        @pointerdown.stop="startResize"
      >
        <svg class="w-2.5 h-2.5 text-gray-700 group-hover:text-blue-500 transition-colors" viewBox="0 0 24 24" fill="currentColor">
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
