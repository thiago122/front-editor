import {
  parseWidthCondition,
  conditionForBreakpoint,
  isBaseBreakpoint,
  matchesBreakpoint,
  selectorFamily,
} from '../shared/breakpointStrategy.js'

/**
 * CssWriteTargetService
 *
 * Resolve ONDE uma edição deve ser escrita quando o usuário está com um
 * botão de breakpoint ativo (ver docs/EDITING_ROADMAP.md → "Decisões de
 * responsividade"). Não muta nada — apenas decide; quem muta é o caller
 * (actions) via CssRuleService/CssAtRuleService.
 *
 * Retornos possíveis de resolve():
 *   { kind: 'base' }
 *       breakpoint ativo é a base da estratégia → editar a regra base,
 *       sem @media.
 *   { kind: 'existing-rule', rule, atRule }
 *       já existe regra com o mesmo seletor dentro de @media equivalente →
 *       editar in place.
 *   { kind: 'existing-atrule', atRule, condition }
 *       @media equivalente existe mas sem o seletor → criar a regra dentro
 *       dela (createRule com parentId = atRule.id).
 *   { kind: 'create-atrule', condition, fileNodeId, insertIndex }
 *       não existe @media equivalente → criar at-rule vazia no arquivo na
 *       posição calculada e a regra dentro dela. fileNodeId null = arquivo
 *       ainda não existe na tree (findOrCreateFile resolve na criação).
 */
export class CssWriteTargetService {

  /**
   * @param {Array}  logicTree
   * @param {Object} opts
   * @param {string}      opts.selector        — seletor da regra base/destino
   * @param {string|null} [opts.baseRuleId]    — âncora: nó da regra base sendo sobrescrita
   * @param {string}      [opts.origin]        — 'on_page' | 'internal' | 'external'
   * @param {string}      [opts.sourceName]    — stylesheet alvo
   * @param {number|null} [opts.breakpointWidth] — largura do botão ativo (null = full/base)
   * @param {'mobile-first'|'desktop-first'} [opts.direction] — já resolvida (nunca 'auto')
   * @param {'breakpoint-blocks'|'rule-adjacent'|'file-end'} [opts.insertion] — já resolvida
   * @param {number[]}    [opts.breakpoints]   — set de larguras do projeto
   */
  static resolve(logicTree, {
    selector,
    baseRuleId = null,
    origin = 'on_page',
    sourceName = 'style',
    breakpointWidth = null,
    direction = 'mobile-first',
    insertion = 'rule-adjacent',
    breakpoints = [],
  }) {
    if (isBaseBreakpoint(breakpointWidth, direction, breakpoints)) {
      return { kind: 'base' }
    }

    const condition = conditionForBreakpoint(breakpointWidth, direction)
    const fileNode = this._findFileNode(logicTree, origin, sourceName)
    if (!fileNode) {
      return { kind: 'create-atrule', condition, fileNodeId: null, insertIndex: -1 }
    }

    // 1) @media equivalente já existente no nível do arquivo?
    //    - Se já contém o seletor exato → edit in place (sempre, qualquer modo).
    //    - Senão, reusa o bloco existente conforme o estilo de inserção:
    //      'rule-adjacent' só reusa um @media da MESMA família do seletor base
    //      (mantém o override perto da base; outra família ganha bloco próprio);
    //      'breakpoint-blocks'/'file-end' reusam qualquer @media do breakpoint
    //      (consolidam num bloco só).
    const wanted = selector.trim()
    const family = selectorFamily(selector)
    let matchedAtRule = null
    for (const child of fileNode.children) {
      if (child.type !== 'at-rule') continue
      const parsed = parseWidthCondition(child.label)
      if (!parsed || !matchesBreakpoint(parsed, breakpointWidth, direction)) continue

      const rule = (child.children ?? []).find(
        c => c.type === 'selector' && c.label.trim() === wanted
      )
      if (rule) return { kind: 'existing-rule', rule, atRule: child }

      if (matchedAtRule) continue
      if (insertion === 'rule-adjacent' && family && !this._belongsToFamily(child, family)) continue
      matchedAtRule = child
    }
    if (matchedAtRule) return { kind: 'existing-atrule', atRule: matchedAtRule, condition }

    // 2) Não existe → calcular a posição de criação conforme o estilo de inserção.
    const insertIndex = this._creationIndex(fileNode, {
      selector, baseRuleId, breakpointWidth, direction, insertion,
    })
    return { kind: 'create-atrule', condition, fileNodeId: fileNode.id, insertIndex }
  }

