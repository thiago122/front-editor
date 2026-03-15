import { CssExplorerTreeBuilder } from './CssExplorerTreeBuilder.js'
import { CssTreeSynchronizer } from './CssTreeSynchronizer.js'
import { CssInspectorMatcher } from '../inspector/CssInspectorMatcher.js'
import { CssRuleService } from './CssRuleService.js'
import { CssAtRuleService } from './CssAtRuleService.js'
import { CssDeclarationService } from './CssDeclarationService.js'
import { CssExportService } from '../export/CssExportService.js'

/**
 * CssLogicTreeService  ← Facade / Coordinator
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PARA DESENVOLVEDORES JÚNIOR
 * ─────────────────────────────────────────────────────────────────────────────
 * Esta classe serve como ponto de entrada único para toda a Logic Tree.
 * Ela NÃO contém lógica própria — apenas delega para os services abaixo.
 *
 * Precisa modificar regras?       → CssRuleService.js
 * Precisa modificar @media etc.?  → CssAtRuleService.js
 * Precisa modificar declarações?  → CssDeclarationService.js
 * Busca / helpers de árvore?      → _logicTreeHelpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CAMADAS DA ENGINE CSS:
 *   1. ast/     — parse e geração de CSS (css-tree)
 *   2. tree/    — Logic Tree: estrutura de dados interna (ESTE ARQUIVO)
 *   3. inspector/ — matching de regras para o painel de estilos
 *   4. loader/  — carga e injeção de CSS no iframe
 *   5. actions/ — ações de alto nível que usam Vue stores
 *   6. shared/  — constantes e utilitários compartilhados
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class CssLogicTreeService {

  // ─── Infraestrutura ────────────────────────────────────────────────────────

  /**
   * Build the Logic Tree from a parsed CSS AST.
   * Called once during editor initialization.
   * @param {Object} masterAst - Master CSS AST (from CssAstBuilder)
   * @returns {Array} Logic Tree root nodes
   */
  static buildLogicTree(masterAst) {
    return new CssExplorerTreeBuilder(masterAst).build()
  }

  /**
   * Write the Logic Tree back to the document's <style> elements.
   * Call this after any mutation to keep the iframe in sync.
   * @param {Array} logicTree - The Logic Tree
   * @param {Document} doc - Target document (iframe)
   */
  static syncToDOM(logicTree, doc = document) {
    new CssTreeSynchronizer(logicTree).syncToDom(doc)
  }

  /**
   * Return rule groups that apply to a DOM element (and its ancestors).
   * Used by the Styles panel to display matched CSS rules.
   * @param {Element} el - The selected element
   * @param {Array}   logicTree   - The Logic Tree
   * @param {Object}  viewport    - { width, height } of the editor viewport
   * @param {Object}  forceStatus - Pseudo-states forced on (e.g. { hover: true })
   * @returns {Array} Rule groups
   */
  static getMatchedRules(el, logicTree, viewport, forceStatus = {}, pseudoTab = null) {
    return new CssInspectorMatcher(el, logicTree, viewport, forceStatus, pseudoTab).find()
  }

  /**
   * Find all ancestors of a node (outermost first).
   * Used by CssExplorer to expand the tree to a selected node.
   * @param {Array}  logicTree - The Logic Tree
   * @param {string} targetId  - ID of the node to find ancestors for
   * @returns {Array} Ancestor nodes
   */
  static findAncestors(logicTree, targetId) {
    const search = (nodes, path) => {
      for (const node of nodes) {
        if (node.id === targetId) return path
        if (node.children) {
          const found = search(node.children, [...path, node])
          if (found) return found
        }
      }
      return null
    }
    return search(logicTree, []) ?? []
  }

  // ─── Rules  →  CssRuleService ──────────────────────────────────────────────

  /** @see CssRuleService.create */
  static createRule(logicTree, selector, origin, sourceName, parentId) {
    return CssRuleService.create(logicTree, selector, origin, sourceName, parentId)
  }

  /** @see CssRuleService.update */
  static updateRule(logicTree, ruleUid, newSelector) {
    return CssRuleService.update(logicTree, ruleUid, newSelector)
  }

  /** @see CssRuleService.delete */
  static deleteRule(logicTree, ruleUid) {
    return CssRuleService.delete(logicTree, ruleUid)
  }

  /** @see CssRuleService.move */
  static moveRule(logicTree, ruleUid, targetParentId, index) {
    return CssRuleService.move(logicTree, ruleUid, targetParentId, index)
  }

  /** @see CssRuleService.duplicate */
  static duplicateRule(logicTree, ruleUid) {
    return CssRuleService.duplicate(logicTree, ruleUid)
  }

  /** @see CssRuleService.findBySelector */
  static findRuleBySelector(logicTree, selector) {
    return CssRuleService.findBySelector(logicTree, selector)
  }

  /** @see CssRuleService.findByOrigin */
  static getRulesByOrigin(logicTree, origin) {
    return CssRuleService.findByOrigin(logicTree, origin)
  }

  // ─── At-rules  →  CssAtRuleService ────────────────────────────────────────

  /** @see CssAtRuleService.create */
  static createAtRule(logicTree, ruleUid, type, condition, origin, sourceName, parentId) {
    return CssAtRuleService.create(logicTree, ruleUid, type, condition, origin, sourceName, parentId)
  }

  /** @see CssAtRuleService.update */
  static updateAtRule(atRuleAstNode, newCondition) {
    return CssAtRuleService.update(atRuleAstNode, newCondition)
  }

  /** @see CssAtRuleService.delete */
  static deleteAtRule(logicTree, atRuleUid) {
    return CssAtRuleService.delete(logicTree, atRuleUid)
  }

  /** @see CssAtRuleService.move */
  static moveAtRule(logicTree, atRuleUid, targetParentId, index) {
    return CssAtRuleService.move(logicTree, atRuleUid, targetParentId, index)
  }

  // ─── Declarations  →  CssDeclarationService ───────────────────────────────

  /** @see CssDeclarationService.create */
  static createDeclaration(rule, prop, val) {
    return CssDeclarationService.create(rule, prop, val)
  }

  /** @see CssDeclarationService.update */
  static updateDeclaration(decl, field, newValue) {
    return CssDeclarationService.update(decl, field, newValue)
  }

  /** @see CssDeclarationService.delete */
  static deleteDeclaration(rule, decl) {
    return CssDeclarationService.delete(rule, decl)
  }

  /** @see CssDeclarationService.toggle */
  static toggleDeclaration(decl) {
    return CssDeclarationService.toggle(decl)
  }

  /** @see CssDeclarationService.move */
  static moveDeclaration(sourceRule, decl, targetRule, index) {
    return CssDeclarationService.move(sourceRule, decl, targetRule, index)
  }

  /** @see CssDeclarationService.duplicate */
  static duplicateDeclaration(rule, decl) {
    return CssDeclarationService.duplicate(rule, decl)
  }

  /** @see CssDeclarationService.findByProperty */
  static findDeclarationByProperty(rule, property) {
    return CssDeclarationService.findByProperty(rule, property)
  }

  // ─── Export  →  CssExportService ───────────────────────────────────────────

  /**
   * Gera mapa de CSS por stylesheet.
   * @see CssExportService.generateAll
   */
  static generateCssExport(logicTree) {
    return CssExportService.generateAll(logicTree)
  }

  /**
   * Baixa uma stylesheet específica como arquivo .css.
   * @see CssExportService.downloadOne
   */
  static downloadStylesheet(logicTree, key) {
    return CssExportService.downloadOne(logicTree, key)
  }

  /**
   * Baixa todas as stylesheets editáveis (exclui externas por padrão).
   * @see CssExportService.downloadAll
   */
  static downloadAllStylesheets(logicTree, includeExternal = false) {
    return CssExportService.downloadAll(logicTree, includeExternal)
  }
}
