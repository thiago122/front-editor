<template>
  <div ref="ruleEl" class="rule">
      <!-- Source file / origin — acima do seletor -->
      <div class="rule__meta">
        <!-- ícone: revelar esta regra no CSS Explorer -->
        <button
          v-if="rule.selector !== 'element.style'"
          class="rule__meta-btn"
          title="Revelar no CSS Explorer"
          @click.stop="styleStore.navigateToRule(rule.uid)"
        >
          <!-- document-search icon -->
          <svg class="rule__meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                 a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0
                 01-2 2z" />
          </svg>
        </button>

        <!-- NOVO: Editar via Código -->
        <button
          v-if="rule.selector !== 'element.style'"
          class="rule__meta-btn rule__meta-btn--code"
          title="Editar via Código"
          @click.stop="editorStore.openCodeEditor('css', rule.uid)"
        >
          <svg class="rule__meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </button>
        <div class="rule__origin">
          <span class="rule__origin-label">{{ originLabel }}</span>
        </div>

        <!-- Botões de clipboard -->
        <div class="rule__clipboard-btns">
          <!-- Colar estilo (só aparece quando há estilo copiado) -->
          <button
            v-if="styleStore.copiedStyle && styleStore.copiedStyle.declarations.length"
            class="rule__meta-btn rule__meta-btn--paste"
            :title="`Colar ${styleStore.copiedStyle.declarations.length} propriedade(s) nesta regra`"
            @click.stop="onPasteStyle"
          >
            <!-- paste icon -->
            <svg class="rule__meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          <!-- Copiar estilo -->
          <button
            v-if="rule.declarations.length"
            class="rule__meta-btn"
            :class="{ 'rule__meta-btn--active': isCopied }"
            :title="isCopied ? 'Estilo copiado!' : 'Copiar declarações desta regra'"
            @click.stop="onCopyStyle"
          >
            <!-- copy icon -->
            <svg class="rule__meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    <!-- At-Rules hierárquicas: cada nível indenta o próximo -->
    <template v-if="rule.context && rule.context.length">
      <div
        v-for="(ctx, idx) in rule.context"
        :key="idx"
      >




        <!-- @layer: exibe como badge de categoria -->
        <template v-if="ctx.name === 'layer'">
          <div 
            class="rule__layer-badge-container" 
            :style="{ paddingLeft: (idx + 1) * INDENT_SIZE + 'px' }"
          >
            <span class="rule__layer-badge">@layer</span>
            <span class="rule__layer-name">{{ ctx.prelude }}</span>
          </div>
        </template>
        <!-- @media, @container, @supports, etc. -->
        <template v-else>
          <div 
            :class="['rule__at-rule-row', ctx.name === 'layer' ? 'rule__at-rule-row--layer' : '']" 
            :style="{ paddingLeft: (idx + 1) * INDENT_SIZE + 'px' }"
          >
            <span class="rule__at-rule-name">@{{ ctx.name }}</span>
              <span
              class="rule__at-rule-prelude"
              :contenteditable="editable ? 'true' : 'false'"
              @blur="(e) => updateAtRule(ctx, e.target.innerText)"
              @keydown.enter.prevent="(e) => e.target.blur()"
            >{{ ctx.prelude }}</span>
          </div>
          
        </template>
      </div>
    </template>

    <!-- Bloco do selector: indentado pela quantidade de at-rules -->
    <div
      class="rule__body"
      :style="{ paddingLeft: indentPx }"
    >

      <!-- Rule Header -->
      <div class="rule__header">
        <div class="rule__header-left">
          <span
            :class="['rule__selector', !editable ? 'rule__selector--readonly' : '']"
            :contenteditable="rule.selector !== 'element.style' && editable"
            @blur="onSelectorBlur"
            @keydown.enter.prevent="onSelectorConfirm"
            @keydown.tab.prevent="onSelectorConfirm"
          >{{ rule.selector }}</span>
          <span class="rule__brace">{</span>
        </div>
      </div>

      <!-- Property List -->
      <div class="rule__declarations">
        <CssDeclaration
          v-for="decl in rule.declarations"
          :key="decl.id || decl.prop"
          :rule="rule"
          :decl="decl"
          :editable="editable"
          @request-new-decl="onAddDeclaration"
          @remove-if-empty="onRemoveIfEmpty(decl)"
        />
      </div>

      <div class="rule__brace-close">}</div>
    </div>

    <!-- Banner de confirmação: sincronizar atributo do elemento -->
    <Transition name="rename-banner">
      <div
        v-if="editorStore.selectorRenameConfirm.show && editorStore.selectorRenameConfirm.ruleUid === rule.uid"
        class="rule__rename-banner"
      >
        <span class="rule__rename-text">
          Renomear
          <code>{{ editorStore.selectorRenameConfirm.type === 'class' ? '.' : '#' }}{{ editorStore.selectorRenameConfirm.oldName }}</code>
          para
          <code>{{ editorStore.selectorRenameConfirm.type === 'class' ? '.' : '#' }}{{ editorStore.selectorRenameConfirm.newName }}</code>
          no elemento?
        </span>
        <div class="rule__rename-actions">
          <button class="rule__rename-btn rule__rename-btn--yes" @click.stop="applyAttrRename">Sim</button>
          <button class="rule__rename-btn rule__rename-btn--no" @click.stop="editorStore.selectorRenameConfirm.show = false">Não</button>
        </div>
      </div>
    </Transition>

    <!-- Rule Action Footer -->
    <div v-if="editable" class="rule__footer">
      <template v-if="rule.selector !== 'element.style'">
        <button @click.stop="createAtRule(rule, 'media')" class="rule__footer-btn" title="wrap with @media">@media</button>
        <button @click.stop="createAtRule(rule, 'container')" class="rule__footer-btn" title="wrap with @container">@container</button>
      </template>
      <div class="rule__footer-spacer"></div>
      <button @click.stop="onAddDeclaration" class="rule__footer-btn rule__footer-btn--add">
        <svg class="rule__footer-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        Prop
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import CssDeclaration from './CssDeclaration.vue'
import { updateRule } from '@/editor/css/actions/cssRuleActions'
import { createAtRule, updateAtRule } from '@/editor/css/actions/cssAtRuleActions'
import { addDeclaration, deleteDeclaration, pasteDeclarations } from '@/editor/css/actions/cssDeclarationActions'
import { useStyleStore } from '@/stores/StyleStore'
import { useEditorStore } from '@/stores/EditorStore'

