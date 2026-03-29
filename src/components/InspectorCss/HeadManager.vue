<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import { useHeadManager, HEAD_TAGS } from '@/composables/useHeadManager'

const editorStore = useEditorStore()
const {
  getHeadElements,
  addElement,
  setAttribute,
  removeAttribute,
  setTextContent,
  removeElement,
  syncContext,
} = useHeadManager()

// ── Forçar reatividade quando o iframe muda ──────────────────────────────────
// headElements é um computed mas lê do DOM (não reativo).
// Um ticker garante que a lista atualize quando o head muda.
const tick = ref(0)
function refresh() { tick.value++ }

watch(() => editorStore.iframe, (iframe) => {
  if (!iframe) return
  iframe.addEventListener('load', refresh)
}, { immediate: true })

// Observa mutações no head para atualizar a lista automaticamente
let headObserver = null
watch(() => editorStore.iframe, (iframe) => {
  headObserver?.disconnect()
  const head = iframe?.contentDocument?.head
  if (!head) return
  headObserver = new MutationObserver(refresh)
  headObserver.observe(head, { childList: true, subtree: true, attributes: true })
}, { immediate: true })

// ── Lista reativa (força re-compute via tick) ─────────────────────────────────
const elements = computed(() => {
  tick.value // dependência reativa
  return getHeadElements() // lê DOM fresco
})

// ── Grouped by tag ───────────────────────────────────────────────────────────
const grouped = computed(() => {
  const groups = {}
  for (const item of elements.value) {
    if (!groups[item.tag]) groups[item.tag] = []
    groups[item.tag].push(item)
  }
  return groups
})

// ── Atributos ignorados na UI (internos do editor) ────────────────────────────
const HIDDEN_ATTRS = new Set(['data-location', 'data-captured', 'data-readonly', 'data-source-name', 'data-source', 'data-manifest-path'])

function visibleAttrs(attrs) {
  return attrs.filter(a => !HIDDEN_ATTRS.has(a.name))
}

// ── Edição de atributo ────────────────────────────────────────────────────────
const editingKey = ref(null) // "el-index:attr-name"
const editValue  = ref('')

function startEdit(el, attrName) {
  editingKey.value = `${getKey(el)}:${attrName}`
  editValue.value  = el.getAttribute(attrName) ?? ''
  nextTick(() => focusInput())
}

function confirmEdit(el, attrName) {
  setAttribute(el, attrName, editValue.value)
  editingKey.value = null
  refresh()
}

function cancelEdit() { editingKey.value = null }

function isEditing(el, attrName) {
  return editingKey.value === `${getKey(el)}:${attrName}`
}

function getKey(el) {
  return el.__headKey ?? (el.__headKey = Math.random().toString(36).slice(2))
}

// ── Edição de textContent (para title) ───────────────────────────────────────
const editingText = ref(null) // symbol key
const editTextValue = ref('')

function startEditText(el) {
  editingText.value = getKey(el)
  editTextValue.value = el.textContent ?? ''
  nextTick(() => focusTextInput())
}

function confirmEditText(el) {
  setTextContent(el, editTextValue.value)
  editingText.value = null
  refresh()
}

// ── Adicionar atributo a element existente ────────────────────────────────────
const addingAttrFor = ref(null) // key of element
const newAttrName   = ref('')
const newAttrValue  = ref('')
const newAttrInput  = ref(null)

function startAddAttr(el) {
  addingAttrFor.value = getKey(el)
  newAttrName.value   = ''
  newAttrValue.value  = ''
  nextTick(() => newAttrInput.value?.focus())
}

function confirmAddAttr(el) {
  const name = newAttrName.value.trim()
  if (name) setAttribute(el, name, newAttrValue.value)
  addingAttrFor.value = null
  newAttrName.value   = ''
  newAttrValue.value  = ''
  refresh()
}

// ── Adicionar novo elemento ao head ──────────────────────────────────────────
const showAddMenu = ref(false)

