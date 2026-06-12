import { ref } from 'vue'

/**
 * Fatia do EditorStore: feedback visual transitório.
 * - blink: pisca o overlay de seleção após inserir elemento novo.
 * - saveState: status do salvamento para a UI (SaveStatus.vue).
 */
export function createFeedbackSlice() {
  /**
   * Controla o efeito de blink visual no overlay de seleção.
   * Ativado após inserção de novo elemento para ajudar o usuário a
   * identificar onde o elemento foi inserido.
   */
  const isBlinking = ref(false)
  let _blinkTimer = null

  /** Inicia o blink do overlay de seleção (reinicia o timer se já ativo). */
  function startBlink() {
    if (_blinkTimer) clearTimeout(_blinkTimer)
    isBlinking.value = true
    _blinkTimer = setTimeout(() => {
      isBlinking.value = false
      _blinkTimer = null
    }, 3000)
  }

  /**
   * Estado do processo de salvamento para feedback na UI.
   * Ativado por Ctrl+S.
   */
  const saveState = ref({
    active:  false,
    status:  'idle',   // 'saving' | 'success' | 'error'
    message: '',
    details: [],      // lista de arquivos salvos ou erros
  })

  return { isBlinking, startBlink, saveState }
}
