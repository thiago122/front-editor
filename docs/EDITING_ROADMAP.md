# Roadmap de Edição — diagnóstico de lacunas

> Levantamento feito em 2026-06-12 sobre o que falta na **experiência de edição**.
> O núcleo de mutação está sólido; as lacunas estão na camada de interação
> e nas pontas de integração. Este doc é o ponto de retomada do trabalho.

## O que já funciona (não refazer)

| Área | Onde | Estado |
| --- | --- | --- |
| Primitivas de mutação + undo por operação inversa | `src/editor/ManipulationEngine.js` | OK |
| Histórico unificado HTML+CSS com transações | `src/editor/history/UnifiedHistoryManager.js` | OK (máx. 120 entradas; transações não aninham) |
| Comandos de nó (delete, move, copy, paste, duplicate, append) | `src/editor/commands/node/` | OK — mas pouco "ligados" à UI/teclado |
| Edição de texto inline (double-click, contenteditable, toolbar wrap/unwrap) | `src/composables/useInlineEdit.js` | OK |
| Drag-and-drop **no Explorer** (reorder + cross-container) | `src/composables/useExplorerDragDrop.js` | OK |
| Seleção/hover/inspect mode no canvas | `src/composables/useIframeEvents.js` | OK |
| Botões de undo/redo e clipboard | `HistoryControls.vue`, `ClipboardControls.vue` | OK (só UI, sem atalho) |
| Painel de Styles: editores visuais (spacing, sizing, typography, border, shadow, layout, overflow), autocomplete, pseudo-states | `src/components/InspectorCss/StylesTab/` | OK |
| Atalhos do CssExplorer (Ctrl+F, Ctrl+D, F2, Ctrl+M) | `src/components/CssExplorer.vue` | OK |

## Lacunas, por ordem de impacto

### 1. Atalhos de edição HTML — *barato, fios já existem*

`src/composables/useEditorShortcuts.js` só registra Ctrl+S, Alt+E/L/C e
Ctrl+Shift+C. Com nó selecionado, **nada** de:

- [ ] **Ctrl+Z / Ctrl+Y (ou Ctrl+Shift+Z)** → `EditorStore.undo()/redo()` já existem (`src/stores/EditorStore.js:275`)
- [ ] **Delete/Backspace** → `DeleteCommand`
- [ ] **Ctrl+C / Ctrl+V / Ctrl+X** → `CopyCommand`/`PasteCommand` (ver item 3, clipboard)
- [ ] **Ctrl+D** (duplicar) → `DuplicateCommand`
- [ ] **Setas** (mover entre irmãos / selecionar pai-filho) → `MoveCommand` / navegação
- Cuidado: não capturar quando o foco está em input/contenteditable/CodeMirror
  (o inline edit já usa Ctrl+B/I em `useInlineEdit.js`).
- Atualizar `docs/KEYBOARD_SHORTCUTS.md` e `ShortcutsModal.vue` ao fechar.

### 2. Edição direta no canvas — *o maior buraco conceitual*

Hoje o canvas é mais "seletor" do que "editor"; manipulação estrutural só pelos painéis.

- [ ] **Drag-and-drop dentro do iframe** (mover elemento na página, com drop
      zones visuais). Reaproveitar a lógica de validação/zonas de
      `useExplorerDragDrop.js`; a execução já existe (`moveNodeToParent`).
- [ ] **Resize handles no elemento selecionado** (arrastar para mudar
      width/height/padding → escreve via engine CSS). Hoje
      `usePreviewResize`/`useColumnResize` só redimensionam o layout do app.
- [ ] **Menu de contexto (right-click)** no canvas: duplicar, deletar,
      envolver em div, copiar, criar componente. O CSS já tem o seu
      (`CssContextMenu.vue`) — usar como referência de padrão.
- [ ] **Inserção contextual**: clicar entre dois elementos e inserir; hoje só
      via `InsertTagMenu.vue` / `insertAfter()`.

### 3. Clipboard nativo

`EditorStore.clipboard` é um objeto em memória: não sobrevive a reload, não
cola entre abas/documentos.

- [ ] Migrar para `navigator.clipboard` com payload serializado
      (ex.: `text/html` + metadata própria), mantendo o fallback em memória.

### 4. Multi-seleção — *decidir cedo, fica caro depois*

