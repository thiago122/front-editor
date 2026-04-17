<template>
  <div class="flex flex-col h-full overflow-hidden text-[11px] font-mono select-none">

    <!-- Empty state -->
    <div v-if="!el" class="flex-1 flex items-center justify-center text-gray-400 text-[11px]">
      Selecione um elemento no canvas
    </div>

    <div v-else class="flex flex-col h-full overflow-y-auto">

      <!-- ── CLASSES ────────────────────────────────────────────────────────── -->
      <section class="px-3 pt-3 pb-2 border-b border-gray-100">
        <div class="flex items-center gap-1 mb-1.5">
          <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-[40px] shrink-0">class</span>
          <div class="flex flex-wrap gap-1 flex-1 min-w-0">

            <!-- Class chips -->
            <template v-for="cls in classList" :key="cls">
              <!-- View mode chip -->
              <span
                v-if="editingClass !== cls"
                class="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:border-blue-400 cursor-default transition-colors"
              >
                <span
                  class="font-mono cursor-pointer hover:text-blue-900"
                  @click="startEditClass(cls)"
                  :title="isClassActiveRule(cls) ? 'Regra CSS ativa' : isClassUsedInCss(cls) ? 'Usado em CSS' : ''"
                >.{{ cls }}</span>
                <span
                  v-if="isClassActiveRule(cls)"
                  class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"
                  title="Regra ativa"
                />
                <span
                  v-else-if="isClassUsedInCss(cls)"
                  class="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0"
                  title="Em regra CSS"
                />
                <button
                  @click="removeClass(cls)"
                  class="opacity-0 group-hover:opacity-100 text-blue-300 hover:text-red-500 transition-opacity text-[10px] leading-none"
                  title="Remover"
                >×</button>
              </span>

              <!-- Edit mode chip -->
              <span v-else class="inline-flex items-center gap-0.5">
                <input
                  ref="editClassInput"
                  v-model="editClassValue"
                  @input="ac.updateQuery($event.target.value)"
                  @keydown="handleEnter($event, () => confirmEditClass(cls))"
                  @keydown.escape="emit('close'); editingClass = null; ac.close()"
                  class="w-[100px] border border-blue-400 px-1 py-0 outline-none font-mono text-blue-800 text-[11px] rounded"
                />
                <button @click="confirmEditClass(cls)" class="text-blue-600 hover:text-blue-800">✓</button>
                <button @click="editingClass = null" class="text-gray-400 hover:text-gray-600">✕</button>
              </span>
            </template>

            <!-- Add class input -->
            <template v-if="addingClass">
              <span class="inline-flex items-center gap-0.5">
                <input
                  ref="addClassInput"
                  v-model="newClassName"
                  @input="ac.updateQuery($event.target.value)"
                  @keydown="handleEnter($event, confirmAddClass)"
                  @keydown.escape="emit('close'); addingClass = false; ac.close()"
                  placeholder="class-name"
                  class="w-[100px] border border-blue-400 px-1 py-0 outline-none font-mono text-blue-800 text-[11px] rounded"
                />
                <button @click="confirmAddClass" class="text-blue-600 hover:text-blue-800">✓</button>
                <button @click="addingClass = false" class="text-gray-400">✕</button>
              </span>
            </template>

            <!-- + add class button -->
            <button
              v-if="!addingClass"
              @click="startAddClass"
              class="inline-flex items-center px-1.5 py-0.5 rounded border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-[10px]"
            >+ class</button>
          </div>
        </div>
      </section>

      <!-- ── ATTRIBUTE TABLE (id + outros) ─────────────────────────────────── -->
      <section class="flex-1 overflow-y-auto">

        <!-- ID row -->
        <div class="group flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 hover:bg-gray-50 transition-colors">
          <span class="text-gray-400 w-[40px] shrink-0">id</span>

          <!-- View mode -->
          <template v-if="!editingId">
            <span
              class="flex-1 font-mono cursor-pointer min-w-0 truncate"
              :class="currentId ? 'text-purple-600 hover:text-purple-800' : 'text-gray-300 italic'"
              :title="currentId"
              @click="startEditId"
            >{{ currentId || 'null' }}</span>
            <span
              v-if="currentId && isIdUsedInCss(currentId)"
              class="text-[9px] px-1 py-0.5 bg-green-100 text-green-600 rounded shrink-0"
            >CSS</span>
            <div class="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0 transition-opacity">
              <button @click="startEditId" class="text-gray-400 hover:text-gray-700">✎</button>
              <button v-if="currentId" @click="removeId" class="text-gray-300 hover:text-red-500">✕</button>
            </div>
          </template>

          <!-- Edit mode -->
          <template v-else>
            <input
              v-model="editIdValue"
              @keydown.enter="confirmEditId"
              @keydown.escape="emit('close'); editingId = false"
              class="flex-1 border border-purple-300 px-1 py-0 outline-none focus:border-purple-500 font-mono text-purple-700 rounded text-[11px] min-w-0"
            />
            <button @click="confirmEditId" class="text-blue-600 hover:text-blue-800 shrink-0">✓</button>
            <button @click="editingId = false" class="text-gray-400 shrink-0">✕</button>
          </template>
        </div>

        <!-- Generic attribute rows -->
        <div
          v-for="attr in genericAttrs"
          :key="attr.name"
          class="group flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 hover:bg-gray-50 transition-colors"
        >
          <span class="text-gray-500 w-[40px] shrink-0 truncate" :title="attr.name">{{ attr.name }}</span>

          <!-- View mode -->
          <template v-if="editingAttr !== attr.name">
            <span
              class="flex-1 font-mono text-gray-700 truncate cursor-pointer hover:text-gray-900 min-w-0"
              :title="attr.value"
              @click="startEditAttr(attr)"
            >{{ attr.value || '""' }}</span>
            <div class="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0 transition-opacity">
              <button @click="startEditAttr(attr)" class="text-gray-400 hover:text-gray-700">✎</button>
              <button @click="removeGenericAttr(attr.name)" class="text-gray-300 hover:text-red-500">✕</button>
            </div>
          </template>

          <!-- Edit mode -->
          <template v-else>
            <input
              v-model="editAttrValue"
              @keydown.enter="confirmEditAttr(attr.name)"
              @keydown.escape="emit('close'); editingAttr = null"
              class="flex-1 border border-blue-300 px-1 py-0 outline-none focus:border-blue-500 font-mono text-gray-800 rounded text-[11px] min-w-0"
            />
            <button @click="confirmEditAttr(attr.name)" class="text-blue-600 hover:text-blue-800 shrink-0">✓</button>
            <button @click="editingAttr = null" class="text-gray-400 shrink-0">✕</button>
          </template>
        </div>

        <!-- ── ADD ATTRIBUTE ──────────────────────────────────────────────── -->
        <div class="flex items-center gap-1 px-3 py-2 bg-gray-50 border-t border-gray-100 sticky bottom-0">
          <input
            v-model="newAttrName"
            @keydown.enter="$refs.newAttrValueInput?.focus()"
            @keydown.escape="emit('close')"
            placeholder="attribute"
            class="w-[90px] border border-gray-200 px-1.5 py-1 outline-none focus:border-blue-400 font-mono text-gray-600 bg-white rounded text-[11px]"
          />
          <span class="text-gray-300">=</span>
          <input
            ref="newAttrValueInput"
            v-model="newAttrValue"
            @keydown.enter="confirmAddAttr"
            @keydown.escape="emit('close')"
            placeholder="value"
            class="flex-1 border border-gray-200 px-1.5 py-1 outline-none focus:border-blue-400 font-mono text-gray-600 bg-white rounded min-w-0 text-[11px]"
          />
          <button
            @click="confirmAddAttr"
            class="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-[11px] shrink-0"
          >+</button>
        </div>
      </section>

    </div>
  </div>

  <!-- Autocomplete Dropdown -->
  <CssAutocompleteDropdown :ac="ac" :anchor="ac.inputEl.value" />
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import { useCssAutocomplete } from '@/composables/useCssAutocomplete'
import CssAutocompleteDropdown from '@/components/CssAutocompleteDropdown.vue'
import { EDITOR_IGNORED_ATTRS } from '@/editor/html/constants'

