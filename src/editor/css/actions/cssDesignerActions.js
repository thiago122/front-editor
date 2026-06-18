/**
 * cssDesignerActions.js
 *
 * Ações do Designer mode (edição element-first, estilo Webflow).
 * O usuário VÊ os seletores do elemento (classes + id) e ESCOLHE qual editar.
 * Editar qualquer classe é permitido (efeito compartilhado é esperado/visível).
 *
 * Política de destino da edição:
 * - Seletor com regra em arquivo EDITÁVEL (on_page/internal) → edita ela.
 * - Seletor sem regra, ou só em CSS EXTERNO (CDN/terceiro, read-only) → cria
 *   uma regra de mesmo seletor no stylesheet do editor (on_page/style) que
 *   sobrescreve. O arquivo externo NUNCA é tocado.
 * - Elemento SEM classe nenhuma → cria uma classe base própria (`el-*`).
 *
 * Ver docs/EDITING_ROADMAP.md → "Designer mode".
 */

import { toRaw } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { createRule, updateRule } from './cssRuleActions'

/** Prefixo das classes base geradas automaticamente pelo Designer mode. */
const AUTO_CLASS_PREFIX = 'el-'

let _autoCounter = 0
// Guarda o último nó resolvido — evita recriar `el-*` em disparos repetidos
// do watch (ex.: troca de modo com o mesmo elemento selecionado).
let _lastResolvedNode = null

// ── Helpers de elemento ───────────────────────────────────────────────────────

/** Classes do elemento, em ordem de autoria. */
function classListOf(el) {
  return el ? Array.from(el.classList) : []
}

/**
 * Seletores candidatos do elemento p/ o chooser: cada classe + o id (se houver),
 * em ordem. Cada item: { type: 'class' | 'id', name, sel }.
 */
export function elementSelectors(el) {
  const out = classListOf(el).map(name => ({ type: 'class', name, sel: `.${name}` }))
  if (el?.id) out.push({ type: 'id', name: el.id, sel: `#${el.id}` })
  return out
}

// ── Helpers de árvore ─────────────────────────────────────────────────────────

/**
 * Acha o nó-seletor de TOPO (fora de @media) com este seletor num arquivo
 * EDITÁVEL (on_page/internal). External é read-only → ignorado.
 * @returns {Object|null} nó da Logic Tree (type 'selector') ou null
 */
function findEditableRuleNode(selector) {
  const tree = toRaw(useStyleStore().cssLogicTree)
  if (!tree) return null
  for (const root of tree) {
    const origin = root.metadata?.origin
    if (origin !== 'on_page' && origin !== 'internal') continue
    for (const file of (root.children || [])) {
      for (const node of (file.children || [])) {
        if (node.type !== 'selector') continue // só regras de topo (não @media)
        if ((node.label || '').trim() === selector) return node
      }
    }
  }
  return null
}

/** Existe uma regra editável p/ este seletor? (governa rename/edição direta) */
export function hasEditableRule(selector) {
  return !!findEditableRuleNode(selector)
}

// ── Aplicação de seletor no elemento ──────────────────────────────────────────

/**
 * Anexa um seletor simples (.class / #id) ao elemento selecionado.
 * Ignora seletores complexos (descendente, pseudo, combinadores).
 */
export function applySelectorToElement(selector) {
  const editorStore = useEditorStore()
  const el = editorStore.selectedElement
  if (!el || !editorStore.selectedNodeId || !editorStore.manipulation) return

  const clean = selector
    .replace(/:hover|:active|:focus|:visited|:focus-within|:focus-visible|:target/g, '')
    .replace(/::?[a-z-]+/g, '')
    .trim()

  if (/[\s>+~]/.test(clean)) return

  const classes = (clean.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).map(c => c.slice(1))
  const idMatch = clean.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/)
  const id = idMatch ? idMatch[0].slice(1) : null

  if (classes.length > 0) {
    const current = Array.from(el.classList)
    const merged = [...new Set([...current, ...classes])].join(' ')
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'class', merged)
  }
  if (id) {
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'id', id)
  }
}

// ── Alvo ativo da edição ──────────────────────────────────────────────────────

