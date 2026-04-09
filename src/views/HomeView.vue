<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/EditorStore'
import { ApiService } from '@/services/ApiService'
import CreateDocumentModal from '@/components/CreateDocumentModal.vue'
import CreateFolderModal from '@/components/CreateFolderModal.vue'
import RenameDocumentModal from '@/components/RenameDocumentModal.vue'
import SimpleConfirmModal from '@/components/SimpleConfirmModal.vue'

const router       = useRouter()
const editorStore  = useEditorStore()

const documents   = ref([])
const loading     = ref(false)
const error       = ref(null)

const projects = computed(() => {
  const groups = {}
  documents.value.forEach(doc => {
    const path = (doc.path ?? doc.id).replace(/\\/g, '/')
    const parts = path.split('/')
    // Se está na raiz, o nome é 'Sem Pasta' ou 'Raiz', senão é a subpasta
    const projectName = (doc.type === 'project') ? path : (parts.length > 1 ? parts.slice(0, -1).join('/') : 'Raiz')
    
    if (!groups[projectName]) groups[projectName] = []
    if (doc.type !== 'project') {
      groups[projectName].push(doc)
    }
  })
  
  return Object.entries(groups).map(([name, docs]) => ({
    name,
    docs: docs.sort((a, b) => a.title.localeCompare(b.title))
  })).sort((a, b) => {
    if (a.name === 'Raiz') return -1
    if (b.name === 'Raiz') return 1
    return a.name.localeCompare(b.name)
  })
})

// Modal states
const isCreateModalOpen = ref(false)
const isCreateFolderModalOpen = ref(false)
const isRenameModalOpen = ref(false)
const isRenameFolderModalOpen = ref(false)
const isConfirmOpen     = ref(false) // Confirmar abertura após criar
const isTrashConfirmOpen = ref(false) // Confirmar exclusão
const isTrashFolderConfirmOpen = ref(false) 

const lastCreatedDoc    = ref(null)
const selectedDoc       = ref(null)
const targetProject     = ref('') // Pasta onde o documento será criado
const collapsedProjects = ref(new Set()) // Nomes das pastas minimizadas

const createLoading     = ref(false)
const createFolderLoading = ref(false)
const renameLoading     = ref(false)
const trashLoading      = ref(false)

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
  if (!doc) {
    console.warn('[EditorStore] openDocument chamado com doc nulo')
    return
  }
  try {
    const docPath = (doc.path ?? doc.id).replace(/\\/g, '/') // normaliza barras do Windows
    await editorStore.openDocument({ ...doc, path: docPath })
    router.push({ name: 'editor', query: { path: docPath } })
  } catch (e) {
    console.error('Erro ao abrir documento:', e)
  }
}

async function handleCreateConfirm(name) {
  if (!name) return
  createLoading.value = true
  try {
    const fullPath = (targetProject.value && targetProject.value !== 'Raiz') 
      ? `${targetProject.value}/${name}` 
      : name
    const res = await ApiService.createDocument(fullPath)
    if (res.ok) {
      // Recarrega a lista
      documents.value = await ApiService.listDocuments()
      isCreateModalOpen.value = false
      
      // Prepara confirmação de abertura
      lastCreatedDoc.value = { 
        id: res.path || name, 
        path: res.path || name, 
        title: name, 
        type: 'document' 
      }
      isConfirmOpen.value = true
    }
  } catch (e) {
    alert('Erro ao criar documento: ' + e.message)
  } finally {
    createLoading.value = false
  }
}

async function handleRenameConfirm(newName) {
  if (!newName || !selectedDoc.value) return
  renameLoading.value = true
  try {
    await ApiService.renameDocument(selectedDoc.value.path, newName)
    documents.value = await ApiService.listDocuments()
    isRenameModalOpen.value = false
  } catch (e) {
    alert('Erro ao renomear: ' + e.message)
  } finally {
    renameLoading.value = false
  }
}

async function handleTrashConfirm() {
  if (!selectedDoc.value) return
  trashLoading.value = true
  try {
    await ApiService.trashDocument(selectedDoc.value.path)
    documents.value = await ApiService.listDocuments()
    isTrashConfirmOpen.value = false
    selectedDoc.value = null
  } catch (e) {
    alert('Erro ao excluir: ' + e.message)
  } finally {
    trashLoading.value = false
  }
}

async function handleCreateFolderConfirm(name) {
  if (!name) return
  createFolderLoading.value = true
  try {
    await ApiService.createFolder(name)
    documents.value = await ApiService.listDocuments()
    isCreateFolderModalOpen.value = false
  } catch (e) {
    alert('Erro ao criar pasta: ' + e.message)
  } finally {
    createFolderLoading.value = false
  }
}

async function handleRenameFolderConfirm(newName) {
  if (!newName || !selectedDoc.value) return
  renameLoading.value = true
  try {
    await ApiService.renameFolder(selectedDoc.value.path, newName)
    documents.value = await ApiService.listDocuments()
    isRenameFolderModalOpen.value = false
  } catch (e) {
    alert('Erro ao renomear pasta: ' + e.message)
  } finally {
    renameLoading.value = false
  }
}

async function handleTrashFolderConfirm() {
  if (!selectedDoc.value) return
  trashLoading.value = true
  try {
    await ApiService.trashFolder(selectedDoc.value.path)
    documents.value = await ApiService.listDocuments()
    isTrashFolderConfirmOpen.value = false
    selectedDoc.value = null
  } catch (e) {
    alert('Erro ao excluir pasta: ' + e.message)
  } finally {
    trashLoading.value = false
  }
}

