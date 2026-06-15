import { ref, watch } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'

/**
 * Largura/unidade do canvas de preview + handles de redimensionamento.
 * Sincroniza com EditorStore.setPreviewBreakpoint (avaliação de @media etc).
 *
 * @param {Function} startResize — do useColumnResize compartilhado da view
 *        (instância única: o isResizing dela cobre colunas E preview).
 */
export function usePreviewResize(startResize) {
  const EditorStore = useEditorStore()

  const previewWidth = ref(100)
  const previewUnit = ref('%')

  function startPreviewResizeRight(e) {
    previewUnit.value = 'px'
    startResize(e, previewWidth, { min: 320, max: 4000, direction: 1, multiplier: 2 })
  }
  function startPreviewResizeLeft(e) {
    previewUnit.value = 'px'
    startResize(e, previewWidth, { min: 320, max: 4000, direction: -1, multiplier: 2 })
  }

  watch([previewWidth, previewUnit], ([w, u]) => {
    EditorStore.setPreviewBreakpoint(w, u)
  })

  return { previewWidth, previewUnit, startPreviewResizeRight, startPreviewResizeLeft }
}
