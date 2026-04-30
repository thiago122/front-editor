<script setup>
import { ref, computed, toRaw } from 'vue'
import { useStyleStore } from '@/stores/StyleStore'
import { getVariableTypeFromName } from '@/composables/useCssVariableTypes'
import { findCssNode, findParentOfLogicNode } from '@/utils/astHelpers'
import { CssLogicTreeService } from '@/editor/css/tree/CssLogicTreeService'
import { CssRuleService } from '@/editor/css/tree/CssRuleService'
import { CssDeclarationService } from '@/editor/css/tree/CssDeclarationService'
import { useEditorStore } from '@/stores/EditorStore'

const styleStore = useStyleStore()

const activeTab = ref('global') // 'global' ou 'local'

const globalVars = computed(() => styleStore.globalVariables)
const localVars = computed(() => styleStore.localVariables)

const currentVars = computed(() => activeTab.value === 'global' ? globalVars.value : localVars.value)

const draggedIndex = ref(null)
const dragOverIndex = ref(null)

function onDragStart(index) {
  draggedIndex.value = index
}

function onDragOver(index) {
  if (draggedIndex.value !== index) {
    dragOverIndex.value = index
  }
}

function onDrop(index) {
  if (draggedIndex.value === null || draggedIndex.value === index) {
    dragOverIndex.value = null
    draggedIndex.value = null
    return
  }
  
  const draggedVar = currentVars.value[draggedIndex.value]
  const targetVar = currentVars.value[index]

  const logicTree = toRaw(styleStore.cssLogicTree)
  const sourceNode = findCssNode(logicTree, draggedVar.id)
  const targetNode = findCssNode(logicTree, targetVar.id)
  
  if (sourceNode && targetNode) {
    const sourceParent = findParentOfLogicNode(logicTree, draggedVar.id)
    const targetParent = findParentOfLogicNode(logicTree, targetVar.id)
    
    if (sourceParent && targetParent) {
      // Find the index of the target node in its parent
      const targetIdxInParent = targetParent.children.findIndex(n => n.id === targetNode.id)
      
      // Determine insert position (before or after based on drag direction)
      const isDraggingDown = draggedIndex.value < index
      const insertAt = isDraggingDown ? targetIdxInParent + 1 : targetIdxInParent
      
      const moved = CssLogicTreeService.moveDeclaration(sourceParent, sourceNode, targetParent, insertAt)
      
      if (moved) {
        const editorStore = useEditorStore()
        styleStore.applyMutation(editorStore.getIframeDoc())
      }
    }
  }
  
  draggedIndex.value = null
  dragOverIndex.value = null
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

function deleteVariable(token) {
  if (activeTab.value !== 'global') return
  
  const logicTree = toRaw(styleStore.cssLogicTree)
  const node = findCssNode(logicTree, token.id)
  if (!node) return
  
  const ruleNode = findParentOfLogicNode(logicTree, token.id)
  if (!ruleNode) return
  
  const ruleObj = { logicNode: ruleNode, astNode: ruleNode.metadata?.astNode }
  const declObj = { logicNode: node, astNode: node.metadata?.astNode }
  
  CssDeclarationService.delete(ruleObj, declObj)
  
  // Sincroniza a remoção da logicTree
  const idx = ruleNode.children.findIndex(n => n.id === token.id)
  if (idx !== -1) ruleNode.children.splice(idx, 1)
  
  const editorStore = useEditorStore()
  styleStore.applyMutation(editorStore.getIframeDoc())
}

function createVariable() {
  if (activeTab.value !== 'global') return
  
  const logicTree = toRaw(styleStore.cssLogicTree)
  let rootRule = CssRuleService.findBySelector(logicTree, ':root')
  
  if (!rootRule) {
    rootRule = CssRuleService.create(logicTree, ':root')
  }
  
  const ruleObj = { logicNode: rootRule, astNode: rootRule.metadata?.astNode }
  
  // Nome único
  let baseName = '--new-var'
  let counter = 1
  let name = baseName
  while (globalVars.value.some(v => v.name === name)) {
    name = `${baseName}-${counter++}`
  }
  
  const logicDecl = CssDeclarationService.create(ruleObj, name, '#000000')
  
  if (logicDecl && rootRule.children && rootRule.children.length > 1) {
    // Se foi criada, movemos para o início (index 0) da mesma regra
    CssLogicTreeService.moveDeclaration(rootRule, logicDecl, rootRule, 0)
  }
  
  const editorStore = useEditorStore()
  styleStore.applyMutation(editorStore.getIframeDoc())
}

function updateVariable(token, field, newValue) {
  if (activeTab.value !== 'global') return
  
  const logicTree = toRaw(styleStore.cssLogicTree)
  const node = findCssNode(logicTree, token.id)
  if (!node) return
  
  const declObj = { logicNode: node, astNode: node.metadata?.astNode }
  
  // Garantir que o nome sempre comece com --
  if (field === 'prop' && !newValue.startsWith('--')) {
    newValue = '--' + newValue.replace(/^[a-zA-Z0-9-]/, '')
  }
  if (field === 'prop' && newValue === '--') return
  
  CssDeclarationService.update(declObj, field, newValue)
  
  const editorStore = useEditorStore()
  styleStore.applyMutation(editorStore.getIframeDoc())
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getTypeLabel(type) {
  const map = {
    'color': 'Cor',
    'gradient': 'Gradiente',
    'size': 'Tamanho',
    'font-family': 'Fonte',
    'weight': 'Peso',
    'shadow': 'Sombra',
    'number': 'Número',
    'raw': 'Texto'
  }
  return map[type] || 'Desconhecido'
}

function renderValuePreview(token) {
  const type = getVariableTypeFromName(token.name)
  if (type === 'color' || type === 'gradient') {
    return `<div style="width:16px; height:16px; border-radius:4px; background:${token.value}; border:1px solid rgba(0,0,0,0.1)"></div>`
  }
  return `<span style="font-family:monospace; font-size:11px; background:#f3f4f6; padding:2px 4px; border-radius:4px">${token.value}</span>`
}
</script>

<template>
  <div class="variables-panel" style="padding: 12px; font-size: 12px; font-family: sans-serif; color: #374151; display:flex; flex-direction:column; gap:14px; height: 100%;">
    
    <!-- Header / Botões Principais -->
    <div style="display:flex; justify-content: space-between; align-items: center;">
      <!-- Tabs -->
      <div style="display:flex; gap: 4px; background: #f3f4f6; padding: 4px; border-radius: 6px; flex: 1; max-width: 200px;">
        <button 
          @click="activeTab = 'global'" 
          :style="{
            flex: 1, padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap',
            background: activeTab === 'global' ? 'white' : 'transparent',
            boxShadow: activeTab === 'global' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            color: activeTab === 'global' ? '#111827' : '#6b7280'
          }"
        >Globais (:root)</button>
        <button 
          @click="activeTab = 'local'" 
          :style="{
            flex: 1, padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px',
            background: activeTab === 'local' ? 'white' : 'transparent',
            boxShadow: activeTab === 'local' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            color: activeTab === 'local' ? '#111827' : '#6b7280'
          }"
        >Locais</button>
      </div>
      
      <!-- Add Button -->
      <button 
        v-if="activeTab === 'global'"
        @click="createVariable"
        style="padding:6px 10px; border:none; border-radius:6px; background:#4f46e5; cursor:pointer; color:white; font-size:11px; font-weight:600; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"
        title="Adicionar Variável no início"
      >
        + Nova
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="currentVars.length === 0" style="text-align: center; padding: 24px 0; color: #9ca3af;">
      Nenhuma variável encontrada neste escopo.
    </div>

    <!-- Lista de Variáveis -->
    <div 
      v-else 
      style="display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px;"
      @dragover.prevent
    >
      <div 
        v-for="(token, index) in currentVars" 
        :key="token.id" 
        draggable="true"
        @dragstart="onDragStart(index)"
        @dragover.prevent="onDragOver(index)"
        @dragleave="onDragLeave"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
        class="token-row"
        style="display:flex; justify-content: space-between; align-items: center; padding: 10px; border-radius: 6px; background: #f9fafb; cursor: grab; position: relative; transition: all 0.15s ease;"
        :style="[
          draggedIndex === index ? 'opacity: 0.4;' : '',
          dragOverIndex === index ? 'border: 1px solid #6366f1; transform: scale(1.01); background: #e0e7ff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);' : 'border: 1px solid transparent; box-shadow: 0 1px 2px rgba(0,0,0,0.02);'
        ]"
      >
        <!-- Linha indicadora de drop em cima -->
        <div v-if="dragOverIndex === index && draggedIndex > index" style="position: absolute; top: -1px; left: 0; right: 0; height: 2px; background: #6366f1; border-radius: 2px; z-index: 10;"></div>
        <!-- Linha indicadora de drop embaixo -->
        <div v-if="dragOverIndex === index && draggedIndex < index" style="position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #6366f1; border-radius: 2px; z-index: 10;"></div>

        <div style="display:flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0;">
          <input 
            v-if="activeTab === 'global'"
            type="text" 
            :value="token.name" 
            @change="e => updateVariable(token, 'prop', e.target.value)"
            class="token-input name-input"
            style="font-weight: 600; font-family: monospace; font-size: 11px; background: transparent; border: 1px solid transparent; outline: none; padding: 2px 4px; margin-left: -4px; width: 100%; border-radius: 4px; transition: background 0.1s;"
            :style="dragOverIndex === index ? 'color: #4f46e5;' : ''"
          />
          <span v-else style="font-weight: 600; font-family: monospace; font-size: 11px; padding: 2px 0;">{{ token.name }}</span>
          <span style="font-size: 10px; color: #9ca3af; pointer-events: none; padding-left: 1px;">{{ getTypeLabel(getVariableTypeFromName(token.name)) }}</span>
        </div>
        
        <div style="display: flex; gap: 8px; align-items: center;">
          <!-- Value Input -->
          <input 
            v-if="activeTab === 'global'"
            type="text" 
            :value="token.value" 
            @change="e => updateVariable(token, 'value', e.target.value)"
            class="token-input value-input"
            style="font-family: monospace; font-size: 11px; background: #f3f4f6; border: 1px solid transparent; outline: none; padding: 4px 6px; border-radius: 4px; width: 80px; text-align: right; transition: all 0.1s;"
          />
          <div v-else v-html="renderValuePreview(token)" style="pointer-events: none;"></div>
          
          <button 
            v-if="activeTab === 'global'"
            @click.stop="deleteVariable(token)" 
            title="Excluir Variável"
            class="delete-btn"
            style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px; opacity: 0; transition: all 0.15s; display: flex; align-items: center; justify-content: center; border-radius: 4px;"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'local'" style="font-size: 10px; text-align: center; color: #9ca3af;">
      Variáveis locais só podem ser editadas nas configurações do elemento.
    </div>

  </div>
</template>

<style scoped>
/* Scrollbar mais elegante para a lista */
.variables-panel ::-webkit-scrollbar {
  width: 4px;
}
.variables-panel ::-webkit-scrollbar-track {
  background: transparent;
}
.variables-panel ::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}
.variables-panel ::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Hover Effects */
.token-row:hover {
  background: #f3f4f6 !important;
  border-color: #e5e7eb !important;
}

/* Mostrar a lixeira apenas quando o mouse estiver sobre a linha */
.token-row:hover .delete-btn {
  opacity: 0.7 !important;
}
.token-row .delete-btn:hover {
  opacity: 1 !important;
  background: #fee2e2 !important;
}

/* Estilos de Input (Foco) */
.token-input.name-input:hover {
  background: rgba(0,0,0,0.03) !important;
}
.token-input.name-input:focus {
  background: white !important;
  border-color: #a5b4fc !important;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.token-input.value-input:hover {
  background: #e5e7eb !important;
}
.token-input.value-input:focus {
  background: white !important;
  border-color: #a5b4fc !important;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}
</style>
