<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted, toRaw, watchEffect } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { findOrCreateRoot, findCssNode, findParent } from '@/editor/css/tree/_logicTreeHelpers.js'
import { findAndRemoveFromLogicTree } from '@/utils/astHelpers.js'

import { generateId } from '@/utils/ids.js'
import CssTreeItem from './CssTreeItem.vue'
import CssContextMenu from './CssContextMenu.vue'
import CssImportModal from './CssImportModal.vue'
import { useCssDragDrop } from '@/composables/useCssDragDrop'
import { parse } from 'css-tree'
import { ApiService } from '@/services/ApiService'

const styleStore = useStyleStore()
const editorStore = useEditorStore()

const { dragState, dropTarget, onDragStart, onDragOver, onDrop, onDragEnd } = useCssDragDrop()


// ============================================
// LOCAL UI STATE — Tree expansion
// (Kept here because this is purely Explorer UI, not global state)
// ============================================

const toggledNodes = ref(new Set())

function toggleNode(id) {
  const next = new Set(toggledNodes.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  toggledNodes.value = next
}

function isExpanded(node) {
  if (!node) return false
  if (node.type === 'root') return true
  return toggledNodes.value.has(node.id)
}

function expandToNode(id) {
  // Find ALL ancestors (root → file → @media → ...) and expand each one
  // so the target node becomes visible regardless of nesting depth.
  const ancestors = CssLogicTreeService.findAncestors(styleStore.cssLogicTree || [], id)
  for (const ancestor of ancestors) {
    if (!isExpanded(ancestor)) {
      toggleNode(ancestor.id)
    }
  }
}

function expandAll() {
  const ids = new Set(toggledNodes.value)
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type !== 'root') ids.add(node.id)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(styleStore.cssLogicTree || [])
  toggledNodes.value = ids
}

function collapseAll() {
  toggledNodes.value = new Set()
}

/** True when all expandable non-root nodes are open */
const isFullyExpanded = computed(() => {
  const expanded = toggledNodes.value
  let allExpanded = true
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type !== 'root' && node.children?.length > 0) {
        if (!expanded.has(node.id)) { allExpanded = false; return }
      }
      if (node.children?.length) walk(node.children)
    }
  }
  walk(styleStore.cssLogicTree || [])
  return allExpanded
})

// When the selected rule changes, expand all its ancestors so it becomes
// visible in the tree — works at any nesting depth (root > file > @media > selector).
watch(() => styleStore.selectedRuleId, (id) => {
  if (id) {
    expandToNode(id)
    selectedTreeNodeId.value = id
  }
})

// When navigateToRule() is called from the Inspector, expand ancestors of the
// highlighted rule and scroll to it — WITHOUT changing what the Inspector shows.
function scrollToHighlighted() {
  const id = styleStore.explorerHighlightId
  if (!id) return
  // 1. Expand ancestors so the node becomes visible in the flat list
  expandToNode(id)
  // 2. After Vue recomputes visibleNodes, scroll to the node
  nextTick(() => {
    const index = visibleNodes.value.findIndex(n => n.id === id)
    if (index === -1 || !containerRef.value) return
    const targetTop    = index * ROW_HEIGHT
    const targetBottom = targetTop + ROW_HEIGHT
    const { scrollTop, clientHeight } = containerRef.value
    if (targetTop < scrollTop || targetBottom > scrollTop + clientHeight) {
      containerRef.value.scrollTop = Math.max(0, targetTop - clientHeight / 2)
    }
  })
}

watch(() => styleStore.explorerScrollRequest, () => {
  scrollToHighlighted()
})

// ============================================
// SEARCH / FILTER
// ============================================

const searchQuery   = ref('')
const searchActive  = ref(false)
const searchInputRef = ref(null)

function openSearch() {
  searchActive.value = true
  nextTick(() => searchInputRef.value?.focus())
}

function clearSearch() {
  searchQuery.value  = ''
  searchActive.value = false
}

// Set of node IDs that match the current query (used in visibleNodes filter)
const matchedIds = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return null // null = no filter active
  const roots = styleStore.cssLogicTree || []
  const ids = new Set()

  const checkNode = (node) => {
    const label = (node.label || '').toLowerCase()
    const value = (node.value || '').toLowerCase()
    return label.includes(q) || value.includes(q)
  }

  // Walk tree; mark a node if it matches OR if any descendant matches
  const walk = (nodes) => {
    let anyMatch = false
    for (const node of nodes) {
      const childMatch = node.children?.length ? walk(node.children) : false
      const selfMatch  = checkNode(node)
      if (selfMatch || childMatch) {
        ids.add(node.id)
        anyMatch = true
      }
    }
    return anyMatch
  }

  walk(roots)
  return ids
})

// How many leaf-level nodes actually match the typed term
const matchCount = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q || !matchedIds.value) return 0
  const roots = styleStore.cssLogicTree || []
  let count = 0
  const walk = (nodes) => {
    for (const node of nodes) {
      const label = (node.label || '').toLowerCase()
      const value = (node.value || '').toLowerCase()
      if (label.includes(q) || value.includes(q)) count++
      if (node.children?.length) walk(node.children)
    }
  }
  walk(roots)
  return count
})

// ============================================
// SCROLLING & VIRTUALISATION
// ============================================

const containerRef = ref(null)
const explorerRef = ref(null)
const selectedTreeNodeId = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(400)
const ROW_HEIGHT = 22

const handleScroll = (e) => {
  scrollTop.value = e.target.scrollTop
}

const updateDimensions = () => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

/** Gerencia a seleção local do CssExplorer quando um nó é clicado */
function onNodeSelect(node) {
  if (!node) return
  selectedTreeNodeId.value = node.id
}

/**
 * Listener global de teclado — atalhos do CSS Explorer.
 * Não depende de foco no container; basta o Explorer estar visível
 * e um nó estar selecionado.
 */
