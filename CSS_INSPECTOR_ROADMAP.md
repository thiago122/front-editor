# Roadmap: CSS Inspector & Explorer Integration

Esta iniciativa visa transformar a experiência de edição de CSS, tornando-a mais focada e integrada à árvore de estilos.

## 🎯 Objetivo
Mudar o paradigma do Inspetor de CSS de "lista infinita de regras" para "edição focada em seletores individuais".

## 🛠️ Mudanças Planejadas

### 1. Seleção Focada de Regras
- O Inspetor não exibirá mais todos os seletores simultaneamente.
- No topo do painel, haverá uma barra de "tabs" ou lista de seletores que afetam o elemento.
- **Tipos de Seletores**:
    - **Vinculados a Atributos**: Baseados em `class` ou `id`. O usuário poderá remover o vínculo (ex: remover a classe do elemento) ou adicionar novos atributos diretamente pelo Inspetor.
    - **Estruturais/Complexos**: Seletores como `div > *`, `p:first-child` ou seletores compostos. Estes não podem ser "removidos" do elemento (pois não dependem de um atributo direto), mas podem ser selecionados para edição.
- **Tratamento de Duplicatas**: Se houver múltiplas regras para o mesmo seletor (ex: `.btn` definido em dois arquivos diferentes), ambas serão listadas individualmente (ex: `.btn [main.css]` e `.btn [style.css]`) para que o usuário escolha qual deseja editar.
- Apenas **um seletor por vez** será exibido para edição detalhada.

### 2. Fluxo de Interação e Criação
- **Seleção Automática**: Ao clicar em um elemento no DOM, o sistema selecionará automaticamente o primeiro seletor (geralmente o mais específico) para edição imediata.
- **Alternância Manual**: O usuário poderá clicar em outros seletores na barra superior do inspetor para trocar o contexto de edição.
- **Gestão de Atributos**: O usuário poderá adicionar ou remover classes e IDs diretamente no Inspetor, o que reflete imediatamente no HTML e na filtragem de regras.
- **Criação Livre de Seletores**: O sistema permitirá criar novos seletores em qualquer contexto:
    - **Com Elemento Selecionado**: Sugestões automáticas baseadas nos atributos do elemento (classes/tags) ou criação de seletores complexos que o incluam.
    - **Sem Elemento Selecionado**: Criação livre de classes, IDs ou seletores complexos diretamente na Árvore de CSS.
- **Sincronização com o Explorer**: Ao selecionar um seletor no Inspetor, o CSS Explorer deve rolar e destacar esse seletor na árvore (e vice-versa).
- **Divisão de Responsabilidades**:
    - **Inspector**: Focado no elemento. Gerencia o vínculo (adicionar/remover classes e IDs do HTML).
    - **CSS Explorer**: Focado no código. Responsável pela **exclusão definitiva** de regras e seletores do AST/StyleSheet.

### 3. Regras Herdadas
- As propriedades herdadas continuarão sendo exibidas na parte inferior do inspetor, mantendo a visibilidade do cascateamento de estilos.

### 4. Gestão de Pseudo-classes
- **Painel de Estados**: Abaixo da lista de seletores principais, o Inspetor exibirá uma lista de pseudo-classes comuns (`:hover`, `:active`, `:focus`, `:visited`, `:focus-within`, `:focus-visible`, `:target`).
- **Estados Existentes**: O sistema marcará visualmente quais dessas pseudo-classes já existem para o seletor selecionado.
- **Criação sob Demanda**: Se o usuário clicar em um estado que ainda não existe, o sistema criará automaticamente a nova regra no AST e a exibirá no CSS Explorer.
- **Navegação Base**: O seletor principal (sem pseudo-classe) será exibido como o "âncora" no topo, permitindo que o usuário clique nele para voltar a editar o estado padrão a qualquer momento.

## 🧬 Impacto na Arquitetura

### StyleStore
- Precisará gerenciar o estado da "Regra Ativa" de forma síncrona com o elemento selecionado no `EditorStore`.
- Implementar lógica para identificar qual é a regra "primária" para auto-seleção.

### InspectorPanel.vue
- Redesign completo do cabeçalho para acomodar o seletor de regras e o painel de pseudo-classes.
- Refatoração do loop de renderização para mostrar apenas a `activeRule`.

### CssExplorer.vue
- Melhorar a API de "scroll to node" para que o Inspetor possa comandar o foco na árvore.
