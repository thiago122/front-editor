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
      @keydown.tab.prevent="onTabProp"
      @keydown.escape.prevent="onEscapeProp"
    />

    <span class="decl__colon">:</span>

    <!-- Value (input + scrubbing + botão de variável + dropdown próprio) -->
    <CssValueField
      :rule="rule"
      :decl="decl"
      :editable="editable"
      :ac="ac"
      v-model:ac-target="acTarget"
      @request-new-decl="$emit('request-new-decl')"
      @remove-if-empty="$emit('remove-if-empty')"
    />

    <button v-if="editable" @click.stop="deleteDeclaration(rule, decl)" class="decl__delete">
      ×
    </button>

    <!-- Autocomplete dropdown (prop) -->
    <CssAutocompleteDropdown :ac="ac" :anchor="propInput" v-if="acTarget === 'prop'" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  toggleDeclaration,
  updateDeclaration,
  deleteDeclaration,
  isPlaceholderDecl,
} from '@/editor/css/actions/cssDeclarationActions'
import { useCssAutocomplete } from '@/composables/useCssAutocomplete'
import CssAutocompleteDropdown from '@/components/CssAutocompleteDropdown.vue'
import CssValueField from './CssValueField.vue'

const emit = defineEmits([
  'request-new-decl', // emitido quando Enter no value da última declaração
  'remove-if-empty', // emitido quando Escape com prop+value vazios (declaração descartada)
])

const props = defineProps({
  rule: { type: Object, required: true },
  decl: { type: Object, required: true },
  editable: { type: Boolean, default: false },
})

// Instância única de autocomplete para os dois campos (prop + value);
// acTarget diz qual campo está com dropdown — o CssValueField escreve
// 'value' nele via v-model.
const ac = useCssAutocomplete()
const propInput = ref(null)
const acTarget = ref(null) // 'prop' | 'value' | null

function valueField() {
  return propInput.value?.closest('.decl')?.querySelector('.prop-value')
}

// ── Prop name handlers ────────────────────────────────────────────────────────

function onPropFocus(e) {
  if (!props.editable) return
  e.target.select()
  acTarget.value = 'prop'
  ac.openProp(propInput.value, e.target.value, (accepted) => {
    updateDeclaration(props.rule, props.decl, 'prop', accepted)
    // Após aceitar a prop, foca o value
    setTimeout(() => valueField()?.focus(), 0)
  })
}

function onPropInput(e) {
  e.target.size = Math.max(e.target.value.length, 2)
  if (!props.editable) return
  acTarget.value = 'prop'
  ac.updateQuery(e.target.value)
  if (!ac.isActive.value) {
    ac.openProp(propInput.value, e.target.value, (accepted) => {
      updateDeclaration(props.rule, props.decl, 'prop', accepted)
      setTimeout(() => valueField()?.focus(), 0)
    })
  }
}

function onPropBlur(e) {
  const typed = e.target.value // captura AGORA — dentro do setTimeout Vue pode ter re-renderizado e revertido el.value
  setTimeout(() => {
    ac.close()
    acTarget.value = null
    // Se ainda é placeholder intocado e o foco foi para FORA da declaração → descarta
    if (isPlaceholderDecl(props.decl) && !valueField()?.matches(':focus')) {
      emit('remove-if-empty')
      return
    }
    updateDeclaration(props.rule, props.decl, 'prop', typed)
  }, 120)
}

// ── Navigation ────────────────────────────────────────────────────────────────

function onFocusValue(e) {
  // Cede controle ao autocomplete se: item selecionado OU único item na lista (implicit accept)
  if (ac.isActive.value && (ac.activeIdx.value >= 0 || ac.suggestions.value.length === 1)) return
  e.target.closest('.decl')?.querySelector('.prop-value')?.focus()
}

/**
 * Tab / Shift+Tab no input de PROP.
 *   Tab       → foca o value (mesma declaração) — comportamento atual
 *   Shift+Tab → foca o value da declaração ANTERIOR
 *               Se for a 1ª declaração → foca o selector da rule
 */
function onTabProp(e) {
  if (e.shiftKey) {
    // Fecha autocomplete se aberto
    if (ac.isActive.value) {
      ac.close()
    }
    const currentDecl = e.target.closest('.decl')
    const prevDecl = currentDecl?.previousElementSibling
    e.preventDefault()
    e.stopPropagation()
    if (prevDecl?.classList.contains('decl')) {
      // Há uma declaração acima → foca o value dela
      e.target.blur()
      prevDecl.querySelector('.prop-value')?.focus()
    } else {
      // 1ª declaração → foca o selector da rule (contenteditable)
      const selector = e.target.closest('.rule')?.querySelector('.rule__selector')
      if (selector) {
        e.target.blur()
        selector.focus()
        // Seleciona todo o texto do selector
        const range = document.createRange()
        range.selectNodeContents(selector)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  } else {
    onFocusValue(e)
  }
}

function onEscapeProp(e) {
  if (!props.editable) return
  // Fecha autocomplete se estiver aberto
  if (ac.isActive.value) {
    ac.close()
    return
  }
  e.target.blur()
  if (isPlaceholderDecl(props.decl)) emit('remove-if-empty')
}

function fieldStateClasses() {
  return {
    'is-editable': props.editable,
    'is-readonly': !props.editable,
    'is-disabled': props.decl.disabled,
    'is-overridden': props.decl.overridden,
  }
}
</script>

<style scoped>
.decl {
  display: flex;
  align-items: center;
  padding-top: 1.5px;
  padding-bottom: 1.5px;
  padding-left: 5px;
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
.rule:hover .decl__checkbox {
  opacity: 1;
}
.decl__checkbox.is-faded {
  opacity: 0.3;
}

/* Prop name */
.decl__prop {
  color: #f43f5e;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  flex-shrink: 0;
}
.decl__prop.is-editable {
  cursor: text;
}
.decl__prop.is-editable:hover,
.decl__prop.is-editable:focus {
  background: #f9fafb;
}
.decl__prop.is-readonly {
  pointer-events: none;
}

/* Colon */
.decl__colon {
  flex-shrink: 0;
  color: #9ca3af;
}

/* Declaração inativa */
.is-disabled {
  opacity: 0.3;
}
.is-overridden {
  text-decoration: line-through;
}

/* Delete button */
.decl__delete {
  opacity: 0;
  flex-shrink: 0;
  color: white;
  background: red;
  border: none;
  cursor: pointer;
  padding: 0;
  transition:
    color 0.15s,
    opacity 0.15s;
  margin-right: 4px;
}
.decl:hover .decl__delete {
  opacity: 1;
}
.decl__delete:hover {
  color: #ef4444;
}
</style>
