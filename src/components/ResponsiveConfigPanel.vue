<template>
  <div class="w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-[11px] space-y-3">
    <!-- Direção da @media gerada (eixo 2) -->
    <div>
      <div class="font-semibold text-gray-700 mb-1">Direção da @media gerada</div>
      <label
        v-for="opt in directionOptions"
        :key="opt.value"
        class="flex items-center gap-1.5 py-0.5 cursor-pointer text-gray-600 hover:text-gray-900"
      >
        <input
          type="radio"
          name="rc-direction"
          class="accent-indigo-600"
          :checked="config.direction === opt.value"
          @change="set({ direction: opt.value })"
        />
        <span>{{ opt.label }}</span>
      </label>
    </div>

    <!-- Posição de inserção de regra nova (eixo 3) -->
    <div>
      <div class="font-semibold text-gray-700 mb-1">Inserção de regra nova</div>
      <label
        v-for="opt in insertionOptions"
        :key="opt.value"
        class="flex items-center gap-1.5 py-0.5 cursor-pointer text-gray-600 hover:text-gray-900"
      >
        <input
          type="radio"
          name="rc-insertion"
          class="accent-indigo-600"
          :checked="config.insertion === opt.value"
          @change="set({ insertion: opt.value })"
        />
        <span>{{ opt.label }}</span>
      </label>
    </div>

    <!-- Breakpoints do projeto (eixo 4) -->
    <div>
      <div class="flex items-center justify-between mb-1">
        <span class="font-semibold text-gray-700">Breakpoints</span>
        <button
          v-if="config.breakpoints"
          class="text-indigo-600 hover:underline"
          title="Descarta o override e volta aos breakpoints detectados do CSS (ou seed)"
          @click="set({ breakpoints: null })"
        >usar detectados</button>
        <span v-else class="text-gray-400">{{ detectedLabel }}</span>
      </div>
      <div class="flex flex-wrap gap-1 mb-1.5">
        <span
          v-for="bp in styleStore.projectBreakpoints"
          :key="bp"
          class="inline-flex items-center gap-0.5 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono"
        >
          {{ bp }}
          <button
            class="text-gray-400 hover:text-red-500 leading-none"
            :disabled="styleStore.projectBreakpoints.length === 1"
            title="Remover breakpoint (vira override do projeto)"
            @click="removeBreakpoint(bp)"
          >×</button>
        </span>
      </div>
      <div class="flex items-center gap-1">
        <input
          v-model="newBreakpoint"
          type="number"
          min="1"
          placeholder="ex: 992"
          class="w-20 border border-gray-200 rounded px-1.5 py-0.5 font-mono outline-none focus:border-indigo-400"
          @keydown.enter.prevent="addBreakpoint"
        />
        <button
          class="border border-gray-200 rounded px-2 py-0.5 text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
          @click="addBreakpoint"
        >+ adicionar</button>
      </div>
    </div>

    <!-- TODO(backend): persistir responsiveConfig por projeto via API. -->
    <p class="text-gray-400 border-t border-gray-100 pt-2">
      Config do projeto — vale para esta sessão; persistência no backend pendente.
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'

const styleStore = useStyleStore()

const config = computed(() => styleStore.responsiveConfig)

const directionOptions = computed(() => [
  {
    value: 'auto',
    label: `Auto — detectado: ${labelDirection(styleStore.responsiveProfile?.direction) ?? 'sem evidência (usa mobile-first)'}`,
  },
  { value: 'mobile-first',  label: 'Mobile-first (min-width)' },
  { value: 'desktop-first', label: 'Desktop-first (max-width)' },
])

const insertionOptions = computed(() => [
  {
    value: 'auto',
    label: `Auto — detectado: ${labelInsertion(styleStore.responsiveProfile?.insertion) ?? 'sem evidência (usa adjacente)'}`,
  },
  { value: 'breakpoint-blocks', label: 'Blocão por breakpoint' },
  { value: 'rule-adjacent',     label: 'Adjacente à regra base' },
  { value: 'file-end',          label: 'Fim do arquivo' },
])

const detectedLabel = computed(() =>
  styleStore.responsiveProfile?.breakpoints?.length ? 'detectados do CSS' : 'seed do editor'
)

function labelDirection(d) {
  return d === 'mobile-first' ? 'mobile-first' : d === 'desktop-first' ? 'desktop-first' : null
}
function labelInsertion(i) {
  return i === 'rule-adjacent' ? 'adjacente' : i === 'breakpoint-blocks' ? 'blocão' : null
}

function set(partial) {
  styleStore.setResponsiveConfig(partial)
}

// Editar a lista materializa o override do projeto (config.breakpoints).
const newBreakpoint = ref('')

function addBreakpoint() {
  const w = Math.round(Number(newBreakpoint.value))
  if (!w || w <= 0) return
  const next = [...new Set([...styleStore.projectBreakpoints, w])].sort((a, b) => a - b)
  set({ breakpoints: next })
  newBreakpoint.value = ''
}

function removeBreakpoint(bp) {
  if (styleStore.projectBreakpoints.length === 1) return
  set({ breakpoints: styleStore.projectBreakpoints.filter(b => b !== bp) })
}
</script>
