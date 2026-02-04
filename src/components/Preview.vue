<script setup>
// Preview.vue

import { ref, watch, onMounted } from 'vue'
import { useBoxModel } from '@/composables/useBoxModel'
import { useInlineEdit } from '@/composables/useInlineEdit'
import { useIframeEvents } from '@/composables/useIframeEvents'

import EDITOR_UI_STYLES from '@/assets/editor-iframe-ui.css?raw'

import { useEditorStore } from '@/stores/EditorStore'

const EditorStore = useEditorStore()

// props
const props = defineProps({
  html: {
    type: String,
    required: true,
  },
})

// emits

const emit = defineEmits(['text-selection'])

// refs
const iframeRef = ref(null)

//  helpers
function getDoc() {
  return iframeRef.value?.contentDocument
}

const boxModel = useBoxModel(iframeRef)
const inlineEdit = useInlineEdit(iframeRef)
const iframeEvents = useIframeEvents(iframeRef, EditorStore)

// Watchers

//  Reagimos às mudanças de props
watch(
  () => EditorStore.hoveredNodeId,
  (newId) => {
    // Aplica a classe de hover
    iframeEvents.applyHover(newId)
  },
)

// Se sair do modo de inspeção, limpamos o overlay imediatamente
watch(
  () => EditorStore.inspectMode,
  (isInspecting) => {
    if (!isInspecting) boxModel.hideOverlay()
  },
)

watch(
  () => EditorStore.selectedNodeId,
  (id) => {
    iframeEvents.applySelection(id)
  },
)

function injectStyle() {
  const doc = EditorStore.getIframeDoc()
  const styleTag = doc.createElement('style')
  styleTag.id = 'editor-ui-styles' // O ID que você pediu
  styleTag.textContent = EDITOR_UI_STYLES

  // Injetamos sempre como último elemento do head para ter prioridade
  doc.head.appendChild(styleTag)
}

onMounted(() => {
  iframeRef.value.addEventListener('load', () => {
    iframeEvents.setup()
    inlineEdit.setup(() => EditorStore.inspectMode)

    // Sincroniza estado inicial se houver
    if (EditorStore.selectedNodeId) iframeEvents.applySelection(EditorStore.selectedNodeId)
    injectStyle()
  })
  EditorStore.iframe = iframeRef.value
})

// ------------------------------------------------------------------
</script>

<template>
  <iframe ref="iframeRef" :srcdoc="html" />
</template>