`selectedNodeId` é `ref` escalar (`src/stores/EditorStore.js:36`). Sem
Ctrl/Shift+click, sem operação em lote (deletar N nós, mover grupo, aplicar
classe em vários).

- [ ] Decisão de arquitetura: `selectedNodeIds: Set` com `selectedNodeId`
      derivado (último selecionado), para não quebrar os consumidores atuais.
- [ ] Comandos em lote = transação no `UnifiedHistoryManager` (já suporta).
- ⚠️ Mexer no shape do `EditorStore` exige atualizar
  `stores/__tests__/EditorStore.contract.spec.js`.

### 5. Pontas de integração (esqueleto)

- [ ] **Bridge** (`src/bridge/`) — placeholder com TODOs em
      `eventInterceptor.js`, `mutationManager.js`, `nodeIdManager.js`,
      `domCleaner.js`, `bridgeInterface.js`. Pré-requisito do caso WordPress/CMS.
      Ver `docs/bridge-architecture.md`.
- [ ] **Persistência backend** — stubs para API PHP/WordPress em
      `src/editor/documents/HtmlExportService.js` e
      `src/editor/css/export/CssExportService.js`.
- [ ] **Gerenciador de assets/mídia** — inexistente; trocar `src` de `<img>`
      é edição manual de atributo.

### 6. Incompletudes menores

- [ ] **`CodeEditor.vue` reparseia o documento inteiro** a cada edição — TODO
      de "reconciliação parcial (DOM diffing)" no próprio arquivo. Perf é
      requisito explícito do projeto; vai doer em documento grande.
- [ ] **Componentes**: ciclo master/instance com slots/lock existe
      (`componentLockSlice.js`), mas falta biblioteca persistida e propagação
      de edição do master para instâncias já inseridas.
- [ ] **Editores visuais CSS faltantes**: transform, animation/@keyframes,
      gradient, filter — hoje caem na edição textual da declaração.
- [ ] **SVG é caixa-preta**: selecionável, sem edição interna.

## Decisões de responsividade (DECIDIDAS em 2026-06-12 — exceto eixo 6)

Contexto: nos editores consagrados (Webflow, Framer, Elementor…) o ícone de
breakpoint define o *write target* das edições, com um breakpoint base e
cascata direcional (desktop-first + `max-width` descendo, na maioria). Eles
podem fazer isso porque são donos do CSS. Nós editamos CSS preexistente de
terceiros, então precisamos de detecção + política de inserção.

**Comportamento atual (status quo):**
- Botões de breakpoint só setam a largura do preview — não participam da escrita.
- Botão @media do inspector gera `(max-width: <largura atual do preview>px)`,
  sempre `max-width`, fallback 768 — `src/editor/css/actions/cssAtRuleActions.js:40`.
- Regra nova sempre no fim do arquivo selecionado — `createRule()` em
  `src/editor/css/actions/cssRuleActions.js:27` (já aceita `parentId`/`insertIndex`,
  a UI é que passa o default `-1`; a infra de inserção posicionada existe).
- Coerente para o usuário final (WYSIWYG, edição sempre vence), mas o CSS
  gerado fica ruim para dev: breakpoints mágicos, direção misturada em tema
  mobile-first, zero organização. A decisão central é: *para quem o arquivo
  gerado precisa ser bom*.

**Eixos de decisão:**

1. **Papel dos botões de breakpoint** — ✅ DECIDIDO: viewport + **write
   target**. O botão ativo define a condição @media de destino das edições
   (não mais a largura crua do preview). Pré-requisito dos eixos 2 e 3.
2. **Direção/condição da @media gerada** — ✅ DECIDIDO: **auto** (detecta a
   estratégia dominante do stylesheet no build da Logic Tree; fallback local =
   segue regras vizinhas), **com override manual do usuário** para forçar
   mobile-first (`min-width`) ou desktop-first (`max-width`).
   Config: `auto | mobile-first | desktop-first`, default `auto`. Documento
   novo/vazio sem dados p/ detectar → default do editor = mobile-first.
3. **Posição de inserção de regra nova** — ✅ DECIDIDO: **auto** (detecta o
   estilo de organização do arquivo; fallback = adjacente à regra base), **com
   override manual**: `auto | blocão por breakpoint | adjacente à regra base |
   fim do arquivo`, default `auto`. Regra de ouro: inserir sempre DEPOIS da
   regra que precisa ser sobrescrita, e nunca reorganizar regras existentes
   (menor diff possível).
