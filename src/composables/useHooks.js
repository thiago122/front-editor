// useHooks.js
//
// Composable Vue que encapsula o HookManager com auto-cleanup.
// Listeners registrados via este composable são automaticamente removidos
// quando o componente que o usa é desmontado (onUnmounted).
//
// Uso em um componente Vue:
//   import { useHooks } from '@/composables/useHooks'
//
//   const { on } = useHooks()
//   on('document:afterOpen', ({ html }) => {
//     console.log('Documento aberto, tamanho:', html.length)
//   })

import { onUnmounted } from 'vue'
import { editorHooks } from '@/editor/HookManager'

/**
 * @returns {{ on: Function, off: Function, emit: Function, emitAsync: Function }}
 */
export function useHooks() {
  /** Lista de unsubscribers para limpar no unmount */
  const _unsubs = []

  /**
   * Registra um listener com auto-cleanup no unmount do componente.
   * @param {string}   hook
   * @param {Function} fn
   */
  function on(hook, fn) {
    const unsub = editorHooks.on(hook, fn)
    _unsubs.push(unsub)
    return unsub
  }

  // Remove todos os listeners registrados por este composable
  onUnmounted(() => {
    _unsubs.forEach((unsub) => unsub())
    _unsubs.length = 0
  })

  return {
    on,
    off:       editorHooks.off.bind(editorHooks),
    emit:      editorHooks.emit.bind(editorHooks),
    emitAsync: editorHooks.emitAsync.bind(editorHooks),
  }
}
