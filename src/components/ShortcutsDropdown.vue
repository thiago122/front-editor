<template>
  <div v-if="isOpen" class="absolute top-full right-0 mt-2 z-[9999]">
    <!-- Clique fora para fechar (overlay invisível) -->
    <div class="fixed inset-0 z-[-1]" @click="close"></div>

    <div class="bg-white rounded-lg shadow-xl border border-gray-200 w-[420px] max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
        <h2 class="text-sm font-bold text-gray-800 flex items-center gap-2">
          <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Atalhos de Teclado
        </h2>
        <button @click="close" class="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 overflow-y-auto grow custom-scrollbar">
        <div class="space-y-5">
          
          <!-- Grupo: Ferramentas e Painéis -->
          <div>
            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Interface e Painéis</h3>
            <div class="space-y-1">
              <ShortcutItem keys="Ctrl + Shift + C" title="Inspecionar Elemento">
                Liga/desliga a seleção com o mouse no canvas.
              </ShortcutItem>
              <ShortcutItem keys="Alt + L" title="Explorador HTML (Layers)">
                Abre ou fecha o painel de camadas à esquerda.
              </ShortcutItem>
              <ShortcutItem keys="Alt + E" title="Explorador CSS">
                Abre ou fecha a árvore de código CSS.
              </ShortcutItem>
              <ShortcutItem keys="Alt + K" title="Criar Seletor Rápido">
                Foca no input de criação de regras CSS (Inspector).
              </ShortcutItem>
              <ShortcutItem keys="Alt + C" title="Atributos Rápidos">
                Abre o painel para adicionar classes ou IDs.
              </ShortcutItem>
              <ShortcutItem keys="Ctrl + F" title="Buscar no CSS">
                Foca no campo de busca do Explorador CSS.
              </ShortcutItem>
            </div>
          </div>

          <!-- Grupo: Arquivos -->
          <div>
            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sistema</h3>
            <div class="space-y-1">
              <ShortcutItem keys="Ctrl + S" title="Salvar Documento">
                Salva alterações no HTML, arquivos CSS e manifestos.
              </ShortcutItem>
            </div>
          </div>

          <!-- Grupo: Edição -->
          <div>
            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Edição no Canvas</h3>
            <div class="space-y-1">
              <ShortcutItem keys="Duplo Clique" title="Editar Texto">
                Entra no modo de edição inline de textos.
              </ShortcutItem>
              <ShortcutItem keys="Ctrl + B" title="Negrito">
                Aplica negrito durante a edição de texto inline.
              </ShortcutItem>
              <ShortcutItem keys="Ctrl + I" title="Itálico">
                Aplica itálico durante a edição de texto inline.
              </ShortcutItem>
              <ShortcutItem keys="Del / Back" title="Excluir Elemento">
                Remove o nó/elemento que está selecionado.
              </ShortcutItem>
              <ShortcutItem keys="Enter" title="Confirmar">
                Aplica edições, seleções em listas ou modais.
              </ShortcutItem>
              <ShortcutItem keys="Esc" title="Cancelar / Fechar">
                Fecha painéis, modais, e cancela edições.
              </ShortcutItem>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}

const handleKeydown = (e) => {
  if (props.isOpen && e.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<script>
// Sub-componente local
import { h } from 'vue'
const ShortcutItem = (props, context) => {
  const keys = props.keys.split(' + ').map(k => 
    h('kbd', { class: 'px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-700 font-bold shadow-sm mx-0.5' }, k)
  )
  
  const keysWithPlus = []
  keys.forEach((node, index) => {
    keysWithPlus.push(node)
    if (index < keys.length - 1) {
      keysWithPlus.push(h('span', { class: 'text-gray-400 text-[10px] font-bold mx-0.5' }, '+'))
    }
  })

  return h('div', { class: 'flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors' }, [
    h('div', { class: 'shrink-0 w-[124px] flex flex-wrap items-center' }, keysWithPlus),
    h('div', { class: 'flex-1' }, [
      h('div', { class: 'text-[11px] font-bold text-gray-800 leading-tight' }, props.title),
      h('div', { class: 'text-[10px] text-gray-500 leading-tight mt-0.5' }, context.slots.default ? context.slots.default() : '')
    ])
  ])
}

export default {
  components: {
    ShortcutItem
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 10px;
}
</style>