  // ─── Posição de criação ─────────────────────────────────────────────────────

  /**
   * Índice em fileNode.children para a nova at-rule.
   * Invariante (todas as estratégias): a inserção fica DEPOIS da regra que
   * será sobrescrita, e nunca reordena nada que já existe.
   * @private
   */
  static _creationIndex(fileNode, { selector, baseRuleId, breakpointWidth, direction, insertion }) {
    if (insertion === 'file-end') return -1

    const children = fileNode.children

    if (insertion === 'rule-adjacent') {
      const anchorIdx = this._anchorIndex(children, baseRuleId, selector)
      if (anchorIdx !== -1) {
        // Cluster: irmãos consecutivos da mesma família de seletor
        // (ex.: .card, .card__title, @media(...){ .card }).
        const family = selectorFamily(selector)
        let end = anchorIdx
        for (let i = anchorIdx + 1; i < children.length; i++) {
          if (this._belongsToFamily(children[i], family)) end = i
          else break
        }
        // Ordem direcional entre as @media do cluster: a nova entra antes da
        // primeira "mais longe da base" (min crescente / max decrescente).
        for (let i = anchorIdx + 1; i <= end; i++) {
          const parsed = children[i].type === 'at-rule' ? parseWidthCondition(children[i].label) : null
          if (parsed && this._fartherFromBase(parsed, breakpointWidth, direction)) return i
        }
        return end + 1
      }
      // Sem âncora identificável → trata como blocão (fallback seguro).
    }

    // 'breakpoint-blocks' (e fallback do rule-adjacent sem âncora):
    // mantém a ordem direcional entre os blocões existentes do arquivo.
    let lastWidthAtRule = -1
    for (let i = 0; i < children.length; i++) {
      if (children[i].type !== 'at-rule') continue
      const parsed = parseWidthCondition(children[i].label)
      if (!parsed || (parsed.min === null && parsed.max === null)) continue
      if (this._fartherFromBase(parsed, breakpointWidth, direction)) return i
      lastWidthAtRule = i
    }
    return lastWidthAtRule === -1 ? -1 : lastWidthAtRule + 1
  }

  /**
   * A condição está "mais longe da base" que o breakpoint novo?
   * mobile-first: min maior · desktop-first: max menor.
   * @private
   */
  static _fartherFromBase(parsed, width, direction) {
    if (direction === 'desktop-first') return (parsed.max ?? Infinity) < width
    return (parsed.min ?? 0) > width
  }

  /**
   * Índice do filho top-level que é (ou contém) a regra base.
   * Sem baseRuleId, usa a ÚLTIMA regra top-level com o mesmo seletor
   * (a que vence a cascata é a âncora natural).
   * @private
   */
  static _anchorIndex(children, baseRuleId, selector) {
    if (baseRuleId) {
      const idx = children.findIndex(c => this._containsId(c, baseRuleId))
      if (idx !== -1) return idx
    }
    const wanted = selector.trim()
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i].type === 'selector' && children[i].label.trim() === wanted) return i
    }
    return -1
  }

  /** @private */
  static _containsId(node, id) {
    if (node.id === id) return true
    return (node.children ?? []).some(c => this._containsId(c, id))
  }

  /**
   * O nó pertence à família do seletor base? Seletores comparam a própria
   * raiz; @media comparam a raiz do primeiro seletor filho.
   * @private
   */
  static _belongsToFamily(node, family) {
    if (!family) return false
    if (node.type === 'selector') return selectorFamily(node.label) === family
    if (node.type === 'at-rule') {
      const first = (node.children ?? []).find(c => c.type === 'selector')
      return first ? selectorFamily(first.label) === family : false
    }
    return false
  }

  /** @private */
  static _findFileNode(logicTree, origin, sourceName) {
    for (const root of logicTree ?? []) {
      if (root.metadata?.origin !== origin) continue
      const file = (root.children ?? []).find(
        c => c.type === 'file' && (c.label === sourceName || c.metadata?.sourceName === sourceName)
      )
      if (file) return file
    }
    return null
  }
}