function onExplorerKeydown(e) {
  // Só funciona quando o Explorer está visível
  if (!editorStore.showCssExplorer) return

  // Não interceptar eventos de input/textarea/contenteditable
  const tag = e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return

  // Ctrl+F → Busca
  if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    openSearch()
    return
  }
  if (e.key === 'Escape' && searchActive.value) {
    clearSearch()
    return
  }

  // ── Atalhos sobre o nó selecionado ──────────────────────────────────────
  const node = selectedNode.value
  if (!node || node.metadata?.origin === 'external') return

  const key = e.key.toLowerCase()

  // Ctrl+D → Duplicar
  if (key === 'd' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    duplicateNode(node)
    return
  }

  // Ctrl+M → Wrap com @media (selector only)
  if (key === 'm' && (e.ctrlKey || e.metaKey) && node.type === 'selector') {
    e.preventDefault()
    wrapWithAtRule(node)
    return
  }

  // Ctrl+Enter → ação contextual por tipo
  if (key === 'enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    if (node.type === 'selector')  { addDeclaration(node); return }
    if (node.type === 'at-rule')   { addRuleInContext(node); return }
    if (node.type === 'file')      { addRuleInContext(node); return }
    return
  }

  // Alt+↑ → Add Rule Before (selector / at-rule)
  if (key === 'arrowup' && e.altKey && (node.type === 'selector' || node.type === 'at-rule')) {
    e.preventDefault()
    addRuleBeforeNode(node)
    return
  }

  // Alt+↓ → Add Rule After (selector / at-rule)
  if (key === 'arrowdown' && e.altKey && (node.type === 'selector' || node.type === 'at-rule')) {
    e.preventDefault()
    addRuleAfterNode(node)
    return
  }

  // Delete / Backspace → Deletar nó
  if (key === 'delete' || key === 'backspace') {
    e.preventDefault()
    deleteNode(node)
    return
  }

  // F2 / Enter (sem modifier) → Editar inline
  if (key === 'f2' || (key === 'enter' && !e.ctrlKey && !e.metaKey && !e.altKey)) {
    e.preventDefault()
    pendingEditId.value = node.id
    setTimeout(() => { pendingEditId.value = null }, 200)
    return
  }
}

onMounted(() => {
  updateDimensions()
  window.addEventListener('resize', updateDimensions)
  window.addEventListener('keydown', onExplorerKeydown)
  if (styleStore.explorerHighlightId) {
    scrollToHighlighted()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions)
  window.removeEventListener('keydown', onExplorerKeydown)
})

// ============================================
// ACTIONS — Criação contextual
// ============================================

// ID do nó que deve abrir em modo de edição inline após ser criado.
const pendingEditId = ref(null)

/** Nó atualmente selecionado na árvore (via seleção local do Explorer) */
const selectedNode = computed(() => {
  const id = selectedTreeNodeId.value
  if (!id || !styleStore.cssLogicTree) return null
  return findCssNode(toRaw(styleStore.cssLogicTree), id) ?? null
})

/**
 * Tipo de contexto baseado no nó selecionado:
 *  'file'     → nenhum/root/file selecionado → adicionar rule/@media no arquivo ativo
 *  'at-rule'  → at-rule selecionada → adicionar rule/@at-rule dentro dela
 *  'selector' → selector selecionado → adicionar declaração
 */
const contextType = computed(() => {
  const n = selectedNode.value
  if (!n || n.type === 'root' || n.type === 'file') return 'file'
  if (n.type === 'at-rule')  return 'at-rule'
  if (n.type === 'selector') return 'selector'
  return 'file'
})

/** Resolve origem e sourceName do arquivo ativo (não-externo) */
function resolveTarget() {
  const tree = styleStore.cssLogicTree
  if (!tree) return { origin: 'on_page', sourceName: 'style' }
  const root     = tree.find(n => n.metadata?.origin !== 'external') ?? tree[0]
  const fileNode = root?.children?.[0]
  return {
    origin:     root?.metadata?.origin ?? 'on_page',
    sourceName: fileNode?.label        ?? 'style',
  }
}

/** Cria nó, aplica mutação, rola até ele e abre edição inline */
async function createAndEdit(newNode) {
  if (!newNode) return
  styleStore.applyMutation(editorStore.getIframeDoc())
  expandToNode(newNode.id)
  await nextTick()
  const index = visibleNodes.value.findIndex(n => n.id === newNode.id)
  if (index !== -1 && containerRef.value) {
    const targetTop = index * ROW_HEIGHT
    containerRef.value.scrollTop = Math.max(0, targetTop - containerRef.value.clientHeight / 2)
  }
  await nextTick()
  pendingEditId.value = newNode.id
  setTimeout(() => { pendingEditId.value = null }, 200)
}

// — Context: file —
function addRule() {
  if (!styleStore.cssLogicTree) return
  const { origin, sourceName } = resolveTarget()
  createAndEdit(CssLogicTreeService.createRule(
    styleStore.cssLogicTree, '.nova-regra', origin, sourceName
  ))
}
function addAtRule() {
  if (!styleStore.cssLogicTree) return
  const { origin, sourceName } = resolveTarget()
  createAndEdit(CssLogicTreeService.createAtRule(
    styleStore.cssLogicTree, null, 'media', '(min-width: 0px)', origin, sourceName
  ))
}

// — Context: at-rule (adicionar como filho) —
function addRuleInside() {
  const atRule = selectedNode.value
  if (!atRule || atRule.type !== 'at-rule') return
  const { origin, sourceName } = { origin: atRule.metadata?.origin ?? 'on_page', sourceName: atRule.metadata?.sourceName ?? 'style' }
  createAndEdit(CssLogicTreeService.createRule(
    styleStore.cssLogicTree, '.nova-regra', origin, sourceName, atRule.id
  ))
}
function addAtRuleInside() {
  const atRule = selectedNode.value
  if (!atRule || atRule.type !== 'at-rule') return
  const { origin, sourceName } = { origin: atRule.metadata?.origin ?? 'on_page', sourceName: atRule.metadata?.sourceName ?? 'style' }
  createAndEdit(CssLogicTreeService.createAtRule(
    styleStore.cssLogicTree, null, 'media', '(min-width: 0px)', origin, sourceName, atRule.id
  ))
}

