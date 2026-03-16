<template>
  <div class="border-b border-gray-300 text-[11px]">

    <!-- ── Header (sempre visível) ─────────────────────────────────────── -->
    <div
      @click="showPanel = !showPanel"
      class="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none hover:bg-gray-50"
    >
      <span class="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Attributes</span>

      <!-- Badges de resumo -->
      <span v-if="classBadge" class="px-1 bg-blue-100 text-blue-700 border border-blue-200 rounded text-[9px] font-mono">
        .{{ classBadge }}
      </span>
      <span v-if="idBadge" class="px-1 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[9px] font-mono">
        #{{ idBadge }}
      </span>
      <span v-if="otherCount > 0" class="px-1 bg-gray-100 text-gray-500 border border-gray-200 rounded text-[9px]">
        +{{ otherCount }}
      </span>

      <span class="ml-auto text-gray-400 text-[10px]">{{ showPanel ? '▲' : '▼' }}</span>
    </div>

    <!-- ── Painel expandido ─────────────────────────────────────────────── -->
    <div v-if="showPanel" class="px-2 pb-2 flex flex-col gap-3">

      <!-- ── CLASSES ─────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center justify-between mb-1">
          <span class="font-semibold text-blue-600">class</span>
          <button
            @click="startAddClass"
            class="text-blue-500 hover:text-blue-700 text-[10px]"
            title="Adicionar classe"
          >+ class</button>
        </div>

        <!-- Lista de classes -->
        <div
          v-for="cls in classList"
          :key="cls"
          class="flex items-center gap-1 py-0.5 group"
        >
          <!-- Modo visualização -->
          <template v-if="editingClass !== cls">
            <span class="font-mono text-blue-500">.{{ cls }}</span>
            <span v-if="isClassUsedInCss(cls)" class="px-1 bg-green-100 text-green-700 border border-green-200 rounded text-[9px]">CSS ✓</span>
            <span v-if="isClassActiveRule(cls)" class="px-1 bg-blue-600 text-white rounded text-[9px]">active</span>
            <div class="ml-auto flex gap-1">
              <button @click="startEditClass(cls)" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity" title="Renomear">✎</button>
              <button @click="removeClass(cls)" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity" title="Remover">✕</button>
            </div>
          </template>

          <!-- Modo edição -->
          <template v-else>
            <input
              v-model="editClassValue"
              @keydown.enter="confirmEditClass(cls)"
              @keydown.escape="editingClass = null"
              class="flex-1 border border-blue-300 px-1 py-0.5 outline-none focus:border-blue-500 font-mono"
            />
            <button @click="confirmEditClass(cls)" class="text-blue-600 hover:text-blue-700">✓</button>
            <button @click="editingClass = null" class="text-gray-400 hover:text-gray-600">✕</button>
          </template>
        </div>

        <!-- Input adicionar classe -->
        <div v-if="addingClass" class="flex gap-1 mt-1">
          <input
            ref="addClassInput"
            v-model="newClassName"
            @keydown.enter="confirmAddClass"
            @keydown.escape="addingClass = false"
            placeholder="nome-da-classe"
            class="flex-1 border border-blue-300 px-1 py-0.5 outline-none focus:border-blue-500 font-mono"
          />
          <button @click="confirmAddClass" class="px-2 bg-blue-600 text-white hover:bg-blue-700">+</button>
          <button @click="addingClass = false" class="px-2 text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </section>

      <!-- ── ID ────────────────────────────────────────────────────────── -->
      <section>
        <!-- ID existente -->
        <div class="flex items-center gap-1 group py-0.5">
          <span class="font-semibold text-gray-500 shrink-0">id</span>
          <span class="text-gray-300">:</span>

          <!-- Modo visualização -->
          <template v-if="!editingId">
            <span class="font-mono text-purple-500 truncate" :title="currentId">{{ currentId || '—' }}</span>
            <span v-if="currentId && isIdUsedInCss(currentId)" class="px-1 bg-green-100 text-green-700 border border-green-200 rounded text-[9px]">CSS ✓</span>
            <div class="ml-auto flex gap-1">
              <button @click="startEditId" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity" title="Editar ID">✎</button>
              <button v-if="currentId" @click="removeId" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity" title="Remover ID">✕</button>
            </div>
          </template>

          <!-- Modo edição -->
          <template v-else>
            <input
              v-model="editIdValue"
              @keydown.enter="confirmEditId"
              @keydown.escape="editingId = false"
              class="flex-1 border border-purple-300 px-1 py-0.5 outline-none focus:border-purple-500 font-mono min-w-0"
            />
            <button @click="confirmEditId" class="text-blue-600 hover:text-blue-700">✓</button>
            <button @click="editingId = false" class="text-gray-400 hover:text-gray-600">✕</button>
          </template>
        </div>
      </section>

      <!-- ── OUTROS ATRIBUTOS ─────────────────────────────────────────────── -->
      <section>
        <span class="font-semibold text-gray-500 block mb-1">outros</span>

        <div
          v-for="attr in genericAttrs"
          :key="attr.name"
          class="flex items-center gap-1 py-0.5 group"
        >
          <span class="font-mono text-gray-600 shrink-0">{{ attr.name }}</span>
          <span class="text-gray-300">:</span>

          <!-- Modo visualização -->
          <span
            v-if="editingAttr !== attr.name"
            class="font-mono text-gray-500 truncate max-w-[120px]"
            :title="attr.value"
          >{{ attr.value }}</span>

          <!-- Modo edição -->
          <input
            v-else
            v-model="editAttrValue"
            @keydown.enter="confirmEditAttr(attr.name)"
            @keydown.escape="editingAttr = null"
            class="flex-1 border border-gray-300 px-1 py-0.5 outline-none focus:border-blue-500 font-mono min-w-0"
          />

          <div class="ml-auto flex gap-1 shrink-0">
            <button v-if="editingAttr !== attr.name" @click="startEditAttr(attr)" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity" title="Editar">✎</button>
            <button v-if="editingAttr === attr.name" @click="confirmEditAttr(attr.name)" class="text-blue-600 hover:text-blue-700">✓</button>
            <button @click="removeGenericAttr(attr.name)" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity" title="Remover">✕</button>
          </div>
        </div>

        <!-- Form de adicionar sempre visível ao final -->
        <div class="flex gap-1 mt-1">
          <input
            v-model="newAttrName"
            @keydown.enter="$refs.newAttrValueInput?.focus()"
            placeholder="atributo"
            class="w-[80px] border border-gray-200 px-1 py-0.5 outline-none focus:border-blue-400 font-mono text-gray-600 bg-gray-50"
          />
          <span class="text-gray-300 self-center">:</span>
          <input
            ref="newAttrValueInput"
            v-model="newAttrValue"
            @keydown.enter="confirmAddAttr"
            placeholder="valor"
            class="flex-1 border border-gray-200 px-1 py-0.5 outline-none focus:border-blue-400 font-mono text-gray-600 bg-gray-50 min-w-0"
          />
          <button @click="confirmAddAttr" class="px-2 text-gray-400 hover:text-gray-700" title="Adicionar">+</button>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'

