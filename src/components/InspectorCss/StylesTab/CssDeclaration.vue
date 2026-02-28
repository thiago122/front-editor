<template>
  <div class="decl">

    <input
      v-if="editable"
      type="checkbox"
      :checked="!decl.overridden && !decl.disabled"
      @change.stop="toggleDeclaration(rule, decl)"
      class="decl__checkbox"
      :class="{ 'is-faded': decl.overridden || decl.disabled }"
    />

    <!-- Prop name -->
    <input
      class="prop-name decl__prop"
      :class="fieldStateClasses"
      :readonly="!editable"
      :value="decl.prop"
      :size="Math.max(decl.prop.length, 2)"
      @input="(e) => e.target.size = Math.max(e.target.value.length, 2)"
      @blur="(e) => updateDeclaration(rule, decl, 'prop', e.target.value)"
      @keydown.enter.prevent="onFocusValue"
      @keydown.tab.prevent="onFocusValue"
    />

    <span class="decl__colon">:</span>

    <div class="decl__value-wrap">
      <!-- Value -->
      <input
        class="prop-value decl__value"
        :class="fieldStateClasses"
        :readonly="!editable"
        :value="decl.value"
        @blur="(e) => updateDeclaration(rule, decl, 'value', e.target.value)"
        @keydown.enter.prevent="(e) => e.target.blur()"
      />
    </div>

    <span v-if="decl.important" class="decl__important">!important</span>

    <button v-if="editable" @click.stop="deleteDeclaration(rule, decl)" class="decl__delete">×</button>
  </div>
</template>

<script setup>
import { toggleDeclaration, updateDeclaration, deleteDeclaration } from '@/editor/css/actions/cssDeclarationActions'

const props = defineProps({
  rule: { type: Object, required: true },
  decl: { type: Object, required: true },
  editable: { type: Boolean, default: false },
})

function onFocusValue(e) {
  e.target.closest('.decl')?.querySelector('.prop-value')?.focus()
}

/** Retorna as classes de estado compartilhadas pelos campos de prop e valor.
 *  is-editable / is-readonly  → controla cursor e highlight de hover
 *  is-inactive                 → esmaece e risca declarações sobrescritas ou desativadas
 */
function fieldStateClasses() {
  return [
    props.editable ? 'is-editable' : 'is-readonly',
    (props.decl.overridden || props.decl.disabled) ? 'is-inactive' : '',
  ]
}
</script>

<style scoped>
.decl {
  display: flex;
  align-items: center;
padding-top: 1.5px;
  padding-bottom: 1.5px;
}

/* Checkbox */
.decl__checkbox {
  width: 12px;
  height: 12px;
  margin-right: 5px;
  flex-shrink: 0;
  cursor: pointer;
  accent-color: #2563eb;
}
.decl__checkbox.is-faded { opacity: 0.3; }

/* Prop name */
.decl__prop {
  color: #f43f5e;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  flex-shrink: 0;
}
.decl__prop.is-editable { cursor: text; }
.decl__prop.is-editable:hover,
.decl__prop.is-editable:focus { background: #f9fafb; }
.decl__prop.is-readonly { pointer-events: none; }

/* Colon */
.decl__colon {
  flex-shrink: 0;
  color: #9ca3af;
}

/* Value */
.decl__value-wrap {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  line-height: 1;
}
.decl__value {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  line-height: 1;
}
.decl__value.is-editable { cursor: text; }
.decl__value.is-editable:hover,
.decl__value.is-editable:focus { background: #eff6ff; }
.decl__value.is-readonly { pointer-events: none; }

/* Declaração inativa (sobrescrita ou desativada) */
.is-inactive {
  opacity: 0.3;
  text-decoration: line-through;
}

/* !important badge */
.decl__important {
  flex-shrink: 0;
  color: #f59e0b;
  font-size: 8px;
  font-weight: 900;
  text-transform: uppercase;
}

/* Delete button */
.decl__delete {
  opacity: 0;
  flex-shrink: 0;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s, opacity 0.15s;
}
.decl:hover .decl__delete { opacity: 1; }
.decl__delete:hover { color: #ef4444; }
</style>
