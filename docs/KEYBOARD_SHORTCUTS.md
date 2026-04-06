# ⌨️ Atalhos de Teclado — Editor Visual

Referência completa de todos os atalhos de teclado disponíveis no editor.

> **Legenda:** `Ctrl` = `Ctrl` (Windows/Linux) ou `Cmd` (macOS)

---

## 🌐 Global

Atalhos que funcionam em qualquer contexto do editor.

| Atalho | Ação | Arquivo |
|--------|------|---------|
| `Ctrl+S` | Salvar documento (API → File System → Download) | EditorView.vue |
| `Ctrl+Z` | Desfazer (Undo) | UnifiedHistoryManager |
| `Ctrl+Shift+Z` | Refazer (Redo) | UnifiedHistoryManager |
| `Alt+K` | Abrir Quick Selector (Rule Creator) | InspectorPanel.vue |

---

## 🖼️ Canvas / Preview (elemento HTML selecionado)

Atalhos que funcionam quando o foco está no iframe ou no overlay de seleção.

### Inserção de Elementos

| Atalho | Ação | Arquivo |
|--------|------|---------|
| `Ctrl+Space` | Inserir tag como irmão após o elemento | HighlightOverlay.vue |
| `Ctrl+Shift+Space` | Inserir tag como último filho do elemento | HighlightOverlay.vue |

### Interação com Elementos

| Atalho | Ação | Arquivo |
|--------|------|---------|
| Double-click | Editar texto inline (em elementos de texto) | useInlineEdit.js |

---

## 🌳 CSS Explorer

Atalhos que funcionam quando o painel CSS Explorer está com foco e há um nó selecionado na árvore.

### Navegação e Busca

| Atalho | Ação | Contexto |
|--------|------|----------|
| `Ctrl+F` | Abrir barra de busca / filtro | Qualquer |
| `Escape` | Fechar barra de busca | Busca ativa |

### Edição

| Atalho | Ação | Contexto |
|--------|------|----------|
| `F2` | Editar inline (renomear seletor, at-rule, declaração) | Qualquer nó editável |
| `Enter` | Editar inline (mesmo que F2) | Qualquer nó editável |
| `Ctrl+D` | Duplicar nó | selector, at-rule |
| `Del` / `Backspace` | Deletar nó | Qualquer nó |

### Criação Contextual

| Atalho | Ação | Contexto |
|--------|------|----------|
| `Ctrl+Enter` | Nova declaração (property: value) | selector |
| `Ctrl+Enter` | Nova CSS Rule dentro | at-rule |
| `Ctrl+Enter` | Nova CSS Rule dentro | file |
| `Alt+↑` | Adicionar regra ANTES do nó | selector, at-rule |
| `Alt+↓` | Adicionar regra DEPOIS do nó | selector, at-rule |
| `Ctrl+M` | Wrap com `@media (min-width: Xpx)` | selector |

### Clique com Modificadores

| Atalho | Ação | Arquivo |
|--------|------|---------|
| `Click` | Selecionar nó / expandir-colapsar | CssTreeItem.vue |
| `Ctrl+Click` | Editar inline (mesmo que F2) | CssTreeItem.vue |
| `Ctrl+Shift+Click` | Forçar exibição da regra no Inspector | CssTreeItem.vue |

---

## 🎨 CSS Inspector — Declarações

Atalhos que funcionam dentro dos inputs de propriedade e valor no painel de estilos.

### Input de Propriedade (prop)

| Atalho | Ação | Detalhes |
|--------|------|----------|
| `Enter` | Foca o input de valor | Aceita autocomplete se item selecionado |
| `Tab` | Foca o input de valor | Mesmo que Enter |
| `Shift+Tab` | Foca o valor da declaração anterior (ou selector) | Navegação reversa |
| `Escape` | Desfoca / descarta declaração vazia | Fecha autocomplete primeiro |

### Input de Valor (value)

