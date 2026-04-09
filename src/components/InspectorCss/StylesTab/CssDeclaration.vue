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

    <div class="decl__value-wrap">
      <!-- Value -->
      <input
        ref="valueInput"
        class="prop-value decl__value"
        :class="fieldStateClasses()"
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
    </div>

    <button v-if="editable" @click.stop="deleteDeclaration(rule, decl)" class="decl__delete">×</button>

    <!-- Autocomplete dropdown (prop) -->
    <CssAutocompleteDropdown :ac="ac" :anchor="propInput" v-if="acTarget === 'prop'" />
    <!-- Autocomplete dropdown (value) -->
    <CssAutocompleteDropdown :ac="ac" :anchor="valueInput" v-if="acTarget === 'value'" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { toggleDeclaration, updateDeclaration, deleteDeclaration } from '@/editor/css/actions/cssDeclarationActions'
import { useCssAutocomplete } from '@/composables/useCssAutocomplete'
import CssAutocompleteDropdown from '@/components/CssAutocompleteDropdown.vue'

const emit = defineEmits([
  'request-new-decl', // emitido quando Enter no value da última declaração
  'remove-if-empty',  // emitido quando Escape com prop+value vazios (declaração descartada)
])

const props = defineProps({
  rule: { type: Object, required: true },
  decl: { type: Object, required: true },
  editable: { type: Boolean, default: false },
})

const ac         = useCssAutocomplete()
const propInput  = ref(null)
const valueInput = ref(null)
const acTarget   = ref(null)  // 'prop' | 'value' | null — qual input está com dropdown

// ── Numeric scrubbing (Up/Down sobre número) ─────────────────────────────
// Encontra o número mais próximo do cursor e ajusta pelo delta.
// Suporta inteiros, decimais e números negativos dentro de valores compostos
// como '1px 2em', 'rgba(0, 128, 255, 0.5)', 'translateX(-50%)'.
function nudgeNumberAtCursor(str, cursorPos, delta) {
  const numberRegex = /-?\d*\.?\d+/g
  let match
  while ((match = numberRegex.exec(str)) !== null) {
    const start = match.index
    const end   = start + match[0].length
    // Cursor dentro ou imediatamente adjacente ao número
    if (cursorPos >= start && cursorPos <= end) {
      const original  = match[0]
      const newVal    = parseFloat(original) + delta

      // Preserva casas decimais: max entre o original e o delta
      const origDec   = (original.split('.')[1] ?? '').length
      const deltaDec  = (String(Math.abs(delta)).split('.')[1] ?? '').length
      const precision = Math.max(origDec, deltaDec)
      const newStr    = precision > 0 ? newVal.toFixed(precision) : String(Math.round(newVal))

      return {
        newValue:       str.slice(0, start) + newStr + str.slice(end),
        selectionStart: start,
        selectionEnd:   start + newStr.length,
      }
    }
  }
  return null  // nenhum número no cursor → comportamento padrão
}

function onValueArrow(e) {
  if (!props.editable) return
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  // Se o autocomplete está navegando, deixa ele tratar
  if (ac.isActive.value) return

  const direction   = e.key === 'ArrowUp' ? 1 : -1
  const multiplier  = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
  const delta       = direction * multiplier

  const input     = e.target
  const rawValue  = editingValue.value ?? input.value
  const result    = nudgeNumberAtCursor(rawValue, input.selectionStart, delta)
  if (!result) return  // sem número no cursor → não interfere

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

// ── editingValue ──────────────────────────────────────────────────────────────
// Enquanto o value input está focado, rastreamos o valor localmente para que
// re-renders do Vue (causados por mudanças em decl.prop ou acTarget) nunca
// chamem `el.value = decl.value` e destruam a seleção ou o texto digitado.
// Fica null quando o input não está focado — aí o :value usa decl.value direto.
const editingValue = ref(null)

const displayValue = computed(() =>
  editingValue.value !== null
    ? editingValue.value
    : (props.decl.important ? props.decl.value + ' !important' : props.decl.value)
)

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
  const typed = e.target.value  // captura AGORA — dentro do setTimeout Vue pode ter re-renderizado e revertido el.value
  setTimeout(() => {
    ac.close()
    acTarget.value = null
    // Se ainda é placeholder intocado e o foco foi para FORA da declaração → descarta
    if (isDeclEmpty() && !valueInput.value?.matches(':focus')) {
      emit('remove-if-empty')
      return
    }
    updateDeclaration(props.rule, props.decl, 'prop', typed)
  }, 120)
}

// ── Value handlers ────────────────────────────────────────────────────────────

