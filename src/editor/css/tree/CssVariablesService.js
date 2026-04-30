import { CssInspectorMatcher } from '../inspector/CssInspectorMatcher.js'

export class CssVariablesService {
  /**
   * Extrai todas as variáveis CSS (Custom Properties) que começam com `--` 
   * a partir da lista de declarações de uma regra.
   * @param {Array} declarations - Lista de declarações da lógica tree
   * @returns {Array} Lista de variáveis encontradas
   */
  static extractVariablesFromDeclarations(declarations) {
    if (!declarations) return []
    return declarations
      .filter(d => d.type === 'declaration' && d.label.startsWith('--') && !d.disabled)
      .map(d => ({
        name: d.label,
        value: d.value,
        id: d.id
      }))
  }

  /**
   * Retorna as variáveis CSS globais declaradas no :root.
   * @param {Array} logicTree - A Logic Tree completa
   * @returns {Array} Lista de variáveis globais
   */
  static getGlobalVariables(logicTree) {
    let globalVars = []
    const searchRoot = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'selector' && node.label === ':root') {
          globalVars = globalVars.concat(this.extractVariablesFromDeclarations(node.children))
        }
        if (node.children) {
          searchRoot(node.children)
        }
      }
    }
    searchRoot(logicTree)
    
    // Deduplicate por nome (mantendo o último encontrado por causa da cascata do CSS, idealmente)
    const unique = new Map()
    globalVars.forEach(v => unique.set(v.name, v))
    return Array.from(unique.values())
  }

  /**
   * Retorna as variáveis locais disponíveis para um elemento específico,
   * percorrendo a cadeia de herança do elemento e capturando as regras aplicáveis.
   * @param {Element} el - O elemento DOM selecionado
   * @param {Array} logicTree - A Logic Tree completa
   * @param {Object} viewport - viewport
   * @returns {Array} Lista de variáveis locais
   */
  static getLocalVariablesForElement(el, logicTree, viewport) {
    if (!el || !logicTree) return []
    
    // Usamos o Matcher para achar todas as regras que se aplicam ao elemento (e seus ancestrais)
    // O Matcher já traz o array ruleGroups organizado
    const groups = new CssInspectorMatcher(el, logicTree, viewport, {}, null).find()
    
    let localVars = new Map()

    // Itera pelos grupos (Ancestrais primeiro, depois o target)
    groups.forEach(group => {
      group.rules.forEach(rule => {
        // Ignora pseudo-elementos/estados por enquanto para as variáveis bases
        if (rule.pseudoSubSection || rule.selector === ':root') return 

        const ruleVars = rule.declarations.filter(d => d.prop.startsWith('--') && !d.disabled)
        ruleVars.forEach(v => {
          localVars.set(v.prop, {
            name: v.prop,
            value: v.value,
            id: v.id,
            origin: group.isTarget ? 'local' : 'inherited',
            sourceSelector: rule.selector
          })
        })
      })
    })

    return Array.from(localVars.values())
  }
}
