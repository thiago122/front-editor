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
  const DROPDOWN_HEIGHT = 180 // aprox (max-height 220, mas tags iniciais são poucas)
  const windowH = window.innerHeight

  let top = rect.bottom + 4
  if (top + DROPDOWN_HEIGHT > windowH) {
    top = rect.top - DROPDOWN_HEIGHT - 4
  }

  dropdownStyle.value = { top: `${top}px`, left: `${rect.left}px` }
  openMenuIdx.value   = idx
  showHtmlPanel.value = false
}

function toggleHtmlPanel(event) {
  if (showHtmlPanel.value) { closeAll(); return }
  const rect = event.currentTarget.getBoundingClientRect()
  const PANEL_HEIGHT = 200 // aprox (textarea + buttons)
  const windowH = window.innerHeight

  let top = rect.bottom + 4
  if (top + PANEL_HEIGHT > windowH) {
    top = rect.top - PANEL_HEIGHT - 4
  }

  htmlPanelStyle.value = { top: `${top}px`, left: `${rect.left}px` }
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
  gap: 4px;
  font-size: 11px;
  height: 100%;
}

/* ── Tags rápidas ────────────────────────────────────────────────────── */
.itm-quick {
  height: 22px;
  padding: 0 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 500;
  color: #4b5563; /* gray-600 */
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms;
}
.itm-quick:hover:not(:disabled) {
  background: #f3f4f6; /* gray-100 */
  color: #111827; /* gray-900 */
  border-color: #e5e7eb; /* gray-200 */
}
.itm-quick:disabled { opacity: .4; cursor: not-allowed; }

/* ── Separador ────────────────────────────────────────────────────────── */
.itm-sep {
  width: 1px;
  height: 12px;
  background: #e5e7eb;
  margin: 0 4px;
  flex-shrink: 0;
}

/* ── Botões de categoria ──────────────────────────────────────────────── */
.itm-cat {
  height: 22px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280; /* gray-500 */
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms;
}
.itm-cat:hover:not(:disabled),
.itm-cat--open {
  background: #f3f4f6; /* gray-100 */
  color: #111827; /* gray-900 */
}
.itm-cat:disabled { opacity: .4; cursor: not-allowed; }

.itm-html-btn { 
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  color: #4f46e5; /* indigo-600 */
}
.itm-html-btn:hover:not(:disabled),
.itm-html-btn.itm-cat--open {
  background: #e0e7ff; /* indigo-100 */
  color: #3730a3; /* indigo-800 */
}

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
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 2px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  padding: 4px;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.itm-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border: none;
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 100ms;
}
.itm-item:hover { background: #f3f4f6; }

.itm-tag-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 500;
  color: #4f46e5;
}

/* ── Painel de HTML customizado ────────────────────────────────────────── */
.itm-html-panel {
  position: fixed;
  z-index: 9999;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 2px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  padding: 16px;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.itm-panel-hint {
  font-size: 11px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}
.itm-panel-hint code {
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  color: #111827;
}

.itm-textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  border: 1px solid #d1d5db;
  border-radius: 2px;
  padding: 8px 10px;
  resize: vertical;
  outline: none;
  color: #111827;
  background: #f9fafb;
  line-height: 1.5;
  transition: border-color 150ms;
}
.itm-textarea:focus { border-color: #6366f1; background: #ffffff; box-shadow: 0 0 0 1px #6366f1; }

.itm-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.itm-panel-btn {
  height: 28px;
  padding: 0 12px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 150ms;
}
.itm-panel-cancel {
  background: #ffffff;
  border-color: #d1d5db;
  color: #374151;
}
.itm-panel-cancel:hover { background: #f3f4f6; color: #111827; }

.itm-panel-insert {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #ffffff;
}
.itm-panel-insert:hover { background: #4338ca; border-color: #4338ca; }

.itm-panel-insert kbd {
  font-size: 10px;
  background: rgba(255,255,255,.25);
  padding: 2px 4px;
  border-radius: 2px;
  margin-left: 6px;
  font-family: inherit;
}

/* ── Animação de dropdown ───────────────────────────────────────────────── */
.itm-fade-enter-active,
.itm-fade-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.itm-fade-enter-from,
.itm-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
