# Documentação do Sistema de Edição de CSS

Este documento descreve as funcionalidades e a arquitetura do sistema de inspeção e exploração de CSS implementado no editor. O sistema foi projetado para oferecer uma experiência de edição focada, integrando a manipulação direta do DOM com a gestão de arquivos de estilo (AST).

---

## 🏗️ Arquitetura Base: Logic Tree
O sistema não trabalha diretamente sobre o CSS bruto, mas sim sobre uma **Logic Tree** (Árvore Lógica) gerada a partir do `css-tree`.
- **Sincronização**: Qualquer alteração no Inspetor ou na Árvore é refletida no AST e sincronizada com as tags `<style>` ou atributos `style` do documento.
- **Origens**: Suporta CSS Interno (`style` tags), On-page (através de um buffer unificado) e Externo (apenas leitura para arquivos externos vinculados).

---

## 🌲 CSS Explorer (Árvore de Estilos)
O CSS Explorer fornece uma visão macro de todo o CSS carregado no projeto.

- **Navegação Hierárquica**: Agrupamento por Fonte -> Arquivo -> Seletores/At-rules.
- **Renderização Virtualizada**: Capaz de lidar com milhares de regras CSS sem perda de performance.
- **Estados de Expansão**: Pastas e seletores começam colapsados por padrão para manter a organização.
- **Criação Livre**: Botão `+` no cabeçalho permite criar novas regras CSS em qualquer lugar, independente de um elemento selecionado.
- **Busca e Filtro**: Busca integrada para localizar rapidamente seletores específicos.

---

## 🔍 CSS Inspector (Redesign de Edição Focada)
O novo Inspetor abandona a lista infinita de regras em favor de um modelo de "Abas de Seletores".

### 1. Navegação por Seletores (Tabs)
- **Auto-seleção**: Ao inspecionar um elemento, o seletor mais específico (ou `element.style`) é ativado automaticamente.
- **Abas Inteligentes**: Mostra todos os seletores aplicáveis ao elemento. Se houver seletores duplicados (ex: `.btn` em dois arquivos), a aba exibe a origem para diferenciação.
- **Unlink (Desvincular)**: Seletores baseados em classe ou ID possuem um botão `✕` que remove o atributo diretamente do elemento HTML via `store.manipulation`.

### 2. Gestão de Pseudo-classes (:hover, :active...)
- **Barra de Estados**: Uma barra dedicada permite alternar entre os estados do seletor.
- **Criação On-demand**: Clicar em um estado inexistente cria automaticamente a regra correspondente no AST.
- **Feedback**: Estados já estilizados aparecem com destaque visual.

### 3. Edição de Propriedades
- **Foco Total**: Exibe apenas as declarações da regra selecionada na aba.
- **Controles de Declaração**: 
  - Habilitar/Desabilitar (comentando a propriedade no AST).
  - Remoção definitiva.
  - Edição de valor com suporte a color picker visual (detecção de cor automática).
- **Herança**: Regras herdadas de elementos pai são exibidas em acordões colapsáveis abaixo da regra ativa.

---

## 🔄 Integração e Sincronização
A maior força do sistema é a ligação bidirecional entre os componentes:

- **Bidirecionalidade**: Selecionar uma regra no Explorer foca ela no Inspetor, e alternar abas no Inspetor navega para o nó correspondente no Explorer.
- **MutationObserver**: O sistema vigia mudanças no DOM (estilos, classes e IDs) e atualiza o Inspetor em tempo real se o elemento mudar por outros meios.
- **StyleStore (Pinia)**: Gerencia o estado global de expansão, seleção e o cache do AST CSS para garantir que todos os componentes vejam os mesmos dados.

---

## 🛠️ Workflows Comuns
...
### Limpar Atributos
1. No cabeçalho do Inspetor, clique na aba do seletor indesejado.
2. Clique no `✕` da aba para remover a classe/ID do elemento HTML.

---

## ⚠️ CORS e Folhas de Estilo Externas
Ao carregar fontes (como Google Fonts) ou bibliotecas externas via `<link>`, o navegador pode restringir o acesso programático ao conteúdo do CSS por segurança (CORS).

- **Sintoma**: Um aviso no console indicando que as regras não puderam ser lidas.
- **Impacto**: O sistema ainda funcionará perfeitamente para todos os outros estilos, mas as regras desse arquivo específico não aparecerão no Explorer ou Inspetor.
- **Solução**: Se você tiver controle sobre o HTML, adicione o atributo `crossorigin="anonymous"` na tag `<link>`. 
  Exemplo: `<link href="..." rel="stylesheet" crossorigin="anonymous">`.
