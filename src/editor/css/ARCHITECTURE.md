# CSS Engine — Arquitetura

> **Para desenvolvedores júnior:** este documento explica como a engine CSS deste editor está organizada, e em qual arquivo fazer cada tipo de mudança.

## Fluxo principal

```
iframe DOM  →  CssAstBuilder   →  CssExplorerTreeBuilder  →  Logic Tree
                                                                   │
Elemento selecionado  →  CssInspectorMatcher  ────────────────────┘
                               │
                      ruleGroups (matched CSS)
                               │
                         StylesTab.vue
```

## Camadas (`src/editor/css/`)

| Pasta | Responsabilidade | Quando usar |
|---|---|---|
| `shared/` | Constantes e utilitários puros | Adicionar constante global, função utilitária |
| `ast/` | Parse e geração de CSS (usa `css-tree`) | Criar/converter nós AST |
| `tree/` | Logic Tree: estrutura de dados interna | Adicionar CRUD de regras, @media, propriedades |
| `inspector/` | Matching de regras para o painel de estilos | Corrigir como regras são encontradas para um elemento |
| `loader/` | Carga e injeção de CSS no iframe | Alterar como arquivos CSS são carregados |
| `actions/` | Ações de alto nível com integração Vue | Adicionar uma nova ação chamada de um componente |

## Dentro de `tree/` — o coração da engine

```
CssLogicTreeService.js   ← ponto de entrada (facade)
│
├── CssRuleService.js        ← CRUD de selectors (.btn { }, h1 { })
├── CssAtRuleService.js      ← CRUD de @media, @supports, @container
├── CssDeclarationService.js ← CRUD de propriedades (color, margin…)
│
├── CssExplorerTreeBuilder.js ← constrói a árvore do CSS Explorer
├── CssTreeSynchronizer.js    ← escreve a Logic Tree de volta no DOM
└── _logicTreeHelpers.js      ← utilitários internos (find, create nodes)
```

> **Regra de ouro:** sempre chame `CssLogicTreeService` nos componentes e actions.
> Use os services individuais (`CssRuleService` etc.) apenas quando precisar de algo mais específico.

## Qual arquivo mexer?

| Quero... | Arquivo |
|---|---|
| Mudar como uma regra é criada | `CssRuleService.js` → `create()` |
| Mudar como um @media é encapsulado | `CssAtRuleService.js` → `create()` |
| Mudar como propriedades são toggladas | `CssDeclarationService.js` → `toggle()` |
| Mudar quais regras aparecem na aba Styles | `CssInspectorMatcher.js` → `_tryMatchSelector()` |
| Mudar como o CSS é gravado de volta no DOM | `CssTreeSynchronizer.js` → `syncToDom()` |
| Mudar como arquivos CSS externos são carregados | `CssLoader.js` / `CssInjector.js` |
| Adicionar constante CSS global | `shared/cssConstants.js` |

## Vite aliases

O projeto usa `@/` como alias para `src/`. Exemplos:

```js
// Ao importar de fora do editor/css/:
import { CssLogicTreeService } from '@/editor/css/tree'
import { CssInspectorMatcher } from '@/editor/css/inspector'

// Dentro do editor/css/, use caminhos relativos:
import { CssAstService } from '../ast/CssAstService.js'
```
