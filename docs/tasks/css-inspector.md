# CSS Inspector — Tarefas de Implementação

## 🔴 Alta prioridade (impacto direto no uso diário)

- [x] Adicionar nova rule inteira — exibe no inspector automaticamente, origin e sourceOrder corretos
- [x] **`!important`** — digitar `red !important` no campo value adiciona o flag; remover o texto remove o flag


## 🟡 Média prioridade
- [ ] **Autocomplete de propriedades** — sugestões ao digitar o nome da propriedade
- [ ] **Autocomplete de valores** — sugestões contextuais ao digitar o valor (`display: f` → `flex`, `flow-root`…)
- [ ] @container named — containers nomeados são parcialmente implementados
- [ ] @keyframes / @font-face — regras fora do fluxo normal de selectors
- [ ] @layer — cascade layers afetam a orden de prioridade; não há suport



- [ ] :has(), :is(), :where(), :not() complexo — seletores modernos podem falhar no element.matches() em algumas situações
- [ ] **Color picker** — ao clicar no swatch de cor abre um picker inline (como no Chrome)
- [ ] **CSS Variables — valor resolvido** — mostrar o valor final de `var(--color-primary)` ao passar o mouse

- [ ] **User agent stylesheet** — exibir as regras padrão do browser (como o Chrome faz em cinza)
- [ ] **Filtro/busca de propriedades** — campo de busca no painel para filtrar declarations por nome
- [ ] **Link para a fonte** — mostrar `styles.css:42` como link clicável levando à linha no arquivo

## 🟢 Baixa prioridade / features avançadas

- [ ] **`@layer` — suporte na cascata** — CSS Cascade Layers afetam a ordem de prioridade; atualmente ignorado
- [ ] **`@keyframes` e `@font-face`** — exibição no painel (regras fora do fluxo de selectors)
- [ ] **Seletores modernos** — validar `:has()`, `:is()`, `:where()` no matching (`element.matches()` pode falhar)
- [ ] **Shorthand expansion** — expandir `margin: 10px 5px` nas 4 propriedades individuais (leitura)
- [ ] **Bezier curve editor** — UI para `transition-timing-function` / `animation-timing-function`

## ✅ Concluído recentemente

- [x] Editar declaration (prop e value) — bug do `logicNode` não sincronizado
- [x] Sobrescrita override correta por contexto `::selection` vs `body`
- [x] Toggle disable/enable declaration — mesmo bug de `logicNode`
- [x] Adicionar declaration (`+ Prop`) — bug do `logicNode` não criado na Logic Tree
- [x] Override detection (`::selection` sobrescrevendo `body`) — separação por `pseudoSubSection`
- [x] Navegação Enter/Tab entre campos (prop → value → próxima decl)
- [x] Seleção de texto ao focar inputs (como no Chrome)
- [x] `fieldStateClasses()` — função não era chamada no template
- [x] **`!important`** — parse ao salvar value, exibe inline no campo
