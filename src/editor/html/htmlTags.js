/**
 * editor/html/htmlTags.js
 *
 * Configuração central de tags HTML para o editor.
 * Usado por:
 *  - InsertTagMenu.vue  (barra de inserção de tags)
 *  - TagAutocomplete.vue (botão + no overlay)
 *
 * Para adicionar/alterar conteúdo padrão de uma tag: edite TAG_CONTENT.
 */

// ── Tags void: não têm fechamento, não aceitam filhos ────────────────────────
export const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

// ── Conteúdo padrão por tag ───────────────────────────────────────────────────
// Tags de texto recebem um pequeno lorem ipsum para ficarem visíveis ao inserir.
// Tags estruturais (div, section...) ficam vazias por padrão.
// Tags complexas (table, form...) são tratadas em TAG_TEMPLATES abaixo.
const TAG_CONTENT = {
  // Headings
  h1:          'Heading 1',
  h2:          'Heading 2',
  h3:          'Heading 3',
  h4:          'Heading 4',
  h5:          'Heading 5',
  h6:          'Heading 6',
  // Parágrafos e citações
  p:           'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  blockquote:  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  // Formatação inline
  strong:      'texto importante',
  b:           'texto negrito',
  em:          'texto enfatizado',
  i:           'texto itálico',
  mark:        'texto destacado',
  small:       'texto menor',
  del:         'texto removido',
  ins:         'texto inserido',
  sub:         'subscript',
  sup:         'superscript',
  s:           'texto riscado',
  // Código
  code:        'const x = 42',
  kbd:         'Ctrl+S',
  var:         'variavel',
  // Links e interativos
  a:           'link de texto',
  button:      'Clique aqui',
  // Estrutura de listas
  li:          'Item da lista',
  dt:          'Termo',
  dd:          'Definição do termo',
  // Tabela
  td:          'Dado',
  th:          'Cabeçalho',
  caption:     'Legenda da tabela',
  // Formulário
  label:       'Rótulo do campo',
  legend:      'Título do grupo',
  output:      'Resultado',
  // Outros
  figcaption:  'Legenda da imagem',
  summary:     'Clique para expandir',
  abbr:        'Abreviação',
  time:        '1 Jan 2024',
  cite:        'Autor, Obra',
  span:        'texto',
  // Código/pre
  pre:         'console.log("hello world")',
}

// ── Templates ricos para tags complexas ──────────────────────────────────────
// Sobrescreve tagToHtml() para tags que precisam de estrutura interna.
const TAG_TEMPLATES = {
  ul:       '<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>',
  ol:       '<ol>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ol>',
  dl:       '<dl>\n  <dt>Termo</dt>\n  <dd>Definição</dd>\n</dl>',
  table:    '<table>\n  <thead><tr><th>Col A</th><th>Col B</th></tr></thead>\n  <tbody><tr><td>1</td><td>2</td></tr></tbody>\n</table>',
  thead:    '<thead><tr><th>Cabeçalho</th></tr></thead>',
  tbody:    '<tbody><tr><td>Dado</td></tr></tbody>',
  tfoot:    '<tfoot><tr><td>Rodapé</td></tr></tfoot>',
  tr:       '<tr><td>Dado</td></tr>',
  colgroup: '<colgroup><col><col></colgroup>',
  figure:   '<figure>\n  <img src="" alt="Imagem">\n  <figcaption>Legenda da imagem</figcaption>\n</figure>',
  details:  '<details>\n  <summary>Clique para expandir</summary>\n  <p>Conteúdo oculto</p>\n</details>',
  dialog:   '<dialog open>\n  <p>Conteúdo do diálogo</p>\n</dialog>',
  picture:  '<picture>\n  <source srcset="" type="image/webp">\n  <img src="" alt="Imagem">\n</picture>',
  video:    '<video controls>\n  <source src="" type="video/mp4">\n  Vídeo não suportado.\n</video>',
  audio:    '<audio controls>\n  <source src="" type="audio/mpeg">\n  Áudio não suportado.\n</audio>',
  form:     '<form>\n  <label>Campo <input type="text" placeholder="Texto"></label>\n  <button type="submit">Enviar</button>\n</form>',
  fieldset: '<fieldset>\n  <legend>Grupo de campos</legend>\n</fieldset>',
  select:   '<select>\n  <option>Opção 1</option>\n  <option>Opção 2</option>\n</select>',
  datalist: '<input list="dl1" placeholder="Digite...">\n<datalist id="dl1">\n  <option value="Opção A">\n  <option value="Opção B">\n</datalist>',
  pre:      `<pre><code>${TAG_CONTENT.pre}</code></pre>`,
}

// ── Todas as tags HTML5 (lista para autocomplete) ─────────────────────────────
export const HTML_TAGS = [
  'a', 'abbr', 'address', 'article', 'aside', 'audio',
  'b', 'blockquote', 'br', 'button',
  'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
  'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
  'em', 'embed',
  'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr',
  'i', 'iframe', 'img', 'input', 'ins',
  'kbd',
  'label', 'legend', 'li',
  'main', 'mark', 'menu', 'meter',
  'nav',
  'object', 'ol', 'optgroup', 'option', 'output',
  'p', 'picture', 'pre', 'progress',
  's', 'section', 'select', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr',
  'u', 'ul',
  'var', 'video',
  'wbr',
]

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Gera o HTML inicial para uma tag.
 *
 * Prioridade:
 *  1. TAG_TEMPLATES — templates ricos para tags complexas (table, form, ul...)
 *  2. VOID_TAGS     — auto-fechantes: <br>, <img>...
 *  3. TAG_CONTENT   — tags de texto com lorem ipsum
 *  4. Default       — <tag></tag> vazio
 *
 * @param {string} tag - nome da tag em minúsculas
 * @returns {string}   - HTML pronto para inserção
 */
export function tagToHtml(tag) {
  if (TAG_TEMPLATES[tag]) return TAG_TEMPLATES[tag]
  if (VOID_TAGS.has(tag))  return `<${tag}>`
  const content = TAG_CONTENT[tag] ?? ''
  return `<${tag}>${content}</${tag}>`
}