// — Context: selector (adicionar declaração) —
function addDeclaration(targetNode) {
  const selectorNode = targetNode ?? selectedNode.value
  if (!selectorNode || selectorNode.type !== 'selector') return
  const original = findCssNode(toRaw(styleStore.cssLogicTree), selectorNode.id)
  if (!original) return
  // CssDeclarationService.create espera { astNode, logicNode }.
  // Na Logic Tree, o astNode fica em metadata.astNode e o logicNode é o próprio nó.
  const ruleArg = { astNode: toRaw(original.metadata?.astNode), logicNode: original }
  if (!ruleArg.astNode) return
  const newDecl = CssLogicTreeService.createDeclaration(ruleArg, 'property', 'value')
  if (newDecl && typeof newDecl === 'object') {
    createAndEdit(newDecl)
  }
}

// — Deletar nó —
function deleteNode(node) {
  if (!node || !styleStore.cssLogicTree) return
  const tree = styleStore.cssLogicTree
  if (node.type === 'selector') {
    CssLogicTreeService.deleteRule(tree, node.id)
  } else if (node.type === 'at-rule') {
    CssLogicTreeService.deleteAtRule(tree, node.id)
  } else if (node.type === 'declaration') {
    // Remove directly from the Logic Tree by ID.
    // applyMutation → syncLogicNodeToAst will regenerate the CSS block without it.
    findAndRemoveFromLogicTree(toRaw(tree), node.id)
  }
  styleStore.applyMutation(editorStore.getIframeDoc())
  // Force-refresh the inspector immediately so the declaration disappears from the panel.
  styleStore.updateInspectorRules(
    editorStore.selectedElement,
    editorStore.viewport,
    styleStore.selectedRuleId,
  )
}

// — Duplicar nó —
function duplicateNode(node) {
  if (!node || !styleStore.cssLogicTree) return
  const tree  = toRaw(styleStore.cssLogicTree)
  let clone = null
  if (node.type === 'selector') {
    clone = CssLogicTreeService.duplicateRule(tree, node.id)
  } else if (node.type === 'at-rule') {
    clone = CssLogicTreeService.duplicateAtRule(tree, node.id)
  }
  if (!clone) return
  styleStore.applyMutation(editorStore.getIframeDoc())
  // Expand the parent so the clone is visible, then open it in edit mode
  expandToNode(clone.id)
  createAndEdit(clone)
}


// — Adicionar arquivo —
function addFile() {
  if (!styleStore.cssLogicTree) return
  const { origin } = resolveTarget()
  const name = `style-${Date.now()}.css`
  // Cria apenas o nó file, sem nenhuma regra dentro
  const root     = findOrCreateRoot(styleStore.cssLogicTree, origin)
  const fileNode = {
    id:       generateId(),
    type:     'file',
    label:    name,
    metadata: { origin, sourceName: name },
    children: [],
  }
  root.children.push(fileNode)
  styleStore.applyMutation(editorStore.getIframeDoc())
  createAndEdit(fileNode)
}

// — Remover arquivo CSS (move para lixeira no backend) —
async function deleteFile(fileNodeCopy) {
  const realNode = findCssNode(toRaw(styleStore.cssLogicTree), fileNodeCopy.id)
  if (!realNode) { console.warn('[deleteFile] nó não encontrado'); return }
  const sourceName = realNode.metadata?.sourceName
  const label      = realNode.label

  // Remove do cssManifest no StyleStore antes do trash
  const updatedManifest = styleStore.getManifest().filter(e => e.path !== sourceName && e.path !== label)
  styleStore.setManifest(updatedManifest)

  /** Verifica se um elemento DOM corresponde ao arquivo pelo sourceName/label */
  function matches(el) {
    const vals = [
      el.getAttribute('href'),
      el.getAttribute('data-manifest-path'),
      el.getAttribute('data-source-name'),
      el.id,
    ].filter(Boolean)
    for (const v of vals) {
      if (v === label || v === sourceName) return true
      if (label     && (v.endsWith(label)      || label.endsWith(v)))      return true
      if (sourceName && (v.endsWith(sourceName) || sourceName.endsWith(v))) return true
    }
    return false
  }

  // 1. Chama o backend para mover o arquivo para a lixeira
  let trashId = null
  if (sourceName) {
    try {
      const res = await ApiService.trashAsset(sourceName)
      trashId = res.trashId
    } catch (err) {
      console.warn('[deleteFile] trashAsset falhou (arquivo pode não estar no servidor):', err.message)
      // Continua mesmo sem backend (arquivo pode ser on_page ou não ter sido salvo)
    }
  }

  // 2. Remove a <style> ou <link> correspondente do iframe
  const doc = editorStore.getIframeDoc()
  if (doc) {
    const allEls = Array.from(
      doc.querySelectorAll('style[data-location], link[rel="stylesheet"]')
    )
    const tag = allEls.find(matches)
    if (tag) {
      tag.remove()
    } else {
      const basename = label?.split('/').pop()
      const fallback = allEls.find(el =>
        (el.getAttribute('href') ?? '').includes(basename) ||
        (el.getAttribute('data-manifest-path') ?? '').includes(basename)
      )
      fallback?.remove()
    }
  }

  // 3. Remove o nó da Logic Tree
  findAndRemoveFromLogicTree(toRaw(styleStore.cssLogicTree), realNode.id)

  // 4. Rebuilda a árvore
  await styleStore.rebuildLogicTree(doc)

  // 5. Toast de desfazer (só se foi para a lixeira no backend)
  if (trashId) showUndoToast(trashId, label?.split('/').pop() ?? label)
}

// — Criar novo stylesheet (on_page / internal / external) —
// Injeta o elemento HTML no iframe e rebuilda a Logic Tree
const newSheetMenu = ref(false)
// Estado para input inline (evita window.prompt que é bloqueado por browsers)
const newSheetInputType  = ref(null)    // null | 'internal' | 'external'
const newSheetInputValue = ref('')       // valor digitado

function requestNewSheet(type) {
  if (type === 'on_page') {
    newSheetMenu.value = false
    createStylesheet('on_page', null)
    return
  }
  newSheetInputType.value  = type
  newSheetInputValue.value = type === 'internal' ? 'styles.css' : 'https://'
}