| Atalho | Ação | Detalhes |
|--------|------|----------|
| `Enter` | Foca a prop da próxima declaração | Cria nova declaração se for a última |
| `Tab` | Foca a prop da próxima declaração | Mesmo que Enter |
| `Shift+Tab` | Volta para o input de prop da mesma declaração | Navegação reversa |
| `Escape` | Desfoca / descarta declaração vazia | Fecha autocomplete primeiro |

### Selector da Rule

| Atalho | Ação | Detalhes |
|--------|------|----------|
| `Enter` | Confirma edição e foca a 1ª prop | Cria declaração se rule vazia |
| `Tab` | Confirma edição e foca a 1ª prop | Mesmo que Enter |

### Autocomplete (prop e value)

| Atalho | Ação |
|--------|------|
| `↑` / `↓` | Navegar entre sugestões |
| `Enter` | Aceitar sugestão selecionada |
| `Escape` | Fechar dropdown de autocomplete |

---

## ✏️ Edição de Texto Inline (contenteditable)

Atalhos que funcionam durante a edição de texto inline no canvas (ativado por double-click ou botão "T").

| Atalho | Ação | Arquivo |
|--------|------|---------|
| `Ctrl+B` | Bold — toggle `<strong>` | useInlineEdit.js |
| `Ctrl+I` | Italic — toggle `<em>` | useInlineEdit.js |
| `Enter` | Inserir `<br>` (quebra de linha) | useInlineEdit.js |
| `Escape` | Cancelar edição (restaurar texto original) | useInlineEdit.js |

---

## 🖱️ Menu de Contexto (botão direito) — CSS Explorer

Opções disponíveis ao clicar com o botão direito em cada tipo de nó:

### Root / Área vazia

| Opção |
|-------|
| New File |

### File (editável)

| Opção | Atalho |
|-------|--------|
| New CSS Rule | `Ctrl+Enter` |
| New At-Rule | — |
| Move Up | — |
| Move Down | — |
| Rename | `F2` |
| Import CSS | — |
| Export .css | — |
| Remover arquivo | `Del` |

### At-Rule (`@media`, `@keyframes`, etc.)

| Opção | Atalho |
|-------|--------|
| New CSS Rule inside | `Ctrl+Enter` |
| New At-Rule inside | — |
| Add Rule Before | `Alt+↑` |
| Add Rule After | `Alt+↓` |
| Duplicate | `Ctrl+D` |
| Delete | `Del` |

### Selector (`.btn`, `#header`, etc.)

| Opção | Atalho |
|-------|--------|
| New Declaration | `Ctrl+Enter` |
| Add Rule Before | `Alt+↑` |
| Add Rule After | `Alt+↓` |
| Wrap @media (Xpx) | `Ctrl+M` |
| Duplicate Rule | `Ctrl+D` |
| Delete | `Del` |

### Declaration (`color: red`, etc.)

| Opção | Atalho |
|-------|--------|
| Delete | `Del` |

### Nó Externo (qualquer tipo)

| Opção |
|-------|
| 🔒 External — read only |

---

## 📂 Arquivos Relevantes

| Área | Arquivo |
|------|---------|
| Atalhos globais | `src/views/EditorView.vue` |
| Canvas / Overlay | `src/components/HighlightOverlay.vue` |
| CSS Explorer | `src/components/CssExplorer.vue` |
| CSS Tree Item | `src/components/CssTreeItem.vue` |
| CSS Inspector Panel | `src/components/InspectorCss/InspectorPanel.vue` |
| CSS Declaração | `src/components/InspectorCss/StylesTab/CssDeclaration.vue` |
| CSS Rule | `src/components/InspectorCss/StylesTab/CssRule.vue` |
| Edição inline | `src/composables/useInlineEdit.js` |
| Menu de contexto | `src/components/CssContextMenu.vue` |
| Quick Selector | `src/components/InspectorCss/RuleCreator.vue` |

---

*Última atualização: Abril 2026*
