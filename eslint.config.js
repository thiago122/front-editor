import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import globals from 'globals'

export default [
  {
    files: ['**/*.{js,mjs,vue}'],
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '__testes/**'],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  // Formatação fica por conta do Prettier — ESLint cuida só de lógica
  skipFormatting,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Projeto usa componentes de uma palavra (Preview, Append, Delete…)
      'vue/multi-word-component-names': 'off',
      // Composables são passados como objeto-prop e seus refs internos mutados
      // (ex: ac.activeIdx.value) — só mutação direta da prop é erro real
      'vue/no-mutating-props': ['error', { shallowOnly: true }],
      // catch {} silencioso é usado de propósito (ex: Element.matches com seletor inválido)
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Args/catch não usados são comuns em handlers — prefixo _ libera
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  {
    files: ['scripts/**', '*.config.{js,ts,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
