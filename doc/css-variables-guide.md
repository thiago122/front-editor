# Guia de Variáveis CSS (Custom Properties) no Editor Visual

Este documento explica o conceito, o funcionamento e as estratégias de implementação de Variáveis CSS (Custom Properties) no contexto do Editor Visual.

## 1. O que são Variáveis CSS?

Variáveis CSS, conhecidas oficialmente como "Custom Properties" (Propriedades Customizadas), permitem armazenar valores específicos (como cores, tamanhos, fontes) que podem ser reutilizados em todo o documento CSS. 

Diferente das variáveis de pré-processadores (como SASS ou LESS), as variáveis CSS são **nativas do navegador**, o que significa que elas existem no DOM (Document Object Model), herdam regras de cascata (cascade) e podem ser atualizadas em tempo real via JavaScript ou mudanças de classe, refletindo imediatamente na interface.

### Sintaxe Básica

**Definindo uma variável:**
Utiliza-se o prefixo `--` seguido do nome da variável.
```css
/* Escopo global */
:root {
  --cor-primaria: #3498db;
  --espacamento-padrao: 16px;
}
```

**Usando uma variável:**
Utiliza-se a função `var()`.
```css
.botao {
  background-color: var(--cor-primaria);
  padding: var(--espacamento-padrao);
}
```

---

## 2. Escopo Global vs. Escopo Local

Um dos conceitos mais poderosos das Variáveis CSS é o escopo. Assim como variáveis em programação (JavaScript, PHP), as variáveis CSS respeitam o bloco onde foram declaradas.

### Escopo Global
Variáveis declaradas no seletor `:root` (que representa a tag `<html>`) são consideradas globais. Elas estão disponíveis para qualquer elemento na página.

*   **Uso ideal:** Design Tokens gerais (Cores da marca, escalas de tipografia, z-index globais).

### Escopo Local
Variáveis declaradas dentro de uma classe, ID ou elemento específico só existem para aquele elemento e para os seus elementos filhos (herança).

```css
/* A variável --cor-fundo-card só existe dentro de .card */
.card {
  --cor-fundo-card: #f8f9fa;
  background-color: var(--cor-fundo-card);
  padding: 20px;
}

/* Isso NÃO vai funcionar, pois .alerta está fora do .card */
.alerta {
  background-color: var(--cor-fundo-card); /* Valor será ignorado */
}
```

---

## 3. O Poder das Variáveis Locais (Exemplos Práticos)

O uso de variáveis locais é essencial para criar componentes modulares e variantes de design no editor.

### Exemplo A: Variações de Componentes (Variantes)
Você pode criar um componente base que utiliza uma variável local vazia ou com um valor padrão, e apenas sobrescrever essa variável nas classes modificadoras.

```css
/* Estrutura Base */
.btn {
  /* Se --btn-bg não existir, usa #ccc como fallback */
  background-color: var(--btn-bg, #cccccc); 
  color: var(--btn-text, #333333);
  padding: 10px 20px;
  border-radius: 4px;
}

/* Variante: Primária */
.btn-primary {
  --btn-bg: #007bff;
  --btn-text: #ffffff;
}

/* Variante: Alerta */
.btn-danger {
  --btn-bg: #dc3545;
  --btn-text: #ffffff;
}
```
**No HTML:**
`<button class="btn btn-primary">Salvar</button>`

### Exemplo B: Sobrescrita (Override) de Variáveis Globais
Um elemento pode redefinir o valor de uma variável global. Todos os filhos desse elemento passarão a usar o novo valor.

```css
:root {
  --cor-texto: #333; /* Texto escuro por padrão */
}

body {
  color: var(--cor-texto);
}

/* Criando um tema escuro apenas para uma seção */
.secao-dark {
  --cor-texto: #fff; /* Redefine a variável apenas aqui */
  background-color: #111;
}
```
Todos os parágrafos dentro de `.secao-dark` automaticamente ficarão brancos, sem precisar reescrever as regras de cor para o parágrafo.

---

## 4. Implementação no Editor Visual (Visão Arquitetural)

Para representar esse ecossistema no Editor Visual, o sistema deve ser **Context-Aware** (Sensível ao contexto):

1.  **Painel de Variáveis (Tokens):**
    *   **Aba Global:** Mostra e gerencia as variáveis no `:root`.
    *   **Aba Local:** Só exibe as variáveis atreladas ao elemento/classe que está selecionado no momento.
2.  **Sistema de Herança Visual:**
    *   Assim como o DevTools do Chrome, o painel deve ser capaz de mostrar ao usuário de onde uma variável vem ("Herdada de `.container`" ou "Global de `:root`").
3.  **UI de Conexão (Link):**
    *   Os inputs padrão (Color Picker, Inputs de Tamanho) devem possuir um modo "Token".
    *   Ao ativar esse modo, o usuário não digita um valor, mas seleciona uma variável disponível em uma lista suspensa (dropdown).
    *   A lista só deve exibir variáveis aplicáveis àquele escopo (Globais + Locais da árvore ancestral daquele elemento).
4.  **Parse de Tipos:**
    *   A lógica (`EditorStore` / AST) precisa inferir visualmente que tipo de input exibir para a variável (ex: se `--padding` for `10px`, renderiza input de tamanho; se `--cor` for `#f00`, renderiza color picker).
