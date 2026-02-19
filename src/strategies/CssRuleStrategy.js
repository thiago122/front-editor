/**
 * CssRuleStrategy — contract for CSS property operation strategies.
 *
 * Both astRuleStrategy and inlineStyleStrategy implement this interface.
 * When adding a new strategy (e.g. deleteRule, externalFileStrategy),
 * implement all four methods below.
 *
 * Usage:
 *   const strategy = createAstRuleStrategy(...)
 *   validateStrategy(strategy) // throws if contract is broken
 *
 * @typedef {Object} CssRuleStrategy
 * @property {function(rule: Object): void} addProperty
 * @property {function(decl: Object, field: string, newValue: string, oldValue?: string): void} updateProperty
 * @property {function(rule: Object, decl: Object): void} deleteProperty
 * @property {function(rule: Object, decl: Object): void} toggleProperty
 */

const REQUIRED_METHODS = ['addProperty', 'updateProperty', 'deleteProperty', 'toggleProperty']

/**
 * Validate that a strategy object implements the full CssRuleStrategy contract.
 * Throws a clear error if any method is missing — catches contract violations early.
 * @param {Object} strategy - Strategy object to validate
 * @param {string} [name] - Optional name for clearer error messages
 */
export function validateStrategy(strategy, name = 'strategy') {
  for (const method of REQUIRED_METHODS) {
    if (typeof strategy[method] !== 'function') {
      throw new Error(
        `[CssRuleStrategy] "${name}" is missing required method: ${method}(). ` +
        `All strategies must implement: ${REQUIRED_METHODS.join(', ')}.`
      )
    }
  }
}