async function confirmCreateStylesheet() {
  const type = newSheetInputType.value
  const href = newSheetInputValue.value?.trim()
  // Reset antes de qualquer await
  newSheetInputType.value  = null
  newSheetInputValue.value = ''
  newSheetMenu.value       = false
  if (!href) return
  await createStylesheet(type, href)
}

async function createStylesheet(type, href = null) {
  const doc = editorStore.getIframeDoc()
  if (!doc) { console.warn('[createStylesheet] doc é null — abortando'); return }

  if (type === 'on_page') {
    // Sem arquivo no disco — apenas injeta <style> no iframe (não vai no manifesto)
    const el = doc.createElement('style')
    el.setAttribute('data-location', 'on_page')
    el.textContent = ':root {}'
    doc.head.appendChild(el)

  } else if (type === 'internal') {
    // 1. Cria o arquivo físico no disco (o backend adiciona ao manifest.json)
    let finalPath = href
    try {
      const res  = await ApiService.createAsset(href, 'css')
      finalPath  = res.path ?? href
    } catch (err) {
      // Arquivo já existe → usa o existente sem recriar
      console.warn('[createStylesheet] createAsset:', err.message)
    }

    // 2. Atualiza o cssManifest no StyleStore (fonte de verdade no frontend)
    const manifest = styleStore.getManifest()
    const alreadyInManifest = manifest.some(e => e.path === finalPath)
    if (!alreadyInManifest) {
      styleStore.setManifest([...manifest, { path: finalPath, type: 'internal' }])
    }

    // 3. Injeta <style data-location="internal"> no iframe para o editor reconhecer
    const el = doc.createElement('style')
    el.setAttribute('data-location', 'internal')
    el.setAttribute('data-manifest-path', finalPath)
    el.setAttribute('data-source-name', finalPath)
    el.textContent = ':root {}'
    doc.head.appendChild(el)

  } else if (type === 'external') {
    // Sem arquivo no disco — injeta <link> no iframe e adiciona ao manifesto
    const el = doc.createElement('link')
    el.rel  = 'stylesheet'
    el.href = href
    el.setAttribute('data-location', 'external')

    // Define um nome legível para o explorer
    let sourceName = href
    try {
      const url      = new URL(href)
      const filename = url.pathname.split('/').filter(Boolean).pop() || ''
      sourceName = /\.(css|less|scss)$/i.test(filename) ? filename : url.hostname
    } catch { /* mantém href */ }
    el.setAttribute('data-source-name', sourceName)

    doc.head.appendChild(el)

    // Atualiza o cssManifest no StyleStore
    const manifest = styleStore.getManifest()
    const alreadyInManifest = manifest.some(e => e.path === href)
    if (!alreadyInManifest) {
      styleStore.setManifest([...manifest, { path: href, type: 'external' }])
    }

    // Atualiza o contexto do pipeline para que o HTML Explorer reflita o novo <link>
    const pipelineCtx = editorStore.ctx
    if (pipelineCtx) {
      pipelineCtx.headHTML = doc.head.innerHTML
      const headNode = pipelineCtx.ast?.children?.find(c => c.tag === 'head')
      if (headNode) {
        const { generateId } = await import('@/utils/ids')
        headNode.children.push({
          nodeId: generateId(),
          type:   'element',
          tag:    'link',
          attrs:  { rel: 'stylesheet', href, 'data-location': 'external', 'data-source-name': sourceName },
          children: [],
        })
      }
    }
  }

  await styleStore.rebuildLogicTree(doc, ['on_page', 'internal', 'external'])
  expandAll()
}

// ============================================
// CONTEXT MENU
// ============================================

const contextMenu = ref(null) // { x, y, items }

// ── Toast de desfazer ──────────────────────────────────────────────────────────
const undoToast = ref(null) // { message, trashId } | null
let undoTimer = null

function showUndoToast(trashId, filename) {
  clearTimeout(undoTimer)
  undoToast.value = { message: `"${filename}" movido para a lixeira`, trashId }
  undoTimer = setTimeout(() => { undoToast.value = null }, 8000)
}

async function undoTrash() {
  const toast = undoToast.value
  if (!toast) return
  undoToast.value = null
  clearTimeout(undoTimer)
  try {
    await ApiService.restoreFromTrash(toast.trashId)
    await styleStore.rebuildLogicTree(editorStore.getIframeDoc())
  } catch (err) {
    console.error('[CssExplorer] falha ao restaurar da lixeira:', err)
  }
}

// ─── CSS Import ───────────────────────────────────────────────────────────────

/**
 * Estado do modal de importação.
 * targetFileNode é o nó `file` de destino selecionado pelo usuário.
 */
const importModal = ref({ open: false, fileNode: null })

/** Abre o modal para importar CSS no arquivo `node`. */
function openImportModal(node) {
  importModal.value = { open: true, fileNode: node }
}

/**
 * Recebe o CSS colado pelo usuário, injeta no iframe e reconstrói a árvore.
 *
 * Estratégia:
 *   1. Validar que o CSS pode ser parseado (css-tree).
 *   2. Localizar o `<style>` correto no iframe pelo sourceName do nó.
 *   3. Concatenar o CSS novo ao conteúdo existente.
 *   4. Reconstruir a Logic Tree para o Explorer refletir os novos nós.
 *
 * @param {string} cssText - CSS bruto colado pelo usuário
 */
async function handleCssImport(cssText) {
  const fileNode = importModal.value.fileNode
  if (!fileNode || !cssText.trim()) return

  // 1. Validar o CSS (parse lança erro se o CSS for inválido)
  try {
    parse(cssText)
  } catch (err) {
    console.error('[CssExplorer] CSS inválido, import abortado:', err)
    return
  }

  // 2. Localizar o <style> no iframe pelo sourceName do arquivo
  const doc        = editorStore.getIframeDoc()
  const sourceName = fileNode.metadata?.sourceName
  const origin     = fileNode.metadata?.origin

  // Para nós on_page/internal: procura a tag <style> com data-location correspondente
  let styleTag = null
  if (origin === 'on_page' || origin === 'internal') {
    const styles = Array.from(doc.querySelectorAll('style'))
    styleTag = styles.find(s => {
      const loc = s.dataset.location
      // Se o arquivo é "style" sem nome específico, pega o primeiro on_page
      return loc === origin || loc === 'on_page'
    }) ?? null
  }

  if (!styleTag) {
    // Cria uma nova <style> on_page se não encontrar a existente
    styleTag = doc.createElement('style')
    styleTag.setAttribute('data-location', 'on_page')
    doc.head.appendChild(styleTag)
  }

  // 3. Concatenar o CSS novo (separado por linha em branco)
  styleTag.textContent += '\n\n' + cssText

  // 4. Reconstruir a Logic Tree para o Explorer refletir os novos nós
  await styleStore.rebuildLogicTree(doc)

  console.log(`[CssExplorer] CSS importado em "${sourceName}" (${origin}).`)
}