// Templates de elementos comuns
const ADD_TEMPLATES = [
  { label: 'link rel="preconnect"',   tag: 'link',   attrs: { rel: 'preconnect', href: '' } },
  { label: 'link rel="stylesheet"',   tag: 'link',   attrs: { rel: 'stylesheet', href: '' } },
  { label: 'link rel="canonical"',    tag: 'link',   attrs: { rel: 'canonical',  href: '' } },
  { label: 'meta name',               tag: 'meta',   attrs: { name: '', content: '' } },
  { label: 'meta property (og:)',      tag: 'meta',   attrs: { property: 'og:title', content: '' } },
  { label: 'meta charset',            tag: 'meta',   attrs: { charset: 'UTF-8' } },
  { label: 'meta viewport',           tag: 'meta',   attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },
  { label: 'title',                   tag: 'title',  attrs: {}, text: '' },
  { label: 'script src',             tag: 'script', attrs: { src: '' } },
]

function addFromTemplate(tpl) {
  addElement(tpl.tag, tpl.attrs, tpl.text ?? '')
  showAddMenu.value = false
  refresh()
}

// ── Remover elemento ──────────────────────────────────────────────────────────
function removeEl(el) {
  removeElement(el)
  refresh()
}

// ── Remover atributo ──────────────────────────────────────────────────────────
function removeAttr(el, name) {
  removeAttribute(el, name)
  refresh()
}

// ── Refs de inputs ────────────────────────────────────────────────────────────
const editInput  = ref(null)
const textInput  = ref(null)

function focusInput()     { nextTick(() => editInput.value?.focus()) }
function focusTextInput() { nextTick(() => textInput.value?.focus()) }

// Tag color para cada tipo
const TAG_COLORS = {
  link:   'text-blue-600 bg-blue-50 border-blue-200',
  meta:   'text-green-700 bg-green-50 border-green-200',
  title:  'text-orange-600 bg-orange-50 border-orange-200',
  script: 'text-purple-700 bg-purple-50 border-purple-200',
  style:  'text-rose-600 bg-rose-50 border-rose-200',
}

function tagColor(tag) {
  return TAG_COLORS[tag] ?? 'text-gray-600 bg-gray-50 border-gray-200'
}
</script>

