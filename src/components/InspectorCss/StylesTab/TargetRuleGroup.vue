<template>
  <div class="px-[4x] border-b border-gray-300">

    <!-- Main rules (no pseudo-element) -->
    <div v-for="(rule, i) in mainRules" :key="rule.uid || i">
      <CssRule
        class="border-b border-[#b1b1b1]"
        :rule="rule"
        :editable="isEditable(rule)"
      />
    </div>

    <!-- Pseudo-element sub-sections (e.g. ::before / ::after in a state tab) -->
    <template v-for="(sectionRules, pseudoEl) in pseudoSubSections" :key="pseudoEl">
      <div v-if="sectionRules.length" class="pseudo-sub-section">
        <div class="pseudo-sub-section__label">{{ pseudoEl }}</div>
        <div v-for="(rule, i) in sectionRules" :key="rule.uid || i">
          <CssRule
            class="border-b border-[#b1b1b1]"
            :rule="rule"
            :editable="isEditable(rule)"
          />
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import CssRule from './CssRule.vue'

const props = defineProps({
  group: { type: Object, required: true },
})

/** Rules in the main section (no pseudo-element context) */
const mainRules = computed(() =>
  props.group.rules.filter(r => !r.pseudoSubSection)
)

/** Rules grouped by pseudo-element for sub-section rendering */
const pseudoSubSections = computed(() => {
  const sections = {}
  for (const rule of props.group.rules) {
    if (rule.pseudoSubSection) {
      if (!sections[rule.pseudoSubSection]) sections[rule.pseudoSubSection] = []
      sections[rule.pseudoSubSection].push(rule)
    }
  }
  return sections
})

function isEditable(rule) {
  if (!rule) return false
  if (rule.selector === 'element.style') return true
  return rule.origin !== 'external'
}
</script>

<style scoped>
.pseudo-sub-section {
  margin-top: 8px;
  border-top: 1px dashed #d1d5db;
  padding-top: 6px;
}

.pseudo-sub-section__label {
  font-size: 10px;
  font-family: monospace;
  color: #9c27b0;
  font-weight: 600;
  margin-bottom: 4px;
  padding: 1px 4px;
  background: #f3e5f5;
  border-radius: 3px;
  display: inline-block;
}
</style>
