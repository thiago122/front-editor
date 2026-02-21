<template>
  <div class="border-b border-gray-300">
    <div @click="showAttributtes = !showAttributtes" class="flex justify-beteen items-center p-2">
      <span class="text-red-500 text-[12px]">atributes:</span> 
      <div class="grow flex items-center">
        <span class="relative block px-2 ml-2 border border-gray-300" v-if="cssBasicAttributes.classes.length > 0">
          class 
          <span class="absolute top-[-7px] right-[-7px] bg-blue-200 block w-3 h-3 flex justify-center items-center">{{ cssBasicAttributes.classes.length }}</span> 
        </span>
        <span class="relative block px-2 ml-2 border border-gray-300" v-if="cssBasicAttributes.id.length > 0">
          ID 
          <span class="absolute top-[-7px] right-[-7px] bg-blue-200 block w-3 h-3 flex justify-center items-center">{{ cssBasicAttributes.id.length }}</span> 
        </span>      
      </div>
      <span class="text-blue-500 text-[12px] cursor-pointer"> 
        <span v-if="!showAttributtes">more..</span><span v-else>less..</span>
      </span> 
    </div> 

    <div class="p-2" v-if="showAttributtes">
      <div v-if="cssBasicAttributes.classes.length" class="mb-3">
        <span class="text-blue-500 text-[13px] underline">class</span> 
        <div v-for="attr in cssBasicAttributes.classes" :key="attr.label" class="flex justify-between">
          {{ attr.label }}
          <div class="grow flex justify-end gap-2">
            <span class="bg-green-100 inline-block px-1 border border-green-300" v-if="attr.isUsed">used</span>
            <span class="bg-green-100 inline-block px-1 border border-green-300" v-if="activeRuleId === attr.uid">active</span>
            <button @click.stop="removeAttr(attr)" class="text-red-500 cursor-pointer" title="Remove from element">
              remove
            </button>            
          </div>
        </div>
      </div>

      <div v-if="cssBasicAttributes.id.length" class="mb-3">
        <span class="text-blue-500 text-[12px]">ID:</span> 
        <div v-for="attr in cssBasicAttributes.id" :key="attr.label" class="flex justify-between">
          {{ attr.label }}
          <div class="grow flex justify-end gap-2">
            <span class="bg-green-100 inline-block px-1 border border-green-300" v-if="attr.isExactMatch">isExactMatch</span>
            <span class="bg-green-100 inline-block px-1 border border-green-300" v-if="attr.isUsed">used</span>
            <span class="bg-green-100 inline-block px-1 border border-green-300" v-if="activeRuleId === attr.uid">active</span>
            <button @click.stop="removeAttr(attr)" class="text-red-500 cursor-pointer" title="Remove from element">
              remove
            </button>            
          </div>
        </div>
      </div>
    </div>       
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/EditorStore'

const props = defineProps({
  attributes: { type: Array, default: () => [] },
  activeRuleId: { type: String, default: null },
})

const store = useEditorStore()
const showAttributtes = ref(false)

const cssBasicAttributes = computed(() => ({
  classes: props.attributes.filter(r => r.type === 'class'),
  id: props.attributes.filter(r => r.type === 'id'),
}))

/**
 * Removes a class or id from the selected element's attributes.
 * MutationObserver in InspectorPanel will fire updateRules automatically.
 */
function removeAttr(attr) {
  if (!store.selectedNodeId || !store.manipulation || !store.selectedElement) return

  if (attr.type === 'class') {
    const newClasses = store.selectedElement.className
      .split(' ')
      .filter(c => c.trim() && c !== attr.value)
      .join(' ')
    store.manipulation.setAttribute(store.selectedNodeId, 'class', newClasses)
  } else if (attr.type === 'id') {
    store.manipulation.setAttribute(store.selectedNodeId, 'id', '')
  }
}
</script>

<style scoped>
.attr__btn {
  font-size: 11px; display: inline-flex; flex-wrap: wrap; align-items: center;
  gap: 10px; padding: 2px 5px; border: 1px solid #ccc; position: relative; white-space: nowrap;
}
.is-exact-match { border: 1px solid rgb(57, 57, 228) }
.is-used { border: 1px solid rgb(225, 240, 90) }
.is-active { background-color: rgb(57, 57, 228); color: #fff; }
</style>
