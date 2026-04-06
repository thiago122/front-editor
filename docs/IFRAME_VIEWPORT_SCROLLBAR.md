# Iframe Viewport & Scrollbar — Bug, Consequências e Solução

## Contexto

O editor usa um `<iframe>` como canvas de preview. Os botões de breakpoint
(360, 640, 768, 1024…) definem a largura do iframe via CSS inline:

```html
<iframe :style="{ width: '768px' }" />
```

O objetivo é simular o viewport de um dispositivo real para que as
**media queries do HTML/CSS carregado dentro do iframe disparem corretamente**.

---

## O Bug (em cascata)

### 1 — `w-full` + flex sem `shrink-0` comprimia o iframe

O componente `<Preview>` recebia `class="w-full"` (Tailwind → `width: 100%`)
**e** `:style="{ width: '768px' }"`. O inline style tem prioridade, mas o
container pai usava flexbox sem `shrink-0`. O algoritmo flex podia comprimir
o iframe abaixo da largura alvo, tornando o viewport interno imprevisível.

**Consequência:** Media queries disparavam com valores menores do que o
breakpoint selecionado, de forma inconsistente.

**Correção:** Remover `w-full` e adicionar `shrink-0` ao `<Preview>`.

---

### 2 — A borda do iframe consumia 2 px

O `<Preview>` tinha `class="border border-gray-300"`. O Tailwind configura
`box-sizing: border-box` globalmente, o que faz `width: 768px` incluir as
bordas de 1 px de cada lado → conteúdo interno = 766 px.

**Consequência:** Viewport 2 px menor que o breakpoint. `@media (max-width: 768px)`
deveria disparar em 768 px, mas o conteúdo "via" 766 px.

**Correção:** Substituir por `border-0` (remove borda do iframe; o visual de
separação pode ser feito no container wrapper, fora do iframe).

---

### 3 — O scrollbar vertical roubava ~17 px de viewport (o mais crítico)

Quando o conteúdo dentro do iframe tem overflow vertical, o browser exibe
uma barra de rolagem. Como o scrollbar fica **dentro** do viewport do iframe,
ele consome ~17 px de largura (Windows/Chrome) → `width: 768px` vira
efetivamente 751 px de viewport para o CSS.

**Consequência:** `@media (max-width: 768px)` só dispara quando o viewport
real atinge 751 px — ou seja, a media query nunca dispara no momento correto.

**Nota:** `scrollbar-gutter: stable` também não resolve: reserva o espaço
do scrollbar permanentemente, então o viewport seria sempre 751 px mesmo sem
overflow. Pior do que antes.

**Correção:** Ver seção abaixo.

---

## A Solução — `editor-iframe-ui.css`

```css
html::-webkit-scrollbar {
  width:  0;    /* vertical: invisível */
  height: 8px;  /* horizontal: visível */
}
html::-webkit-scrollbar-thumb:horizontal {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
}
html::-webkit-scrollbar-track:horizontal {
  background: rgba(0, 0, 0, 0.06);
}
```

### Por que cada linha existe

#### `html::-webkit-scrollbar { width: 0; }`
Remove a espessura do scrollbar **vertical**. Em webkit, `width` é a espessura
da barra vertical e `height` é a espessura da barra horizontal. Zerando `width`,
a barra vertical deixa de ocupar espaço no layout → viewport = exatamente a
largura do iframe.

#### `html::-webkit-scrollbar { height: 8px; }`
**Crítico:** Ao estilizar `::-webkit-scrollbar`, o webkit entra em
**"modo de scrollbar customizado"**. Nesse modo, qualquer parte da barra que
não for explicitamente declarada fica completamente invisível — inclusive o
track e o thumb. Sem o `height: 8px`, a barra horizontal não renderiza
**mesmo que haja overflow horizontal real**, mascarando bugs de layout.

#### `html::-webkit-scrollbar-thumb:horizontal { ... }`
No modo customizado do webkit, o thumb (a alça que o usuário arrasta) é
transparente por padrão. Sem este bloco, a barra horizontal existe em termos
de layout mas é invisível ao usuário — inutilizável.

#### `html::-webkit-scrollbar-track:horizontal { ... }`
Estiliza a trilha da barra horizontal para dar contexto visual ao thumb.
Sem ela, o thumb aparece "flutuando" sem fundo, o que fica visualmente estranho.

#### Por que não `display: none` na barra inteira?
`html::-webkit-scrollbar { display: none; }` (ou `scrollbar-width: none` no
Firefox) esconde **todas** as barras. Isso resolve o viewport vertical, mas
**também esconde overflow horizontal** — o usuário não percebe quando um
elemento está quebrando o layout horizontalmente, algo comum no dia a dia de
desenvolvimento web.

#### Firefox
O Firefox não suporta segmentação por eixo via `scrollbar-width`. Por isso
nenhuma regra é aplicada: o viewport fica ~9 px menor que o breakpoint (barra
fina nativa do Firefox), mas **ambas as barras permanecem visíveis e
funcionais**. É o trade-off aceitável.

---

## Resultado Final

| Browser | Barra vertical | Barra horizontal | Viewport |
|---|---|---|---|
| Chrome / Edge / Safari | ❌ invisível (0 px) | ✅ visível (8 px) | = breakpoint exato |
| Firefox | ✅ visível (nativa fina ~9 px) | ✅ visível | ≈ breakpoint − 9 px |

---

## Referência de Implementação

| Arquivo | O que faz |
|---|---|
| `src/assets/editor-iframe-ui.css` | CSS injetado no iframe; contém as regras de scrollbar |
| `src/components/Preview.vue` | Injeta `editor-iframe-ui.css` no `<head>` do iframe após load |
| `src/views/EditorView.vue` | Aplica `shrink-0 border-0` ao `<Preview>` e controla `previewWidth` |
| `src/components/icons/BreakpointeControl.vue` | Emite o breakpoint escolhido pelo usuário |

---

## Como o Webflow resolve

O Webflow usa a mesma abordagem de esconder o scrollbar via CSS (`display: none`
em ambas as barras), adicionando dois extras:

1. **Scroll externo ao iframe:** o canvas tem altura igual ao conteúdo e a
   rolagem acontece num wrapper `div` fora do iframe — então nenhum scrollbar
   existe dentro do documento.
2. **`transform: scale()`:** quando o breakpoint é maior que a tela disponível,
   escalam o canvas para caber, exibindo o percentual ("85%") no topo do editor.

Estas melhorias são candidatas para implementação futura neste editor.