const editorStore = useEditorStore()
const styleStore  = useStyleStore()

// ── UI state ──────────────────────────────────────────────────────────────────
const showPanel   = ref(false)
const mutationTick = ref(0)  // incrementado após cada mutação para forçar re-compute

const addingClass   = ref(false)
const newClassName  = ref('')
const addClassInput = ref(null)
const editingClass  = ref(null)   // nome da classe sendo renomeada
const editClassValue = ref('')

const addingId  = ref(false)
const newIdValue = ref('')
const editingId  = ref(false)
const editIdValue = ref('')

const addingAttr   = ref(false)
const newAttrName  = ref('')
const newAttrValue = ref('')
const newAttrValueInput = ref(null)

const editingAttr  = ref(null)  // nome do atributo em edição
const editAttrValue = ref('')

// ── Atributos internos que não devem ser exibidos ─────────────────────────────
const HIDDEN_ATTRS = new Set(['data-node-id', 'data-editor-hovered'])

// ── Computeds base ─────────────────────────────────────────────────────────────

const el = computed(() => editorStore.selectedElement)

const classList = computed(() => {
  mutationTick.value // dependência para re-avaliar após mutações
  if (!el.value) return []
  return (el.value.className?.trim() || '').split(/\s+/).filter(Boolean)
})

const currentId = computed(() => {
  mutationTick.value
  return el.value?.id || ''
})

