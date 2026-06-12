<template>
  <div class="flex items-center gap-0.5">
    <!-- Breakpoints do projeto: detectados do CSS > override do usuário > seed.
         Fonte: StyleStore.projectBreakpoints (docs/EDITING_ROADMAP.md). -->
    <button
      v-for="bp in breakpointButtons"
      :key="bp.width"
      class="relative flex items-center justify-center p-1.5 rounded-sm transition-colors"
      :class="previewUnit === 'px' && previewWidth === bp.width
        ? 'bg-white ring-1 ring-gray-200/60 text-indigo-600'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      :title="bp.title"
      @click="update(bp.width, 'px')"
    >
      <component :is="ICONS[bp.iconKey]" />
      <!-- Marcador do breakpoint base da estratégia (edita sem @media) -->
      <span
        v-if="bp.isBase"
        class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 pointer-events-none"
      ></span>
    </button>

    <button
      class="flex items-center justify-center p-1.5 rounded-sm transition-colors"
      @click="update(100, '%')"
      :class="previewUnit === '%' && previewWidth === 100 ? 'bg-white ring-1 ring-gray-200/60 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      title="Full Width (100%)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
    </button>

    <div class="ml-2 flex items-center bg-white border border-gray-200 rounded-md px-1.5 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/20 transition-all h-7">
      <input
        type="number"
        class="w-10 text-right bg-transparent text-[11px] outline-none font-mono font-medium text-gray-700"
        :value="previewWidth"
        @change="(e) => update(Number(e.target.value), 'px')"
      />
      <span class="text-[10px] font-semibold text-gray-400 ml-1">px</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { isBaseBreakpoint } from '@/editor/css/shared/breakpointStrategy'
import IconBreakpointXS from '@/components/icons/IconBreakpointXS.vue'
import IconBreakpointSM from '@/components/icons/IconBreakpointSM.vue'
import IconBreakpointMD from '@/components/icons/IconBreakpointMD.vue'
import IconBreakpointLG from '@/components/icons/IconBreakpointLG.vue'
import IconBreakpointXL from '@/components/icons/IconBreakpointXL.vue'
import IconBreakpoint2XL from '@/components/icons/IconBreakpoint2XL.vue'

const styleStore = useStyleStore()

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
  if (width < 480)  return 'xs'
  if (width < 700)  return 'sm'
  if (width < 900)  return 'md'
  if (width < 1200) return 'lg'
  if (width < 1400) return 'xl'
  return '2xl'
}

const breakpointButtons = computed(() => {
  const bps = [...styleStore.projectBreakpoints].sort((a, b) => a - b)
  return bps.map(width => {
    const iconKey = iconKeyFor(width)
    const isBase  = isBaseBreakpoint(width, styleStore.resolvedDirection, bps)
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
