/**
 * cssBreakpointActions.js
 *
 * Ações do modelo "botão de breakpoint = write target"
 * (decisões em docs/EDITING_ROADMAP.md → "Decisões de responsividade").
 *
 * Usage:
 *   import { resolveWriteTarget, duplicateRuleToBreakpoint, getActiveBreakpointWidth }
 *     from '@/editor/css/actions/cssBreakpointActions'
 */

import { toRaw } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { useEditorStore } from '@/stores/EditorStore'
import { CssLogicTreeService } from '../tree/CssLogicTreeService.js'
import { isBaseBreakpoint } from '../shared/breakpointStrategy.js'
import { findAndRemoveFromLogicTree } from '@/utils/astHelpers'
import { unifiedHistory } from '@/editor/history/UnifiedHistoryManager'

/**
 * Largura do breakpoint ativo na toolbar, ou null no modo full (%).
 * null = sem breakpoint explícito → tratado como base da estratégia.
 * @returns {number|null}
 */
export function getActiveBreakpointWidth() {
  const bp = useEditorStore().previewBreakpoint
  return bp?.unit === 'px' ? bp.width : null
}

/**
 * Normaliza a "regra" recebida — aceita tanto a rule do inspector
 * ({ uid, selector, origin, sourceName }) quanto um nó da Logic Tree
 * ({ id, label, metadata }).
 * @private
 */
function normalizeRule(rule) {
  return {
    selector:   rule.selector ?? rule.label,
    baseRuleId: rule.uid ?? rule.id ?? null,
    origin:     rule.origin ?? rule.metadata?.origin ?? 'on_page',
    sourceName: rule.sourceName ?? rule.metadata?.sourceName ?? 'style',
  }
}

/**
 * Resolve onde uma edição da regra deve ser escrita para o breakpoint
 * ativo. Só decide — não muta nada.
 * @param {Object} rule - Rule do inspector ou nó selector da Logic Tree
 * @returns {Object} resolução do CssWriteTargetService ({ kind, ... })
 */
export function resolveWriteTarget(rule) {
  const styleStore = useStyleStore()
  return CssLogicTreeService.resolveWriteTarget(toRaw(styleStore.cssLogicTree), {
    ...normalizeRule(rule),
    breakpointWidth: getActiveBreakpointWidth(),
    direction:       styleStore.resolvedDirection,
    insertion:       styleStore.resolvedInsertion,
    breakpoints:     styleStore.projectBreakpoints,
  })
}

/**
 * Edições de declaração devem ser roteadas para o breakpoint ativo?
 * (write-target IMPLÍCITO — eixo 1 das decisões)
 *
 * Roteia apenas quando:
 * - a regra NÃO é inline (element.style);
 * - a regra NÃO está dentro de @media/@container (editar regra de um bloco
 *   condicional é intenção explícita naquele bloco — não redireciona);
 * - o inspector está no modo elemento (no modo Explorer o usuário editou a
 *   regra diretamente na árvore — intenção explícita);
 * - o breakpoint ativo NÃO é a base da estratégia.
 *
 * @param {Object} rule - Rule do inspector
 * @returns {boolean}
 */
export function shouldRouteDeclarationEdits(rule) {
  if (!rule || rule.selector === 'element.style') return false
  if (rule.context?.some(c => c.name === 'media' || c.name === 'container')) return false
  const styleStore = useStyleStore()
  // Toggle do header do inspetor: OFF = edita a regra visível no lugar.
  if (!styleStore.routeEditsToBreakpoint) return false
  if (styleStore.inspectorSource === 'explorer') return false
  return !isBaseBreakpoint(
    getActiveBreakpointWidth(),
    styleStore.resolvedDirection,
    styleStore.projectBreakpoints
  )
}

/**
 * Garante que exista uma regra com o mesmo seletor no @media do breakpoint
 * ativo e a retorna (nó selector da Logic Tree). SEM histórico — o caller
 * gerencia snapshot/commit, para compor com outras mutações na mesma entrada.
 *
 * @param {Object} rule - Rule do inspector ou nó selector da Logic Tree
 * @returns {Object|null} Nó selector de destino, ou null se breakpoint = base
 */
export function ensureRuleAtBreakpoint(rule) {
  const styleStore = useStyleStore()
  const { selector, origin, sourceName } = normalizeRule(rule)

  const target = resolveWriteTarget(rule)
  if (target.kind === 'base') return null
  if (target.kind === 'existing-rule') return target.rule

  const tree   = toRaw(styleStore.cssLogicTree)
  const atRule = target.kind === 'existing-atrule'
    ? target.atRule
    : CssLogicTreeService.createAtRule(
        tree, null, 'media', target.condition, origin, sourceName, null, target.insertIndex
      )

  return atRule
    ? CssLogicTreeService.createRule(tree, selector, origin, sourceName, atRule.id)
    : null
}

/**
 * "Voltar a herdar" — limpa uma propriedade NO BREAKPOINT ativo removendo-a
 * do override (se existir). NUNCA toca a regra base: limpar um valor olhando
 * o tablet não pode apagar o valor do desktop.
 *
 * @param {Object} rule - Rule base exibida no painel
 * @param {string} prop - Propriedade a voltar a herdar
 * @returns {boolean} true se a limpeza foi tratada no contexto do breakpoint
 *                    (caller NÃO deve deletar da regra de origem);
 *                    false = sem roteamento ativo, caller segue fluxo normal.
 */
export function clearPropertyAtBreakpoint(rule, prop) {
  if (!shouldRouteDeclarationEdits(rule)) return false

  const probe = resolveWriteTarget(rule)
  // Sem override no breakpoint → não há o que limpar; base fica intacta.
  if (probe.kind !== 'existing-rule') return true

  const decl = (probe.rule.children ?? []).find(
    c => c.type === 'declaration' && c.label === prop
  )
  if (!decl) return true

  const styleStore  = useStyleStore()
  const editorStore = useEditorStore()
  const applyFn = () => styleStore.applyMutation(editorStore.getIframeDoc())

  unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)
  findAndRemoveFromLogicTree(toRaw(styleStore.cssLogicTree), decl.id)
  applyFn()
  unifiedHistory.commitCss(styleStore.cssLogicTree)
  styleStore.updateInspectorRules(
    editorStore.selectedElement,
    editorStore.viewport,
    styleStore.selectedRuleId
  )
  return true
}

/**
 * "Duplicar para este breakpoint" — garante que exista uma regra com o
 * mesmo seletor no @media do breakpoint ativo (base intacta) e a retorna.
 * É a versão explícita do write-target implícito: cria o destino sem
 * precisar editar uma propriedade.
 *
 * @param {Object} rule - Rule do inspector ou nó selector da Logic Tree
 * @returns {Object|null} O nó selector de destino (existente ou criado),
 *                        ou null se o breakpoint ativo é a base.
 */
export function duplicateRuleToBreakpoint(rule) {
  const styleStore  = useStyleStore()
  const editorStore = useEditorStore()

  // Sondagem sem mutação: evita snapshot de histórico quando nada muda.
  const probe = resolveWriteTarget(rule)
  if (probe.kind === 'base') return null
  if (probe.kind === 'existing-rule') return probe.rule

  const applyFn = () => styleStore.applyMutation(editorStore.getIframeDoc())
  unifiedHistory.snapshotCss(styleStore.cssLogicTree, applyFn)

  const newRule = ensureRuleAtBreakpoint(rule)

  if (newRule) {
    applyFn()
    unifiedHistory.commitCss(styleStore.cssLogicTree)
  } else {
    unifiedHistory.discardCssSnapshot()
  }
  return newRule
}