<template>
  <div class="flex flex-col h-full text-[11px] select-none font-mono">

    <!-- Header ──────────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0">
      <span class="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">&lt;head&gt; Elements</span>

      <!-- Add menu -->
      <div class="relative">
        <button
          @click="showAddMenu = !showAddMenu"
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors text-[10px]"
          title="Adicionar elemento"
        >
          <span>+ add</span>
          <span class="text-gray-400">▾</span>
        </button>

        <!-- Dropdown -->
        <div
          v-if="showAddMenu"
          class="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded shadow-lg min-w-[200px] py-1"
          @click.stop
        >
          <button
            v-for="tpl in ADD_TEMPLATES"
            :key="tpl.label"
            @click="addFromTemplate(tpl)"
            class="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-[11px]"
          >
            {{ tpl.label }}
          </button>
        </div>
        <!-- Backdrop to close menu -->
        <div v-if="showAddMenu" class="fixed inset-0 z-40" @click="showAddMenu = false" />
      </div>
    </div>

    <!-- Body ────────────────────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-y-auto">

      <!-- Empty state -->
      <div v-if="!elements.length" class="px-3 py-6 text-center text-gray-400 text-[11px]">
        Nenhum elemento no &lt;head&gt;<br>
        <span class="text-[10px]">Use "+ add" para adicionar</span>
      </div>

      <!-- Grouped sections -->
      <template v-for="(items, tag) in grouped" :key="tag">
        <!-- Section header -->
        <div class="sticky top-0 bg-white border-b border-gray-100 px-2 py-0.5 z-10">
          <span :class="['inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold', tagColor(tag)]">
            &lt;{{ tag }}&gt;
          </span>
        </div>

        <!-- Elements of this type -->
        <div
          v-for="item in items"
          :key="getKey(item.el)"
          class="px-2 py-1.5 border-b border-gray-50 group hover:bg-gray-50 transition-colors"
        >
          <!-- Delete button (top right) -->
          <div class="flex items-start justify-between mb-1">
            <div class="flex flex-wrap gap-x-3 gap-y-0.5 flex-1 min-w-0">
              <!-- textContent (for title) -->
              <template v-if="tag === 'title'">
                <div class="flex items-center gap-1 w-full">
                  <template v-if="editingText !== getKey(item.el)">
                    <span class="text-orange-600 italic truncate max-w-[180px]" :title="item.textContent">
                      {{ item.textContent || '(sem texto)' }}
                    </span>
                    <button @click="startEditText(item.el)" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 ml-1 transition-opacity" title="Editar">✎</button>
                  </template>
                  <template v-else>
                    <input
                      ref="textInput"
                      v-model="editTextValue"
                      @keydown.enter="confirmEditText(item.el)"
                      @keydown.escape="editingText = null"
                      class="flex-1 border border-orange-300 px-1 py-0.5 outline-none focus:border-orange-500 font-mono min-w-0 text-[11px]"
                    />
                    <button @click="confirmEditText(item.el)" class="text-blue-600 hover:text-blue-700">✓</button>
                    <button @click="editingText = null" class="text-gray-400 hover:text-gray-600">✕</button>
                  </template>
                </div>
              </template>

              <!-- Attributes -->
              <template v-for="attr in visibleAttrs(item.attrs)" :key="attr.name">
                <div class="flex items-center gap-0.5 min-w-0">
                  <span class="text-gray-500 shrink-0">{{ attr.name }}</span>
                  <span class="text-gray-300">:</span>

                  <!-- View mode -->
                  <template v-if="!isEditing(item.el, attr.name)">
                    <span
                      class="text-blue-600 font-mono truncate max-w-[130px] cursor-pointer hover:text-blue-800"
                      :title="attr.value"
                      @click="startEdit(item.el, attr.name)"
                    >{{ attr.value || '""' }}</span>
                    <button
                      @click="removeAttr(item.el, attr.name)"
                      class="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 ml-0.5 transition-opacity text-[9px]"
                      title="Remover atributo"
                    >✕</button>
                  </template>

                  <!-- Edit mode -->
                  <template v-else>
                    <input
                      ref="editInput"
                      v-model="editValue"
                      @keydown.enter="confirmEdit(item.el, attr.name)"
                      @keydown.escape="cancelEdit"
                      class="border border-blue-300 px-1 py-0 outline-none focus:border-blue-500 font-mono w-[120px] text-[11px]"
                    />
                    <button @click="confirmEdit(item.el, attr.name)" class="text-blue-600 hover:text-blue-700 ml-0.5">✓</button>
                    <button @click="cancelEdit" class="text-gray-400 hover:text-gray-600">✕</button>
                  </template>
                </div>
              </template>
            </div>

            <!-- Actions -->
            <div class="flex gap-1 shrink-0 ml-1">
              <button
                @click="startAddAttr(item.el)"
                class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 text-[10px] transition-opacity"
                title="Adicionar atributo"
              >+attr</button>
              <button
                @click="removeEl(item.el)"
                class="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-opacity"
                title="Remover elemento"
              >✕</button>
            </div>
          </div>

          <!-- Add attribute form -->
          <div v-if="addingAttrFor === getKey(item.el)" class="flex gap-1 mt-1">
            <input
              ref="newAttrInput"
              v-model="newAttrName"
              @keydown.enter="$refs.newAttrValueInput?.focus()"
              @keydown.escape="addingAttrFor = null"
              placeholder="name"
              class="w-[70px] border border-gray-200 px-1 py-0.5 outline-none focus:border-blue-400 font-mono bg-gray-50 text-[11px]"
            />
            <span class="text-gray-300 self-center">:</span>
            <input
              ref="newAttrValueInput"
              v-model="newAttrValue"
              @keydown.enter="confirmAddAttr(item.el)"
              @keydown.escape="addingAttrFor = null"
              placeholder="value"
              class="flex-1 border border-gray-200 px-1 py-0.5 outline-none focus:border-blue-400 font-mono bg-gray-50 min-w-0 text-[11px]"
            />
            <button @click="confirmAddAttr(item.el)" class="px-1.5 text-gray-400 hover:text-gray-700 text-[10px]">+</button>
            <button @click="addingAttrFor = null" class="text-gray-400 hover:text-gray-600 text-[10px]">✕</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
