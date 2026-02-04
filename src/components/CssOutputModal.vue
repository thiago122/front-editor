<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close'])

const store = useEditorStore()

const internalGroups = computed(() => store.getCssGroupedBySource('internal'))
const onPageGroups = computed(() => store.getCssGroupedBySource('on_page'))

const close = () => {
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-full flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
        <h2 class="text-xl font-bold text-slate-800">CSS Output Preview (Testing)</h2>
        <button @click="close" class="text-slate-400 hover:text-slate-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto grow flex flex-col gap-8">
        <!-- Internal CSS Group -->
        <div v-if="internalGroups.length > 0" class="flex flex-col gap-4">
          <h3 class="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] border-b border-indigo-50 pb-2">Internal CSS (Vite/Local)</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="group in internalGroups" :key="group.name" class="flex flex-col gap-2">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ group.name }}</label>
              <textarea 
                readonly 
                class="min-h-[300px] p-4 font-mono text-xs bg-slate-900 text-slate-300 rounded-xl border border-slate-800 focus:outline-none"
                :value="group.css"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- On Page CSS Group -->
        <div v-if="onPageGroups.length > 0" class="flex flex-col gap-4">
          <h3 class="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] border-b border-emerald-50 pb-2">On Page CSS (Style Tags)</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="group in onPageGroups" :key="group.name" class="flex flex-col gap-2">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ group.name }}</label>
              <textarea 
                readonly 
                class="min-h-[300px] p-4 font-mono text-xs bg-slate-900 text-slate-300 rounded-xl border border-slate-800 focus:outline-none"
                :value="group.css"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end bg-slate-50">
        <button 
          @click="close" 
          class="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
</template>
