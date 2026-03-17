<!--
  TagAutocomplete.vue

  Popup de autocomplete de tags HTML.
  Aparece ao clicar no botão "+" do overlay de seleção.

  - Input com foco automático
  - Filtra as ~80 tags HTML5 conforme o usuário digita
  - ↑↓ navega, Enter confirma, Escape fecha
  - Ao confirmar, emite o nome da tag escolhida
-->
<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { HTML_TAGS } from '@/editor/html/htmlTags'

const props = defineProps({
  /** Estilo de posicionamento (position:fixed calculado pelo pai) */
  style: { type: Object, default: () => ({}) },
})

const emit = defineEmits([
  'select', // tag: string
  'close',
])

// ── Estado local ──────────────────────────────────────────────────────────────

const query       = ref('')
const activeIndex = ref(0)
const inputRef    = ref(null)

// ── Filtragem ─────────────────────────────────────────────────────────────────

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return HTML_TAGS.slice(0, 12) // mostra os primeiros 12 por padrão
  return HTML_TAGS.filter(t => t.startsWith(q)).slice(0, 12)
})

// Garante que o índice ativo fica dentro dos limites ao filtrar
const safeIndex = computed(() =>
  Math.min(activeIndex.value, Math.max(filtered.value.length - 1, 0))
)

// ── Keyboard ──────────────────────────────────────────────────────────────────

function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (safeIndex.value + 1) % filtered.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (safeIndex.value - 1 + filtered.value.length) % filtered.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    confirm(filtered.value[safeIndex.value])
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

function confirm(tag) {
  if (tag) emit('select', tag)
}

// Reseta o índice ativo quando o filtro muda
function onInput() {
  activeIndex.value = 0
}

// ── Mount ─────────────────────────────────────────────────────────────────────

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})
</script>

<template>
  <!-- Teleport garante que fica por cima de tudo -->
  <Teleport to="body">
    <div class="tac-popup" :style="style" @mousedown.stop @click.stop>

      <!-- Input de busca -->
      <input
        ref="inputRef"
        v-model="query"
        class="tac-input"
        placeholder="tag…"
        spellcheck="false"
        autocomplete="off"
        @keydown="onKeydown"
        @input="onInput"
      />

      <!-- Lista de sugestões -->
      <ul class="tac-list" v-if="filtered.length">
        <li
          v-for="(tag, idx) in filtered"
          :key="tag"
          class="tac-item"
          :class="{ 'tac-item--active': idx === safeIndex }"
          @mousedown.prevent="confirm(tag)"
        >
          <span class="tac-tag">&lt;{{ tag }}&gt;</span>
        </li>
      </ul>
      <p v-else class="tac-empty">Nenhuma tag encontrada</p>

    </div>
  </Teleport>
</template>

<style scoped>
.tac-popup {
  position: fixed;
  z-index: 10000;
  background: #1e1e2e;
  border: 1px solid #3b3b5c;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0,0,0,.45);
  padding: 6px;
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tac-input {
  height: 28px;
  background: #313244;
  border: 1px solid #4a4a6a;
  border-radius: 5px;
  color: #cdd6f4;
  font-family: monospace;
  font-size: 12px;
  padding: 0 8px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.tac-input:focus { border-color: #6366f1; }

.tac-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-height: 220px;
  overflow-y: auto;
}

.tac-item {
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 80ms;
}
.tac-item:hover,
.tac-item--active {
  background: #313244;
}

.tac-tag {
  font-family: monospace;
  font-size: 12px;
  color: #89b4fa;
}

.tac-empty {
  font-size: 11px;
  color: #585b70;
  text-align: center;
  margin: 4px 0;
}
</style>