function openContextMenu(node, event) {
  event.preventDefault()
  const x = event.clientX
  const y = event.clientY
  let items = []

  const isExternal = node?.metadata?.origin === 'external'

  if (!node || node.type === 'root') {
    items = [
      { label: 'New File', icon: '📄', action: addFile },
    ]
  } else if (node.type === 'file') {
    const fileKey = `${node.metadata?.origin}::${node.label}`
    if (isExternal) {
      items = [{ label: 'External — read only', icon: '🔒', disabled: true }]
    } else {
      items = [
        { label: 'New CSS Rule', icon: '{}', action: () => addRuleInContext(node), shortcut: 'Ctrl+Enter' },
        { label: 'New At-Rule',  icon: '@',  action: () => addAtRuleInContext(node) },
        { divider: true },
        { label: 'Move Up',     icon: '↑',  action: () => moveFileInManifest(node, 'up') },
        { label: 'Move Down',   icon: '↓',  action: () => moveFileInManifest(node, 'down') },
        { divider: true },
        { label: 'Rename',      icon: '✏️', action: () => renameFile(node), shortcut: 'F2' },
        { label: 'Import CSS',  icon: '↑', action: () => openImportModal(node) },
        { label: 'Export .css', icon: '↓', action: () => downloadSheet(fileKey) },
        { divider: true },
        { label: 'Remover arquivo', icon: '✕', action: () => deleteFile(node), danger: true, shortcut: 'Del' },
      ]
    }
  } else if (node.type === 'at-rule') {
    if (isExternal) {
      items = [{ label: 'External — read only', icon: '🔒', disabled: true }]
    } else {
      items = [
        { label: 'New CSS Rule inside', icon: '{}', action: () => addRuleInContext(node), shortcut: 'Ctrl+Enter' },
        { label: 'New At-Rule inside',  icon: '@',  action: () => addAtRuleInContext(node) },
        { divider: true },
        { label: 'Add Rule Before',     icon: '↑{}', action: () => addRuleBeforeNode(node), shortcut: 'Alt+↑' },
        { label: 'Add Rule After',      icon: '↓{}', action: () => addRuleAfterNode(node), shortcut: 'Alt+↓' },
        { divider: true },
        { label: 'Duplicate',           icon: '⧉',  action: () => duplicateNode(node), shortcut: 'Ctrl+D' },
        { divider: true },
        { label: 'Delete', icon: '✕', action: () => deleteNode(node), danger: true, shortcut: 'Del' },
      ]
    }
  } else if (node.type === 'selector') {
    if (isExternal) {
      items = [{ label: 'External — read only', icon: '🔒', disabled: true }]
    } else {
      items = [
        { label: 'New Declaration', icon: ':', action: () => addDeclaration(node), shortcut: 'Ctrl+Enter' },
        { divider: true },
        { label: 'Add Rule Before', icon: '↑{}', action: () => addRuleBeforeNode(node), shortcut: 'Alt+↑' },
        { label: 'Add Rule After',  icon: '↓{}', action: () => addRuleAfterNode(node), shortcut: 'Alt+↓' },
        { divider: true },
        { label: `Wrap @media (${Math.round(editorStore.viewport?.width ?? 768)}px)`, icon: '@', action: () => wrapWithAtRule(node), shortcut: 'Ctrl+M' },
        { divider: true },
        { label: 'Duplicate Rule',  icon: '⧉', action: () => duplicateNode(node), shortcut: 'Ctrl+D' },
        { divider: true },
        { label: 'Delete', icon: '✕', action: () => deleteNode(node), danger: true, shortcut: 'Del' },
      ]
    }
  } else if (node.type === 'declaration') {
    if (isExternal) {
      items = [{ label: 'External — read only', icon: '🔒', disabled: true }]
    } else {
      items = [
        { label: 'Delete', icon: '✕', action: () => deleteNode(node), danger: true, shortcut: 'Del' },
      ]
    }
  }

  if (items.length) contextMenu.value = { x, y, items }
}


/** Renomeia um nó file atualizando a Logic Tree e o atributo no iframe */
function renameFile(fileNodeCopy) {
  const oldName = fileNodeCopy.label ?? ''
  const newName = window.prompt('Novo nome do arquivo CSS:', oldName)
  if (!newName || newName.trim() === oldName) return

  const trimmed = newName.trim()

  // O nó do context menu é uma cópia do virtual list ({ ...node, depth })
  // Precisamos encontrar o nó REAL na Logic Tree para mutá-lo
  const realNode = findCssNode(toRaw(styleStore.cssLogicTree), fileNodeCopy.id)
  if (!realNode) {
    console.warn('[renameFile] nó não encontrado na cssLogicTree:', fileNodeCopy.id)
    return
  }

  // 1. Atualiza o nó real na Logic Tree
  realNode.label = trimmed
  if (realNode.metadata) realNode.metadata.sourceName = trimmed

  // 2. Propaga o novo sourceName para todas as regras filhas (usada no Inspector)
  const walk = (nodes) => nodes?.forEach(child => {
    if (child.metadata) child.metadata.sourceName = trimmed
    walk(child.children)
  })
  walk(realNode.children)

  // 3. Atualiza o data-source-name no <style> correspondente no iframe
  const doc = editorStore.getIframeDoc()
  if (doc) {
    const styles = Array.from(doc.querySelectorAll('style[data-location], link[rel="stylesheet"]'))
    const match  = styles.find(el =>
      el.getAttribute('data-source-name') === oldName ||
      el.getAttribute('data-label') === oldName
    )
    if (match) match.setAttribute('data-source-name', trimmed)
  }

  // 4. Notifica a UI
  styleStore.notifyTreeMutation()
}

