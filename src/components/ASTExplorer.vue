<script setup>
// ASTExplorer.vue

import { computed, ref } from 'vue'
import ASTNode from './ASTNode.vue'
import CssContextMenu from './CssContextMenu.vue'
import CreateComponentModal from './CreateComponentModal.vue'
import { useExplorerDragDrop } from '@/composables/useExplorerDragDrop'
import { useEditorStore } from '@/stores/EditorStore'
import { useComponentStore } from '@/stores/ComponentStore'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'
import { HtmlExportService } from '@/editor/css/export/HtmlExportService'

const { explorerDragState } = useExplorerDragDrop()
const s = explorerDragState

const showTextNodes = ref(false)
const showCommentNodes = ref(false)

const EditorStore = useEditorStore()
const ComponentStore = useComponentStore()

// ── Context Menu ─────────────────────────────────────────────────────────────
const contextMenu = ref(null) // { x, y, items }

function handleContextMenu({ node, event }) {
  if (node.type !== 'element') return
  
  const items = []
  
  // Se já for componente, mostrar opção de editar? (opcional por enquanto)
  if (node.attrs?.['data-component']) {
    const componentName = node.attrs['data-component']
    items.push({ 
      label: 'Atualizar Master', 
      icon: '🔄', 
      action: () => confirmUpdateMaster(node, componentName) 
    })
    if (EditorStore.unlockedComponentIds.has(node.nodeId)) {
      items.push({ 
        label: 'Bloquear Edição', 
        icon: '🔒', 
        action: () => EditorStore.lockComponent(node.nodeId) 
      })
    } else {
      items.push({ 
        label: 'Editar Componente', 
        icon: '✏️', 
        action: () => EditorStore.unlockComponent(node.nodeId) 
      })
    }
  } else {
    items.push({ 
      label: 'Criar Componente', 
      icon: '📦', 
      action: () => openCreateModal(node) 
    })
  }

  // ── Opções de Slot (para qualquer elemento que não seja raiz de componente) ──
  const isInsideComponent = !!EditorStore.getParent(node.nodeId)?.attrs?.['data-component'] ||
    isAncestorComponent(node.nodeId)

  if (!node.attrs?.['data-component'] && isInsideComponent) {
    items.push({ divider: true })

    if (node.attrs?.['data-slot'] !== undefined) {
      // É um slot: opções de gestão
      const hasHideEmpty = node.attrs?.['data-slot-hide-empty'] !== undefined
      items.push({ 
        label: hasHideEmpty ? 'Remover Hide-If-Empty' : 'Esconder Se Vazio',
        icon: hasHideEmpty ? '👁' : '🙈',
        action: () => {
          if (hasHideEmpty) {
            EditorStore.manipulation.removeAttribute(node.nodeId, 'data-slot-hide-empty')
          } else {
            EditorStore.manipulation.setAttribute(node.nodeId, 'data-slot-hide-empty', '')
          }
        }
      })
      items.push({ 
        label: 'Remover Slot', 
        icon: '✕',
        action: () => EditorStore.manipulation.removeAttribute(node.nodeId, 'data-slot') 
      })
    } else {
      // Não é slot: opção de transformar
      items.push({ 
        label: 'Transformar em Slot', 
        icon: '◈',
        action: () => {
          const slotName = prompt('Nome do slot (ex: content, footer, sidebar):', 'default')
          if (slotName) {
            EditorStore.manipulation.setAttribute(node.nodeId, 'data-slot', slotName.trim())
          }
        }
      })
    }
  }

  contextMenu.value = { x: event.clientX, y: event.clientY, items }
}

/**
 * Verifica se algum ancestral do nó é um componente (raiz de data-component).
 */
function isAncestorComponent(nodeId) {
  let current = EditorStore.getParent(nodeId)
  while (current) {
    if (current.attrs?.['data-component']) return true
    current = EditorStore.getParent(current.nodeId)
  }
  return false
}


async function confirmUpdateMaster(node, name) {
  if (!confirm(`Deseja atualizar o componente mestre "${name}" com as alterações desta instância? Todas as outras instâncias na página também serão atualizadas.`)) {
    return
  }

  isCreating.value = true // Reusamos o loading do modal
  try {
    const el = EditorStore.getIframeDoc()?.querySelector(`[data-node-id="${node.nodeId}"]`)
    if (!el) throw new Error('Elemento não encontrado no preview')

    const html = HtmlExportService.generateNodeHtml(el)
    
    // 1. Salva no servidor
    const success = await ComponentStore.saveComponent(name, html)
    
    if (success) {
      // 2. Atualiza todas as instâncias na tela
      NodeDispatcher.updateComponentMaster(name, html)
      console.log(`[ASTExplorer] Master "${name}" atualizado e instâncias sincronizadas.`)
    }
  } catch (e) {
    alert('Erro ao atualizar master: ' + e.message)
  } finally {
    isCreating.value = false
  }
}

