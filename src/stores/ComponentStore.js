import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ApiService } from '@/services/ApiService'
import { useEditorStore } from './EditorStore'

export const useComponentStore = defineStore('components', () => {
  const components = ref([])
  const isLoading = ref(false)

  async function loadComponents() {
    isLoading.value = true
    const editorStore = useEditorStore()
    const docPath = editorStore.currentDocument?.path || ''
    
    try {
      const list = await ApiService.listComponents(docPath)
      components.value = list
    } catch (e) {
      console.error('[ComponentStore] Erro ao carregar componentes:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function saveComponent(name, html) {
    const editorStore = useEditorStore()
    const docPath = editorStore.currentDocument?.path || ''

    try {
      await ApiService.saveComponent(name, html, docPath)
      await loadComponents() // recarrega a lista
      return true
    } catch (e) {
      console.error('[ComponentStore] Erro ao salvar componente:', e)
      return false
    }
  }

  return {
    components,
    isLoading,
    loadComponents,
    saveComponent
  }
})
