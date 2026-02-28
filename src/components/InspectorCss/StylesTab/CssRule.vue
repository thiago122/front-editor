<template>
  <div ref="ruleEl" class="rule">

    <!-- Context (At-Rules) -->
    <div v-if="rule.context && rule.context.length" class="rule__context">
      <div v-for="(ctx, idx) in rule.context" :key="idx" class="rule__at-rule">
        <span class="rule__at-rule-name">@{{ ctx.name }}</span>
        <span
          class="rule__at-rule-prelude"
          contenteditable="true"
          @blur="(e) => updateAtRule(ctx, e.target.innerText)"
          @keydown.enter.prevent="(e) => e.target.blur()"
        >{{ ctx.prelude }}</span>
      </div>
    </div>

    <!-- Rule Header -->
    <div class="rule__header">
      <div class="rule__header-left">
        <div class="rule__selector-line">
          <span
            :class="['rule__selector', !editable ? 'rule__selector--readonly' : '']"
            :contenteditable="rule.selector !== 'element.style' && editable"
            @blur="(e) => updateRule(rule, e.target.innerText)"
            @keydown.enter.prevent="(e) => e.target.blur()"
          >{{ rule.selector }}</span>
          <span class="rule__brace">{</span>
        </div>
      </div>

      <!-- Origin Badge -->
      <div class="rule__origin">
        <span class="rule__origin-label">origin:</span>
        <span>{{ originLabel }}</span>
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

const props = defineProps({
  rule: { type: Object, required: true },
  editable: { type: Boolean, default: false },
})

const ruleEl = ref(null)

const originLabel = computed(() => {
  if (props.rule.selector === 'element.style') return 'inline'
  const map = { external: 'external', on_page: 'header', inline: 'inline' }
  return map[props.rule.origin] ?? (props.rule.sourceName || 'style')
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

/* At-Rule context */
.rule__context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.rule__at-rule {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  color: #4b5563;
  font-size: 9px;
}
.rule__at-rule-name { opacity: 0.6; }
.rule__at-rule-prelude { cursor: text; }
.rule__at-rule-prelude:hover { text-decoration: underline; }

/* Header */
.rule__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.rule__header-left {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.rule__selector-line {
  display: flex;
  align-items: center;
  gap: 4px;
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

/* Origin */
.rule__origin {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 11px;
  letter-spacing: -0.02em;
}
.rule__origin-label { font-weight: 700; }

/* Declarations */
.rule__declarations {
  padding-left: 7px;
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
