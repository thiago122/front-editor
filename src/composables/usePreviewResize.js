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

  // Em modo '%' o previewWidth vale 100 (não px). Antes de arrastar, troca para
  // a largura REAL do canvas em px (EditorStore.viewport.width) — senão o resize
  // partiria de 100 e o min:320 faria a tela pular para 320 no primeiro movimento.
  function seedPxWidthFromViewport() {
    if (previewUnit.value === '%') {
      previewWidth.value = Math.round(EditorStore.viewport.width) || 320
    }
    previewUnit.value = 'px'
  }

  function startPreviewResizeRight(e) {
    seedPxWidthFromViewport()
    startResize(e, previewWidth, { min: 320, max: 4000, direction: 1, multiplier: 2 })
  }
  function startPreviewResizeLeft(e) {
    seedPxWidthFromViewport()
    startResize(e, previewWidth, { min: 320, max: 4000, direction: -1, multiplier: 2 })
  }

  watch([previewWidth, previewUnit], ([w, u]) => {
    EditorStore.setPreviewBreakpoint(w, u)
  })

  return { previewWidth, previewUnit, startPreviewResizeRight, startPreviewResizeLeft }
}
