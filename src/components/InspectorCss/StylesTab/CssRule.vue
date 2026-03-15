<template>
  <div ref="ruleEl" class="rule">
      <!-- Source file / origin — acima do seletor -->
      <div>
        <!-- ícone: revelar esta regra no CSS Explorer -->
        <button
          v-if="rule.selector !== 'element.style'"
          class="rule__reveal-btn"
          title="Revelar no CSS Explorer"
          @click.stop="styleStore.navigateToRule(rule.uid)"
        >
          <!-- document-search icon -->
          <svg class="rule__reveal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                 a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0
                 01-2 2z" />
          </svg>
        </button>
        <div class="rule__origin">
          <span class="rule__origin-label">{{ originLabel }}</span>
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
            @blur="(e) => updateRule(rule, e.target.innerText)"
            @keydown.enter.prevent="(e) => e.target.blur()"
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
        />
      </div>

      <div class="rule__brace-close">}</div>
    </div>

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
import { addDeclaration } from '@/editor/css/actions/cssDeclarationActions'
import { useStyleStore } from '@/stores/StyleStore'

const styleStore = useStyleStore()

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

function onAddDeclaration() {
  addDeclaration(props.rule, ruleEl.value)
  nextTick(() => {
    const propNames = ruleEl.value?.querySelectorAll('.prop-name')
    if (propNames?.length) {
      const last = propNames[propNames.length - 1]
      last.focus()
      const range = document.createRange()
      range.selectNodeContents(last)
      range.collapse(false)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
    }
  })
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
}
.rule__origin-label { font-weight: 600; }

/* Reveal-in-Explorer button */
.rule__reveal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-left: 6px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  vertical-align: middle;
  border-radius: 3px;
  transition: color 0.15s, background 0.15s;
}
.rule__reveal-btn:hover {
  color: #2563eb;
  background: #eff6ff;
}
.rule__reveal-icon {
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
</style>