4. **Origem dos ícones de breakpoint** — ✅ DECIDIDO: **detectados das @media
   do próprio CSS** (com tolerância a quase-duplicatas, ex. 767/768) **+
   configuráveis por projeto** (usuário pode adicionar/editar/remover os
   seus). Projeto novo recebe um conjunto padrão do editor (o set atual
   Tailwind-style — `IconBreakpoint*.vue` — serve de seed).
5. **Condições não-width** (`orientation`, `prefers-color-scheme`,
   `@container`, `print`) — ✅ DECIDIDO: ficam FORA do ciclo de write-target —
   edit-in-place apenas, nunca geradas automaticamente. O detector do eixo 2
   ignora essas condições.
6. **Botão "envolver com @media" do inspector** (`wrapInAtRule`,
   `cssAtRuleActions.js:20`) — ✅ DECIDIDO: vira **menu com duas ações**,
   ambas usando a condição do breakpoint ativo + estratégia do eixo 2
   (editável depois via `updateAtRuleCondition`):
   - **"Restringir a este breakpoint"** (wrap — comportamento atual): MOVE a
     regra p/ dentro da @media; ela deixa de valer nos outros tamanhos.
     Operação de *escopo* (ex.: `.menu-hamburguer` que só existe no mobile).
   - **"Duplicar para este breakpoint"** (override explícito): cria regra
     nova/vazia na @media com o mesmo seletor, base intacta. Operação de
     *cascata* — mesma coisa que o write-target implícito faz ao editar uma
     propriedade, só que sem precisar editar nada ainda.
   - Com o **breakpoint base ativo**: o botão abre **input de condição
     manual** — que é também a porta de entrada das condições não-width do
     eixo 5 (`print`, `orientation`, `@container`).

**Onde a config vive** — ✅ DECIDIDO: **por projeto**, com defaults do editor
para projeto novo, **persistida no backend**.

**Definição de "componente" no CSS** (necessária p/ o eixo 3 — e o termo
conflita com "componente HTML" do ComponentStore/`data-component`, que é outro
conceito): a inserção "adjacente" NÃO depende de um conceito global de
componente. A âncora é a **regra base** que está sendo sobrescrita; o
"cluster" dela = regras consecutivas cujo seletor compartilha a mesma raiz
(primeiro token de classe — `.card`, `.card__title`, `.card:hover`,
`.card .icon`) + blocos @media já anexados a esse cluster. A regra nova entra
após o cluster, respeitando a ordem direcional entre @media existentes
(min-width ascendente / max-width descendente) para manter a invariante da
cascata. Futuro: componente HTML pode declarar sua(s) raiz(es) CSS para
reforçar a heurística — mas o algoritmo não pode depender disso.

Decisão correlata ainda aberta (registrar quando surgir): sintaxe gerada
(px vs em, `min-width:` vs range syntax — auto-detectável); alvo de
arquivo/origem quando não há regra base (inline-only, CSS de plugin "travado"
→ redirecionar p/ stylesheet do editor).

UI necessária quando implementar: indicador de origem por propriedade no
painel (valor definido neste breakpoint vs herdado de outro — o motor de
cascata do inspector já calcula isso) e "remover override" (volta a herdar)
como ação distinta de zerar o valor.

### Status de implementação (2026-06-12) — motor pronto, UI pendente

**Implementado (engine + estado + actions, com testes):**
- `css/shared/breakpointStrategy.js` — detecção de direção/organização/
  breakpoints (1 passada, no rebuild), parse de condição width, família de
  seletor, geração de condição por estratégia. Specs co-localizados.
- `css/tree/CssWriteTargetService.js` — resolução do write-target:
  `{ kind: 'base' | 'existing-rule' | 'existing-atrule' | 'create-atrule' }`
  com insertIndex calculado por estilo de inserção (adjacente com cluster e
  ordem direcional / blocão ordenado / fim). Specs co-localizados.
- Facade: `CssLogicTreeService.detectResponsiveProfile()` e
  `.resolveWriteTarget()`.
- StyleStore: `responsiveProfile` (detectado no rebuildLogicTree),
  `responsiveConfig` (+`setResponsiveConfig`), computeds `resolvedDirection`,
  `resolvedInsertion`, `projectBreakpoints` (override > detectado > seed).
