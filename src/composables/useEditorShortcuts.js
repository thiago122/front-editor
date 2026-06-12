import { watch, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'

/**
 * Atalhos globais do editor — registrados na window E no iframe do preview
 * (o foco vai para o iframe ao interagir com o canvas).
 *
 *   Ctrl+S        → salvar (API backend > File System Access > download)
 *   Alt+E         → toggle CSS Explorer
 *   Alt+L         → toggle HTML Layers
 *   Alt+C         → toggle Components
 *   Ctrl+Shift+C  → toggle inspect mode
 *
 * @param {{ activeExplorer: import('vue').Ref<string|null>, saveNow: Function }} deps
 */
export function useEditorShortcuts({ activeExplorer, saveNow }) {
  const EditorStore = useEditorStore()

  function handleGlobalKeydown(e) {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      saveNow()
    } else if (e.altKey && e.key === 'e') {
      e.preventDefault()
      EditorStore.showCssExplorer = !EditorStore.showCssExplorer
    } else if (e.altKey && e.key === 'l') {
      e.preventDefault()
      activeExplorer.value = activeExplorer.value === 'html' ? null : 'html'
    } else if (e.altKey && e.key === 'c') {
      e.preventDefault()
      activeExplorer.value = activeExplorer.value === 'components' ? null : 'components'
    } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      EditorStore.inspectMode = !EditorStore.inspectMode
    }
  }

  onMounted(() => window.addEventListener('keydown', handleGlobalKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown))

  // ── Atalhos dentro do iframe ───────────────────────────────────────────────
  // Cada load do iframe cria um contentWindow novo — re-registra no atual e
  // remove do anterior. O listener de load também é removido ao trocar de
  // iframe (sem cleanup ele acumularia a cada reatribuição).
  let _iframeWin = null
  let _boundIframe = null
  let _onIframeLoad = null

  function attachIframeKeydown(iframe) {
    if (_iframeWin) _iframeWin.removeEventListener('keydown', handleGlobalKeydown)
    _iframeWin = iframe?.contentWindow ?? null
    _iframeWin?.addEventListener('keydown', handleGlobalKeydown)
  }

  watch(
    () => EditorStore.iframe,
    (iframe) => {
      if (_boundIframe && _onIframeLoad) {
        _boundIframe.removeEventListener('load', _onIframeLoad)
      }
      if (!iframe) return
      attachIframeKeydown(iframe)
      _onIframeLoad = () => attachIframeKeydown(iframe)
      _boundIframe = iframe
      iframe.addEventListener('load', _onIframeLoad)
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (_iframeWin) _iframeWin.removeEventListener('keydown', handleGlobalKeydown)
    if (_boundIframe && _onIframeLoad) _boundIframe.removeEventListener('load', _onIframeLoad)
  })
}