const editorStore = useEditorStore()
const styleStore  = useStyleStore()
const ac          = useCssAutocomplete()

const emit = defineEmits(['close'])

// ── UI state ──────────────────────────────────────────────────────────────────
const showPanel   = ref(true)
const mutationTick = ref(0)  // incrementado após cada mutação para forçar re-compute

const addingClass   = ref(false)
const newClassName  = ref('')
const addClassInput = ref(null)
const editingClass  = ref(null)   // nome da classe sendo renomeada
const editClassValue = ref('')
const editClassInput = ref(null)

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
// Importados de /editor/html/constants.js — edite lá para adicionar/remover.

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
    .filter(a => a.name !== 'class' && a.name !== 'id' && !EDITOR_IGNORED_ATTRS.has(a.name))
    .map(a => ({ name: a.name, value: a.value }))
})

/** Todas as classes presentes no CSS do projeto */
const allAvailableClasses = computed(() => {
  const classes = new Set()
  const traverse = (nodes) => {
    if (!nodes) return
    nodes.forEach(node => {
      if (node.type === 'selector' && node.label) {
        // Regex para capturar classes (ex: .my-class)
        const matches = node.label.match(/\.([\w-]+)/g)
        if (matches) {
          matches.forEach(m => classes.add(m.slice(1)))
        }
      }
      if (node.children) traverse(node.children)
    })
  }
  traverse(styleStore.cssLogicTree)
  return Array.from(classes).sort()
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function handleEnter(e, confirmFn) {
  // Se o autocomplete consumiu o Enter/Tab, não fazemos nada.
  // Caso contrário, confirmamos a ação.
  if (!ac.onKeydown(e)) {
    if (e.key === 'Enter') confirmFn()
  }
}

// ── CRUD — Classes ─────────────────────────────────────────────────────────────

function startAddClass() {
  addingClass.value = true
  newClassName.value = ''
  nextTick(() => {
    addClassInput.value?.focus()
    ac.openCustom(addClassInput.value, allAvailableClasses.value, '', (val) => {
      newClassName.value = val
      confirmAddClass()
    })
  })
}

function confirmAddClass() {
  const name = newClassName.value.trim().replace(/^\./, '')
  if (!name || !editorStore.selectedNodeId) {
    addingClass.value = false
    ac.close()
    return
  }
  const current = classList.value
  if (!current.includes(name)) {
    const merged = [...current, name].join(' ')
    editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'class', merged)
    notifyChange()
  }
  addingClass.value = false
  newClassName.value = ''
  ac.close()
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
  nextTick(() => {
    editClassInput.value?.focus()
    ac.openCustom(editClassInput.value, allAvailableClasses.value, cls, (val) => {
      editClassValue.value = val
      confirmEditClass(cls)
    })
  })
}

function confirmEditClass(oldCls) {
  const newCls = editClassValue.value.trim().replace(/^\./, '')
  if (!newCls || !editorStore.selectedNodeId) {
    editingClass.value = null
    ac.close()
    return
  }
  const merged = classList.value.map(c => c === oldCls ? newCls : c).join(' ')
  editorStore.manipulation.setAttribute(editorStore.selectedNodeId, 'class', merged)
  notifyChange()
  editingClass.value = null
  ac.close()
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

defineExpose({
  startAddClass
})
</script>
