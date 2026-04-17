<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  show:            { type: Boolean, default: false },
  title:           { type: String,  default: 'Window' },
  initialX:        { type: Number,  default: 0 },
  initialY:        { type: Number,  default: 0 },
  initialWidth:    { type: Number,  default: 400 },
  initialHeight:   { type: Number,  default: 300 },
  minWidth:        { type: Number,  default: 100 },
  minHeight:       { type: Number,  default: 100 },
  blueIndicator:  { type: Boolean, default: false },
  closable:        { type: Boolean, default: true },
  closeOnClickOutside: { type: Boolean, default: true },
  theme:           { type: String,  default: 'dark' }, // 'dark' | 'light'
  minimizable:     { type: Boolean, default: true },
  minimalist:      { type: Boolean, default: false }, // Compact header and no body padding
  zIndex:          { type: Number,  default: 10000 },
})

const emit = defineEmits(['close', 'move', 'resize', 'focus'])

const container = ref(null)
const pos = ref({ x: props.initialX, y: props.initialY })
const size = ref({ width: props.initialWidth, height: props.initialHeight })
const isDragging = ref(false)
const isResizing = ref(false)
const isMinimized = ref(false)

let dragOffset = { x: 0, y: 0 }
let resizeStartSize = { w: 0, h: 0 }
let resizeStartPos = { x: 0, y: 0 }

const positionStyle = computed(() => ({
  display: props.show ? 'flex' : 'none',
  left: `${pos.value.x}px`,
  top: `${pos.value.y}px`,
  width: `${size.value.width}px`,
  height: isMinimized.value ? 'auto' : `${size.value.height}px`,
  zIndex: props.zIndex
}))

const themeClasses = computed(() => {
  if (props.theme === 'light') {
    return {
      container: 'bg-white/95 backdrop-blur-md border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.15)]',
      header: 'bg-gray-50/80 border-black/[0.05]',
      title: 'text-blue-600',
      body: 'bg-white/50',
      footer: 'bg-gray-50/80 border-black/[0.05]',
      closeBtn: 'text-gray-400 hover:text-gray-900 hover:bg-black/5',
      resizeIcon: 'text-gray-300'
    }
  }
  return {
    container: 'bg-[#282c34] border-gray-100/10 shadow-2xl',
    header: 'bg-[#21252b] border-gray-800',
    title: 'text-blue-400',
    body: 'bg-[#282c34]',
    footer: 'bg-[#1e2227] border-gray-800',
    closeBtn: 'text-gray-500 hover:text-white hover:bg-white/5',
    resizeIcon: 'text-gray-700'
  }
})

// --- DRAG ---
function startDrag(e) {
  
  isDragging.value = true
  emit('focus') // Traz para frente ao começar a arrastar
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
  if (!props.show || !props.closable || !props.closeOnClickOutside) return

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
      class="fixed rounded-lg border overflow-hidden flex flex-col"
      :class="[
        isDragging || isResizing ? 'transition-none select-none' : 'transition-[left,top,width,height] duration-200',
        themeClasses.container
      ]"
      :style="positionStyle"
      @pointerdown="emit('focus')"
    >
      <div 
        class="flex items-center justify-between px-3 border-b shrink-0 select-none cursor-grab active:cursor-grabbing"
        :class="[
          themeClasses.header,
          minimalist ? 'h-7' : 'h-9'
        ]"
        @pointerdown="startDrag"
      >
        <div class="flex items-center gap-2 pointer-events-none overflow-hidden">
          <slot name="header-left">
            <span v-if="blueIndicator" class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
            <span 
              class="text-[10px] font-bold uppercase tracking-widest shrink-0 truncate"
              :class="themeClasses.title"
            >
              {{ title }}
            </span>
          </slot>
        </div>
        
        <div class="flex items-center gap-1 shrink-0">
          <slot name="header-right"></slot>
          
          <!-- Minimize Button -->
          <button 
            v-if="minimizable"
            @click.stop="isMinimized = !isMinimized" 
            class="transition-colors p-1 pointer-events-auto rounded flex items-center justify-center"
            :class="themeClasses.closeBtn"
            :title="isMinimized ? 'Expandir' : 'Minimizar'"
          >
            <svg v-if="isMinimized" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 13l-7 7-7-7" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18 12H6" />
            </svg>
          </button>

          <button 
            v-if="closable"
            @click.stop="$emit('close')" 
            class="transition-colors p-1 pointer-events-auto rounded"
            :class="themeClasses.closeBtn"
            title="Fechar (Esc)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Body -->
      <div 
        v-show="!isMinimized"
        class="flex-1 overflow-hidden relative"
        :class="[themeClasses.body, minimalist ? 'p-0' : '']"
      >
        <slot></slot>
      </div>

      <!-- Footer -->
      <div 
        v-if="$slots.footer && !isMinimized" 
        class="shrink-0 px-3 py-2 border-t"
        :class="themeClasses.footer"
      >
        <slot name="footer"></slot>
      </div>

      <!-- Resize Handle -->
      <div 
        v-show="!isMinimized"
        class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-[10001] flex items-end justify-end p-0.5 group"
        @pointerdown.stop="startResize"
      >
        <svg 
          class="w-2.5 h-2.5 transition-colors group-hover:text-blue-500" 
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
