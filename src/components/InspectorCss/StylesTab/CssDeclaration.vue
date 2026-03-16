<template>
  <div class="decl" @keydown="ac.onKeydown($event)">

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
      ref="propInput"
      class="prop-name decl__prop"
      :class="fieldStateClasses()"
      :readonly="!editable"
      :value="decl.prop"
      :size="Math.max(decl.prop.length, 2)"
      @focus="onPropFocus"
      @input="onPropInput"
      @blur="onPropBlur"
      @keydown.enter.prevent="onFocusValue"
      @keydown.tab.prevent="onFocusValue"
    />

    <span class="decl__colon">:</span>

    <div class="decl__value-wrap">
      <!-- Value -->
      <input
        ref="valueInput"
        class="prop-value decl__value"
        :class="fieldStateClasses()"
        :readonly="!editable"
        :value="decl.important ? decl.value + ' !important' : decl.value"
        @focus="onValueFocus"
        @input="onValueInput"
        @blur="onValueBlur"
        @keydown.enter.prevent="onFocusNextDecl"
        @keydown.tab.prevent="onFocusNextDecl"
      />
    </div>

    <button v-if="editable" @click.stop="deleteDeclaration(rule, decl)" class="decl__delete">×</button>

    <!-- Autocomplete dropdown (prop) -->
    <CssAutocompleteDropdown :ac="ac" :anchor="propInput" v-if="acTarget === 'prop'" />
    <!-- Autocomplete dropdown (value) -->
    <CssAutocompleteDropdown :ac="ac" :anchor="valueInput" v-if="acTarget === 'value'" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { toggleDeclaration, updateDeclaration, deleteDeclaration } from '@/editor/css/actions/cssDeclarationActions'
import { useCssAutocomplete } from '@/composables/useCssAutocomplete'
import CssAutocompleteDropdown from '@/components/CssAutocompleteDropdown.vue'

const props = defineProps({
  rule: { type: Object, required: true },
  decl: { type: Object, required: true },
  editable: { type: Boolean, default: false },
})

const ac        = useCssAutocomplete()
const propInput  = ref(null)
const valueInput = ref(null)
const acTarget   = ref(null)  // 'prop' | 'value' | null — qual input está com dropdown

// ── Prop name handlers ────────────────────────────────────────────────────────

function onPropFocus(e) {
  if (!props.editable) return
  e.target.select()
  acTarget.value = 'prop'
  ac.openProp(propInput.value, e.target.value, accepted => {
    updateDeclaration(props.rule, props.decl, 'prop', accepted)
    // Após aceitar a prop, foca o value
    setTimeout(() => valueInput.value?.focus(), 0)
  })
}

function onPropInput(e) {
  e.target.size = Math.max(e.target.value.length, 2)
  if (!props.editable) return
  acTarget.value = 'prop'
  ac.updateQuery(e.target.value)
  if (!ac.isActive.value) {
    ac.openProp(propInput.value, e.target.value, accepted => {
      updateDeclaration(props.rule, props.decl, 'prop', accepted)
      setTimeout(() => valueInput.value?.focus(), 0)
    })
  }
}

function onPropBlur(e) {
  // Pequeno delay para permitir mousedown no dropdown antes de fechar
  setTimeout(() => {
    ac.close()
    acTarget.value = null
    updateDeclaration(props.rule, props.decl, 'prop', e.target.value)
  }, 120)
}

// ── Value handlers ────────────────────────────────────────────────────────────

function onValueFocus(e) {
  if (!props.editable) return
  e.target.select()
  acTarget.value = 'value'
  ac.openValue(valueInput.value, props.decl.prop, e.target.value, accepted => {
    updateDeclaration(props.rule, props.decl, 'value', accepted)
  })
}

function onValueInput(e) {
  if (!props.editable) return
  acTarget.value = 'value'
  ac.updateQuery(e.target.value)
  if (!ac.isActive.value) {
    ac.openValue(valueInput.value, props.decl.prop, e.target.value, accepted => {
      updateDeclaration(props.rule, props.decl, 'value', accepted)
    })
  }
}

function onValueBlur(e) {
  setTimeout(() => {
    ac.close()
    acTarget.value = null
    updateDeclaration(props.rule, props.decl, 'value', e.target.value)
  }, 120)
}

// ── Navigation ────────────────────────────────────────────────────────────────

function onFocusValue(e) {
  if (ac.isActive.value && ac.activeIdx.value >= 0) return // Enter aceita sugestão via ac.onKeydown
  e.target.closest('.decl')?.querySelector('.prop-value')?.focus()
}

function onFocusNextDecl(e) {
  if (ac.isActive.value && ac.activeIdx.value >= 0) return
  const currentDecl = e.target.closest('.decl')
  const nextDecl    = currentDecl?.nextElementSibling
  e.target.blur()
  if (nextDecl?.classList.contains('decl')) {
    nextDecl.querySelector('.prop-name')?.focus()
  }
}

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
  opacity: 0;
  transition: opacity 0.1s;
}
.rule:hover .decl__checkbox { opacity: 1; }
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

/* Declaração inativa */
.is-inactive {
  opacity: 0.3;
  text-decoration: line-through;
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
