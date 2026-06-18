import { ref, computed } from 'vue'

/**
 * Fatia do EditorStore: modo de edição (Dev vs Designer).
 *
 * - **dev**: comportamento atual — inspetor CSS completo, criação manual de
 *   seletor, breakpoint só seta viewport, edição grava na regra visível.
 * - **designer**: UX element-first p/ leigo — esconde o inspetor CSS, mostra
 *   só o editor visual. Cada elemento ganha uma classe base própria; com um
 *   breakpoint ativo, a edição é roteada p/ o @media daquele breakpoint
 *   (duplica a classe sem props). Força config desktop-first + blocão.
 *
 * REGRA DAS FATIAS: nunca importar useEditorStore aqui; deps chegam por
 * parâmetro. Os membros retornados são espalhados no return do EditorStore.
 *
 * @param {{ styleStore: object }} deps
 */
export function createModeSlice({ styleStore }) {
  const editorMode = ref('dev') // 'dev' | 'designer'
  const isDesignerMode = computed(() => editorMode.value === 'designer')

  // Config de responsividade do usuário, guardada ao entrar no Designer p/
  // restaurar ao sair (o Designer força a sua própria política).
  let _savedResponsiveConfig = null

  function setEditorMode(mode) {
    const next = mode === 'designer' ? 'designer' : 'dev'
    if (next === editorMode.value) return
    editorMode.value = next

    if (next === 'designer') {
      // Política automática do Designer (decisão do usuário): desktop-first +
      // blocão por breakpoint. Guarda a config atual p/ restaurar depois.
      _savedResponsiveConfig = { ...styleStore.responsiveConfig }
      styleStore.setResponsiveConfig({
        direction: 'desktop-first',
        insertion: 'breakpoint-blocks',
      })
    } else if (_savedResponsiveConfig) {
      styleStore.setResponsiveConfig(_savedResponsiveConfig)
      _savedResponsiveConfig = null
    }
  }

  return { editorMode, isDesignerMode, setEditorMode }
}
