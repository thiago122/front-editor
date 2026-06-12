<template>
  <div class="decl__value-wrap" style="position: relative" :title="variableValueTooltip">
    <!-- Value -->
    <input
      ref="valueInput"
      class="prop-value decl__value"
      :class="fieldStateClasses()"
      :style="hasVariable && editingValue === null ? 'padding-right: 20px;' : ''"
      :readonly="!editable"
      :value="displayValue"
      @focus="onValueFocus"
      @input="onValueInput"
      @blur="onValueBlur"
      @keydown="onValueArrow"
      @keydown.enter.prevent="onFocusNextDecl"
      @keydown.tab.prevent="onTabValue"
      @keydown.escape.prevent="onEscapeValue"
    />
    <!-- Token Link -->
    <button
      v-if="hasVariable && editingValue === null"
      @click.stop="openVariablesPanel"
      title="Abrir Design Tokens"
      style="
        position: absolute;
        right: 2px;
        top: 50%;
        transform: translateY(-50%);
        cursor: pointer;
        background: transparent;
        border: none;
        font-size: 10px;
        opacity: 0.6;
        padding: 2px;
      "
      onmouseover="this.style.opacity=1"
      onmouseout="this.style.opacity=0.6"
    >
      🔗
    </button>

    <!-- Autocomplete dropdown (value) -->
    <CssAutocompleteDropdown :ac="ac" :anchor="valueInput" v-if="acTarget === 'value'" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { updateDeclaration, isPlaceholderDecl } from '@/editor/css/actions/cssDeclarationActions'
import { nudgeNumberAtCursor } from '@/utils/nudgeNumber'
import { useEditorStore } from '@/stores/EditorStore'
import { useStyleStore } from '@/stores/StyleStore'
import CssAutocompleteDropdown from '@/components/CssAutocompleteDropdown.vue'

const emit = defineEmits([
  'request-new-decl', // Enter no value da última declaração
  'remove-if-empty', // Escape/blur com prop+value ainda placeholder
])

const props = defineProps({
  rule: { type: Object, required: true },
  decl: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  // Instância única de useCssAutocomplete — compartilhada com o campo de prop
  // no CssDeclaration pai (uma declaração nunca tem dois dropdowns abertos).
  ac: { type: Object, required: true },
})

// Qual campo da declaração está com dropdown ('prop' | 'value' | null).
// v-model com o pai: o campo de prop escreve 'prop', este escreve 'value'.
const acTarget = defineModel('acTarget')

const valueInput = ref(null)

// ── editingValue ──────────────────────────────────────────────────────────────
// Enquanto o value input está focado, rastreamos o valor localmente para que
// re-renders do Vue (causados por mudanças em decl.prop ou acTarget) nunca
// chamem `el.value = decl.value` e destruam a seleção ou o texto digitado.
// Fica null quando o input não está focado — aí o :value usa decl.value direto.
const editingValue = ref(null)

const displayValue = computed(() =>
  editingValue.value !== null
    ? editingValue.value
    : props.decl.important
      ? props.decl.value + ' !important'
      : props.decl.value,
)

const hasVariable = computed(() => {
  return props.decl.value && props.decl.value.includes('var(--')
})

const variableValueTooltip = computed(() => {
  if (!hasVariable.value) return ''

  const match = props.decl.value.match(/var\((--[^)]+)\)/)
  if (!match) return ''

  const varName = match[1]
  const styleStore = useStyleStore()
  const allVars = [...(styleStore.localVariables || []), ...(styleStore.globalVariables || [])]

  const found = allVars.find((v) => v.name === varName)
  if (found) {
    return `Variável: ${varName}\nValor: ${found.value}`
  }

  return `Variável: ${varName} (não encontrada/definida)`
})

function openVariablesPanel() {
  const editorStore = useEditorStore()
  editorStore.variablesPanel.show = true
}

// ── Numeric scrubbing (Up/Down sobre número) ─────────────────────────────────

