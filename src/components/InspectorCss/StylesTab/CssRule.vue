<template>
  <div class="bg-white relative">

    <!-- Context (At-Rules) -->
    <div v-if="rule.context && rule.context.length" class="flex flex-wrap items-center gap-1 mb-2">
      <div v-for="(ctx, idx) in rule.context" :key="idx"
        class="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 text-[9px]">
        <span class="opacity-60">@{{ ctx.name }}</span>
        <span 
          class="cursor-text hover:underline" 
          contenteditable="true"
          @blur="(e) => inspector.updateAtRule(rule, ctx, e.target.innerText)"
          @keydown.enter.prevent="(e) => e.target.blur()"
        >{{ ctx.prelude }}</span>
      </div>
    </div>

    <!-- Rule Header -->
    <div class="flex items-start justify-between">
      <div class="flex flex-col flex-1">
        <div class="flex items-center gap-1">
          <span :class="[
            'text-[13px] cursor-text hover:underline break-all',
            !editable ? 'opacity-40 !cursor-not-allowed no-underline' : '',
          ]" 
            :contenteditable="rule.selector !== 'element.style' && editable"
            @blur="(e) => inspector.updateSelector(rule, e.target.innerText)"
            @keydown.enter.prevent="(e) => e.target.blur()"
          >{{ rule.selector }}</span>
          <span class="ml-1">{</span>
        </div>
      </div>
      
      <!-- Origin Badge -->
      <div class="flex items-center gap-1 shrink-0 px-2 py-0.5 text-[11px] tracking-tight">
        <span class="font-bold">origin:</span>
        <span>{{ originLabel }}</span>
      </div>
    </div>

    <!-- Property List -->
    <div class="pl-4 relative">
      <CssDeclaration 
        v-for="decl in rule.declarations" 
        :key="decl.id || decl.prop"
        :decl="decl"
        :editable="editable"
        @toggle="(d) => inspector.toggleDeclaration(rule, d)"
        @update="(d, f, v) => inspector.updateProperty(rule, d, f, v)"
        @delete="(d) => inspector.deleteDeclaration(rule, d)"
        @focus-value="(d, e) => inspector.focusValue(rule, d, e)"
      />
    </div>

    <div class="ml-1">}</div>

    <!-- Rule Action Footer -->
    <div v-if="editable" class="flex items-center gap-1.5">
      <template v-if="rule.selector !== 'element.style'">
        <button @click.stop="inspector.wrapInAtRule(rule, 'media')" class="text-[11px] hover:text-blue-600 px-2 py-1 transition-all" title="wrap with @media">@media</button>
        <button @click.stop="inspector.wrapInAtRule(rule, 'container')" class="text-[11px] hover:text-blue-600 px-2 py-1 transition-all" title="wrap with @container">@container</button>
      </template>
      <div class="flex-1"></div>
      <button @click.stop="inspector.addNewProperty(rule)" class="flex items-center gap-1 text-[11px] hover:text-green-700 px-3 py-1 transition-all">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        Prop
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import CssDeclaration from './CssDeclaration.vue'

const props = defineProps({
  rule: { type: Object, required: true },
  editable: { type: Boolean, default: false },
})

const inspector = inject('inspector')

const originLabel = computed(() => {
  if (props.rule.selector === 'element.style') return 'inline'
  const map = { external: 'external', on_page: 'header', inline: 'inline' }
  return map[props.rule.origin] ?? (props.rule.sourceName || 'style')
})
</script>