/**
 * Reordena arquivos CSS internos movendo o arquivo alvo para cima ou para baixo.
 * Lê os data-manifest-path dos <style data-location="internal"> no iframe (na ordem atual),
 * aplica o movimento e persiste via ApiService.reorderAssets().
 *
 * @param {Object} fileNode - nó file do CssExplorer (cópia do virtual list)
 * @param {'up'|'down'} direction
 */
async function moveFileInManifest(fileNode, direction) {
  // 1. Trabalha diretamente com o cssManifest do StyleStore (fonte de verdade)
  const manifest = styleStore.getManifest()
  if (manifest.length < 2) return

  // 2. Identifica o path do arquivo alvo
  const targetPath = fileNode.metadata?.sourceName ?? fileNode.label
  const idx = manifest.findIndex(e => e.path === targetPath)
  if (idx === -1) return

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= manifest.length) return

  // 3. Trocar posições (preservando os objetos {path, type})
  const newManifest = [...manifest]
  ;[newManifest[idx], newManifest[swapIdx]] = [newManifest[swapIdx], newManifest[idx]]

  // 4. Atualiza o StyleStore
  styleStore.setManifest(newManifest)

  // 5. Persiste no backend (envia apenas os paths, o backend preserva os types)
  const paths = newManifest.map(e => e.path)
  try {
    await ApiService.reorderAssets(paths)
    console.log('[CssExplorer] reorderAssets OK:', paths)
  } catch (err) {
    console.error('[CssExplorer] reorderAssets falhou:', err)
  }
}

/** Adiciona regra como filho de um nó file ou at-rule específico */
function addRuleInContext(parentNode) {
  const origin     = parentNode.metadata?.origin     ?? resolveTarget().origin
  const sourceName = parentNode.metadata?.sourceName ?? resolveTarget().sourceName
  const parentId   = parentNode.type === 'at-rule' ? parentNode.id : null
  createAndEdit(CssLogicTreeService.createRule(
    styleStore.cssLogicTree, '.nova-regra', origin, sourceName, parentId
  ))
}

/** Adiciona @media como filho de um nó file ou at-rule específico */
function addAtRuleInContext(parentNode) {
  const origin     = parentNode.metadata?.origin     ?? resolveTarget().origin
  const sourceName = parentNode.metadata?.sourceName ?? resolveTarget().sourceName
  const parentId   = parentNode.type === 'at-rule' ? parentNode.id : null
  createAndEdit(CssLogicTreeService.createAtRule(
    styleStore.cssLogicTree, null, 'media', '(min-width: 0px)', origin, sourceName, parentId
  ))
}

/**
 * Resolve o parentNode e o índice de um nó dentro da Logic Tree.
 * Retorna { parentNode, index, origin, sourceName, parentId }
 */
function resolveNodePosition(node) {
  const tree       = toRaw(styleStore.cssLogicTree)
  const parentNode = findParent(tree, node.id)
  if (!parentNode) return null
  const index      = parentNode.children.findIndex(n => n.id === node.id)
  const origin     = node.metadata?.origin     ?? resolveTarget().origin
  const sourceName = node.metadata?.sourceName ?? resolveTarget().sourceName
  // parentId só se o pai for um at-rule; se for file passamos null
  const parentId   = parentNode.type === 'at-rule' ? parentNode.id : null
  return { parentNode, index, origin, sourceName, parentId }
}

/** Insere uma nova CSS Rule ANTES do nó informado (mesmo pai, mesmo índice) */
function addRuleBeforeNode(node) {
  const pos = resolveNodePosition(node)
  if (!pos) return
  createAndEdit(CssLogicTreeService.createRule(
    styleStore.cssLogicTree, '.nova-regra', pos.origin, pos.sourceName, pos.parentId, pos.index
  ))
}

/** Insere uma nova CSS Rule DEPOIS do nó informado (mesmo pai, índice + 1) */
function addRuleAfterNode(node) {
  const pos = resolveNodePosition(node)
  if (!pos) return
  createAndEdit(CssLogicTreeService.createRule(
    styleStore.cssLogicTree, '.nova-regra', pos.origin, pos.sourceName, pos.parentId, pos.index + 1
  ))
}

/** Envolve uma regra selector com um @media usando a largura atual do viewport */
function wrapWithAtRule(node) {
  if (!node || node.type !== 'selector' || !styleStore.cssLogicTree) return
  const vw = editorStore.viewport?.width ?? editorStore.previewBreakpoint?.width ?? 768
  const condition = `(min-width: ${Math.round(vw)}px)`
  const atRuleNode = CssLogicTreeService.createAtRule(
    styleStore.cssLogicTree, node.id, 'media', condition
  )
  if (!atRuleNode) return
  styleStore.applyMutation(editorStore.getIframeDoc())
  expandToNode(node.id)
}

const refresh = async () => {
  const doc = editorStore.getIframeDoc()
  await styleStore.rebuildLogicTree(doc)
}

// ============================================
// VIRTUAL LIST
// ============================================

/**
 * Flat list of visible nodes based on local expansion state.
 * Depends on astMutationKey to re-compute when the AST is mutated,
 * and on toggledNodes to re-compute when a node is expanded/collapsed.
 */
const visibleNodes = computed(() => {
  // Depend on mutation key to trigger re-computation when tree structure changes
  void styleStore.astMutationKey

  // Depend on toggledNodes to trigger re-computation when expansion changes
  void toggledNodes.value

  const flat  = []
  const roots = styleStore.cssLogicTree || []
  const ids   = matchedIds.value // null when no search active

  const traverse = (nodes, depth = 0) => {
    for (const node of nodes) {
      // In search mode: only include nodes that are matched (or ancestors of matched)
      if (ids !== null && !ids.has(node.id)) continue

      flat.push({ ...node, depth })

      // In search mode: always show children if this node is in the matched set
      // (the set already contains ancestors of real matches, so we expand them)
      const expand = ids !== null ? ids.has(node.id) : isExpanded(node)
      if (expand && node.children?.length > 0) {
        const nextDepth = node.type === 'root' ? 0 : depth + 1
        traverse(node.children, nextDepth)
      }
    }
  }

  traverse(roots)
  return flat
})

