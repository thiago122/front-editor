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
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  ac: { type: Object, required: true },
  anchor: { type: Object, default: null },
})

const listEl   = ref(null)
const itemRefs = ref([])
const dropdownStyle = ref({})

// Scroll para o item ativo ao navegar com teclado
watch(() => props.ac.activeIdx.value, idx => {
  if (idx < 0) return
  nextTick(() => {
    itemRefs.value[idx]?.scrollIntoView({ block: 'nearest' })
  })
})

function updatePosition() {
  const el = props.anchor
  if (!el || !props.ac.isActive.value) return
  const rect = el.getBoundingClientRect()
  dropdownStyle.value = {
    position:  'fixed',
    top:       `${rect.bottom + 2}px`,
    left:      `${rect.left}px`,
    minWidth:  `${Math.max(rect.width, 140)}px`,
    zIndex:    9999,
  }
}

watch(() => props.ac.isActive.value, v => {
  if (v) nextTick(updatePosition)
})

watch(() => props.ac.suggestions.value, () => {
  if (props.ac.isActive.value) nextTick(updatePosition)
  itemRefs.value = []
})
</script>

<style scoped>
.css-ac-dropdown {
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  list-style: none;
  margin: 0;
  padding: 2px 0;
  max-height: 220px;
  overflow-y: auto;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.css-ac-item {
  padding: 3px 10px;
  cursor: pointer;
  color: #374151;
  white-space: nowrap;
  transition: background 0.08s;
}

.css-ac-item:hover,
.css-ac-item--active {
  background: #eff6ff;
  color: #1d4ed8;
}
</style>
