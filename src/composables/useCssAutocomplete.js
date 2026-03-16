// src/composables/useCssAutocomplete.js
//
// Composable reutilizável para autocomplete de propriedades e valores CSS.
//
// Uso:
//   const ac = useCssAutocomplete()
//   ac.openProp(inputEl, currentText)   — abre sugestões de propriedades
//   ac.openValue(inputEl, propName, currentText) — abre sugestões de valores
//   ac.close()                          — fecha o dropdown
//   ac.isActive                         — true quando visível
//   ac.accept(item)                     — aceita uma sugestão
//   ac.onKeydown(e)                     — handler para ArrowUp/Down/Enter/Escape/Tab
//
// O componente host deve:
//   1. Chamar ac.openProp/openValue @focus ou @input
//   2. Passar ac.onKeydown no @keydown do input
//   3. Renderizar <CssAutocompleteDropdown> passando a instância ac

import { ref, computed } from 'vue'
import { CSS_PROPERTIES, CSS_VALUES } from '@/editor/css/shared/cssProperties'

export function useCssAutocomplete() {
  // ── Estado ──────────────────────────────────────────────────────────────────
  const query      = ref('')       // texto digitado pelo usuário
  const candidates = ref([])       // lista completa de sugestões para a query atual
  const activeIdx  = ref(-1)       // índice selecionado (-1 = nenhum)
  const inputEl    = ref(null)     // elemento <input> host
  const mode       = ref(null)     // 'prop' | 'value' | null
  let   onAcceptCb = null          // callback(value) chamado ao aceitar

  // ── Computed ─────────────────────────────────────────────────────────────────

  /** Sugestões filtradas pela query atual (máx. 12) */
  const suggestions = computed(() => {
    if (!query.value.trim()) return candidates.value.slice(0, 12)
    const q = query.value.toLowerCase()
    return candidates.value
      .filter(s => s.toLowerCase().startsWith(q))
      .slice(0, 12)
  })

  const isActive = computed(() => mode.value !== null && suggestions.value.length > 0)

  // ── API pública ──────────────────────────────────────────────────────────────

  /**
   * Abre sugestões de propriedades CSS.
   * @param {HTMLInputElement} el   — input host
   * @param {string}           text — valor atual do input
   * @param {Function}         onAccept — callback(propName)
   */
  function openProp(el, text, onAccept) {
    inputEl.value = el
    candidates.value = CSS_PROPERTIES
    query.value    = text ?? ''
    activeIdx.value = -1
    mode.value     = 'prop'
    onAcceptCb     = onAccept
  }

  /**
   * Abre sugestões de valores CSS para uma propriedade específica.
   * @param {HTMLInputElement} el       — input host
   * @param {string}           propName — nome da propriedade CSS
   * @param {string}           text     — valor atual do input
   * @param {Function}         onAccept — callback(value)
   */
  function openValue(el, propName, text, onAccept) {
    const values = CSS_VALUES[propName?.toLowerCase()]
    if (!values?.length) { close(); return }
    inputEl.value  = el
    candidates.value = values
    query.value    = text ?? ''
    activeIdx.value = -1
    mode.value     = 'value'
    onAcceptCb     = onAccept
  }

  /** Atualiza a query (chamar no @input do host) */
  function updateQuery(text) {
    query.value = text
    activeIdx.value = -1
  }

  /** Fecha o dropdown */
  function close() {
    mode.value     = null
    candidates.value = []
    query.value    = ''
    activeIdx.value = -1
    onAcceptCb     = null
  }

  /**
   * Aceita uma sugestão (clique ou Enter).
   * @param {string} [item] — item a aceitar; se omitido usa o item selecionado pelo teclado
   */
  function accept(item) {
    const value = item ?? suggestions.value[activeIdx.value]
    if (!value) return
    onAcceptCb?.(value)
    close()
  }

  /**
   * Handler de teclado — ligar ao @keydown do input host.
   * Retorna true se o evento foi consumido (para suprimir comportamento padrão).
   */
  function onKeydown(e) {
    if (!isActive.value) return false

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      activeIdx.value = Math.min(activeIdx.value + 1, suggestions.value.length - 1)
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      activeIdx.value = Math.max(activeIdx.value - 1, 0)
      return true
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && activeIdx.value >= 0) {
      e.preventDefault()
      accept()
      return true
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return true
    }
    return false
  }

  return {
    // Estado (readonly fora do composable)
    suggestions,
    activeIdx,
    isActive,
    mode,
    // Métodos
    openProp,
    openValue,
    updateQuery,
    accept,
    close,
    onKeydown,
  }
}