/**
 * Define o seletor ativo do painel visual: edita a regra editável existente, ou
 * cria uma regra de mesmo seletor no stylesheet do editor (override).
 * @param {string} selector  - ex. '.btn' ou '#hero'
 * @param {boolean} applyToElement - anexa o seletor ao elemento (classe nova)
 * @returns {Object|null} nó-seletor de destino
 */
export function setActiveTarget(selector, applyToElement = false) {
  const editorStore = useEditorStore()
  const styleStore  = useStyleStore()

  const existing = findEditableRuleNode(selector)
  if (existing) {
    if (applyToElement) applySelectorToElement(selector)
    styleStore.selectRule(existing.id)
    editorStore.visualEditor.activeRuleUid = existing.id
    return existing
  }

  // Sem regra editável → cria override no stylesheet do editor (on_page/style).
  const node = createRule(selector, 'on_page', 'style')
  if (node) {
    if (applyToElement) applySelectorToElement(selector)
    editorStore.visualEditor.activeRuleUid = node.id
  }
  return node
}

/** Chip do chooser clicado → torna aquele seletor o alvo ativo. */
export function setActiveTargetBySelector(selector) {
  return setActiveTarget(selector, false)
}

/** Gera um nome de classe único (não presente no documento do iframe). */
function uniqueClassName(doc) {
  let name
  do {
    _autoCounter++
    name = `${AUTO_CLASS_PREFIX}${_autoCounter.toString(36)}`
  } while (doc?.querySelector(`.${name}`))
  return name
}

/**
 * Cria uma classe base `el-*` nova, anexa ao elemento e mira ela.
 * Usado como fallback (elemento sem classe) e pelo botão "+ classe".
 * @returns {Object|null} nó-seletor criado
 */
export function addBaseClass() {
  const editorStore = useEditorStore()
  if (!editorStore.selectedElement || !editorStore.selectedNodeId) return null
  const name = uniqueClassName(editorStore.getIframeDoc())
  return setActiveTarget(`.${name}`, true)
}

/**
 * Renomeia uma classe editável: atualiza a regra (.old → .new) e o atributo
 * class do elemento. Classe sem regra editável (só external) não renomeia.
 * @returns {boolean} true se renomeou
 */
export function renameClass(oldName, newName) {
  const clean = (newName || '').trim().replace(/^\./, '')
  if (!clean || clean === oldName) return false
  if (!/^[a-zA-Z_-][\w-]*$/.test(clean)) return false

  const editorStore = useEditorStore()
  const el = editorStore.selectedElement
  if (!el) return false
  if (Array.from(el.classList).includes(clean)) return false // já existe no elemento

  const node = findEditableRuleNode(`.${oldName}`)
  if (!node) return false // sem regra editável → nada a renomear

  // Renomeia a regra na árvore (reusa a action — faz histórico + applyMutation).
  updateRule(
    { selector: `.${oldName}`, uid: node.id, astNode: node.metadata?.astNode },
    `.${clean}`
  )

  // Troca a classe no atributo do elemento.
  const merged = Array.from(el.classList).map(c => (c === oldName ? clean : c)).join(' ')
  editorStore.manipulation?.setAttribute(editorStore.selectedNodeId, 'class', merged)

  editorStore.visualEditor.activeRuleUid = node.id
  return true
}

// ── Resolução automática na seleção ───────────────────────────────────────────

/**
 * Designer mode: ao selecionar um elemento, define o alvo padrão do editor
 * visual — a última classe do elemento; se ele não tem classe nenhuma, cria
 * uma classe base `el-*`. O usuário troca depois pelos chips do chooser.
 * Chamada pelo watch de seleção do EditorStore (só quando isDesignerMode).
 */
export function resolveTargetForSelection() {
  const editorStore = useEditorStore()
  const el = editorStore.selectedElement
  if (!el || !editorStore.selectedNodeId) return

  const classes = classListOf(el)
  if (classes.length === 0) {
    // Sem classe → cria a base (uma vez por nó, evita recriação em re-disparo).
    if (_lastResolvedNode === editorStore.selectedNodeId) return
    _lastResolvedNode = editorStore.selectedNodeId
    addBaseClass()
    return
  }

  _lastResolvedNode = editorStore.selectedNodeId
  // Default = última classe (geralmente a mais específica/recente).
  setActiveTarget(`.${classes[classes.length - 1]}`, false)
}