function openRename(doc) {
  selectedDoc.value = doc
  isRenameModalOpen.value = true
}

function openRenameFolder(projectName) {
  selectedDoc.value = { path: projectName, title: projectName }
  isRenameFolderModalOpen.value = true
}

function openTrash(doc) {
  selectedDoc.value = doc
  isTrashConfirmOpen.value = true
}

function openTrashFolder(projectName) {
  selectedDoc.value = { path: projectName, title: projectName }
  isTrashFolderConfirmOpen.value = true
}

function openCreateInProject(projectName) {
  targetProject.value = projectName
  isCreateModalOpen.value = true
}

function openCreateRoot() {
  targetProject.value = ''
  isCreateModalOpen.value = true
}

function toggleProject(name) {
  if (collapsedProjects.value.has(name)) {
    collapsedProjects.value.delete(name)
  } else {
    collapsedProjects.value.add(name)
  }
}

function isCollapsed(name) {
  return collapsedProjects.value.has(name)
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

      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Documentos</h2>
        <div class="flex gap-2">
          <button
            @click="isCreateFolderModalOpen = true"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-semibold rounded-md
                   border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Nova Pasta
          </button>
          <button
            @click="openCreateRoot"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-semibold rounded-md
                   hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 active:scale-95"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Novo Documento
          </button>
        </div>
      </div>

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

      <div v-else class="space-y-8">
        <div v-for="project in projects" :key="project.name" class="space-y-3">
          <div class="flex items-center gap-2 px-1 group/header">
            <!-- Toggle Arrow -->
            <button 
              @click="toggleProject(project.name)"
              class="p-1 -ml-1 text-gray-400 hover:text-indigo-600 hover:bg-white rounded transition-all"
              :class="{ 'rotate-[-90deg]': isCollapsed(project.name) }"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            <h3 
              @click="toggleProject(project.name)"
              class="text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-gray-700 transition-colors"
            >
              {{ project.name }}
            </h3>
            
            <!-- Folder Actions -->
            <div v-if="project.name !== 'Raiz'" class="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
              <button @click="openCreateInProject(project.name)" class="p-1 text-indigo-600 hover:bg-white rounded transition-colors" title="Adicionar documento nesta pasta">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              </button>
              <button @click="openRenameFolder(project.name)" class="p-1 text-gray-400 hover:text-indigo-600 hover:bg-white rounded transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              </button>
              <button @click="openTrashFolder(project.name)" class="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
            <div v-else class="opacity-0 group-hover/header:opacity-100 transition-opacity">
                <button @click="openCreateRoot" class="p-1 text-indigo-600 hover:bg-white rounded transition-colors" title="Adicionar documento na raiz">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                </button>
            </div>

            <div class="flex-1 h-px bg-gray-200"></div>
          </div>

          <ul v-show="!isCollapsed(project.name)" class="space-y-1">
            <li v-for="doc in project.docs" :key="doc.id" class="group relative">
              <button
                @click="openDocument(doc)"
                class="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200
                      hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
              >
                <span class="text-xl shrink-0">{{ typeIcon[doc.type] ?? '📄' }}</span>
                <div class="flex-1 min-w-0 pr-20">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ doc.title }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ doc.path ?? doc.id }}</p>
                </div>
              </button>

              <!-- Ações -->
              <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  @click.stop="openRename(doc)"
                  class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                  title="Renomear"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
                <button 
                  @click.stop="openTrash(doc)"
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                  title="Excluir"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
                <div class="w-px h-4 bg-gray-200 mx-1"></div>
                <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </li>
          </ul>
        </div>
      </div>

    </main>

    <!-- Modais Customizados -->
    <CreateDocumentModal
      :is-open="isCreateModalOpen"
      :loading="createLoading"
      :project-path="targetProject"
      @close="isCreateModalOpen = false"
      @confirm="handleCreateConfirm"
    />

    <RenameDocumentModal
      :is-open="isRenameModalOpen"
      :loading="renameLoading"
      :initial-name="selectedDoc?.title"
      @close="isRenameModalOpen = false"
      @confirm="handleRenameConfirm"
    />

    <SimpleConfirmModal
      :is-open="isConfirmOpen"
      title="Documento Criado!"
      :message="`O arquivo '${lastCreatedDoc?.title}' foi criado com sucesso. Deseja abri-lo no editor agora?`"
      confirm-text="Sim, abrir agora"
      cancel-text="Depois"
      @close="isConfirmOpen = false"
      @confirm="openDocument(lastCreatedDoc)"
    />

    <CreateFolderModal
      :is-open="isCreateFolderModalOpen"
      :loading="createFolderLoading"
      @close="isCreateFolderModalOpen = false"
      @confirm="handleCreateFolderConfirm"
    />

    <RenameDocumentModal
      v-if="isRenameFolderModalOpen"
      :is-open="isRenameFolderModalOpen"
      :loading="renameLoading"
      :initial-name="selectedDoc?.title"
      @close="isRenameFolderModalOpen = false"
      @confirm="handleRenameFolderConfirm"
    />

    <SimpleConfirmModal
      :is-open="isTrashFolderConfirmOpen"
      title="Excluir Pasta?"
      :message="`Tem certeza que deseja mover a pasta '${selectedDoc?.title}' e TODO o seu conteúdo para a lixeira?`"
      confirm-text="Sim, excluir tudo"
      cancel-text="Cancelar"
      variant="danger"
      :loading="trashLoading"
      @close="isTrashFolderConfirmOpen = false"
      @confirm="handleTrashFolderConfirm"
    />
  </div>
</template>
