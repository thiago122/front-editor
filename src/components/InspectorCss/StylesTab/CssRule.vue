<template>
  <div class="bg-white relative group/rule overflow-hidden transition-all">

    <!-- Rule Header (Simple title) -->
    <div class="flex items-start justify-between">
      <div class="flex flex-col flex-1">
        
        <!-- Context (At-Rules) -->
        <div v-if="rule.context && rule.context.length" class="flex flex-wrap items-center gap-1 mb-2">
          <div v-for="(ctx, idx) in rule.context" :key="idx"
            class="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 text-[9px] group/ctx">
            <span class="opacity-60">@{{ ctx.name }}</span>
            <span 
              class="cursor-text hover:underline" 
              contenteditable="true"
              @blur="(e) => $emit('update-at-rule', rule, ctx, e.target.innerText)"
              @keydown.enter.prevent="(e) => e.target.blur()"
            >{{ ctx.prelude }}</span>
          </div>
        </div>

        <!-- Selector -->
        <div class="flex items-center gap-1">
          <span :class="[
            'text-orange-800 font-bold text-[12px] cursor-text hover:underline break-all font-mono',
            !editable ? 'opacity-40 !cursor-not-allowed no-underline' : '',
          ]" 
            :contenteditable="rule.selector !== 'element.style' && editable"
            @blur="(e) => $emit('update-selector', rule, e.target.innerText)"
            @keydown.enter.prevent="(e) => e.target.blur()"
          >{{ rule.selector }}</span>
          <span class="text-gray-300 font-normal ml-1">{</span>
        </div>
      </div>
      
      <!-- ID Badge (Origin) -->
      <div class="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight"
        :class="[
          rule.origin === 'external' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
          rule.origin === 'on_page' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
          'bg-blue-50 text-blue-600 border border-blue-100'
        ]">
          <span>{{ originLabel }}</span>
      </div>
    </div>

    <!-- Property List -->
    <div class="pl-4 space-y-1.5 relative mb-2">
      <CssDeclaration 
        v-for="decl in rule.declarations" 
        :key="decl.id || decl.prop"
        :decl="decl"
        :editable="editable"

        @toggle="(d) => $emit('toggle-declaration', rule, d)"
        @update="(d, f, v) => $emit('update-property', rule, d, f, v)"
        @delete="(d) => $emit('delete-declaration', rule, d)"
        @focus-value="(d, e) => $emit('focus-value', rule, d, e)"
      />
    </div>

    <div class="text-gray-300 px-0.5 mb-2 font-normal">}</div>

    <!-- Rule Action Footer -->
    <div v-if="editable" 
      class="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
        <button @click.stop="$emit('add-property', rule)" class="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#166534] bg-[#dcfce7] hover:bg-green-200 px-3 py-1 rounded-lg border border-[#bbf7d0] transition-all">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Prop
        </button>
        <div class="flex-1"></div>
        <template v-if="rule.selector !== 'element.style'">
          <button @click.stop="$emit('wrap-at-rule', rule, 'media')" class="text-[9px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-transparent transition-all">@media</button>
          <button @click.stop="$emit('wrap-at-rule', rule, 'container')" class="text-[9px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-transparent transition-all">@container</button>
        </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CssDeclaration from './CssDeclaration.vue'

const props = defineProps({
  rule: {
    type: Object,
    required: true
  },
  editable: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'update-at-rule', 
  'update-selector', 
  'toggle-declaration', 
  'update-property', 
  'delete-declaration', 
  'focus-value', 
  'add-property', 
  'wrap-at-rule'
])

const originLabel = computed(() => {
  if (props.rule.selector === 'element.style') return 'inline'
  const origin = props.rule.origin || 'internal'
  const map = {
    external: 'external',
    internal: props.rule.sourceName || 'style',
    on_page: 'header',
    inline: 'inline',
  }
  return map[origin] || origin
})
</script>
