<template>
  <div class="flex items-center gap-0.5">
    <!-- Direção da cascata (mobile/desktop-first) — accent fuchsia, casa com section headers -->
    <span
      class="flex items-center gap-1 mr-1.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-600 select-none whitespace-nowrap"
      :title="directionInfo.title">

      {{ directionInfo.label }}

    </span>
    <!-- Faixa de breakpoints + seta de alcance da cascata -->
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-0.5">
        <!-- mobile-first: base aplica DE 0 e cresce (marcador "0" à esquerda) -->
        <div>
          <button class="btn-bp" @click="update(100, '%')" :class="previewUnit === '%' && previewWidth === 100
            ? 'is-selected'
            : 'is-base'
            " title="Base (Mobile-first) — aplica a partir de 0 e cresce; sobrescrito pelos breakpoints maiores"
            v-if="styleStore.resolvedDirection == 'mobile-first'">

            <span class="block text-[10px] text-center"> a partir de 0 </span>
          </button>

        </div>

        <!-- Breakpoints do projeto: detectados do CSS > override do usuário > seed.
         Fonte: StyleStore.projectBreakpoints (docs/EDITING_ROADMAP.md). -->
        <div v-for="bp in breakpointButtons" :key="bp.width" class="flex flex-col items-center">
          <button class="btn-bp" :class="previewUnit === 'px' && previewWidth === bp.width
            ? 'is-selected'
            : 'is-base'
            " :title="bp.title" @click="update(bp.width, 'px')">
            <component :is="ICONS[bp.iconKey]" />
          </button>

          <span class="block text-[10px] text-center">
            <span v-if="previewUnit === 'px' && previewWidth === bp.width">
              <span v-if="styleStore.resolvedDirection == 'mobile-first'">a partir de {{ bp.width }}</span>
              <span v-else>até {{ bp.width }}</span>
            </span>
          </span>

        </div>

        <!-- desktop-first: base aplica ATÉ O FIM (marcador "∞" à direita) -->
        <button class="btn-bp" @click="update(100, '%')" :class="previewUnit === '%' && previewWidth === 100
          ? 'is-selected'
          : 'is-base'
          " title="Base (Desktop-first) — aplica até o fim (maior largura); sobrescrito pelos breakpoints menores"
          v-if="styleStore.resolvedDirection == 'desktop-first'">

          <span class="block text-[10px] text-center flex items-center gap-1"> até o fim</span>

        </button>
      </div>


    </div>

    <div
      class="ml-2 flex items-center bg-white border border-gray-200 rounded-md px-1.5 focus-within:border-fuchsia-400 focus-within:ring-1 focus-within:ring-fuchsia-400/20 transition-all h-7">
      <input type="number"
        class="w-10 text-right bg-transparent text-[11px] outline-none font-mono font-medium text-gray-700"
        :value="previewWidth" @change="(e) => update(Number(e.target.value), 'px')" />
      <span class="text-[10px] font-semibold text-gray-400 ml-1">{{ previewUnit }}</span>
    </div>

    <!-- Config de responsividade (direção / inserção / breakpoints) -->
    <div class="relative">
      <button class="flex items-center justify-center p-1.5 rounded-sm transition-colors" :class="showConfig
        ? 'bg-white ring-1 ring-gray-200/60 text-fuchsia-600'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
        " title="Configuração de responsividade do projeto" @click="showConfig = !showConfig">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      <div v-if="showConfig" class="fixed inset-0 z-40" @click="showConfig = false"></div>
      <div v-if="showConfig" class="absolute top-full right-0 mt-1 z-50" @click.stop>
        <ResponsiveConfigPanel />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { isBaseBreakpoint } from '@/editor/css/shared/breakpointStrategy'
import ResponsiveConfigPanel from '@/components/ResponsiveConfigPanel.vue'
import IconBreakpointXS from '@/components/icons/IconBreakpointXS.vue'
import IconBreakpointSM from '@/components/icons/IconBreakpointSM.vue'
import IconBreakpointMD from '@/components/icons/IconBreakpointMD.vue'
import IconBreakpointLG from '@/components/icons/IconBreakpointLG.vue'
import IconBreakpointXL from '@/components/icons/IconBreakpointXL.vue'
import IconBreakpoint2XL from '@/components/icons/IconBreakpoint2XL.vue'

const styleStore = useStyleStore()
const showConfig = ref(false)

defineProps({
  previewWidth: {
    type: Number,
    default: 1280,
  },
  previewUnit: {
    type: String,
    default: 'px',
  },
})
const emit = defineEmits(['update'])

/** Mapa fora da reatividade — componentes não devem virar objetos reativos. */
const ICONS = {
  xs: IconBreakpointXS,
  sm: IconBreakpointSM,
  md: IconBreakpointMD,
  lg: IconBreakpointLG,
  xl: IconBreakpointXL,
  '2xl': IconBreakpoint2XL,
}

const LABELS = {
  xs: 'Mobile',
  sm: 'Mobile Landscape',
  md: 'Tablet',
  lg: 'Laptop',
  xl: 'Desktop',
  '2xl': 'Wide',
}

/** Ícone por faixa de largura — breakpoints detectados raramente batem o seed. */
function iconKeyFor(width) {
  if (width < 480) return 'xs'
  if (width < 700) return 'sm'
  if (width < 900) return 'md'
  if (width < 1200) return 'lg'
  if (width < 1400) return 'xl'
  return '2xl'
}

/** Rótulo de direção da cascata + seta de crescimento. */
const directionInfo = computed(() => {
  const isMobileFirst = styleStore.resolvedDirection === 'mobile-first'
  return {
    label: isMobileFirst ? 'Mobile-first' : 'Desktop-first',
    // mobile-first cresce p/ telas maiores (→); desktop-first cascateia p/ menores (←)
    arrow: isMobileFirst ? '→' : '←',
    arrowBefore: !isMobileFirst,
    // Sentido do alcance da regra a partir do breakpoint escolhido
    rangeLabel: isMobileFirst ? 'a partir daqui' : 'até aqui',
    title: isMobileFirst
      ? 'Mobile-first: edita do menor p/ o maior; @media (min-width)'
      : 'Desktop-first: edita do maior p/ o menor; @media (max-width)',
  }
})

const breakpointButtons = computed(() => {
  const bps = [...styleStore.projectBreakpoints].sort((a, b) => a - b)
  return bps.map((width) => {
    const iconKey = iconKeyFor(width)
    const isBase = isBaseBreakpoint(width, styleStore.resolvedDirection, bps)
    return {
      width,
      iconKey,
      isBase,
      title: `${LABELS[iconKey]} (${width}px)${isBase ? ' — base da estratégia' : ''}`,
    }
  })
})

function update(width, unit) {
  emit('update', { width: width, unit: unit })
}
</script>

<style scoped>
/* Tailwind 4: cada <style> SFC compila isolado — sem isto @apply não resolve utilities */
@reference "../../assets/base.css";

.btn-bp {
  @apply relative flex items-center justify-center p-1.5 rounded-sm transition-colors;
}

.btn-bp.is-base {
  @apply text-gray-500 hover:text-gray-800 hover:bg-gray-200/50;
}

.btn-bp.is-selected {
  @apply bg-fuchsia-600 text-white shadow-sm;
}
</style>
