<!-- src/components/CssAutocompleteDropdown.vue
     Dropdown de sugestões para o autocomplete CSS.

     Uso:
       <CssAutocompleteDropdown :ac="acInstance" @select="ac.accept($event)" />

     O componente é posicionado logo abaixo do input host via CSS absolute.
     O componente host deve ter position: relative no wrapper do input.
-->
<template>
  <Teleport to="body">
    <ul
      v-if="ac.isActive.value"
      ref="listEl"
      class="css-ac-dropdown"
      :class="{ 'is-positioned': isPositioned }"
      :style="dropdownStyle"
    >
      <li
        v-for="(item, i) in ac.suggestions.value"
        :key="item"
        :ref="el => { if (el) itemRefs[i] = el }"
        class="css-ac-item"
        :class="{ 'css-ac-item--active': i === ac.activeIdx.value }"
        @mousedown.prevent="ac.accept(item)"
        @mouseover="ac.activeIdx.value = i"
      >
        {{ item }}
      </li>
    </ul>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  ac: { type: Object, required: true },
  anchor: { type: Object, default: null },
})

const listEl   = ref(null)
const itemRefs = ref([])
const dropdownStyle = ref({})
const isPositioned  = ref(false)

// Scroll para o item ativo ao navegar com teclado
watch(() => props.ac.activeIdx.value, idx => {
  if (idx < 0) return
  nextTick(() => {
    itemRefs.value[idx]?.scrollIntoView({ block: 'nearest' })
  })
})

function updatePosition() {
  const el = props.anchor
  if (!el || !props.ac.isActive.value) {
    isPositioned.value = false
    return
  }
  const rect = el.getBoundingClientRect()
  
  // Se o elemento não houver visibilidade ou rect válido, não posiciona
  if (rect.width === 0 && rect.height === 0) return

  dropdownStyle.value = {
    top:       `${rect.bottom + 2}px`,
    left:      `${rect.left}px`,
    minWidth:  `${Math.max(rect.width, 140)}px`,
  }
  isPositioned.value = true
}

// Observa ativação e mudanças de anchor para reposicionar
watch(() => props.ac.isActive.value, v => {
  if (v) {
    isPositioned.value = false // reseta até o próximo tick
    nextTick(updatePosition)
  }
})

watch(() => props.ac.suggestions.value, () => {
  if (props.ac.isActive.value) nextTick(updatePosition)
  itemRefs.value = []
})

watch(() => props.anchor, () => {
  if (props.ac.isActive.value) nextTick(updatePosition)
}, { immediate: true })

// Reposiciona no resize da janela
onMounted(() => {
  window.addEventListener('resize', updatePosition)
})
onUnmounted(() => {
  window.removeEventListener('resize', updatePosition)
})
</script>

<style scoped>
.css-ac-dropdown {
  position: fixed;
  z-index: 10000;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 220px;
  overflow-y: auto;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  
  /* Esconde até que o posicionamento seja calculado */
  opacity: 0;
  pointer-events: none;
  transform: translateY(-5px);
  transition: opacity 0.1s, transform 0.1s;
}

.css-ac-dropdown.is-positioned {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.css-ac-item {
  padding: 4px 12px;
  cursor: pointer;
  color: #374151;
  white-space: nowrap;
  transition: background 0.1s, color 0.1s;
}

.css-ac-item:hover,
.css-ac-item--active {
  background: #eff6ff;
  color: #2563eb;
}
</style>
