<template>
  <!-- Header -->
  <div class="px-2 py-1.5 bg-gradient-to-b from-gray-100 to-gray-50 border-b border-gray-200 flex items-center gap-1 shrink-0">

    <!-- Título + contador -->
    <div class="flex items-center gap-1.5 min-w-0 mr-auto">
      <svg class="w-3 h-3 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10M5 3h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/>
      </svg>
      <span class="text-[11px] font-semibold text-gray-600 tracking-wide truncate">CSS</span>
      <span v-if="search.searchQuery.value.trim()" class="text-[10px] text-blue-500 font-medium shrink-0">
        {{ search.matchCount.value }} match{{ search.matchCount.value !== 1 ? 'es' : '' }}
      </span>
      <span v-else class="text-[10px] text-gray-400 tabular-nums shrink-0">{{ nodeCount }}</span>
    </div>

    <!-- Botões de ação -->
    <div class="flex items-center gap-0.5">

      <!-- Search toggle -->
      <button
        @click="search.searchActive.value ? search.clearSearch() : search.openSearch()"
        class="w-6 h-6 flex items-center justify-center rounded transition-colors"
        :class="search.searchActive.value ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'"
        title="Buscar (Ctrl+F)"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
        </svg>
      </button>

      <!-- Expand / Collapse All -->
      <button
        @click="expansion.isFullyExpanded.value ? expansion.collapseAll() : expansion.expandAll()"
        class="w-6 h-6 flex items-center justify-center rounded transition-colors text-gray-400 hover:text-gray-700 hover:bg-gray-200"
        :title="expansion.isFullyExpanded.value ? 'Recolher tudo' : 'Expandir tudo'"
      >
        <svg v-if="expansion.isFullyExpanded.value" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14l7-7m0 0V3m0 4H7M20 10l-7 7m0 0v4m0-4h4"/>
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
        </svg>
      </button>

      <!-- Refresh -->
      <button
        @click="$emit('refresh')"
        class="w-6 h-6 flex items-center justify-center rounded transition-colors text-gray-400 hover:text-gray-700 hover:bg-gray-200"
        title="Recarregar árvore CSS"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>

      <!-- Separador -->
      <div class="w-px h-4 bg-gray-200 mx-0.5"></div>

      <!-- New Stylesheet (+) dropdown -->
      <div class="relative" ref="menuRef">
        <button
          @click.stop="newSheetMenu = !newSheetMenu"
          class="w-6 h-6 flex items-center justify-center rounded transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          title="Novo stylesheet"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
        <div
          v-if="newSheetMenu"
          class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 z-50 min-w-[180px] text-[11px]"
          @click.stop
        >
          <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Novo Stylesheet</div>

          <!-- Input inline (substitui window.prompt) -->
          <div v-if="newSheetInputType" class="px-2 pb-2">
            <div class="text-[10px] text-gray-500 mb-1 px-1">
              {{ newSheetInputType === 'internal' ? 'Nome do arquivo:' : 'URL externa:' }}
            </div>
            <input
              v-model="newSheetInputValue"
              :placeholder="newSheetInputType === 'internal' ? 'styles.css' : 'https://cdn.example.com/x.css'"
              class="w-full border border-gray-300 rounded px-2 py-1 text-[11px] outline-none focus:border-blue-400 mb-1"
              @keydown.enter.prevent="confirmCreateStylesheet"
              @keydown.escape.prevent="newSheetInputType = null"
              autofocus
            />
            <div class="flex gap-1">
              <button
                @click.stop="confirmCreateStylesheet"
                class="flex-1 bg-blue-500 text-white rounded px-2 py-1 text-[10px] font-medium hover:bg-blue-600"
              >Criar</button>
              <button
                @click.stop="newSheetInputType = null"
                class="flex-1 bg-gray-100 text-gray-600 rounded px-2 py-1 text-[10px] hover:bg-gray-200"
              >Cancelar</button>
            </div>
          </div>

          <!-- Botões de tipo -->
          <template v-else>
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-gray-700"
              @click.stop="requestNewSheet('on_page')"
            >
              <span class="text-indigo-500 font-mono">&lt;style&gt;</span>
              On-page
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-gray-700"
              @click.stop="requestNewSheet('internal')"
            >
              <span class="text-blue-500 font-mono">&lt;link&gt;</span>
              Internal
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-gray-700"
              @click.stop="requestNewSheet('external')"
            >
              <span class="text-orange-500 font-mono">🔗</span>
              External
            </button>
          </template>
        </div>
      </div>

    </div>
  </div>

  <!-- Search bar -->
  <transition name="search-bar">
    <div v-if="search.searchActive.value" class="px-2 py-1.5 bg-[#f8f8f8] border-b border-[#d1d1d1] flex items-center gap-1.5 shrink-0">
      <svg class="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
      </svg>
      <input
        :ref="(el) => (search.searchInputRef.value = el)"
        v-model="search.searchQuery.value"
        type="text"
        placeholder="Filter rules…"
        class="flex-1 min-w-0 bg-transparent outline-none text-[11px] text-gray-700 placeholder-gray-400 font-mono"
        @keydown.escape.stop="search.clearSearch()"
      />

      <button
        v-if="search.searchQuery.value"
        @click="search.searchQuery.value = ''"
        class="text-gray-400 hover:text-gray-700 text-[11px] leading-none font-bold shrink-0"
        title="Clear"
      >×</button>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['refresh', 'create-stylesheet'])

defineProps({
  // Objetos dos composables useExplorerSearch/useTreeExpansion do pai —
  // refs internos NÃO fazem auto-unwrap aqui (acessar com .value).
  search: { type: Object, required: true },
  expansion: { type: Object, required: true },
  nodeCount: { type: Number, default: 0 },
})

// ── New Stylesheet dropdown (estado local do header) ─────────────────────────
const newSheetMenu = ref(false)
// Input inline (evita window.prompt que é bloqueado por browsers)
const newSheetInputType = ref(null) // null | 'internal' | 'external'
const newSheetInputValue = ref('')
const menuRef = ref(null)

function requestNewSheet(type) {
  if (type === 'on_page') {
    newSheetMenu.value = false
    emit('create-stylesheet', 'on_page', null)
    return
  }
  newSheetInputType.value = type
  newSheetInputValue.value = type === 'internal' ? 'styles.css' : 'https://'
}

function confirmCreateStylesheet() {
  const type = newSheetInputType.value
  const href = newSheetInputValue.value?.trim()
  // Reset antes de qualquer await no pai
  newSheetInputType.value = null
  newSheetInputValue.value = ''
  newSheetMenu.value = false
  if (!href) return
  emit('create-stylesheet', type, href)
}

// Clique fora fecha o dropdown (antes era o @click no root do Explorer)
function onDocClick(e) {
  if (newSheetMenu.value && menuRef.value && !menuRef.value.contains(e.target)) {
    newSheetMenu.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
/* Search bar slide-down animation */
.search-bar-enter-active,
.search-bar-leave-active {
  transition: max-height 0.15s ease, opacity 0.15s ease;
  overflow: hidden;
}
.search-bar-enter-from,
.search-bar-leave-to {
  max-height: 0;
  opacity: 0;
}
.search-bar-enter-to,
.search-bar-leave-from {
  max-height: 40px;
  opacity: 1;
}
</style>
