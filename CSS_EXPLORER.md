# CSS Explorer Documentation

O **CSS Explorer** é um componente de navegação técnica que permite visualizar e interagir com a estrutura de estilos (AST) do documento sendo editado. Ele foi projetado para ser extremamente performático, mesmo lidando com dezenas de milhares de regras CSS (como o Tailwind CSS).

## 🏗️ Arquitetura e Fluxo de Dados

O fluxo de processamento do CSS no editor segue estas etapas:

1.  **Extração (`useCssParser.js`)**: O parser lê todas as stylesheets do iframe, utiliza a biblioteca `css-tree` para gerar o AST real e injeta metadados (origem, especificidade, IDs).
2.  **Transformação para Logic Tree**: O AST bruto do `css-tree` é convertido em uma **Logic Tree**. Esta árvore simplifica a estrutura para facilitar a renderização, agrupando as regras por:
    *   **Origem**: Inline, On-Page, Internal, External.
    *   **Arquivo**: Nome do arquivo ou ID da tag `<style>`.
    *   **Regras**: Seletores e At-rules (como @media).
3.  **Estado (`StyleStore.js`)**: A Logic Tree é armazenada no `StyleStore`. A store também gerencia quais nós estão colapsados/expandidos e qual regra está selecionada.
4.  **Interface (`CssExplorer.vue` + `CssTreeItem.vue`)**: Exibe a Logic Tree para o usuário.

---

## ⚡ Estratégias de Performance

Para garantir que a interface não trave com grandes volumes de dados, o explorer utiliza técnicas avançadas:

### 1. Flattened Tree (Árvore Aplanada)
Em vez de renderizar componentes de forma recursiva (um dentro do outro), o sistema converte a árvore em uma **lista plana** de nós visíveis através de uma `computed` property. Isso economiza memória e reduz drasticamente o trabalho de "patching" do Vue.

### 2. Manual Virtual Scrolling
A maior inovação de performance é o scroll virtual. O componente `CssExplorer.vue` monitora o scroll e calcula em tempo real o "slice" (fatia) de nós que devem aparecer no monitor.
- **Renderização Econômica**: O DOM renderiza apenas ~40 elementos, independentemente de a árvore ter 10.000 regras.
- **Espaçador Dinâmico**: Um elemento invisível simula a altura total da árvore para manter o scroll do navegador funcionando naturalmente.

### 3. Reatividade de Estado em Blocos
O estado de colapso de nós é mantido em um `Set` reativo na `StyleStore`. Para garantir performance, a reatividade é disparada apenas por substituição do objeto `Set`, evitando que o Vue monitore milhares de estados booleanos individuais.

---

## 📂 Componentes Principais

- **`CssExplorer.vue`**: O container principal. Responsável pelo cálculo do Scroll Virtual e pela orquestração da lista plana.
- **`CssTreeItem.vue`**: Representa uma única linha na árvore. É um componente "burro" que apenas exibe os dados e reage a cliques para seleção ou expansão.
- **`StyleStore.js`**: O "cérebro" do CSS. Mantém o AST e o estado de interação sincronizado entre o Explorer e o Inspector.

---

## 🛠️ Como Contribuir / Modificar

Se precisar mudar a forma como os dados são exibidos:
1.  **Novo Tipo de Nó**: Adicione a lógica de mapeamento em `useCssParser.mapCssNodeToLogicNode`.
2.  **Visual da Linha**: Altere o template/estilos em `CssTreeItem.vue`.
3.  **Comportamento de Scroll**: Ajuste `ROW_HEIGHT` ou o buffer de renderização no `CssExplorer.vue`.