function onValueFocus(e) {
  if (!props.editable) return
  // Ancora o valor atual: enquanto editingValue !== null Vue nunca vai
  // chamar el.value = decl.value (pois displayValue === el.value → skip).
  editingValue.value = e.target.value
  e.target.select()
  // rAF extra de segurança para o caso de algum re-render síncrono ainda pendente
  const el = e.target
  requestAnimationFrame(() => { el.select() })
  acTarget.value = 'value'
  ac.openValue(valueInput.value, props.decl.prop, e.target.value, accepted => {
    editingValue.value = null
    updateDeclaration(props.rule, props.decl, 'value', accepted)
  })
}

function onValueInput(e) {
  if (!props.editable) return
  editingValue.value = e.target.value  // mantém em sincronia com o que o usuário digita
  acTarget.value = 'value'
  ac.updateQuery(e.target.value)
  if (!ac.isActive.value) {
    ac.openValue(valueInput.value, props.decl.prop, e.target.value, accepted => {
      editingValue.value = null
      updateDeclaration(props.rule, props.decl, 'value', accepted)
    })
  }
}

function onValueBlur(e) {
  const finalValue = e.target.value
  setTimeout(() => {
    ac.close()
    acTarget.value = null
    editingValue.value = null  // libera o anchor — Vue volta a usar decl.value
    // Se ainda é placeholder intocado e o foco foi para FORA da declaração → descarta
    if (isDeclEmpty() && !propInput.value?.matches(':focus')) {
      emit('remove-if-empty')
      return
    }
    updateDeclaration(props.rule, props.decl, 'value', finalValue)
  }, 120)
}

// ── Navigation ────────────────────────────────────────────────────────────────

function onFocusValue(e) {
  // Cede controle ao autocomplete se: item selecionado OU único item na lista (implicit accept)
  if (ac.isActive.value && (ac.activeIdx.value >= 0 || ac.suggestions.value.length === 1)) return
  e.target.closest('.decl')?.querySelector('.prop-value')?.focus()
}

function onFocusNextDecl(e) {
  // Cede controle ao autocomplete se: item selecionado OU único item na lista (implicit accept)
  if (ac.isActive.value && (ac.activeIdx.value >= 0 || ac.suggestions.value.length === 1)) return
  const currentDecl = e.target.closest('.decl')
  const nextDecl    = currentDecl?.nextElementSibling
  e.preventDefault()
  e.stopPropagation()
  e.target.blur()
  if (nextDecl?.classList.contains('decl')) {
    nextDecl.querySelector('.prop-name')?.focus()
  } else {
    emit('request-new-decl')
  }
}

// ── Shift+Tab navigation ─────────────────────────────────────────────────────

/**
 * Tab / Shift+Tab no input de PROP.
 *   Tab       → foca o value (mesma declaração) — comportamento atual
 *   Shift+Tab → foca o value da declaração ANTERIOR
 *               Se for a 1ª declaração → foca o selector da rule
 */
function onTabProp(e) {
  if (e.shiftKey) {
    // Fecha autocomplete se aberto
    if (ac.isActive.value) { ac.close() }
    const currentDecl = e.target.closest('.decl')
    const prevDecl    = currentDecl?.previousElementSibling
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

/**
 * Tab / Shift+Tab no input de VALUE.
 *   Tab       → foca o prop da próxima declaração — comportamento atual
 *   Shift+Tab → foca o prop da MESMA declaração
 */
function onTabValue(e) {
  if (e.shiftKey) {
    if (ac.isActive.value) { ac.close() }
    e.preventDefault()
    e.stopPropagation()
    e.target.blur()
    propInput.value?.focus()
    propInput.value?.select()
  } else {
    onFocusNextDecl(e)
  }
}

// Valores padrão que CssDeclarationService.create coloca numa nova declaração
const DEFAULT_PROP  = 'property'
const DEFAULT_VALUE = 'value'

function isDeclEmpty() {
  const p = (props.decl.prop  ?? '').trim()
  const v = (props.decl.value ?? '').trim()
  return (!p || p === DEFAULT_PROP) && (!v || v === DEFAULT_VALUE)
}

function onEscapeProp(e) {
  if (!props.editable) return
  // Fecha autocomplete se estiver aberto
  if (ac.isActive.value) { ac.close(); return }
  e.target.blur()
  if (isDeclEmpty()) emit('remove-if-empty')
}

function onEscapeValue(e) {
  if (!props.editable) return
  if (ac.isActive.value) { ac.close(); return }
  e.target.blur()
  if (isDeclEmpty()) emit('remove-if-empty')
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
  color: white;
  background: red;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s, opacity 0.15s;
  margin-right: 4px;
}
.decl:hover .decl__delete { opacity: 1; }
.decl__delete:hover { color: #ef4444; }
</style>
