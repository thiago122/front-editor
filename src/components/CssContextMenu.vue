<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  /** { x, y, items: [{ label, icon?, action, divider? }] } — null = hidden */
  menu: { type: Object, default: null },
})

const emit = defineEmits(['close'])
const menuEl = ref(null)

// Adjust position so the menu never goes off-screen
const style = ref({})
watch(() => props.menu, (m) => {
  if (!m) return
  // Use nextTick equivalent: after DOM update the el is rendered
  requestAnimationFrame(() => {
    if (!menuEl.value) return
    const { innerWidth: vw, innerHeight: vh } = window
    const { offsetWidth: w, offsetHeight: h } = menuEl.value
    style.value = {
      left: Math.min(m.x, vw - w - 8) + 'px',
      top:  Math.min(m.y, vh - h - 8) + 'px',
    }
  })
})

function close() { emit('close') }

// Close on click outside or Escape
function onKeydown(e) { if (e.key === 'Escape') close() }
function onPointerdown(e) {
  if (menuEl.value && !menuEl.value.contains(e.target)) close()
}
onMounted(() => {
  window.addEventListener('pointerdown', onPointerdown, true)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onPointerdown, true)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="menu"
      ref="menuEl"
      class="fixed z-[9999] min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-xl py-1 text-[12px] select-none"
      :style="style"
      @contextmenu.prevent
    >
      <template v-for="(item, i) in menu.items" :key="i">
        <!-- Divider -->
        <div v-if="item.divider" class="my-1 border-t border-gray-100" />
        <!-- Item -->
        <button
          v-else
          class="w-full text-left flex items-center gap-2 px-3 py-1.5 transition-colors"
          :class="[
            item.disabled  ? 'text-gray-400 cursor-default'                      : '',
            item.danger    ? 'text-red-600 hover:bg-red-50'                      : '',
            !item.disabled && !item.danger ? 'text-gray-700 hover:bg-gray-50'   : '',
          ]"
          :disabled="item.disabled"
          @click="() => { if (!item.disabled) { item.action?.(); close() } }"
        >
          <span v-if="item.icon" class="text-[10px] w-3 text-gray-400">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