function onValueArrow(e) {
  if (!props.editable) return
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  // Se o autocomplete está navegando, deixa ele tratar
  if (props.ac.isActive.value) return

  const direction = e.key === 'ArrowUp' ? 1 : -1
  const multiplier = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
  const delta = direction * multiplier

  const input = e.target
  const rawValue = editingValue.value ?? input.value
  const result = nudgeNumberAtCursor(rawValue, input.selectionStart, delta)
  if (!result) return // sem número no cursor → não interfere

  e.preventDefault()

  // Atualiza display e ancora o editing value
  editingValue.value = result.newValue
  // Restaura a posição do cursor sobre o número alterado
  requestAnimationFrame(() => {
    input.value = result.newValue
    input.setSelectionRange(result.selectionStart, result.selectionEnd)
  })

  // Persiste imediatamente no AST (sem depender do blur)
  updateDeclaration(props.rule, props.decl, 'value', result.newValue)
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function onValueFocus(e) {
  if (!props.editable) return
  // Ancora o valor atual: enquanto editingValue !== null Vue nunca vai
  // chamar el.value = decl.value (pois displayValue === el.value → skip).
  editingValue.value = e.target.value
  e.target.select()
  // rAF extra de segurança para o caso de algum re-render síncrono ainda pendente
  const el = e.target
  requestAnimationFrame(() => {
    el.select()
  })
  acTarget.value = 'value'
  props.ac.openValue(valueInput.value, props.decl.prop, e.target.value, (accepted) => {
    editingValue.value = null
    updateDeclaration(props.rule, props.decl, 'value', accepted)
  })
}

function onValueInput(e) {
  if (!props.editable) return
  editingValue.value = e.target.value // mantém em sincronia com o que o usuário digita
  acTarget.value = 'value'
  props.ac.updateQuery(e.target.value)
  if (!props.ac.isActive.value) {
    props.ac.openValue(valueInput.value, props.decl.prop, e.target.value, (accepted) => {
      editingValue.value = null
      updateDeclaration(props.rule, props.decl, 'value', accepted)
    })
  }
}

function propField() {
  return valueInput.value?.closest('.decl')?.querySelector('.prop-name')
}

function onValueBlur(e) {
  const finalValue = e.target.value
  setTimeout(() => {
    props.ac.close()
    acTarget.value = null
    editingValue.value = null // libera o anchor — Vue volta a usar decl.value
    // Se ainda é placeholder intocado e o foco foi para FORA da declaração → descarta
    if (isPlaceholderDecl(props.decl) && !propField()?.matches(':focus')) {
      emit('remove-if-empty')
      return
    }
    updateDeclaration(props.rule, props.decl, 'value', finalValue)
  }, 120)
}

// ── Navegação ─────────────────────────────────────────────────────────────────

function onFocusNextDecl(e) {
  // Cede controle ao autocomplete se: item selecionado OU único item na lista (implicit accept)
  if (props.ac.isActive.value && (props.ac.activeIdx.value >= 0 || props.ac.suggestions.value.length === 1)) return
  const currentDecl = e.target.closest('.decl')
  const nextDecl = currentDecl?.nextElementSibling
  e.preventDefault()
  e.stopPropagation()
  e.target.blur()
  if (nextDecl?.classList.contains('decl')) {
    nextDecl.querySelector('.prop-name')?.focus()
  } else {
    emit('request-new-decl')
  }
}

/**
 * Tab / Shift+Tab no input de VALUE.
 *   Tab       → foca o prop da próxima declaração
 *   Shift+Tab → foca o prop da MESMA declaração
 */
function onTabValue(e) {
  if (e.shiftKey) {
    if (props.ac.isActive.value) {
      props.ac.close()
    }
    e.preventDefault()
    e.stopPropagation()
    e.target.blur()
    const prop = propField()
    prop?.focus()
    prop?.select()
  } else {
    onFocusNextDecl(e)
  }
}

function onEscapeValue(e) {
  if (!props.editable) return
  if (props.ac.isActive.value) {
    props.ac.close()
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
.decl__value.is-editable {
  cursor: text;
}
.decl__value.is-editable:hover,
.decl__value.is-editable:focus {
  background: #eff6ff;
}
.decl__value.is-readonly {
  pointer-events: none;
}

/* Declaração inativa */
.is-disabled {
  opacity: 0.3;
}
.is-overridden {
  text-decoration: line-through;
}
</style>
