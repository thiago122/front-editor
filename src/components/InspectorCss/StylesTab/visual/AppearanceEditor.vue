<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useVisualSection } from '@/composables/useVisualSection'
import VisualInput from '@/components/ui/VisualInput.vue'
import VisualSelect from '@/components/ui/VisualSelect.vue'
import VisualToggleGroup from '@/components/ui/VisualToggleGroup.vue'
import VisualFieldset from '@/components/ui/VisualFieldset.vue'
import ColorVarInput from '@/components/ui/ColorVarInput.vue'
import BoxShadowEditor from './BoxShadowEditor.vue'
import BorderEditor from './BorderEditor.vue'
import BorderRadiusEditor from './BorderRadiusEditor.vue'

const props = defineProps({
  ruleGetter: { type: Function, required: true }
})
const getRule = () => props.ruleGetter()

const APPEARANCE_PROPS = [
  'opacity', 'visibility',
  'background-color', 'background-image', 'background-size',
  'background-position', 'background-position-x', 'background-position-y',
  'background-repeat', 'background-repeat-x', 'background-repeat-y', 'background-attachment',
  'box-shadow', 'cursor', 'pointer-events', 'user-select', 'resize',
  'filter', 'backdrop-filter', 'mix-blend-mode', 'isolation',
  'transform', 'transform-origin', 'transform-style', 'perspective', 'backface-visibility',
]

const { hasAnyValue, useProp } = useVisualSection(getRule, APPEARANCE_PROPS)

const emit = defineEmits(['has-value'])
watch(hasAnyValue, (v) => emit('has-value', v), { immediate: true })

const opacity      = useProp('opacity')
const visibility   = useProp('visibility')
const bgColor      = useProp('background-color')
const bgImage      = useProp('background-image')
const bgSize       = useProp('background-size')
const bgPos        = useProp('background-position')
const bgPosX       = useProp('background-position-x')
const bgPosY       = useProp('background-position-y')
const bgRepeat     = useProp('background-repeat')
const bgRepeatX    = useProp('background-repeat-x')
const bgRepeatY    = useProp('background-repeat-y')
const bgAttach     = useProp('background-attachment')
const cursor       = useProp('cursor')
const transform    = useProp('transform')
const transOrigin  = useProp('transform-origin')

// Background Position Logic
const isPositionLinked = ref(true)
const positionBackup = ref({ linked: null, x: null, y: null })
function togglePositionLink() {
  if (isPositionLinked.value) {
    positionBackup.value.linked = bgPos.raw.value
    bgPos.set(null); bgPosX.set(positionBackup.value.x); bgPosY.set(positionBackup.value.y); isPositionLinked.value = false
  } else {
    positionBackup.value.x = bgPosX.raw.value; positionBackup.value.y = bgPosY.raw.value
    bgPosX.set(null); bgPosY.set(null); bgPos.set(positionBackup.value.linked); isPositionLinked.value = true
  }
}

// Background Repeat Logic
const isRepeatLinked = ref(true)
const repeatBackup = ref({ linked: null, x: null, y: null })
function toggleRepeatLink() {
  if (isRepeatLinked.value) {
    repeatBackup.value.linked = bgRepeat.raw.value
    bgRepeat.set(null); bgRepeatX.set(repeatBackup.value.x); bgRepeatY.set(repeatBackup.value.y)
    isRepeatLinked.value = false
  } else {
    repeatBackup.value.x = bgRepeatX.raw.value; repeatBackup.value.y = bgRepeatY.raw.value
    bgRepeatX.set(null); bgRepeatY.set(null); bgRepeat.set(repeatBackup.value.linked)
    isRepeatLinked.value = true
  }
}


const visibilityOptions = [
  { value: 'visible',  label: 'Visible', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>` },
  { value: 'hidden',   label: 'Hidden',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>` },
]
const bgRepeatOptions = [
  { value: 'repeat',    label: 'XY',    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>` },
  { value: 'repeat-x',  label: 'X',     icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/><rect x="15" y="9" width="6" height="6"/></svg>` },
  { value: 'repeat-y',  label: 'Y',     icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="9" y="3" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/><rect x="9" y="15" width="6" height="6"/></svg>` },
  { value: 'space',     label: 'Space', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><rect x="16" y="16" width="5" height="5"/></svg>` },
  { value: 'round',     label: 'Round', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>` },
  { value: 'no-repeat', label: 'None',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="8" y="8" width="8" height="8"/></svg>` },
]
const bgRepeatAxisOptions = [
  { value: 'repeat',    label: 'Repeat', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/><rect x="15" y="9" width="6" height="6"/></svg>` },
  { value: 'space',     label: 'Space',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="9" width="5" height="6"/><rect x="17" y="9" width="5" height="6"/></svg>` },
  { value: 'round',     label: 'Round',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="9" width="7" height="6" rx="1"/><rect x="14" y="9" width="7" height="6" rx="1"/></svg>` },
  { value: 'no-repeat', label: 'None',   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="8" y="9" width="8" height="6"/></svg>` },
]
const cursorOptions = ['default', 'pointer', 'not-allowed', 'move', 'text', 'zoom-in'].map(c => ({ label: c, value: c }))
</script>

