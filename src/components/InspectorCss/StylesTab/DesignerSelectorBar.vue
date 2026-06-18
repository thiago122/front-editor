<script setup>
import { computed, ref, nextTick } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
import {
  elementSelectors,
  hasEditableRule,
  setActiveTargetBySelector,
  addBaseClass,
  renameClass,
} from '@/editor/css/actions/cssDesignerActions'

const props = defineProps({
  // Seletor atualmente ativo no painel (ex. '.btn'). Vem do rule.selector.
  activeSelector: { type: String, default: '' },
})

const editorStore = useEditorStore()

// Chips dos seletores do elemento (classes + id). Reativo a mudanças de
// atributo via astMutationKey (setAttribute bumpa ele).
const chips = computed(() => {
  editorStore.astMutationKey // dep de reatividade
  const el = editorStore.selectedElement
  if (!el) return []
  return elementSelectors(el).map(s => ({
    ...s,
    editable: s.type === 'class' && hasEditableRule(s.sel),
  }))
})

function pick(sel) {
  if (sel === props.activeSelector) return
  setActiveTargetBySelector(sel)
}

function onAdd() {
  addBaseClass()
}

// ── Rename inline ─────────────────────────────────────────────────────────────
const editing = ref(null) // nome da classe em edição
const draft = ref('')
const inputRef = ref(null)

function startRename(chip) {
  if (chip.type !== 'class' || !chip.editable) return
  editing.value = chip.name
  draft.value = chip.name
  nextTick(() => inputRef.value?.focus())
}

function commitRename() {
  const old = editing.value
  editing.value = null
  if (old) renameClass(old, draft.value)
}

function cancelRename() {
  editing.value = null
}
</script>

<template>
  <div class="flex items-center gap-1 flex-wrap min-w-0">
    <template v-for="chip in chips" :key="chip.sel">
      <!-- Em edição (rename inline) -->
      <input
        v-if="editing === chip.name"
        ref="inputRef"
        v-model="draft"
        @keydown.enter.prevent="commitRename"
        @keydown.esc.prevent="cancelRename"
        @blur="commitRename"
        class="text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-400 outline-none w-20 bg-white"
      />
      <!-- Chip -->
      <button
        v-else
        @click="pick(chip.sel)"
        @dblclick="startRename(chip)"
        :title="chip.editable
          ? 'Clique p/ editar · 2 cliques p/ renomear'
          : (chip.type === 'id' ? 'id' : 'classe (regra externa/sem regra)')"
        class="text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors truncate max-w-[120px]"
        :class="chip.sel === activeSelector
          ? 'bg-blue-600 text-white border-blue-600'
          : chip.type === 'id'
            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400'
            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'"
      >{{ chip.sel }}</button>
    </template>

    <!-- + Adicionar classe -->
    <button
      @click="onAdd"
      title="Adicionar nova classe"
      class="text-[11px] leading-none w-5 h-5 flex items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-colors shrink-0"
    >+</button>
  </div>
</template>
