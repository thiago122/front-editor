<!--
  InsertTagMenu.vue

  Barra de inserção de tags HTML.
  O HTML de cada tag é gerado por tagToHtml() em @/editor/html/htmlTags.js.
  Para alterar conteúdo padrão (lorem ipsum etc.), edite TAG_CONTENT em htmlTags.js.
-->
<script setup>
import { ref } from 'vue'
import { NodeDispatcher } from '@/editor/dispatchers/NodeDispatcher'
import { tagToHtml }      from '@/editor/html/htmlTags'

const props = defineProps({
  nodeId: { type: String, default: null },
})

// ── Catálogo de tags ─────────────────────────────────────────────────────────
// Apenas nomes de tag — html gerado via tagToHtml() em tempo de inserção.

const QUICK_TAGS = ['section', 'div', 'span', 'p', 'h2', 'a', 'img']

const CATEGORIES = [
  {
    name: 'Estrutura',
    tags: ['header', 'footer', 'main', 'nav', 'aside', 'article', 'section', 'details', 'dialog', 'div', 'span'],
  },
  {
    name: 'Texto',
    tags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'strong', 'em', 'mark', 'small', 'abbr', 'time', 'hr', 'br', 'a'],
  },
  {
    name: 'Listas',
    tags: ['ul', 'ol', 'li', 'dl'],
  },
  {
    name: 'Tabela',
    tags: ['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption'],
  },
  {
    name: 'Form',
    tags: ['form', 'input', 'textarea', 'select', 'button', 'label', 'fieldset', 'datalist'],
  },
  {
    name: 'Mídia',
    tags: ['img', 'figure', 'video', 'audio', 'canvas', 'svg', 'iframe', 'picture'],
  },
]

// ── Estado dos dropdowns (posição via getBoundingClientRect) ──────────────────

const openMenuIdx    = ref(-1)
const dropdownStyle  = ref({})

const showHtmlPanel  = ref(false)
const htmlPanelStyle = ref({})
const customHtml     = ref('')

// ── Abrir / fechar ────────────────────────────────────────────────────────────

function toggleMenu(idx, event) {
  if (openMenuIdx.value === idx) { closeAll(); return }
  const rect = event.currentTarget.getBoundingClientRect()
  dropdownStyle.value = { top: `${rect.bottom + 4}px`, left: `${rect.left}px` }
  openMenuIdx.value   = idx
  showHtmlPanel.value = false
}

function toggleHtmlPanel(event) {
  if (showHtmlPanel.value) { closeAll(); return }
  const rect = event.currentTarget.getBoundingClientRect()
  htmlPanelStyle.value = { top: `${rect.bottom + 4}px`, left: `${rect.left}px` }
  showHtmlPanel.value = true
  openMenuIdx.value   = -1
}

function closeAll() {
  openMenuIdx.value   = -1
  showHtmlPanel.value = false
}

// ── Inserção ──────────────────────────────────────────────────────────────────

function insert(tag) {
  if (!props.nodeId) return
  NodeDispatcher.appendElement(props.nodeId, tagToHtml(tag))
  closeAll()
}

function insertCustomHtml() {
  const raw = customHtml.value.trim()
  if (!raw || !props.nodeId) return
  // Se digitou só o nome de uma tag (ex: "article"), usa tagToHtml() com o conteúdo padrão
  const isTagName = /^[a-zA-Z][a-zA-Z0-9-]*$/.test(raw)
  NodeDispatcher.appendElement(props.nodeId, isTagName ? tagToHtml(raw) : raw)
  customHtml.value = ''
  closeAll()
}
</script>