<template>
  <div class="flex flex-col gap-2.5 px-0.5">
    <!-- 1. VISIBILITY -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-1">
        <div class="text-[11px] text-blue-700 font-normal min-w-[44px] shrink-0">Opacity</div>
        <div class="flex-1 flex items-center gap-2">
          <input type="range" min="0" max="1" step="0.01" :value="opacity.raw.value || 1" @input="e => opacity.set(e.target.value)" class="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          <VisualInput :modelValue="opacity.raw.value" @update:modelValue="v => opacity.set(v)" :units="[]" class="w-16" placeholder="1" />
        </div>
      </div>
      <VisualToggleGroup label="Visible" :modelValue="visibility.raw.value" @update:modelValue="v => visibility.set(v)" :options="visibilityOptions" />
    </div>

    <!-- 🎨 2. BACKGROUND -->
    <VisualFieldset label="Background">
      <div class="flex items-center gap-1">
        <div class="text-[11px] text-blue-700 font-normal min-w-[44px] shrink-0">BG Color</div>
        <ColorVarInput :value="bgColor.raw.value" @update="v => bgColor.set(v)" class="flex-1" />
      </div>
      <VisualInput label="Image" :modelValue="bgImage.raw.value" @update:modelValue="v => bgImage.set(v)" :units="[]" :keywords="['none', 'linear-gradient()']" />
      <VisualInput label="Size"  :modelValue="bgSize.raw.value"  @update:modelValue="v => bgSize.set(v)"  :units="[]" :keywords="['auto', 'cover', 'contain', 'inherit', 'unset']" />

      <!-- Sub-separator: Position -->
      <div class="flex items-center gap-2 my-2">
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-[11px] text-blue-700 font-normal">Position</span>
          <button @click="togglePositionLink" class="p-0.5 rounded hover:bg-blue-100 transition-colors" :class="isPositionLinked ? 'text-blue-600' : 'text-gray-400'">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path v-if="isPositionLinked" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path v-if="isPositionLinked" d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 00 7.07 7.07l1.71-1.71" />
              <path v-else d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>
      <div v-if="isPositionLinked" class="flex items-center gap-3">
        <div class="grid grid-cols-3 gap-0.5 p-1 bg-gray-50/50 rounded border border-gray-100 shrink-0">
          <button v-for="p in ['top left', 'top', 'top right', 'left', 'center', 'right', 'bottom left', 'bottom', 'bottom right']" :key="p" @click="bgPos.set(p)" class="w-3.5 h-3.5 flex items-center justify-center rounded-[1px] transition-all" :class="bgPos.raw.value === p ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-200 hover:bg-blue-50'">
            <div class="w-0.5 h-0.5 rounded-full bg-current"></div>
          </button>
        </div>
        <VisualInput class="flex-1" :modelValue="bgPos.raw.value" @update:modelValue="v => bgPos.set(v)" :units="[]" :keywords="['center', 'top', 'bottom', 'left', 'right']" placeholder="center" />
      </div>
      <div v-else class="flex flex-col gap-2">
        <VisualInput label="Pos X" :modelValue="bgPosX.raw.value" @update:modelValue="v => bgPosX.set(v)" :units="[]" :keywords="['left', 'center', 'right', 'inherit', 'unset']" />
        <VisualInput label="Pos Y" :modelValue="bgPosY.raw.value" @update:modelValue="v => bgPosY.set(v)" :units="[]" :keywords="['top', 'center', 'bottom', 'inherit', 'unset']" />
      </div>

      <!-- Sub-separator: Repeat -->
      <div class="flex items-center gap-2 my-2">
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-[11px] text-blue-700 font-normal">Repeat</span>
          <button @click="toggleRepeatLink" class="p-0.5 rounded hover:bg-blue-100 transition-colors" :class="isRepeatLinked ? 'text-blue-600' : 'text-gray-400'">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path v-if="isRepeatLinked" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path v-if="isRepeatLinked" d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 00 7.07 7.07l1.71-1.71" />
              <path v-else d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>
      <div v-if="isRepeatLinked">
        <VisualToggleGroup :modelValue="bgRepeat.raw.value" @update:modelValue="v => bgRepeat.set(v)" :options="bgRepeatOptions" />
      </div>
      <div v-else class="flex flex-col gap-2">
        <VisualToggleGroup label="X" :modelValue="bgRepeatX.raw.value" @update:modelValue="v => bgRepeatX.set(v)" :options="bgRepeatAxisOptions" />
        <VisualToggleGroup label="Y" :modelValue="bgRepeatY.raw.value" @update:modelValue="v => bgRepeatY.set(v)" :options="bgRepeatAxisOptions" />
      </div>

      <div class="border-t border-gray-100 my-1.5 opacity-50"></div>
      <VisualToggleGroup label="Attach" :modelValue="bgAttach.raw.value" @update:modelValue="v => bgAttach.set(v)" :options="['scroll', 'fixed', 'local'].map(o => ({label: o, value: o}))" />
    </VisualFieldset>

    <!-- 🔲 3. BORDER -->
    <BorderEditor :rule-getter="ruleGetter" />

    <!-- ⭕ 4. RADIUS -->
    <BorderRadiusEditor :rule-getter="ruleGetter" />

    <!-- 🌫 5. BOX SHADOW -->
    <VisualFieldset label="Box Shadow"><BoxShadowEditor :rule-getter="getRule" /></VisualFieldset>

    <!-- 🖱️ 6. INTERACTION -->
    <VisualFieldset label="Interaction">
      <VisualSelect label="Cursor" :modelValue="cursor.raw.value" @update:modelValue="v => cursor.set(v)" :options="cursorOptions" />
    </VisualFieldset>

    <!-- 🔄 7. TRANSFORM -->
    <VisualFieldset label="Transform">
      <VisualInput label="Transf." :modelValue="transform.raw.value"    @update:modelValue="v => transform.set(v)"   :units="[]" />
      <VisualInput label="Origin"  :modelValue="transOrigin.raw.value"  @update:modelValue="v => transOrigin.set(v)" :units="[]" :keywords="['center', 'top', 'bottom', 'left', 'right']" />
    </VisualFieldset>
  </div>
</template>
