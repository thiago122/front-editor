<script setup>
import { ref } from 'vue'
import TypographyEditor from './visual/TypographyEditor.vue'
import LayoutEditor from './visual/LayoutEditor.vue'
import AdvancedLayoutEditor from './visual/AdvancedLayoutEditor.vue'
import AppearanceEditor from './visual/AppearanceEditor.vue'
import SizingEditor from './visual/SizingEditor.vue'
import SpacingEditor from './visual/SpacingEditor.vue'
import PositioningEditor from './visual/PositioningEditor.vue'
import VisualSection from '@/components/ui/VisualSection.vue'

defineProps({
  // Getter da rule ativa (reativo) — repassado aos editores via :rule-getter.
  ruleGetter:    { type: Function, required: true },
  activeRuleUid: { type: [String, Number, null], default: null },
  parentDisplay: { type: String, default: 'block' },
  minimalist:    { type: Boolean, default: true },
})

// ── Sub-section Visibility ───────────────────────────────────────────────────
const showDisplay     = ref(true)
const showSizing      = ref(true)
const showSpacing     = ref(true)
const showPositioning = ref(true)
const showAdvanced    = ref(true)
const showTypography  = ref(true)
const showAppearance  = ref(true)

const hasValueDisplay     = ref(false)
const hasValueSizing      = ref(false)
const hasValueSpacing     = ref(false)
const hasValuePositioning = ref(false)
const hasValueAdvanced    = ref(false)
const hasValueTypography  = ref(false)
const hasValueAppearance  = ref(false)
</script>

<template>
  <div class="flex flex-col">
    <VisualSection title="Layout" v-model:show="showDisplay" :hasAnyValue="hasValueDisplay">
      <LayoutEditor
        @has-value="v => hasValueDisplay = v"
        :key="activeRuleUid + '_layout'"
        :rule-getter="ruleGetter"
        :parent-display="parentDisplay"
      />
    </VisualSection>

    <VisualSection title="Sizing" v-model:show="showSizing" :hasAnyValue="hasValueSizing">
      <SizingEditor
        @has-value="v => hasValueSizing = v"
        :key="activeRuleUid + '_sizing'"
        :rule-getter="ruleGetter"
      />
    </VisualSection>

    <VisualSection title="Spacing" v-model:show="showSpacing" :hasAnyValue="hasValueSpacing">
      <SpacingEditor
        @has-value="v => hasValueSpacing = v"
        :key="activeRuleUid + '_spacing'"
        :rule-getter="ruleGetter"
      />
    </VisualSection>

    <VisualSection title="Positioning" v-model:show="showPositioning" :hasAnyValue="hasValuePositioning">
      <PositioningEditor
        @has-value="v => hasValuePositioning = v"
        :key="activeRuleUid + '_pos'"
        :rule-getter="ruleGetter"
      />
    </VisualSection>

    <VisualSection title="Advanced" v-model:show="showAdvanced" :hasAnyValue="hasValueAdvanced">
      <AdvancedLayoutEditor
        @has-value="v => hasValueAdvanced = v"
        :key="activeRuleUid + '_advanced'"
        :rule-getter="ruleGetter"
      />
    </VisualSection>

    <VisualSection title="Typography" v-model:show="showTypography" :hasAnyValue="hasValueTypography">
      <TypographyEditor
        @has-value="v => hasValueTypography = v"
        :key="activeRuleUid + '_typography'"
        :rule-getter="ruleGetter"
      />
    </VisualSection>

    <VisualSection title="Appearance" v-model:show="showAppearance" :hasAnyValue="hasValueAppearance">
      <AppearanceEditor
        @has-value="v => hasValueAppearance = v"
        :key="activeRuleUid + '_appearance'"
        :rule-getter="ruleGetter"
      />
    </VisualSection>
  </div>
</template>
