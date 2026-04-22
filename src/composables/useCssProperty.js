import { computed, isRef } from 'vue'
import { 
  addDeclaration, 
  updateDeclaration, 
  deleteDeclaration 
} from '@/editor/css/actions/cssDeclarationActions'

/**
 * Helper to manage a single CSS property within a specific Inspector Rule.
 * 
 * @param {Object|Ref|Function} ruleOrGetter 
 *   - Pass a plain object, a Vue ref, OR a getter function: () => rule
 *   - The rule must come from StyleStore.ruleGroups (not the Logic Tree),
 *     so that `.declarations` is properly formatted.
 * @param {string} propName - The CSS property name (e.g., 'font-size')
 */
export function useCssProperty(ruleOrGetter, propName) {
  
  // Normalize to a reactive getter
  const getRule = typeof ruleOrGetter === 'function'
    ? ruleOrGetter
    : isRef(ruleOrGetter)
      ? () => ruleOrGetter.value
      : () => ruleOrGetter

  // ── Find existing declaration ──────────────────────────────────────────────
  const declaration = computed(() => {
    const rule = getRule()
    if (!rule?.declarations) return null
    return rule.declarations.find(d => d.prop === propName && !d.disabled) ?? null
  })

  const rawValue = computed(() => declaration.value?.value ?? '')

  // ── Parsing Logic ──────────────────────────────────────────────────────────
  
  /** Splits '15px' into { number: 15, unit: 'px' } */
  const parsed = computed(() => {
    const val = rawValue.value
    if (!val) return { number: '', unit: 'px' }

    const numMatch = val.match(/^([+-]?\d*\.?\d+)(.*)$/)
    if (numMatch) {
      return {
        number: parseFloat(numMatch[1]),
        unit: numMatch[2].trim() || 'px'
      }
    }
    return { number: val, unit: '' } // Keyword like 'bold', 'auto', 'center'
  })

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Updates the property in the rule.
   * If value is null/empty, the declaration is removed.
   */
  function set(value, unit = '') {
    const rule = getRule()
    if (!rule) return
    
    // When unit is empty string ('—' / unitless) OR the value is a keyword (not a number),
    // value is saved as plain text without unit suffix.
    const isNum = value !== '' && value !== null && !isNaN(value)
    const fullValue = (value === '' || value === null || value === undefined) 
      ? null 
      : (unit === '' || !isNum)
        ? `${value}`        // keyword or unitless: just the value
        : `${value}${unit}` // with unit (e.g. '16px')
    
    // 1. Remove if null
    if (fullValue === null) {
      if (declaration.value) {
        deleteDeclaration(rule, declaration.value)
      }
      return
    }

    // 2. Update if exists
    if (declaration.value) {
      updateDeclaration(rule, declaration.value, 'value', fullValue)
    } 
    // 3. Create if new
    else {
      addDeclaration(rule, null, propName, fullValue)
    }
  }

  return {
    exists:  computed(() => !!declaration.value),
    value:   computed(() => parsed.value.number),
    unit:    computed(() => parsed.value.unit),
    raw:     rawValue,
    set
  }
}
