<!--
  InlineToolbar.vue

  Toolbar flutuante que aparece sobre texto selecionado durante a edição inline.
  Permite aplicar/remover tags de formatação (<strong>, <em>, <code>, <span>, <a>).

  Como funciona:
  - Visível quando `selectionRect` (prop) não for null
  - Posicionada acima da seleção usando position:fixed + Teleport
  - @mousedown.prevent em todos os botões evita que o clique tire o foco
    do elemento sendo editado (contenteditable)
  - Para <a>: mostra um input de href em vez dos botões
-->
<script setup>
import { ref, computed } from 'vue'

// ── Props ─────────────────────────────────────────────────────────────────────

const props = defineProps({
  /**
   * Rect da seleção atual em coords do viewport.
   * null = sem seleção → toolbar oculta.
   */
  selectionRect: {
    type: Object,
    default: null,
  },

  /**
   * Quais tags estão ativas no cursor atual.
   * Ex: { strong: true, em: false, code: false, span: false, a: false }
   */
  activeFormats: {
    type: Object,
    default: () => ({}),
  },

  /**
   * Função para aplicar/remover uma tag.
   * Chamada com (tag, attrs?) — ex: wrap('a', { href: 'https://...' })
   */
  wrap: {
    type: Function,
    required: true,
  },

  /**
   * Suspende o finish() do editor enquanto o input de link está ativo.
   * Chamado ao abrir o input de href.
   */
  onEnterLinkMode: { type: Function, required: true },

  /**
   * Retoma o finish() e restaura o foco no contenteditable.
   * Chamado ao confirmar ou cancelar o input de href.
   */
  onExitLinkMode: { type: Function, required: true },
})

// ── Definição dos botões da toolbar ──────────────────────────────────────────

const BUTTONS = [
  { tag: 'strong', label: 'B',  title: 'Negrito  (Ctrl+B)', style: 'font-bold' },
  { tag: 'em',     label: 'I',  title: 'Itálico  (Ctrl+I)', style: 'italic'    },
  { tag: 'code',   label: '<>', title: 'Código',             style: 'font-mono' },
  { tag: 'span',   label: 'S',  title: 'Span',               style: ''          },
  // <a> é tratado separadamente (precisa de input de href)
]

// ── Posicionamento da toolbar ─────────────────────────────────────────────────

// Altura aproximada da toolbar em px — usada para posicionar acima da seleção
const TOOLBAR_H = 34

const toolbarStyle = computed(() => {
  if (!props.selectionRect) return {}
  const { top, left, width } = props.selectionRect
  return {
    // Fica acima da seleção com uma folga de 6px
    top:       `${top - TOOLBAR_H - 6}px`,
    // Centraliza horizontalmente sobre a seleção
    left:      `${left + width / 2}px`,
    transform: 'translateX(-50%)',
  }
})

// ── Estado do input de link ───────────────────────────────────────────────────

const linkInputActive = ref(false)
const linkHref        = ref('')
const linkInputRef    = ref(null)

// ── Handlers ─────────────────────────────────────────────────────────────────

/** Clique em um botão de formatação regular (strong, em, code, span) */
function handleFormat(tag) {
  props.wrap(tag)
}

/** Clique no botão de link */
function handleLinkClick() {
  if (props.activeFormats.a) {
    // Já tem link ativo → remove
    props.wrap('a')
    return
  }
  // Suspende o finish() para que o blur do contenteditable não feche a edição
  props.onEnterLinkMode()
  // Abre o input para digitar o href
  linkInputActive.value = true
  linkHref.value        = ''
  // Foca o input na próxima renderização
  setTimeout(() => linkInputRef.value?.focus(), 0)
}

/** Usuário confirmou o href (Enter ou clique no ✓) */
function confirmLink() {
  if (linkHref.value.trim()) {
    props.wrap('a', { href: linkHref.value.trim() })
  }
  _closeLinkInput()
  props.onExitLinkMode() // Restaura o foco no contenteditable
}

/** Usuário cancelou o input de link (Escape ou clique no ✕) */
function cancelLink() {
  _closeLinkInput()
  props.onExitLinkMode() // Restaura o foco no contenteditable
}

function _closeLinkInput() {
  linkInputActive.value = false
  linkHref.value        = ''
}
</script>

<template>
  <!--
    Teleport to="body": garante que a toolbar fica por cima de tudo,
    independente do contexto de stacking do componente pai.
  -->
  <Teleport to="body">
    <Transition name="toolbar-fade">
      <div
        v-if="selectionRect"
        class="inline-toolbar"
        :style="toolbarStyle"
        @mousedown.prevent
      >
        <!-- ── Modo normal: botões de formatação ── -->
        <template v-if="!linkInputActive">

          <!-- Botão para cada tag de formatação -->
          <button
            v-for="btn in BUTTONS"
            :key="btn.tag"
            class="toolbar-btn"
            :class="[btn.style, { 'toolbar-btn--active': activeFormats[btn.tag] }]"
            :title="btn.title"
            @mousedown.prevent="handleFormat(btn.tag)"
          >
            {{ btn.label }}
          </button>

          <!-- Separador visual -->
          <div class="toolbar-sep" />

          <!-- Botão de link (tratamento especial) -->
          <button
            class="toolbar-btn"
            :class="{ 'toolbar-btn--active': activeFormats.a }"
            title="Link"
            @mousedown.prevent="handleLinkClick"
          >
            🔗
          </button>

        </template>

        <!-- ── Modo link: input de href ── -->
        <template v-else>
          <input
            ref="linkInputRef"
            v-model="linkHref"
            type="url"
            class="toolbar-link-input"
            placeholder="https://..."
            @mousedown.stop
            @keydown.enter.prevent="confirmLink"
            @keydown.escape.prevent="cancelLink"
          />
          <button class="toolbar-btn toolbar-btn--active" title="Confirmar" @mousedown.prevent="confirmLink">✓</button>
          <button class="toolbar-btn" title="Cancelar" @mousedown.prevent="cancelLink">✕</button>
        </template>

      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Toolbar container ─────────────────────────────────────────────── */
.inline-toolbar {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 1px;
  background: #1e1e2e;
  border: 1px solid #3b3b5c;
  border-radius: 6px;
  padding: 2px 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  /* Impede que o texto do editor mude por causa do z-index */
  pointer-events: auto;
}

/* ── Botões ────────────────────────────────────────────────────────── */
.toolbar-btn {
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #cdd6f4;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 100ms, color 100ms;
}

.toolbar-btn:hover {
  background: #313244;
  color: #fff;
}

/* Botão ativo = tag está aplicada no cursor atual */
.toolbar-btn--active {
  background: #4a90d9;
  color: #fff;
}

.toolbar-btn--active:hover {
  background: #5ba3e8;
}

/* ── Separador vertical ─────────────────────────────────────────────── */
.toolbar-sep {
  width: 1px;
  height: 18px;
  background: #3b3b5c;
  margin: 0 2px;
}

/* ── Input de href ──────────────────────────────────────────────────── */
.toolbar-link-input {
  height: 26px;
  width: 200px;
  background: #313244;
  border: 1px solid #4a90d9;
  border-radius: 4px;
  color: #cdd6f4;
  font-size: 12px;
  padding: 0 8px;
  outline: none;
}

.toolbar-link-input::placeholder {
  color: #585b70;
}

/* ── Animação de entrada/saída ───────────────────────────────────────── */
.toolbar-fade-enter-active,
.toolbar-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.toolbar-fade-enter-from,
.toolbar-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}
</style>