<template>
  <!-- Overlay: clique fora fecha qualquer dropdown aberto -->
  <Teleport to="body">
    <div
      v-if="openMenuIdx >= 0 || showHtmlPanel"
      class="itm-overlay"
      @click="closeAll"
    />
  </Teleport>

  <div class="itm-bar">

    <!-- ── Tags rápidas ─────────────────────────────────────────────── -->
    <button
      v-for="tag in QUICK_TAGS"
      :key="tag"
      class="itm-quick"
      :disabled="!nodeId"
      :title="`Inserir <${tag}>`"
      @click="insert(tag)"
    >{{ tag }}</button>

    <div class="itm-sep" />

    <!-- ── Menus de categoria ───────────────────────────────────────── -->
    <button
      v-for="(cat, idx) in CATEGORIES"
      :key="cat.name"
      class="itm-cat"
      :class="{ 'itm-cat--open': openMenuIdx === idx }"
      :disabled="!nodeId"
      @click.stop="toggleMenu(idx, $event)"
    >
      {{ cat.name }}
      <span :style="{ display:'inline-block', transition:'transform 150ms', transform: openMenuIdx === idx ? 'rotate(180deg)' : '' }">▾</span>
    </button>

    <div class="itm-sep" />

    <!-- ── Botão HTML customizado ─────────────────────────────────────── -->
    <button
      class="itm-cat itm-html-btn"
      :class="{ 'itm-cat--open': showHtmlPanel }"
      :disabled="!nodeId"
      title="Inserir HTML ou nome de tag"
      @click.stop="toggleHtmlPanel($event)"
    >
      &lt;/&gt; HTML
    </button>

  </div>

  <!-- ── Dropdowns de categoria (Teleport + position:fixed) ─────────── -->
  <Teleport to="body">
    <Transition name="itm-fade">
      <div
        v-if="openMenuIdx >= 0"
        class="itm-dropdown"
        :style="dropdownStyle"
      >
        <button
          v-for="tag in CATEGORIES[openMenuIdx].tags"
          :key="tag"
          class="itm-item"
          @click="insert(tag)"
        >
          <span class="itm-tag-label">&lt;{{ tag }}&gt;</span>
        </button>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Painel de HTML customizado (Teleport + position:fixed) ─────── -->
  <Teleport to="body">
    <Transition name="itm-fade">
      <div
        v-if="showHtmlPanel"
        class="itm-html-panel"
        :style="htmlPanelStyle"
        @click.stop
      >
        <p class="itm-panel-hint">
          Digite um nome de tag (<code>article</code>) ou cole HTML completo.
        </p>
        <textarea
          v-model="customHtml"
          class="itm-textarea"
          rows="5"
          placeholder="<section class=&quot;hero&quot;>&#10;  <h1>Olá</h1>&#10;</section>&#10;&#10;ou apenas: article"
          @keydown.ctrl.enter.prevent="insertCustomHtml"
        />
        <div class="itm-panel-actions">
          <button class="itm-panel-btn itm-panel-cancel" @click="closeAll">Cancelar</button>
          <button class="itm-panel-btn itm-panel-insert" @click="insertCustomHtml">
            Inserir <kbd>Ctrl+Enter</kbd>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

</template>

<style scoped>
/* ── Barra principal ────────────────────────────────────────────────── */
.itm-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
}

/* ── Tags rápidas ────────────────────────────────────────────────────── */
.itm-quick {
  height: 22px;
  padding: 0 7px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;
  transition: background 100ms, border-color 100ms;
}
.itm-quick:hover:not(:disabled) {
  background: #e0e7ff;
  border-color: #818cf8;
  color: #4338ca;
}
.itm-quick:disabled { opacity: .35; cursor: not-allowed; }

/* ── Separador ────────────────────────────────────────────────────────── */
.itm-sep {
  width: 1px;
  height: 16px;
  background: #e5e7eb;
  margin: 0 3px;
  flex-shrink: 0;
}

/* ── Botões de categoria ──────────────────────────────────────────────── */
.itm-cat {
  height: 22px;
  padding: 0 7px;
  display: flex;
  align-items: center;
  gap: 3px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 11px;
  color: #6b7280;
  cursor: pointer;
  white-space: nowrap;
  transition: background 100ms, color 100ms, border-color 100ms;
}
.itm-cat:hover:not(:disabled),
.itm-cat--open {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #111827;
}
.itm-cat:disabled { opacity: .35; cursor: not-allowed; }

.itm-html-btn { font-family: monospace; }

/* ── Overlay (fecha menus ao clicar fora) ────────────────────────────── */
.itm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9990;
}

/* ── Dropdown de categoria ─────────────────────────────────────────────── */
.itm-dropdown {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  padding: 4px;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.itm-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 80ms;
}
.itm-item:hover { background: #eff6ff; }

.itm-tag-label {
  font-family: monospace;
  font-size: 11px;
  color: #2563eb;
}

/* ── Painel de HTML customizado ────────────────────────────────────────── */
.itm-html-panel {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  padding: 12px;
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.itm-panel-hint {
  font-size: 11px;
  color: #6b7280;
  margin: 0;
}
.itm-panel-hint code {
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.itm-textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: monospace;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 6px 8px;
  resize: vertical;
  outline: none;
  color: #111827;
  background: #f9fafb;
  line-height: 1.5;
}
.itm-textarea:focus { border-color: #6366f1; background: #fff; }

.itm-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.itm-panel-btn {
  height: 26px;
  padding: 0 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid;
}
.itm-panel-cancel {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}
.itm-panel-cancel:hover { background: #f3f4f6; }

.itm-panel-insert {
  background: #4f46e5;
  border-color: #4338ca;
  color: #fff;
}
.itm-panel-insert:hover { background: #4338ca; }

.itm-panel-insert kbd {
  font-size: 10px;
  background: rgba(255,255,255,.2);
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
}

/* ── Animação de dropdown ───────────────────────────────────────────────── */
.itm-fade-enter-active,
.itm-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}
.itm-fade-enter-from,
.itm-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
