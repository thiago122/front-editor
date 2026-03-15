# CSS Explorer — Task List

Melhorias planejadas para o **CSS Explorer** (`CssExplorer.vue`, `CssTreeItem.vue`).

---

## 1. Busca / Filtro
> Inspirado em: VS Code (Ctrl+F no Explorer), WebStorm

- [x] Adicionar barra de busca no topo do Explorer (ícone 🔍, ativa com Ctrl+F)
- [x] Filtrar a `visibleNodes` pelo texto digitado (label do nó contém o termo)
- [x] Highlight do texto correspondente dentro dos labels dos nós filtrados
- [x] Manter pais/ancest expandidos quando um filho match (não colapsar o contexto)
- [x] Limpar filtro com Escape ou botão ×
- [x] Mostrar contagem de resultados (ex: `3 of 47 nodes`)

**Arquivos envolvidos:** `CssExplorer.vue`

---

## 2. Badge de Origem Visual — Lock para arquivos externos
> Inspirado em: Figma Layers panel (locked layers), VS Code (read-only files)

- [x] Exibir ícone 🔒 (vermelho) nos nós `file` e `root` do tipo `external`
- [x] Reduzir a opacidade dos nós filhos de arquivos externos (cores mais claras)
- [x] Tooltip no 🔒: `"External file — read only"`
- [x] Ocultar opções de edição no menu de contexto para nós externos (mostra "External — read only" disabled)
- [x] Bloquear edição inline (`isEditable` respeita origem)

**Arquivos envolvidos:** `CssTreeItem.vue`, `CssExplorer.vue`, `CssContextMenu.vue`

---

## 3. Indicador de Regras Inativas / Fora do Viewport
> Inspirado em: Chrome DevTools (regras em `@media` inativas ficam com opacidade reduzida)

- [x] Passar props `isActive` e `inactiveReason` para `CssTreeItem`
- [x] Avaliar `@media` com `evaluateMediaQuery()` contra `editorStore.viewport` em `displayedNodes`
- [x] Nós `at-rule` com condição inativa recebem texto acinzentado + badge âmbar `inactive`
- [x] Tooltip: ex. `"@media (min-width: 1024px) — inactive (viewport 768px < 1024px)"`
- [x] Suporta: min/max-width, min/max-height, em/rem, condições compostas com `and`, `print`, `screen`

**Arquivos envolvidos:** `CssExplorer.vue`, `CssTreeItem.vue`

---

## 4. Expandir / Colapsar Tudo
> Inspirado em: VS Code (botões Expand All / Collapse All no topo do Explorer)

- [x] Botão único toggle no header (mostra expand ou collapse conforme estado)
- [x] `isFullyExpanded` computed detecta se todos os nós com filhos estão abertos
- [x] `Expand All`: adiciona todos os IDs não-root ao `toggledNodes`
- [x] `Collapse All`: esvazia o `toggledNodes`
- [x] Tooltip dinâmico: "Expand All" / "Collapse All"

**Arquivos envolvidos:** `CssExplorer.vue`

---

## 5. Duplicar Nó
> Cancelado pelo usuário

- [~] Cancelado — funcionalidade removida

---

## 6. Atalhos de Teclado na Árvore
> Inspirado em: VS Code, WebStorm (navegação full-keyboard no tree)

- [ ] Capturar eventos `keydown` no container da árvore quando ele estiver em foco
- [ ] `↑` / `↓` — mover o nó selecionado para cima/baixo na flat list
- [ ] `→` — expandir nó se tiver filhos; caso contrário selecionar
- [ ] `←` — colapsar nó se expandido; caso contrário, selecionar o pai
- [ ] `Delete` / `Backspace` — deletar o nó selecionado (com confirmação ou undo futuramente)
- [ ] `F2` — abrir edição inline no nó selecionado (alternativa ao Ctrl+Click)
- [ ] `Enter` — confirmar seleção / abrir no inspector
- [ ] `Ctrl+F` — focar a barra de busca (ver item 1) ✅ já implementado
- [ ] `Escape` — limpar busca ou desfocar árvore ✅ já implementado

**Arquivos envolvidos:** `CssExplorer.vue`, `CssTreeItem.vue`

---

## 7. Copiar Seletor / CSS
> Cancelado pelo usuário

- [~] Cancelado — funcionalidade removida

---

## Ordem de implementação sugerida

| # | Tarefa | Impacto | Esforço | Status |
|---|--------|---------|---------|--------|
| 1 | **Busca / Filtro** | Alto | Médio | ✅ |
| 2 | **Badge de origem (🔒)** | Médio | Baixo ⚡ | ✅ |
| 3 | **Indicador de regras inativas** | Médio | Alto | ✅ |
| 4 | **Expandir/Colapsar tudo** | Médio | Baixo ⚡ | ✅ |
| 5 | **Duplicar nó** | Médio | Baixo ⚡ | ❌ cancelado |
| 6 | **Atalhos de teclado** | Alto | Médio | ⬜ pendente |
| 7 | **Copiar seletor / CSS** | Alto | Baixo ⚡ | ❌ cancelado |
