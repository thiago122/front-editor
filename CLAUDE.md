# CLAUDE.md

Editor visual de HTML/CSS (Vue 3 + Vite). O usuário edita um documento
dentro de um `<iframe>`; o app mantém duas engines paralelas — uma de
HTML (AST) e uma de CSS (css-tree) — sincronizadas com o DOM do iframe.

## Comandos

```sh
npm run dev          # vite dev server (porta 5174)
npm run build        # type-check (vue-tsc) + build
npm run build-only   # build sem type-check — use p/ validar mudanças JS
npm run build:bridge # build do bridge (vite.bridge.config.ts)
npm run build:all    # build + build:bridge
npm run test:unit    # vitest (specs em __tests__/ co-localizados)
npm run lint         # eslint (flat config; unused-vars = warning)
npm run format       # prettier em src/
npm run gen:inherited # regenera INHERITED_PROPERTIES de mdn-data (NÃO editar à mão)
```

`npm run build` roda type-check (vue-tsc) + vite em paralelo. O shim de
módulos `.vue` vive em `env.d.ts` — não remover, senão `router/index.ts`
quebra o type-check.

## Stack

Vue 3 `<script setup>` · Pinia · vue-router · Vite 7 · Tailwind 4 ·
css-tree · CodeMirror 6 · lodash-es. Alias `@/` → `src/`.

## Arquitetura — duas engines

O estado vive em 3 stores Pinia (`src/stores/`):
- **EditorStore** — engine HTML. AST como `shallowRef` + `markRaw` (sem
  proxy Vue na árvore, perf). Muta via `ManipulationEngine` (primitivas com
  undo por operação inversa). Reatividade manual: `notifyAstMutation()` /
  `astMutationKey`. Dono do iframe, seleção, hover, save/export.
  **Composto por fatias** (`stores/editor/*Slice.js`: panels, documents,
  editorStyles, componentLock, feedback) espalhadas no return —
  `useEditorStore()` é a ÚNICA API pública. Fatia recebe deps por
  parâmetro, NUNCA importa o store. O shape do return é congelado por
  `stores/__tests__/EditorStore.contract.spec.js` — membro novo exige
  atualizar o contrato.
- **StyleStore** — engine CSS. css-tree → Logic Tree → matching p/ o painel.
- **ComponentStore** — componentes reutilizáveis.

### Engine HTML
`Pipeline` (`editor/pipeline/`) com `htmlPlugin` faz
normalize→tokenize→parse→transform→render. Mutações passam por
`ManipulationEngine` (`editor/ManipulationEngine.js`), que escreve no DOM do
iframe via `_syncDom` e registra inverso no `UnifiedHistoryManager`.
Comandos em `editor/commands/`. Hooks via `editor/HookManager.js`
(`document:beforeSave`, `node:afterInsert/Remove/Move/Attribute`, etc).

### Bridge (`src/bridge/`) — ⚠️ PLACEHOLDER
Bundle IIFE vanilla JS (sem Vue/Pinia), buildado por `build:bridge` →
`dist/bridge/bridge.iife.js`. O backend injeta inline no `<head>` do iframe
do CMS (alvo: plugin WordPress), antes dos scripts do CMS. Faz: injetar
`data-node-id`, neutralizar `document.write`, interceptar eventos, expor
`window.__editorBridge`. Hoje é **esqueleto com TODOs** — estrutura definida,
lógica a preencher. Ver `docs/bridge-architecture.md`.

### Engine CSS — ver `src/editor/css/ARCHITECTURE.md`
Camadas: `shared/` (constantes/utils puros) · `ast/` (css-tree) ·
`tree/` (Logic Tree, coração) · `inspector/` (matching p/ painel) ·
`loader/` (carga/injeção no iframe) · `actions/` (alto nível + Vue).

**Regra de ouro:** componentes/actions chamam `CssLogicTreeService` (facade),
nunca os services individuais direto. Tabela "qual arquivo mexer" está no
ARCHITECTURE.md.

O painel de Styles busca correção vs Chrome DevTools (cascata, specificity,
herança), mas **specs são a fonte de verdade**, não o Chrome — ver
`memory/css-inspector-correctness.md`.

## Convenções

- **Perf é requisito explícito do usuário.** Dado de correção (specificity,
  flags de herança) computa UMA vez (build-time ou no build-tree), nunca
  por-render/por-frame. Evitar deps runtime novas; nada de `querySelectorAll('*')`
  por frame. AST fora do sistema de reatividade do Vue de propósito.
- **Idioma:** código, comentários e commits do projeto em PT-BR. Mantenha.
- Dentro de `editor/css/` use imports relativos; fora, use `@/`.
- `data-node-id` no DOM do iframe = ponte entre AST e elemento real.

## Armadilhas

- **`--tag-name`:** o Outline Mode injeta essa custom property inline no
  hover (label de tooltip). É estado de UI, NÃO conteúdo. Limpa em
  `document:beforeSave`; nunca pode vazar pro HTML salvo —
  ver `memory/tag-name-label-leak.md`.
- **`@media`/`@container` inativos** aparecem no inspector de propósito
  (editar breakpoints), ≠ Chrome que esconde. Não marcar como overridden.
