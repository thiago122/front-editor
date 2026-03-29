<script setup>
// PixelPerfectPanel.vue
// Painel de controles do Pixel Perfect — aparece como AsidePanel no sidebar.

import { ref } from 'vue'
import { usePixelPerfect } from '@/composables/usePixelPerfect'

const {
  enabled, imageUrl, opacity, offsetX, offsetY,
  positionType, interactive, opacityFraction, loadImage, center, clear,
} = usePixelPerfect()

const props = defineProps({
  containerEl: { type: Object, default: null },
})

const fileInput = ref(null)

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) {
    loadImage(file)
    e.target.value = ''
  }
}

function onCenter() {
  center()
}

const POSITION_OPTIONS = [
  { value: 'absolute', label: 'Absolute',  hint: 'Relativo ao canvas (rola com a página)' },
  { value: 'fixed',    label: 'Fixed',     hint: 'Fixo na viewport (não rola)' },
  { value: 'auto',     label: 'Auto',      hint: 'Fluxo normal do documento' },
]
</script>

<template>
  <div style="padding: 12px; font-size: 12px; font-family: sans-serif; color: #374151; display:flex; flex-direction:column; gap:14px">

    <!-- Upload / preview da imagem -->
    <div>
      <div style="font-weight:600; color:#4f46e5; font-size:11px; letter-spacing:.05em; text-transform:uppercase; margin-bottom:8px">
        Pixel Perfect
      </div>

      <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />

      <button
        v-if="!imageUrl"
        @click="fileInput.click()"
        style="width:100%; padding:10px; border:2px dashed #c7d2fe; border-radius:8px;
               background:#f5f3ff; cursor:pointer; color:#4f46e5; font-size:12px; font-weight:500"
      >
        ↑ Carregar imagem de referência
      </button>

      <div v-else style="display:flex; gap:8px; align-items:center">
        <img :src="imageUrl" style="width:56px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #e5e7eb; flex-shrink:0" />
        <div style="flex:1; min-width:0">
          <div style="font-size:11px; color:#6b7280; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
            Imagem carregada
          </div>
          <button @click="fileInput.click()" style="font-size:11px; color:#4f46e5; background:none; border:none; cursor:pointer; padding:0">
            Trocar imagem
          </button>
        </div>
        <button @click="clear" style="border:none; background:none; cursor:pointer; color:#ef4444; font-size:16px; flex-shrink:0" title="Remover">✕</button>
      </div>
    </div>

    <template v-if="imageUrl">
      <!-- Toggle ON/OFF -->
      <div style="display:flex; align-items:center; justify-content:space-between">
        <span style="font-weight:500">Visível</span>
        <button
          @click="enabled = !enabled"
          :style="{
            padding: '3px 12px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            background: enabled ? '#4f46e5' : '#e5e7eb',
            color:      enabled ? 'white'   : '#6b7280',
            transition: 'all .15s',
          }"
        >{{ enabled ? 'ON' : 'OFF' }}</button>
      </div>

      <!-- Toggle Clicável -->
      <div style="display:flex; align-items:center; justify-content:space-between">
        <div>
          <div style="font-weight:500">Clicável</div>
          <div style="font-size:10px; color:#9ca3af">{{ interactive ? 'Imagem captura cliques (drag)' : 'Cliques passam para o iframe' }}</div>
        </div>
        <button
          @click="interactive = !interactive"
          :style="{
            padding: '3px 12px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            background: interactive ? '#0ea5e9' : '#e5e7eb',
            color:      interactive ? 'white'   : '#6b7280',
            transition: 'all .15s',
          }"
        >{{ interactive ? 'ON' : 'OFF' }}</button>
      </div>

      <!-- Opacidade -->
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px">
          <span style="font-weight:500">Opacidade</span>
          <span style="color:#4f46e5; font-weight:600">{{ opacity }}%</span>
        </div>
        <input type="range" min="0" max="100" v-model.number="opacity"
               style="width:100%; accent-color:#4f46e5" />
      </div>

      <!-- Tipo de posição -->
      <div>
        <div style="font-weight:500; margin-bottom:6px">Tipo de posição</div>
        <div style="display:flex; gap:4px">
          <button
            v-for="opt in POSITION_OPTIONS"
            :key="opt.value"
            @click="positionType = opt.value"
            :title="opt.hint"
            :style="{
              flex: 1,
              padding: '5px 2px',
              borderRadius: '5px',
              border: '1px solid',
              borderColor: positionType === opt.value ? '#4f46e5' : '#e5e7eb',
              background:  positionType === opt.value ? '#ede9fe' : '#f9fafb',
              color:        positionType === opt.value ? '#4f46e5' : '#6b7280',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 600,
            }"
          >{{ opt.label }}</button>
        </div>
        <div style="margin-top:4px; font-size:10px; color:#9ca3af">
          {{ POSITION_OPTIONS.find(o => o.value === positionType)?.hint }}
        </div>
      </div>



      <!-- Ações -->
      <div style="display:flex; gap:6px">
        <button
          @click="onCenter"
          style="flex:1; padding:7px 0; border-radius:6px; border:1px solid #e5e7eb;
                 background:#f9fafb; cursor:pointer; font-size:11px; font-weight:500; color:#374151"
          title="Centralizar horizontalmente"
        >⊹ Centralizar X</button>
        <button
          @click="() => { offsetX = 0; offsetY = 0 }"
          style="flex:1; padding:7px 0; border-radius:6px; border:1px solid #e5e7eb;
                 background:#f9fafb; cursor:pointer; font-size:11px; font-weight:500; color:#374151"
          title="Resetar posição"
        >↺ Reset</button>
      </div>
    </template>
  </div>
</template>
