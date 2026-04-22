import { ref, computed } from 'vue'
import { useCssProperty } from './useCssProperty'

/**
 * Composable for visual editor panel sections.
 * Standardizes the "has any value" indicator and collapse toggle
 * so all panel editors (Typography, Layout, Appearance, Dynamics) work the same way.
 *
 * @param {Function} ruleGetter  - () => rule (reactive getter)
 * @param {string[]} propNames   - CSS property names that belong to this section
 * @param {boolean}  defaultOpen - Whether the section starts expanded (default: true)
 *
 * @example
 * // In LayoutEditor.vue:
 * const { hasAnyValue, showContent, useProp } = useVisualSection(
 *   getRule, 
 *   ['display', 'width', 'height', 'margin', 'padding', ...]
 * )
 * const display = useProp('display')
 * const width   = useProp('width')
 */
export function useVisualSection(ruleGetter, propNames, defaultOpen = true) {
  const showContent = ref(defaultOpen)

  // Create a useCssProperty for each prop name, keyed by name
  const _props = {}
  for (const name of propNames) {
    _props[name] = useCssProperty(ruleGetter, name)
  }

  /** True if ANY of the listed properties has an explicit value in the rule */
  const hasAnyValue = computed(() =>
    Object.values(_props).some(p => p.exists.value)
  )

  /**
   * Returns the useCssProperty binding for a given prop name.
   * Only works for props that were listed in propNames.
   */
  function useProp(name) {
    if (!_props[name]) {
      console.warn(`[useVisualSection] Property "${name}" not listed in propNames. Add it to the array.`)
      return useCssProperty(ruleGetter, name)
    }
    return _props[name]
  }

  return {
    showContent,
    hasAnyValue,
    useProp,
  }
}