- Actions: `cssBreakpointActions.js` — `resolveWriteTarget(rule)`,
  `duplicateRuleToBreakpoint(rule)` ("Duplicar para este breakpoint"),
  `getActiveBreakpointWidth()`. `createAtRule` (wrap) agora gera condição
  pela estratégia (min/max conforme direção) e aceita condição manual.

**Pendente (UI/integração):**
- [x] Menu de duas ações no botão @media do `CssRule.vue` (Restringir /
      Duplicar) + input de condição manual com o base ativo (eixo 6) ✔ 2026-06-12
- [~] Write-target IMPLÍCITO — introduzido em 2026-06-12, **removido** no
      `9f7d98b` (16/jun) por ser opaco no inspetor de Dev (toggle escondido +
      badge âmbar). **Reintroduzido escopado ao Designer mode** (ver abaixo):
      `updateDeclaration` (valor) e `addDeclaration` (prop+val dos editores
      visuais) roteiam via `routeValueEditToBreakpoint` quando o editor está em
      **Designer mode**, regra não-inline, sem contexto @media/@container,
      inspector em modo elemento, breakpoint ≠ base. Renomes de prop, toggle e
      delete NÃO roteiam. Dev mode NÃO roteia (edição explícita na regra visível).

### Designer mode (2026-06-18) — UX element-first p/ leigo

Modo paralelo ao Dev (toggle na toolbar — `EditorStore.setEditorMode`).
Esconde o inspetor CSS, mostra só o editor visual docado. Config automática:
desktop-first + blocão por breakpoint (forçada em `modeSlice`, restaurada ao
sair).

**Chooser de seletores (estilo Webflow)** — `DesignerSelectorBar.vue` +
`cssDesignerActions.js`. O header do painel mostra chips com os seletores do
elemento (classes + id); o usuário escolhe qual editar. Pode renomear qualquer
classe editável (2 cliques no chip) e adicionar classe nova (`+`).

**Destino da edição:**
- Seletor com regra em arquivo EDITÁVEL (on_page/internal) → edita ela.
- Seletor sem regra, ou só em CSS EXTERNO (CDN/terceiro, **read-only**) → cria
  regra de mesmo seletor no stylesheet do editor (override). Externo nunca é tocado.
- Elemento SEM classe nenhuma → cria classe base `el-*` (fallback) e mira ela.
- Alvo padrão ao selecionar = última classe do elemento.

Com breakpoint ativo, a edição duplica a regra alvo (sem props) no @media e grava
lá (write-target implícito acima); base intacta.
- [x] Toolbar dinâmica ✔ 2026-06-12 — `BreakpointControl.vue` renderiza de
      `projectBreakpoints` (ícone por faixa de largura, marcador no
      breakpoint base da estratégia). UI p/ adicionar/editar breakpoints
      fica junto com a UI de config (item abaixo).
- [x] UI de config ✔ 2026-06-12 — `ResponsiveConfigPanel.vue` (popover na
      engrenagem do `BreakpointControl`): direção/inserção com radio
      auto+override mostrando o detectado, breakpoints com chips
      add/remove e "usar detectados". Persistência no backend SEGUE
      PENDENTE (TODO no componente e no StyleStore — config vale por sessão).
- [x] Indicadores azul/âmbar + "voltar a herdar" ✔ 2026-06-12 — badge por
      REGRA no painel (azul = definida no @media do breakpoint ativo;
      âmbar = "→ (condição)", edição de valor roteia p/ lá). Limpar valor
      nos editores visuais com breakpoint não-base usa
      `clearPropertyAtBreakpoint` (remove do override; base intacta) —
      resolve o edge case do `set(null)`. Indicador POR PROPRIEDADE nos
      editores visuais (estilo Webflow) fica como refinamento futuro.

## Ordem sugerida de ataque

1. **Atalhos (item 1)** — maior retorno por esforço; só ligar comandos ao teclado.
2. **Canvas (item 2)** — começa por drag-and-drop no iframe, depois handles e context menu.
3. **Multi-seleção (item 4)** — fechar a decisão de modelo antes de crescer mais a UI.
4. **Clipboard nativo (item 3)** — pode pegar carona no trabalho dos atalhos.
5. **Bridge/persistência (item 5)** — quando a integração WordPress virar prioridade de fato.
