// shared/ — Constantes e utilitários CSS compartilhados
export { CSS_LOCATIONS, PSEUDO_STATES, STATE_REGEXES, PSEUDO_ELEMENT_REGEX, INHERITED_PROPERTIES, INHERITED_PROPERTIES_SET, COLOR_KEYWORDS, SPECIFICITY_INLINE, SPECIFICITY_DEFAULT, PSEUDO_STATE_TABS } from './cssConstants.js'
export { cleanSelectorForMatching, isInheritedProperty, normalizePropertyName, isColorValue, getSpecificity, getSpecificityFromAst } from './cssUtils.js'
export { DEFAULT_BREAKPOINTS, BREAKPOINT_TOLERANCE, parseWidthCondition, selectorFamily, conditionForBreakpoint, isBaseBreakpoint, matchesBreakpoint, detectResponsiveProfile } from './breakpointStrategy.js'