const totalHeight = computed(() => visibleNodes.value.length * ROW_HEIGHT)
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - 5))
const endIndex = computed(() => Math.min(visibleNodes.value.length, Math.ceil((scrollTop.value + containerHeight.value) / ROW_HEIGHT) + 5))

// ============================================
// MEDIA QUERY EVALUATION
// ============================================

/**
 * Evaluate whether an @media at-rule label is active for the given viewport.
 * Handles the most common cases: min/max-width, min/max-height, print, screen, all.
 * Returns { active: boolean, reason: string | null }
 */
function evaluateMediaQuery(label, viewport) {
  if (!label || !label.includes('@media')) return { active: true, reason: null }

  // Extract the condition string after '@media'
  const condition = label.replace(/^@media\s*/i, '').trim()

  if (!condition || condition === 'all' || condition === 'screen') {
    return { active: true, reason: null }
  }
  if (condition === 'print') {
    return { active: false, reason: `@media print — inactive (screen)` }
  }

  const vw = viewport?.width  ?? window.innerWidth
  const vh = viewport?.height ?? window.innerHeight

  // Parse all conditions joined by 'and'
  const parts = condition.split(/\s+and\s+/i)
  for (const part of parts) {
    const clean = part.replace(/[()]/g, '').trim()

    let m
    // min-width
    m = clean.match(/^min-width\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) {
      const val = parseFloat(m[1]) * (m[2] === 'em' || m[2] === 'rem' ? 16 : 1)
      if (vw < val) return { active: false, reason: `${label} — inactive (viewport ${vw}px < ${Math.round(val)}px)`}
      continue
    }
    // max-width
    m = clean.match(/^max-width\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) {
      const val = parseFloat(m[1]) * (m[2] === 'em' || m[2] === 'rem' ? 16 : 1)
      if (vw > val) return { active: false, reason: `${label} — inactive (viewport ${vw}px > ${Math.round(val)}px)`}
      continue
    }
    // min-height
    m = clean.match(/^min-height\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) {
      const val = parseFloat(m[1]) * (m[2] === 'em' || m[2] === 'rem' ? 16 : 1)
      if (vh < val) return { active: false, reason: `${label} — inactive (viewport height ${vh}px < ${Math.round(val)}px)`}
      continue
    }
    // max-height
    m = clean.match(/^max-height\s*:\s*([\d.]+)(px|em|rem)?$/i)
    if (m) {
      const val = parseFloat(m[1]) * (m[2] === 'em' || m[2] === 'rem' ? 16 : 1)
      if (vh > val) return { active: false, reason: `${label} — inactive (viewport height ${vh}px > ${Math.round(val)}px)`}
      continue
    }
  }
  return { active: true, reason: null }
}

const displayedNodes = computed(() => {
  const q        = searchQuery.value.trim()
  const viewport = editorStore.viewport
  return visibleNodes.value.slice(startIndex.value, endIndex.value).map((node, index) => {
    let isActive      = true
    let inactiveReason = null
    if (node.type === 'at-rule' && node.label?.includes('@media')) {
      const result = evaluateMediaQuery(node.label, viewport)
      isActive       = result.active
      inactiveReason = result.reason
    }
    return {
      ...node,
      virtualIndex:   startIndex.value + index,
      isExpanded:     isExpanded(node),
      onToggle:       () => toggleNode(node.id),
      searchQuery:    q,
      isActive,
      inactiveReason,
    }
  })
})

const itemsOffset = computed(() => startIndex.value * ROW_HEIGHT)
</script>



