<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/EditorStore'
import { ApiService } from '@/services/ApiService'

const router       = useRouter()
const editorStore  = useEditorStore()

const documents   = ref([])
const loading     = ref(false)
const error       = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    documents.value = await ApiService.listDocuments()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function openDocument(doc) {
  await editorStore.openDocument(doc)
  router.push('/editor')
}

const typeIcon = { document: '📄', page: '📃', post: '📝', css: '🎨', js: '⚙️' }
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">

    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
      <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
      </svg>
      <h1 class="text-lg font-semibold text-gray-800">Front Editor</h1>
    </header>

    <!-- Body -->
    <main class="flex-1 max-w-3xl mx-auto w-full px-6 py-8">

      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Documentos</h2>

      <!-- Loading -->
      <div v-if="loading" class="text-gray-400 text-sm py-8 text-center">Carregando…</div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        <strong>Erro ao carregar documentos:</strong> {{ error }}
        <p class="mt-1 text-xs text-red-500">Verifique se a API está acessível e o <code>config.js</code> está configurado.</p>
      </div>

      <!-- Empty -->
      <div v-else-if="!documents.length" class="text-gray-400 text-sm py-8 text-center">
        Nenhum documento encontrado.<br>
        <span class="text-xs">Verifique a configuração do backend em <code>public/config.js</code>.</span>
      </div>

      <!-- Document list -->
      <ul v-else class="space-y-1">
        <li v-for="doc in documents" :key="doc.id">
          <button
            @click="openDocument(doc)"
            class="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200
                   hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left group"
          >
            <span class="text-xl shrink-0">{{ typeIcon[doc.type] ?? '📄' }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ doc.title }}</p>
              <p class="text-xs text-gray-400 truncate">{{ doc.path ?? doc.id }}</p>
            </div>
            <svg class="w-4 h-4 text-gray-300 group-hover:text-indigo-500 shrink-0 transition-colors"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </li>
      </ul>

    </main>
  </div>
</template>
