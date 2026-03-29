// HookManager.js
//
// Sistema centralizado de hooks do editor.
// Qualquer módulo pode registrar callbacks em momentos-chave do ciclo de vida
// sem acoplamento direto entre os módulos.
//
// Suporte a prioridade: número menor executa primeiro (igual ao WordPress).
// Prioridade padrão: 10
//
// Uso básico:
//   import { editorHooks } from '@/editor/HookManager'
//   editorHooks.on('document:afterOpen', ({ html }) => { ... })
//   editorHooks.on('document:afterOpen', minhaFn, 5) // executa antes (prioridade 5)

export class HookManager {
  constructor() {
    /**
     * Map de hook → array de { priority, fn } ordenado por prioridade crescente.
     * @type {Map<string, Array<{priority: number, fn: Function}>>}
     */
    this._listeners = new Map()
  }

  /**
   * Registra um listener para um hook.
   *
   * @param {string}   hook      — nome do hook (ex: 'document:afterOpen')
   * @param {Function} fn        — callback a executar
   * @param {number}   priority  — prioridade de execução (menor = primeiro, padrão 10)
   * @returns {Function} unsubscribe — chame para remover o listener
   */
  on(hook, fn, priority = 10) {
    if (!this._listeners.has(hook)) {
      this._listeners.set(hook, [])
    }

    const list = this._listeners.get(hook)
    list.push({ priority, fn })

    // Mantém lista sempre ordenada por prioridade crescente
    list.sort((a, b) => a.priority - b.priority)

    // Retorna função de cancelamento
    return () => this.off(hook, fn)
  }

  /**
   * Remove um listener previamente registrado.
   * @param {string}   hook
   * @param {Function} fn
   */
  off(hook, fn) {
    const list = this._listeners.get(hook)
    if (!list) return
    const idx = list.findIndex((entry) => entry.fn === fn)
    if (idx !== -1) list.splice(idx, 1)
  }

  /**
   * Dispara um hook de forma SÍNCRONA.
   * Listeners são executados em ordem de prioridade (menor número primeiro).
   * @param {string} hook
   * @param {*}      payload
   */
  emit(hook, payload) {
    const list = this._listeners.get(hook)
    if (!list) return
    for (const { fn } of list) {
      try {
        fn(payload)
      } catch (err) {
        console.error(`[HookManager] Erro no hook "${hook}":`, err)
      }
    }
  }

  /**
   * Dispara um hook de forma ASSÍNCRONA em sequência (await).
   * Listeners são executados em ordem de prioridade (menor número primeiro).
   * Permite hooks que retornam Promise (ex: validação antes de salvar).
   * @param {string} hook
   * @param {*}      payload
   * @returns {Promise<void>}
   */
  async emitAsync(hook, payload) {
    const list = this._listeners.get(hook)
    if (!list) return
    for (const { fn } of list) {
      try {
        await fn(payload)
      } catch (err) {
        console.error(`[HookManager] Erro async no hook "${hook}":`, err)
      }
    }
  }

  /**
   * Remove todos os listeners de um hook específico.
   * @param {string} hook
   */
  clear(hook) {
    this._listeners.delete(hook)
  }

  /**
   * Remove TODOS os listeners de todos os hooks.
   * Útil para testes ou reset completo do editor.
   */
  clearAll() {
    this._listeners.clear()
  }

  /**
   * Retorna os nomes de todos os hooks que têm listeners registrados.
   * @returns {string[]}
   */
  registeredHooks() {
    return [...this._listeners.keys()].filter(
      (k) => this._listeners.get(k).length > 0
    )
  }
}

/** Singleton global do editor. Importe este em qualquer lugar. */
export const editorHooks = new HookManager()

