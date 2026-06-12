<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted, toRaw } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { CssExportService } from '@/editor/css/export/CssExportService'
import { findOrCreateRoot, findCssNode, findParent } from '@/editor/css/tree/_logicTreeHelpers.js'
import { findAndRemoveFromLogicTree } from '@/utils/astHelpers.js'

import { generateId } from '@/utils/ids.js'
import CssTreeItem from './CssTreeItem.vue'
import CssContextMenu from './CssContextMenu.vue'
import CssExplorerHeader from './CssExplorerHeader.vue'
import CssExplorerUndoToast from './CssExplorerUndoToast.vue'
import { buildContextMenuItems } from './cssExplorerMenu.js'
import { useCssDragDrop } from '@/composables/useCssDragDrop'
import { useTreeExpansion } from '@/composables/useTreeExpansion'
import { useExplorerSearch } from '@/composables/useExplorerSearch'
import { evaluateMediaQuery } from '@/editor/css/shared/mediaQuery.js'
import { ApiService } from '@/services/ApiService'

const styleStore = useStyleStore()
const editorStore = useEditorStore()

const { dragState, dropTarget, onDragStart, onDragOver, onDrop, onDragEnd } = useCssDragDrop()

// Estado de expansão da árvore (UI local) e busca/filtro
const expansion = useTreeExpansion(styleStore)
const { toggledNodes, toggleNode, isExpanded, expandToNode } = expansion
const search = useExplorerSearch(styleStore)
const { searchQuery, searchActive, openSearch, clearSearch, matchedIds } = search

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
      const res = await ApiService.trashAsset(sourceName, editorStore.currentDocument?.path)
      trashId = res.trashId
    } catch (err) {
      console.warn('[deleteFile] trashAsset falhou:', err.message)
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
// O dropdown/input vivem no CssExplorerHeader; aqui só a criação de fato:
// injeta o elemento HTML no iframe e rebuilda a Logic Tree.
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
      const res  = await ApiService.createAsset(href, 'css', editorStore.currentDocument?.path)
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
  // expandAll()
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

// ─── Menu de Contexto ───────────────────────────────────────────────────────

// Callbacks que o builder do menu liga aos itens (cssExplorerMenu.js)
const menuActions = {
  addFile,
  addRuleInContext,
  addAtRuleInContext,
  moveFileInManifest,
  renameFile,
  exportFile: (node) =>
    CssExportService.downloadOne(styleStore.cssLogicTree, `${node.metadata?.origin}::${node.label}`),
  deleteFile,
  addDeclaration,
  addRuleBeforeNode,
  addRuleAfterNode,
  wrapWithAtRule,
  duplicateNode,
  deleteNode,
}

function openContextMenu(node, event) {
  event.preventDefault()
  const items = buildContextMenuItems(node, menuActions, editorStore.viewport?.width)
  if (items.length) contextMenu.value = { x: event.clientX, y: event.clientY, items }
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
    await ApiService.reorderAssets(paths, editorStore.currentDocument?.path)
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
    >
        <!-- Header + busca + menu de novo stylesheet -->
        <CssExplorerHeader
          :search="search"
          :expansion="expansion"
          :nodeCount="visibleNodes.length"
          @refresh="refresh"
          @create-stylesheet="createStylesheet"
        />

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


        <CssExplorerUndoToast :toast="undoToast" @undo="undoTrash" />
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

