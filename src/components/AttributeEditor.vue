<script setup>
// AttributeEditor.vue

import { reactive, watch, computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'
const EditorStore = useEditorStore()
const attrs = reactive([])

// Agora EditorStore.selectedNode existe!
const node = computed(() => EditorStore.selectedNode)

watch(
  () => EditorStore.selectedNodeId,
  () => {
    attrs.length = 0 // Reseta a lista local

    // Pegamos o nó atual da store
    const currentNode = EditorStore.selectedNode

    if (currentNode?.attrs) {
      Object.entries(currentNode.attrs).forEach(([key, value]) => {
        if (key !== 'data-node-id') {
          attrs.push({ key, value })
        }
      })
    }
  },
  { immediate: true },
)

function commit() {
  if (!EditorStore.selectedNodeId || !EditorStore.manipulation) return

  const result = {}
  attrs.forEach(({ key, value }) => {
    if (key.trim()) {
      result[key] = value ?? ''
    }
  })

  // Envia para a Engine atualizar AST e Iframe
  EditorStore.manipulation.setAttributes(EditorStore.selectedNodeId, result)
}

function addAttr() {
  attrs.push({ key: '', value: '' })
}
</script>

<template>
  <div class="p-4 bg-white border-l h-full overflow-y-auto">
    <div v-if="node">
      <div class="mb-4">
        <span class="text-[10px] font-bold text-gray-400 uppercase">Editando</span>
        <h2 class="text-blue-600 font-mono font-bold">&lt;{{ node.tag }}&gt;</h2>
      </div>

      <div class="space-y-2">
        <div v-for="(attr, i) in attrs" :key="i" class="flex gap-1 items-center">
          <input
            v-model="attr.key"
            @blur="commit"
            class="w-1/2 p-1 border rounded text-xs font-mono focus:border-blue-500 outline-none"
            placeholder="Atributo"
          />
          <input
            v-model="attr.value"
            @blur="commit"
            class="w-1/2 p-1 border rounded text-xs font-mono focus:border-blue-500 outline-none"
            placeholder="Valor"
          />
          <button
            @click="
              () => {
                attrs.splice(i, 1)
                commit()
              }
            "
            class="text-red-400 hover:text-red-600 px-1"
          >
            ✕
          </button>
        </div>
      </div>

      <button @click="addAttr" class="mt-4 text-xs text-blue-500 hover:underline">
        + Adicionar Atributo
      </button>
    </div>

    <div v-else class="h-full flex items-center justify-center text-gray-400 text-center p-10">
      <p>Selecione um elemento no preview para editar seus atributos.</p>
    </div>
  </div>
</template>
