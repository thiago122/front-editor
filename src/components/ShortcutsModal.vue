<template>
  <div v-if="isOpen" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="close">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Atalhos de Teclado
        </h2>
        <button @click="close" class="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto grow">
        <div class="space-y-6">
          
          <!-- Grupo: Ferramentas -->
          <div>
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ferramentas & Workspace</h3>
            <div class="space-y-2">
              <ShortcutItem keys="Ctrl + Shift + C" title="Inspecionar Elemento">
                Liga ou desliga o modo de seleção pelo mouse. Útil para rapidamente focar em um elemento específico do canvas sem precisar procurar na árvore.
              </ShortcutItem>
              <ShortcutItem keys="Alt + L" title="Layers (Explorador HTML)">
                Abre ou fecha o painel lateral esquerdo com a árvore DOM (Camadas). Ideal para organizar a estrutura ou reordenar elementos.
              </ShortcutItem>
              <ShortcutItem keys="Alt + E" title="CSS Explorer">
                Abre ou fecha o painel do explorador de CSS. Mostra todos os seletores e regras ativas da página.
              </ShortcutItem>
            </div>
          </div>

          <!-- Grupo: Arquivos -->
          <div>
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Arquivos</h3>
            <div class="space-y-2">
              <ShortcutItem keys="Ctrl + S" title="Salvar Alterações">
                Salva as mudanças no HTML e no CSS. Se o arquivo veio da API, salva no servidor. Caso contrário, salva localmente ou faz o download.
              </ShortcutItem>
            </div>
          </div>

          <!-- Grupo: Edição -->
          <div>
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Edição de Elementos</h3>
            <div class="space-y-2">
              <ShortcutItem keys="Del / Backspace" title="Deletar Elemento">
                Remove o elemento selecionado atualmente do canvas. (O foco deve estar no canvas ou no inspector).
              </ShortcutItem>
              <ShortcutItem keys="Duplo Clique" title="Editar Texto Inline">
                Ao dar um duplo clique em textos (P, H1, H2, SPAN, etc) no canvas, você pode editar o conteúdo do texto diretamente.
              </ShortcutItem>
            </div>
          </div>

        </div>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
        <button @click="close" class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
          Fechar
        </button>
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
// Sub-componente local para as linhas de atalho
import { h } from 'vue'
const ShortcutItem = (props, context) => {
  const keys = props.keys.split(' + ').map(k => 
    h('kbd', { class: 'px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-xs font-mono text-gray-700 font-semibold shadow-sm mx-0.5' }, k)
  )
  
  // Renderiza com sinais de '+'
  const keysWithPlus = []
  keys.forEach((node, index) => {
    keysWithPlus.push(node)
    if (index < keys.length - 1) {
      keysWithPlus.push(h('span', { class: 'text-gray-400 text-xs font-bold mx-0.5' }, '+'))
    }
  })

  return h('div', { class: 'flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100' }, [
    h('div', { class: 'shrink-0 w-32 flex flex-wrap items-center pt-0.5' }, keysWithPlus),
    h('div', { class: 'flex-1' }, [
      h('div', { class: 'text-sm font-bold text-gray-800' }, props.title),
      h('div', { class: 'text-xs text-gray-500 mt-1 leading-relaxed' }, context.slots.default ? context.slots.default() : '')
    ])
  ])
}

export default {
  components: {
    ShortcutItem
  }
}
</script>
