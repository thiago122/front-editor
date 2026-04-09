# Planejamento: Camada de Edição Visual (Inspector)

Este documento descreve a reorganização conceitual das propriedades CSS no Inspector do editor, agrupando-as em áreas genéricas de interesse para melhorar a experiência do usuário (UX).

## 🎯 Objetivo
Transformar a lista técnica de propriedades CSS em uma interface intuitiva dividida em **4 Grandes Áreas Master**, permitindo um fluxo de trabalho progressivo e organizado.

---

## 🏗️ 1. Estrutura (Layout & Structure)
*Responsável pelo posicionamento, tamanho e comportamento do elemento no fluxo da página.*

### 1.1 Layout (Flow)
- **Principal**: `display` (Block, Flex, Grid, Inline).
- **Flexbox**: `flex-direction`, `justify-content`, `align-items`, `flex-wrap`, `gap`.
- **Grid**: `grid-template-columns`, `grid-template-rows`, `column-gap`, `row-gap`.

### 1.2 Espaçamento (Spacing)
- **Box Model**: `padding` (top, right, bottom, left), `margin` (top, right, bottom, left).

### 1.3 Dimensões (Size)
- **Manual**: `width`, `height`.
- **Limites**: `min-width`, `max-width`, `min-height`, `max-height`.

### 1.4 Posicionamento (Coords)
- **Modo**: `position` (Static, Relative, Absolute, Fixed, Sticky).
- **Eixos**: `top`, `right`, `bottom`, `left`.
- **Z-Index**: `z-index`.

---

## ✍️ 2. Texto (Typography)
*Focada inteiramente na legibilidade e estilo do conteúdo textual.*

### 2.1 Fonte (Character)
- **Estilo**: `font-family`, `font-size`, `font-weight`, `font-style`.
- **Cor**: `color`.

### 2.2 Parágrafo (Paragraph)
- **Alinhamento**: `text-align`, `text-transform`, `text-decoration`.
- **Espaçamento**: `line-height`, `letter-spacing`, `word-spacing`.

---

## 🎨 3. Aparência (Appearance & Skin)
*Define a estética do elemento (cores, bordas e efeitos) sem afetar o layout.*

### 3.1 Superfície (Background)
- **Fundo**: `background-color`, `background-image`, `background-size`, `background-position`.
- **Misc**: `opacity`, `visibility`.

### 3.2 Contorno (Borders)
- **Bordas**: `border-width`, `border-style`, `border-color`.
- **Cantos**: `border-radius`.

### 3.3 Efeitos (Visual Effects)
- **Sombras**: `box-shadow`, `text-shadow`.
- **Filtros**: `blur`, `grayscale`, `backdrop-filter`.

---

## ⚡ 4. Dinâmica (Motion & Feedback)
*Controla as interações, estados e animações do elemento.*

### 4.1 Transformação (Transform)
- **Espacial**: `rotate`, `scale`, `translate`, `skew`.

### 4.2 Feedback (State)
- **Cursor**: `cursor`.
- **Eventos**: `pointer-events`.

### 4.3 Movimento (Transition)
- **Suavização**: `transition-property`, `transition-duration`, `transition-timing-function`.

---

## 💡 Proposta de Interface (UX)
- **Abordagem de Accordions**: Cada uma das 4 áreas master deve ser um Accordion (seção colapsável) no Inspector.
- **Visual Progressivo**: Propriedades menos comuns em cada seção devem ser escondidas sob um botão "Advanced" ou "More".
- **Componentização**: Criar componentes Vue específicos para cada área (`LayoutSection.vue`, `TypographySection.vue`, etc) para manter o código limpo.