const styleStore  = useStyleStore()
const editorStore = useEditorStore()

const props = defineProps({
  rule: { type: Object, required: true },
  editable: { type: Boolean, default: false },
})

const INDENT_SIZE = 7
const indentPx = computed(() => ((props.rule.context?.length ?? 0) + 1) * INDENT_SIZE + 'px')
const ruleEl = ref(null)

const originLabel = computed(() => {
  if (props.rule.selector === 'element.style') return 'inline'
  if (props.rule.origin === 'on_page') return 'on-page'
  if (props.rule.origin === 'inline')  return 'inline'
  // external / internal → exibe o nome real do arquivo (ex: assets_teste-2__styles.css)
  return props.rule.sourceName || props.rule.origin || 'style'
})

// ── Clipboard de estilo ───────────────────────────────────────────────────────

/** Indica se é esta rule que está com o estilo copiado (feedback visual) */
const isCopied = computed(() =>
  styleStore.copiedStyle?._sourceUid === props.rule.uid
)

function onCopyStyle() {
  styleStore.copyStyle(props.rule.declarations, props.rule.uid)
}

function onPasteStyle() {
  const copied = styleStore.copiedStyle
  if (!copied?.declarations?.length) return
  pasteDeclarations(props.rule, copied.declarations)
  styleStore.clearCopiedStyle()
}