// ── Create Component Modal ───────────────────────────────────────────────────
const showCreateModal = ref(false)
const nodeToComponent = ref(null)
const isCreating = ref(false)

function openCreateModal(node) {
  nodeToComponent.value = node
  showCreateModal.value = true
}

async function confirmCreateComponent(name) {
  if (!nodeToComponent.value) return
  
  isCreating.value = true
  try {
    // 1. Pega o elemento real no iframe para extrair o HTML limpo
    const el = EditorStore.getIframeDoc()?.querySelector(`[data-node-id="${nodeToComponent.value.nodeId}"]`)
    if (!el) throw new Error('Elemento não encontrado no preview')

    const html = HtmlExportService.generateNodeHtml(el)
    
    // 2. Salva no servidor
    const success = await ComponentStore.saveComponent(name, html)
    
    if (success) {
      // 3. Marca como componente no editor
      NodeDispatcher.createComponent(nodeToComponent.value.nodeId, name)
      showCreateModal.value = false
    }
  } catch (e) {
    alert('Erro ao criar componente: ' + e.message)
  } finally {
    isCreating.value = false
    nodeToComponent.value = null
  }
}

const props = defineProps({
  ast: Object,
  selectedNodeId: String,
})

function findPath(node, targetId, path = []) {
  if (!node) return null
  if (node.nodeId === targetId) return [...path, node.nodeId]
  for (const child of node.children || []) {
    const result = findPath(child, targetId, [...path, node.nodeId])
    if (result) return result
  }
  return null
}

const openPath = computed(() => {
  if (!props.selectedNodeId) return []
  return findPath(props.ast, props.selectedNodeId) || []
})
</script>

<template>
  <div class="ast-explorer-container flex flex-col h-full overflow-hidden">
    <!-- Filters Toolbar -->
    <div class="flex items-center gap-3 px-3 py-1.5 border-b border-gray-100 bg-gray-50/50 text-[10px] text-gray-500 font-medium shrink-0">
      <label class="flex items-center gap-1.5 cursor-pointer hover:text-gray-700 transition-colors">
        <input type="checkbox" v-model="showTextNodes" class="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0">
        Texto
      </label>
      <label class="flex items-center gap-1.5 cursor-pointer hover:text-gray-700 transition-colors">
        <input type="checkbox" v-model="showCommentNodes" class="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0">
        Comentários
      </label>
    </div>

    <!-- Tree Content -->
    <div class="flex-1 overflow-auto py-2 min-w-0">
      <div class="inline-block min-w-full">
        <ASTNode 
          :node="ast" 
          :selectedNodeId="selectedNodeId" 
          :openPath="openPath"
          :show-text-nodes="showTextNodes"
          :show-comment-nodes="showCommentNodes"
          @contextmenu="handleContextMenu"
        />
      </div>
    </div>
  </div>

  <!-- Indicador de drop: linha azul durante drag no Explorer -->
  <Teleport to="body">
    <template v-if="s.active.value && s.indicator.value">
      <!-- Linha horizontal -->
      <div
        class="pointer-events-none"
        style="position: fixed; z-index: 9500; height: 2px; background: #3b82f6; transition: top 50ms ease"
        :style="{
          top:  (s.indicator.value.lineY - 1) + 'px',
          left:  s.indicator.value.lineX + 'px',
          width: s.indicator.value.lineW + 'px',
        }"
      />
      <!-- Triângulo no início da linha -->
      <div
        class="pointer-events-none"
        style="position: fixed; z-index: 9500"
        :style="{
          top:  (s.indicator.value.lineY - 5) + 'px',
          left: (s.indicator.value.lineX - 6) + 'px',
          width: 0,
          height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderLeft: '6px solid #3b82f6',
        }"
      />
    </template>
  </Teleport>

  <!-- Context Menu Rendering -->
  <CssContextMenu 
    :menu="contextMenu" 
    @close="contextMenu = null" 
  />

  <!-- Create Component Modal -->
  <CreateComponentModal
    :is-open="showCreateModal"
    :loading="isCreating"
    @close="showCreateModal = false"
    @confirm="confirmCreateComponent"
  />
</template>