/** Todos os atributos exceto class, id e internos do editor */
const genericAttrs = computed(() => {
  mutationTick.value
  if (!el.value) return []
  return Array.from(el.value.attributes)
    .filter(a => a.name !== 'class' && a.name !== 'id' && !HIDDEN_ATTRS.has(a.name))
    .map(a => ({ name: a.name, value: a.value }))
})

/** Chama após qualquer mutação para reativar os computeds. */
function notifyChange() { mutationTick.value++ }

// ── Badges de resumo no header ─────────────────────────────────────────────────

const classBadge = computed(() => classList.value[0] || null)
const idBadge    = computed(() => currentId.value || null)
const otherCount = computed(() => genericAttrs.value.length)

// ── CSS matching (igual ao comportamento anterior) ─────────────────────────────

const allRules = computed(() => styleStore.ruleGroups.flatMap(g => g.rules))

function isClassUsedInCss(cls) {
  const sel = '.' + cls
  return allRules.value.some(r => r.selector === sel || r.selector.includes(sel))
}

function isClassActiveRule(cls) {
  const sel = '.' + cls
  const rule = allRules.value.find(r => r.selector === sel || r.selector.includes(sel))
  return rule?.uid === styleStore.selectedRuleId
}

function isIdUsedInCss(id) {
  const sel = '#' + id
  return allRules.value.some(r => r.selector === sel || r.selector.includes(sel))
}

// ── CRUD — Classes ─────────────────────────────────────────────────────────────

function startAddClass() {
  addingClass.value = true
  newClassName.value = ''
  nextTick(() => addClassInput.value?.focus())
}

function confirmAddClass() {
  const name = newClassName.value.trim().replace(/^\./, '')
  if (!name || !editorStore.selectedNodeId) { addingClass.value = false; return }
  const current = classList.value
  if (!current.includes(name)) {
    const merged = [...current, name].join(' ')
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'class', merged)
    notifyChange()
  }
  addingClass.value = false
  newClassName.value = ''
}

function removeClass(cls) {
  if (!editorStore.selectedNodeId) return
  const merged = classList.value.filter(c => c !== cls).join(' ')
  editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'class', merged)
  notifyChange()
}

function startEditClass(cls) {
  editingClass.value = cls
  editClassValue.value = cls
}

function confirmEditClass(oldCls) {
  const newCls = editClassValue.value.trim().replace(/^\./, '')
  if (!newCls || !editorStore.selectedNodeId) { editingClass.value = null; return }
  const merged = classList.value.map(c => c === oldCls ? newCls : c).join(' ')
  editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'class', merged)
  notifyChange()
  editingClass.value = null
}

// ── CRUD — ID ──────────────────────────────────────────────────────────────────

function startAddId() {
  addingId.value = true
  newIdValue.value = ''
}

function confirmAddId() {
  const id = newIdValue.value.trim().replace(/^#/, '')
  if (id && editorStore.selectedNodeId) {
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'id', id)
    notifyChange()
  }
  addingId.value = false
}

function startEditId() {
  editIdValue.value = currentId.value
  editingId.value = true
}

function confirmEditId() {
  const id = editIdValue.value.trim().replace(/^#/, '')
  if (editorStore.selectedNodeId) {
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'id', id)
    notifyChange()
  }
  editingId.value = false
}

function removeId() {
  if (!editorStore.selectedNodeId) return
  editorStore.manipulation.removeAttribute(editorStore.selectedNodeId, 'id')
  notifyChange()
}

// ── CRUD — Atributos genéricos ─────────────────────────────────────────────────

function startEditAttr(attr) {
  editingAttr.value = attr.name
  editAttrValue.value = attr.value
}

function confirmEditAttr(name) {
  if (editorStore.selectedNodeId) {
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, name, editAttrValue.value)
    notifyChange()
  }
  editingAttr.value = null
}

function removeGenericAttr(name) {
  if (editorStore.selectedNodeId) {
    editorStore.manipulation.removeAttribute(editorStore.selectedNodeId, name)
    notifyChange()
  }
}

function confirmAddAttr() {
  const name = newAttrName.value.trim()
  if (name && editorStore.selectedNodeId) {
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, name, newAttrValue.value)
    notifyChange()
  }
  addingAttr.value = false
  newAttrName.value = ''
  newAttrValue.value = ''
}
</script>