function onAddDeclaration() {
  addDeclaration(props.rule, ruleEl.value)
  nextTick(() => {
    const propNames = ruleEl.value?.querySelectorAll('.prop-name')
    if (propNames?.length) {
      const last = propNames[propNames.length - 1]
      last.focus()
      last.select()
    }
  })
}

/**
 * Extrai tipo e nome de um token simples de seletor CSS.
 * Retorna { type: 'class'|'id', name: string } ou null para seletores complexos.
 */
function parseSingleToken(selector) {
  const s = (selector ?? '').trim()
  if (/^\.([a-zA-Z_-][\w-]*)$/.test(s)) return { type: 'class', name: s.slice(1) }
  if (/^#([a-zA-Z_-][\w-]*)$/.test(s))  return { type: 'id',    name: s.slice(1) }
  return null
}

// ── Estado do banner (store — persiste durante re-mounts causados pelo applyMutation) ──
// confirmRename é agora editorStore.selectorRenameConfirm

function onSelectorBlur(e) {
  const oldSelector = props.rule.selector
  const newSelector = e.target.innerText.trim()

  updateRule(props.rule, newSelector)

  if (oldSelector === newSelector) return

  const oldToken = parseSingleToken(oldSelector)
  const newToken = parseSingleToken(newSelector)
  if (!oldToken || !newToken || oldToken.type !== newToken.type) return

  const el = editorStore.selectedElement
  if (!el) return

  const elHasToken =
    oldToken.type === 'class'
      ? el.classList.contains(oldToken.name)
      : el.id === oldToken.name

  if (!elHasToken) return

  // Grava no store — não é destruido quando CssRule remonta
  editorStore.selectorRenameConfirm.show    = true
  editorStore.selectorRenameConfirm.type    = oldToken.type
  editorStore.selectorRenameConfirm.oldName = oldToken.name
  editorStore.selectorRenameConfirm.newName = newToken.name
  editorStore.selectorRenameConfirm.ruleUid = props.rule.uid
}

function applyAttrRename() {
  const rc    = editorStore.selectorRenameConfirm
  rc.show     = false
  const { type, oldName, newName } = rc
  const nodeId = editorStore.selectedNodeId
  if (!nodeId || !editorStore.manipulation) return

  if (type === 'class') {
    const el     = editorStore.selectedElement
    const merged = (el?.className ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map(c => c === oldName ? newName : c)
      .join(' ')
    editorStore.manipulation.setAttribute(nodeId, 'class', merged)
  } else {
    editorStore.manipulation.setAttribute(nodeId, 'id', newName)
  }
}

/**
 * Enter / Tab no selector → salva a edição e navega para o 1º prop.
 * Se não houver nenhuma declaração, cria uma (igual ao botão "+ Prop").
 */
function onSelectorConfirm(e) {
  e.target.blur() // dispara @blur → salva + detecta rename
  nextTick(() => {
    // Verifica pelo dado (não pelo DOM, que pode estar stale após re-mount)
    if (props.rule.declarations?.length > 0) {
      // Já tem declarações → foca o primeiro prop pelo DOM
      const firstProp = ruleEl.value?.querySelector('.prop-name')
      firstProp?.focus()
      firstProp?.select()
    } else {
      // Rule vazia → cria a primeira declaração
      onAddDeclaration()
    }
  })
}

function onRemoveIfEmpty(decl) {
  // Remove apenas se ainda estiver com os valores padrão do placeholder
  const p = (decl.prop  ?? '').trim()
  const v = (decl.value ?? '').trim()
  const isDefault = (!p || p === 'property') && (!v || v === 'value')
  if (!isDefault) return
  deleteDeclaration(props.rule, decl)
}
</script>

<style scoped>
.rule {
  position: relative;
  background: #fff;
}

/* At-Rules hierárquicas */
.rule__at-rule-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 0;
  font-size: 11px;
  line-height: 1.4;
  color: #6b7280;
}
.rule__at-rule-name {
  color: #7c3aed;   /* roxo — mesmo tom do Chrome DevTools */
  flex-shrink: 0;
}
.rule__at-rule-prelude {
  color: #374151;
  cursor: text;
}
.rule__at-rule-prelude:hover { text-decoration: underline; }

/* @layer — badge de categoria (estilo diferente dos at-rules condicionais) */
.rule__layer-badge-container{
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: #e3ecff;
}

.rule__layer-badge {
  font-size: 10px;
  font-style: italic;
  color: #1e3a5f;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
.rule__layer-name {
  font-size: 10px;
  color: #1e40af;
  font-weight: 600;
}

/* Header */
.rule__header {
  display: flex;
  align-items: center;
}
.rule__header-left {
  display: flex;
  align-items: center;
}
.rule__selector {
  font-size: 13px;
  cursor: text;
  word-break: break-all;
}
.rule__selector:hover { text-decoration: underline; }
.rule__selector--readonly {
  opacity: 0.4;
  cursor: not-allowed;
  text-decoration: none;
}
.rule__brace { margin-left: 4px; line-height: 1; }

.rule__origin {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px 0;
  font-size: 10px;
  color: #9ca3af;
  letter-spacing: 0.01em;
  flex: 1;
}
.rule__origin-label { font-weight: 600; }

/* Meta row (origin + clipboard buttons) */
.rule__meta {
  display: flex;
  align-items: center;
}
.rule__clipboard-btns {
  display: none;
  align-items: center;
  gap: 1px;
  margin-left: auto;
  padding-right: 4px;
}
.rule:hover .rule__clipboard-btns {
  display: flex;
}

/* Shared meta button (reveal + copy + paste) */
.rule__meta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  border-radius: 3px;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.rule__meta-btn:hover {
  color: #2563eb;
  background: #eff6ff;
}
.rule__meta-btn--active {
  color: #16a34a;
  background: #dcfce7;
}
.rule__meta-btn--paste:hover {
  color: #7c3aed;
  background: #ede9fe;
}
.rule__meta-icon {
  width: 11px;
  height: 11px;
}

/* Declarations */
.rule__declarations {
  line-height: 1;
  position: relative;
}
.rule__brace-close {
  line-height: 1;
}

/* Footer */
.rule__footer {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rule__footer-spacer { flex: 1; }
.rule__footer-btn {
  font-size: 11px;
  padding: 4px 8px;
  transition: color 0.15s;
  background: none;
  border: none;
  cursor: pointer;
}
.rule__footer-btn:hover { color: #2563eb; }
.rule__footer-btn--add {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
}
.rule__footer-btn--add:hover { color: #15803d; }
.rule__footer-icon {
  width: 12px;
  height: 12px;
}

/* Banner de confirmação de rename de .class / #id */
.rule__rename-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px;
  margin: 2px 0;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 5px;
  font-size: 11px;
  color: #92400e;
}
.rule__rename-text { flex: 1; }
.rule__rename-text code {
  font-family: monospace;
  background: #fef3c7;
  padding: 0 3px;
  border-radius: 3px;
}
.rule__rename-actions { display: flex; gap: 4px; flex-shrink: 0; }
.rule__rename-btn {
  padding: 2px 10px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
}
.rule__rename-btn--yes { background: #d97706; color: white; }
.rule__rename-btn--yes:hover { background: #b45309; }
.rule__rename-btn--no  { background: #f3f4f6; color: #374151; }
.rule__rename-btn--no:hover  { background: #e5e7eb; }
/* Transition */
.rename-banner-enter-active,
.rename-banner-leave-active { transition: opacity .2s, transform .2s; }
.rename-banner-enter-from,
.rename-banner-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