<template>
    <div
      ref="explorerRef"
      class="flex flex-col h-full bg-white border-r border-[#d1d1d1]"
      @click="newSheetMenu = false"
    >
        <!-- Header -->
        <div class="px-2 py-1.5 bg-gradient-to-b from-gray-100 to-gray-50 border-b border-gray-200 flex items-center gap-1 shrink-0">

          <!-- Título + contador -->
          <div class="flex items-center gap-1.5 min-w-0 mr-auto">
            <svg class="w-3 h-3 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10M5 3h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/>
            </svg>
            <span class="text-[11px] font-semibold text-gray-600 tracking-wide truncate">CSS</span>
            <span v-if="searchQuery.trim()" class="text-[10px] text-blue-500 font-medium shrink-0">
              {{ matchCount }} match{{ matchCount !== 1 ? 'es' : '' }}
            </span>
            <span v-else class="text-[10px] text-gray-400 tabular-nums shrink-0">{{ visibleNodes.length }}</span>
          </div>

          <!-- Botões de ação -->
          <div class="flex items-center gap-0.5">

            <!-- Search toggle -->
            <button
              @click="searchActive ? clearSearch() : openSearch()"
              class="w-6 h-6 flex items-center justify-center rounded transition-colors"
              :class="searchActive ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'"
              title="Buscar (Ctrl+F)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
              </svg>
            </button>

            <!-- Expand / Collapse All -->
            <button
              @click="isFullyExpanded ? collapseAll() : expandAll()"
              class="w-6 h-6 flex items-center justify-center rounded transition-colors text-gray-400 hover:text-gray-700 hover:bg-gray-200"
              :title="isFullyExpanded ? 'Recolher tudo' : 'Expandir tudo'"
            >
              <svg v-if="isFullyExpanded" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14l7-7m0 0V3m0 4H7M20 10l-7 7m0 0v4m0-4h4"/>
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
            </button>

            <!-- Refresh -->
            <button
              @click="refresh"
              class="w-6 h-6 flex items-center justify-center rounded transition-colors text-gray-400 hover:text-gray-700 hover:bg-gray-200"
              title="Recarregar árvore CSS"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>

            <!-- Separador -->
            <div class="w-px h-4 bg-gray-200 mx-0.5"></div>

            <!-- New Stylesheet (+) dropdown -->
            <div class="relative">
              <button
                @click.stop="newSheetMenu = !newSheetMenu"
                class="w-6 h-6 flex items-center justify-center rounded transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                title="Novo stylesheet"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
              </button>
              <div
                v-if="newSheetMenu"
                class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 z-50 min-w-[180px] text-[11px]"
                @click.stop
              >
                <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Novo Stylesheet</div>

                <!-- Input inline (substitui window.prompt) -->
                <div v-if="newSheetInputType" class="px-2 pb-2">
                  <div class="text-[10px] text-gray-500 mb-1 px-1">
                    {{ newSheetInputType === 'internal' ? 'Nome do arquivo:' : 'URL externa:' }}
                  </div>
                  <input
                    v-model="newSheetInputValue"
                    :placeholder="newSheetInputType === 'internal' ? 'styles.css' : 'https://cdn.example.com/x.css'"
                    class="w-full border border-gray-300 rounded px-2 py-1 text-[11px] outline-none focus:border-blue-400 mb-1"
                    @keydown.enter.prevent="confirmCreateStylesheet"
                    @keydown.escape.prevent="newSheetInputType = null"
                    autofocus
                  />
                  <div class="flex gap-1">
                    <button
                      @click.stop="confirmCreateStylesheet"
                      class="flex-1 bg-blue-500 text-white rounded px-2 py-1 text-[10px] font-medium hover:bg-blue-600"
                    >Criar</button>
                    <button
                      @click.stop="newSheetInputType = null"
                      class="flex-1 bg-gray-100 text-gray-600 rounded px-2 py-1 text-[10px] hover:bg-gray-200"
                    >Cancelar</button>
                  </div>
                </div>

                <!-- Botões de tipo -->
                <template v-else>
                  <button
                    class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-gray-700"
                    @click.stop="requestNewSheet('on_page')"
                  >
                    <span class="text-indigo-500 font-mono">&lt;style&gt;</span>
                    On-page
                  </button>
                  <button
                    class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-gray-700"
                    @click.stop="requestNewSheet('internal')"
                  >
                    <span class="text-blue-500 font-mono">&lt;link&gt;</span>
                    Internal
                  </button>
                  <button
                    class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-gray-700"
                    @click.stop="requestNewSheet('external')"
                  >
                    <span class="text-orange-500 font-mono">🔗</span>
                    External
                  </button>
                </template>
              </div>
            </div>

          </div>
        </div>

        <!-- Search bar -->
        <transition name="search-bar">
          <div v-if="searchActive" class="px-2 py-1.5 bg-[#f8f8f8] border-b border-[#d1d1d1] flex items-center gap-1.5 shrink-0">
            <svg class="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
            </svg>
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Filter rules…"
              class="flex-1 min-w-0 bg-transparent outline-none text-[11px] text-gray-700 placeholder-gray-400 font-mono"
              @keydown.escape.stop="clearSearch"
            />

            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="text-gray-400 hover:text-gray-700 text-[11px] leading-none font-bold shrink-0"
              title="Clear"
            >×</button>
          </div>
        </transition>

        <!-- Virtualized List Container -->
        <div 
            ref="containerRef"
            class="flex-1 overflow-y-auto custom-scrollbar bg-white relative"
            @scroll="handleScroll"
            @contextmenu.self.prevent="(e) => openContextMenu(null, e)"
        >
            <div v-if="visibleNodes.length" :style="{ height: totalHeight + 'px' }" class="relative">
                <div 
                    class="absolute top-0 left-0 w-full" 
                    :style="{ transform: `translateY(${itemsOffset}px)` }"
                >
                    <CssTreeItem 
                        v-for="node in displayedNodes" 
                        :key="node.id" 
                        :node="node" 
                        :depth="node.depth" 
                        :isDragging="dragState?.node?.id === node.id"
                        :dropPosition="dropTarget?.nodeId === node.id ? dropTarget.position : null"
                        :editNodeId="pendingEditId"
                        :searchQuery="node.searchQuery"
                        :isActive="node.isActive"
                        :inactiveReason="node.inactiveReason"
                        :selectedNodeId="selectedTreeNodeId"
                        style="height: 22px;"
                        @dragstart="onDragStart"
                        @dragover="onDragOver"
                        @drop="onDrop"
                        @dragend="onDragEnd"
                        @contextmenu="openContextMenu"
                        @import-css="openImportModal"
                        @select="onNodeSelect"
                    />
                </div>
            </div>
            <div v-else class="p-4 text-center text-gray-400 text-xs">
              <template v-if="searchQuery.trim()">
                No results for <strong>{{ searchQuery }}</strong>.
              </template>
              <template v-else>
                No CSS AST loaded.<br>Try clicking refresh.
              </template>
            </div>
        </div>

        <!-- Menu de contexto -->
        <CssContextMenu :menu="contextMenu" @close="contextMenu = null" />

        <!-- Modal de importação de CSS -->
        <CssImportModal
          :isOpen="importModal.open"
          :fileName="importModal.fileNode?.label ?? 'style'"
          @import="handleCssImport"
          @close="importModal.open = false"
        />

        <!-- Toast de desfazer (lixeira) -->
        <Transition name="toast">
          <div
            v-if="undoToast"
            style="
              position: absolute; bottom: 10px; left: 8px; right: 8px;
              background: #1e293b; color: white; border-radius: 8px;
              padding: 8px 10px; font-size: 11px; display: flex;
              align-items: center; justify-content: space-between;
              gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 100;
            "
          >
            <span style="opacity:.85">🗑 {{ undoToast.message }}</span>
            <button
              @click="undoTrash"
              style="background:#4f46e5; border:none; color:white; padding:3px 10px;
                     border-radius:5px; cursor:pointer; font-size:11px; font-weight:600; flex-shrink:0"
            >Desfazer</button>
          </div>
        </Transition>
    </div>

</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}

/* Search bar slide-down animation */
.search-bar-enter-active,
.search-bar-leave-active {
  transition: max-height 0.15s ease, opacity 0.15s ease;
  overflow: hidden;
}
.search-bar-enter-from,
.search-bar-leave-to {
  max-height: 0;
  opacity: 0;
}
.search-bar-enter-to,
.search-bar-leave-from {
  max-height: 40px;
  opacity: 1;
}
</style>

