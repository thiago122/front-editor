# CSS Logic Tree — Guia Completo

> Este guia é voltado para desenvolvedores que trabalham no editor CSS. Ele explica os conceitos centrais do sistema de CSS, a estrutura da Logic Tree, e demonstra com exemplos como usar toda a API CRUD disponível no `CssLogicTreeService`.

---

## Sumário

1. [O que é a Logic Tree?](#o-que-é-a-logic-tree)
2. [Estrutura da árvore](#estrutura-da-árvore)
3. [Conceitos: Root, File, Rule, AtRule, Declaration](#conceitos)
4. [API CRUD — Rule](#api-rule)
5. [API CRUD — AtRule](#api-atrule)
6. [API CRUD — Declaration](#api-declaration)
7. [Move vs Reorder](#move-vs-reorder)
8. [Duplicate](#duplicate)
9. [Query / Busca](#query--busca)
10. [Fluxo completo de uma mutação](#fluxo-completo)
11. [Referência de métodos](#referência-de-métodos)

---

## O que é a Logic Tree?

A **Logic Tree** é a fonte de verdade do editor CSS. Ela é uma árvore de objetos JavaScript que representa **todo o CSS** da página sendo editada.

Quando o usuário edita uma propriedade, adiciona uma classe, ou arrasta uma regra para outro lugar, a Logic Tree é mutada primeiro — e depois o CSS do documento (`<style>`) é sincronizado a partir dela.

**Por que não editar o CSS diretamente?**

Editar o texto CSS diretamente é frágil e difícil de gerenciar. A Logic Tree permite:
- Identificar cada regra por um **ID único** (não perde a referência ao mover ou duplicar)
- Navegar pela hierarquia (qual regra está dentro de qual `@media`)
- Sincronizar eficientemente com o DOM

---

## Estrutura da árvore

A Logic Tree é um **array de nós**, onde cada nó pode ter filhos. A estrutura segue esta hierarquia:

```
logicTree (Array)
  └── Root         ← agrupa por origin (on_page, internal, external)
        └── File   ← agrupa por arquivo/style element
              ├── Rule (selector)
              ├── AtRule (@media, @supports…)
              │     ├── Rule
              │     └── AtRule (aninhado)
              │           └── Rule
              └── Rule
```

**Exemplo visual com CSS real:**

```css
/* <style id="style"> (on_page) */
body {
  font-family: 'Roboto', sans-serif;   ← Declaration
}

@media (min-width: 768px) {            ← AtRule
  .card {                              ← Rule (dentro do AtRule)
    display: flex;                     ← Declaration
  }
}

/* custom.css (internal) */
.btn {                                 ← Rule
  color: white;                        ← Declaration
}
```

Vira na Logic Tree:

```
Root (on_page)
  └── File "style"
        ├── Rule "body"
        │     └── [Declaration: font-family: 'Roboto', sans-serif]
        └── AtRule "@media (min-width: 768px)"
              └── Rule ".card"
                    └── [Declaration: display: flex]

Root (internal)
  └── File "custom.css"
        └── Rule ".btn"
              └── [Declaration: color: white]
```

---

## Conceitos

### Root

Nó raiz que agrupa tudo de uma mesma **origem**:

| origin | Onde vive |
|--------|-----------|
| `on_page` | `<style>` tags no HTML da página |
| `internal` | Arquivos CSS internos referenciados na página |
| `external` | CDNs e folhas externas (Bootstrap, FontAwesome…) |

### File

Representa um único `<style>` ou arquivo `.css`. O `label` é o **id** do `<style>` ou o nome do arquivo.

```html
<style id="style" data-location="on_page">…</style>
<!-- label = "style", origin = "on_page" -->

<link href="custom.css" data-location="internal">
<!-- label = "custom.css", origin = "internal" -->
```

### Rule (Selector)

Representa uma **regra CSS com seletor**. É o equivalente de:

```css
.card { … }
```

Propriedades relevantes do nó:
```js
{
  id: 'abc123',            // ID único gerado automaticamente
  type: 'selector',
  label: '.card',          // o seletor
  metadata: {
    origin: 'on_page',
    sourceName: 'style',
    astNode: { … },        // nó AST interno (css-tree)
    specificity: [0,1,0],  // especificidade do seletor
  },
  children: [],            // sempre vazio para rules
}
```

### AtRule

Representa um **at-rule** como `@media`, `@supports`, `@container`, etc.

```css
@media (min-width: 768px) {
  .card { … }
}
```

Propriedades relevantes:
```js
{
  id: 'def456',
  type: 'at-rule',
  label: '@media (min-width: 768px)',
  metadata: {
    origin: 'on_page',
    sourceName: 'style',
    astNode: { … },
  },
  children: [/* Rules ou outros AtRules */],
}
```

### Declaration

Uma **declaração CSS** (propriedade + valor) dentro de uma Rule. Diferente dos outros nós, as declarations **não têm um ID próprio** na Logic Tree — elas vivem como nós AST dentro do bloco da Rule.

```css
.card {
  color: red;        ← Declaration (property: "color", value: "red")
  font-size: 16px;   ← Declaration
}
```

---

## API Rule

> Todos os métodos de mutação exigem `syncToDOM` + `notifyTreeMutation` depois. Ver [Fluxo completo](#fluxo-completo).

### `createRule(logicTree, selector, origin?, sourceName?, parentId?)`

Cria uma nova regra CSS na Logic Tree.

```js
const logicTree = toRaw(styleStore.cssLogicTree)

// Criação simples — adiciona ao file "style" de on_page
const rule = CssLogicTreeService.createRule(logicTree, '.card')

// Com origin e source específicos
const rule = CssLogicTreeService.createRule(logicTree, '.btn', 'internal', 'custom.css')

// Dentro de um at-rule existente
const rule = CssLogicTreeService.createRule(logicTree, '.card', 'on_page', 'style', mediaNode.id)
```

**Retorna:** o nó criado (com `.id`) ou `null` se o seletor for inválido.

---

### `updateRule(logicTree, ruleUid, newSelector)`

Muda o seletor de uma regra existente.

```js
// Renomear a classe
CssLogicTreeService.updateRule(logicTree, rule.id, '.card--active')

// Adicionar pseudo-classe
CssLogicTreeService.updateRule(logicTree, rule.id, '.btn:hover')

// Trocar para ID
CssLogicTreeService.updateRule(logicTree, rule.id, '#hero')
```

**Retorna:** `true` se encontrou e atualizou, `false` caso contrário.

---

### `deleteRule(logicTree, ruleUid)`

Remove uma regra da Logic Tree.

```js
CssLogicTreeService.deleteRule(logicTree, rule.id)
// CSS da regra some do <style> após syncToDOM
```

**Retorna:** `true` se encontrou e removeu.

---

## API AtRule

### `createAtRule(logicTree, ruleUid, type, condition?, origin?, sourceName?, parentId?)`

Cria um at-rule. Tem dois modos:

**Modo wrap** — envolve uma rule existente (passa `ruleUid`):
```js
// Pega .card e envolve em @media
const atRule = CssLogicTreeService.createAtRule(
  logicTree,
  rule.id,           // rule que será envolvida
  'media',
  '(min-width: 768px)'
)

// Resultado:
// @media (min-width: 768px) {
//   .card { … }     ← .card foi movida para dentro
// }
```

**Modo vazio** — cria um at-rule sem conteúdo (passa `null` como ruleUid):
```js
// @media vazio no file "style"
const atRule = CssLogicTreeService.createAtRule(logicTree, null, 'media', '(min-width: 768px)')

// @supports vazio em outro file
const atRule = CssLogicTreeService.createAtRule(
  logicTree, null, 'supports', '(display: grid)', 'internal', 'custom.css'
)

// @media vazio aninhado dentro de outro at-rule (usa parentId)
const inner = CssLogicTreeService.createAtRule(
  logicTree, null, 'supports', '(display: grid)',
  'on_page', 'style',
  outerMedia.id   // ← parentId: insere dentro deste @media
)
```

**Retorna:** o nó at-rule criado ou `null` em caso de erro.

---

### `updateAtRule(atRuleAstNode, newCondition)`

Muda a condição do at-rule. Recebe o **astNode** (não o id):

```js
// rule.context.astNode quando a rule está dentro de um @media
CssLogicTreeService.updateAtRule(atRule.metadata.astNode, '(max-width: 1024px)')
CssLogicTreeService.updateAtRule(atRule.metadata.astNode, 'screen and (min-width: 480px)')
```

---

### `deleteAtRule(logicTree, atRuleUid)`

Remove o at-rule **e todos os filhos** (rules dentro dele somem também).

```js
CssLogicTreeService.deleteAtRule(logicTree, atRule.id)
// @media e tudo dentro é removido
```

> ⚠️ Se quiser preservar as rules dentro do @media, mova-as para outro lugar com `moveRule` **antes** de deletar o at-rule.

---

## API Declaration

### `createDeclaration(rule, prop?, val?)`

Adiciona uma declaração à rule.

```js
// Placeholder vazio — bom para o botão "+" na UI
CssLogicTreeService.createDeclaration(rule)
// Cria: property: value  (editável pelo usuário)

// Já preenchida — bom para programar
CssLogicTreeService.createDeclaration(rule, 'color', 'red')
CssLogicTreeService.createDeclaration(rule, 'font-size', '16px')
CssLogicTreeService.createDeclaration(rule, 'display', 'flex')
```

> Quando usar via UI, prefira `inspector.addDeclaration(rule)` — ele faz o sync e foca o campo automaticamente.

---

### `updateDeclaration(decl, field, newValue)`

Atualiza o nome (`'prop'`) ou valor (`'value'`) de uma declaration.

```js
// Mudar a propriedade
CssLogicTreeService.updateDeclaration(decl, 'prop', 'background-color')

// Mudar o valor
CssLogicTreeService.updateDeclaration(decl, 'value', '#ff0000')
CssLogicTreeService.updateDeclaration(decl, 'value', '2rem')
```

---

### `deleteDeclaration(rule, decl)`

Remove uma declaration da rule.

```js
CssLogicTreeService.deleteDeclaration(rule, decl)
// A propriedade some do CSS
```

---

### `toggleDeclaration(decl)`

Ativa ou desativa uma declaration (equivale ao checkbox de um devtool CSS). Declarations desativadas ficam tachadas na UI e não têm efeito no CSS.

```js
CssLogicTreeService.toggleDeclaration(decl)
// Se estava ativa → desativa
// Se estava inativa → ativa
```

---

## Move vs Reorder

> **Da UI são o mesmo gesto.** Quando o usuário arrasta um item, o código não precisa saber se é "move" ou "reorder" — é sempre a mesma chamada.

A diferença é só conceitual:

| Operação | Definição | Exemplo |
|----------|-----------|---------|
| **Move** | Muda de pai (file, at-rule) | `.card` sai de `on_page/style` e vai para `@media` |
| **Reorder** | Troca de posição dentro do **mesmo pai** | `.card` vai do índice 0 para o índice 3, ainda no mesmo file |

Os três métodos de move lidam com ambos automaticamente:

### `moveRule(logicTree, ruleUid, targetParentId, index?)`

```js
// MOVE — muda de pai (de file "style" para dentro de @media)
CssLogicTreeService.moveRule(logicTree, rule.id, mediaNode.id)

// REORDER — mesmo pai, novo índice
// (o índice se refere à posição FINAL na lista; o ajuste é automático)
CssLogicTreeService.moveRule(logicTree, rule.id, fileNode.id, 3)

// MOVE entre arquivos
CssLogicTreeService.moveRule(logicTree, rule.id, customFileNode.id)
```

### `moveAtRule(logicTree, atRuleUid, targetParentId, index?)`

```js
// Mover @media inteiro (com tudo dentro) para outro file
CssLogicTreeService.moveAtRule(logicTree, mediaNode.id, customFileNode.id)

// Aninhar @supports dentro de @media
CssLogicTreeService.moveAtRule(logicTree, supportsNode.id, mediaNode.id)

// Reordenar @media dentro do mesmo file
CssLogicTreeService.moveAtRule(logicTree, mediaNode.id, fileNode.id, 1)
```

### `moveDeclaration(sourceRule, decl, targetRule, index?)`

```js
// Move 'color: red' da .card para a .btn
CssLogicTreeService.moveDeclaration(cardRule, decl, btnRule)

// Move para posição específica na rule destino
CssLogicTreeService.moveDeclaration(cardRule, decl, btnRule, 0)

// REORDER — mesma rule, nova posição
CssLogicTreeService.moveDeclaration(cardRule, decl, cardRule, 2)
```

> **Detalhe de índice:** Ao reordenar dentro do mesmo pai, o índice que você passa é a **posição final desejada**. O método ajusta o índice internamente (porque o nó é removido antes de inserir, deslocando a lista).

---

## Duplicate

Cria uma cópia exata com um **novo id**. Útil para o botão "duplicar" na UI.

### `duplicateRule(logicTree, ruleUid)`

```js
const clone = CssLogicTreeService.duplicateRule(logicTree, rule.id)
// clone é inserido logo após o original, com mesmo seletor e mesmas declarations
// clone.id é diferente de rule.id
```

### `duplicateDeclaration(rule, decl)`

```js
CssLogicTreeService.duplicateDeclaration(rule, decl)
// Cópia da declaration inserida logo abaixo da original
```

---

## Query / Busca

Métodos de leitura — não mutam a árvore, não precisam de sync.

### `findRuleBySelector(logicTree, selector)`

```js
// Encontra a primeira rule com esse seletor exato
const rule = CssLogicTreeService.findRuleBySelector(logicTree, '.card')
// → nó ou null
```

### `findDeclarationByProperty(rule, property)`

```js
// Encontra a primeira declaration com essa propriedade
const decl = CssLogicTreeService.findDeclarationByProperty(rule, 'color')
// → nó AST ou null
```

### `getRulesByOrigin(logicTree, origin)`

```js
// Todas as rules de uma origem
const onPageRules = CssLogicTreeService.getRulesByOrigin(logicTree, 'on_page')
const internalRules = CssLogicTreeService.getRulesByOrigin(logicTree, 'internal')
// → Array de nós selector
```

---

## Fluxo completo

**Toda mutação na Logic Tree segue o mesmo padrão de 3 passos:**

```js
import { CssLogicTreeService } from '@/composables/CssLogicTreeService'
import { useStyleStore } from '@/stores/StyleStore'
import { toRaw } from 'vue'

const styleStore = useStyleStore()
const doc = document.querySelector('iframe')?.contentDocument

// 1. Muta a Logic Tree
const rule = CssLogicTreeService.createRule(
  toRaw(styleStore.cssLogicTree),
  '.minha-classe'
)

// 2. Sincroniza com o DOM (escreve no <style>)
CssLogicTreeService.syncToDOM(styleStore.cssLogicTree, doc)

// 3. Notifica os componentes Vue para re-renderizar
styleStore.notifyTreeMutation()
```

**Exemplo completo: criar regra com declarations**

```js
const logicTree = toRaw(styleStore.cssLogicTree)

// Cria a rule
const rule = CssLogicTreeService.createRule(logicTree, '.card', 'on_page', 'style')

if (rule) {
  // Adiciona declarations
  CssLogicTreeService.createDeclaration(rule, 'background', '#ffffff')
  CssLogicTreeService.createDeclaration(rule, 'padding', '16px')
  CssLogicTreeService.createDeclaration(rule, 'border-radius', '8px')
  CssLogicTreeService.createDeclaration(rule, 'box-shadow', '0 2px 8px rgba(0,0,0,.1)')

  // Sincroniza
  CssLogicTreeService.syncToDOM(styleStore.cssLogicTree, doc)
  styleStore.notifyTreeMutation()

  // Seleciona a nova regra no explorer (opcional)
  styleStore.selectRule(rule.id)
}

// CSS gerado:
// .card {
//   background: #ffffff;
//   padding: 16px;
//   border-radius: 8px;
//   box-shadow: 0 2px 8px rgba(0,0,0,.1);
// }
```

**Usando o InspectorController (na UI)**

Quando você já tem acesso ao `inspector`, ele faz o sync automaticamente:

```js
// Em vez de chamar CssLogicTreeService diretamente + sync manual:
inspector.addDeclaration(rule)                          // cria + sync + foca o campo
inspector.updateDeclaration(rule, decl, 'value', '2rem') // atualiza + sync
inspector.deleteDeclaration(rule, decl)                  // remove + sync
inspector.updateRule(rule, '.novo-seletor')              // atualiza seletor + sync
inspector.createAtRule(rule, 'media')                   // wrap em @media + sync
```

---

## Referência de métodos

### Rule

| Método | Parâmetros | Retorno |
|--------|-----------|---------|
| `createRule` | `logicTree, selector, origin?, sourceName?, parentId?` | nó ou `null` |
| `updateRule` | `logicTree, ruleUid, newSelector` | `boolean` |
| `deleteRule` | `logicTree, ruleUid` | `boolean` |
| `moveRule` | `logicTree, ruleUid, targetParentId, index?` | `boolean` |
| `duplicateRule` | `logicTree, ruleUid` | nó clonado ou `null` |
| `findRuleBySelector` | `logicTree, selector` | nó ou `null` |
| `getRulesByOrigin` | `logicTree, origin` | `Array` |

### AtRule

| Método | Parâmetros | Retorno |
|--------|-----------|---------|
| `createAtRule` | `logicTree, ruleUid\|null, type, condition?, origin?, sourceName?, parentId?` | nó ou `null` |
| `updateAtRule` | `atRuleAstNode, newCondition` | `boolean` |
| `deleteAtRule` | `logicTree, atRuleUid` | `boolean` |
| `moveAtRule` | `logicTree, atRuleUid, targetParentId, index?` | `boolean` |

### Declaration

| Método | Parâmetros | Retorno |
|--------|-----------|---------|
| `createDeclaration` | `rule, prop?, val?` | `boolean` |
| `updateDeclaration` | `decl, field ('prop'\|'value'), newValue` | `boolean` |
| `deleteDeclaration` | `rule, decl` | `boolean` |
| `toggleDeclaration` | `decl` | `boolean` |
| `moveDeclaration` | `sourceRule, decl, targetRule, index?` | `boolean` |
| `duplicateDeclaration` | `rule, decl` | `boolean` |
| `findDeclarationByProperty` | `rule, property` | nó AST ou `null` |
