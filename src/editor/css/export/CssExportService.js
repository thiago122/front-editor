import { toRaw } from 'vue'
import { generate } from 'css-tree'
import { CssTreeSynchronizer } from '../tree/CssTreeSynchronizer.js'

/**
 * CssExportService
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidades:
 *   1. Gerar CSS em string por stylesheet (sourceName)
 *   2. Disparar download de arquivo .css no navegador
 *   3. Enviar CSS para um endpoint de API (stub para PHP / WordPress)
 *
 * Para desenvolvedores júnior:
 *   - Esta classe NÃO muta nada — só lê a Logic Tree e gera texto.
 *   - Para salvar via API no futuro, implemente apenas o método `saveToServer`.
 *   - O método `generateAll` reutiliza o CssTreeSynchronizer que já existe.
 *
 * Camadas relacionadas:
 *   Logic Tree  →  CssExportService  →  download / API
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class CssExportService {

  // ─── Geração ────────────────────────────────────────────────────────────────

  /**
   * Gera o CSS de cada stylesheet presente na Logic Tree.
   *
   * @param {Array} logicTree - A Logic Tree (pode ser reativa do Vue)
   * @returns {Map<string, { sourceName: string, origin: string, css: string }>}
   *   Mapa indexado pela chave `"origin::sourceName"`.
   *
   * @example
   *   const sheets = CssExportService.generateAll(logicTree)
   *   sheets.forEach(({ sourceName, css }) => console.log(sourceName, css))
   */
  static generateAll(logicTree) {
    const sync = new CssTreeSynchronizer(toRaw(logicTree))
    const fileGroups = sync.collectRulesByFile()

    const result = new Map()
    fileGroups.forEach(({ origin, sourceName, rules }, key) => {
      const styleSheet = { type: 'StyleSheet', children: rules }
      result.set(key, {
        key,
        origin,
        sourceName,
        css: generate(styleSheet),
      })
    })
    return result
  }

  /**
   * Gera o CSS de uma única stylesheet.
   *
   * @param {Array}  logicTree  - A Logic Tree
   * @param {string} key        - Chave `"origin::sourceName"` (ex: "on_page::style")
   * @returns {{ sourceName: string, origin: string, css: string } | null}
   */
  static generateOne(logicTree, key) {
    return CssExportService.generateAll(logicTree).get(key) ?? null
  }

  // ─── Download (navegador) ───────────────────────────────────────────────────

  /**
   * Dispara o download de um arquivo .css no navegador.
   *
   * @param {string} filename - Nome do arquivo (ex: "styles.css")
   * @param {string} css      - Conteúdo CSS em texto
   */
  static downloadFile(filename, css) {
    const name = filename.endsWith('.css') ? filename : `${filename}.css`
    const blob = new Blob([css], { type: 'text/css;charset=utf-8' })
    const url  = URL.createObjectURL(blob)

    const anchor    = document.createElement('a')
    anchor.href     = url
    anchor.download = name
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  /**
   * Gera + baixa uma stylesheet específica.
   *
   * @param {Array}  logicTree - A Logic Tree
   * @param {string} key       - Chave `"origin::sourceName"`
   */
  static downloadOne(logicTree, key) {
    const sheet = CssExportService.generateOne(logicTree, key)
    if (!sheet) {
      console.warn(`[CssExportService] Stylesheet "${key}" não encontrada.`)
      return
    }
    CssExportService.downloadFile(sheet.sourceName, sheet.css)
  }

  /**
   * Gera + baixa todas as stylesheets (excluindo as externas por padrão).
   *
   * @param {Array}   logicTree       - A Logic Tree
   * @param {boolean} includeExternal - Incluir stylesheets externas? (default: false)
   */
  static downloadAll(logicTree, includeExternal = false) {
    const sheets = CssExportService.generateAll(logicTree)
    sheets.forEach(({ origin, sourceName, css }) => {
      if (!includeExternal && origin === 'external') return
      CssExportService.downloadFile(sourceName, css)
    })
  }

  // ─── Salvar via API (stub para PHP / WordPress) ─────────────────────────────

  /**
   * Envia o CSS de uma stylesheet para um endpoint de API.
   *
   * COMO IMPLEMENTAR:
   *   O endpoint deve aceitar POST com JSON:
   *   { "sourceName": "styles.css", "origin": "internal", "css": "body { ... }" }
   *
   *   Exemplo em PHP / WordPress:
   *   ```php
   *   $data = json_decode(file_get_contents('php://input'), true);
   *   file_put_contents(get_stylesheet_directory() . '/' . $data['sourceName'], $data['css']);
   *   ```
   *
   * @param {string} sourceName - Nome da stylesheet
   * @param {string} origin     - Origem ('on_page' | 'internal' | 'external')
   * @param {string} css        - Conteúdo CSS gerado
   * @param {string} endpoint   - URL da API (ex: '/wp-admin/admin-ajax.php?action=save_css')
   * @returns {Promise<any>}    - Resposta JSON do servidor
   * @throws {Error}            - Se endpoint não configurado ou servidor retornar erro
   */
  static async saveToServer(sourceName, origin, css, endpoint) {
    if (!endpoint) {
      throw new Error(
        '[CssExportService] saveToServer: endpoint não configurado.\n' +
        'Passe a URL da API como 4º argumento. Ver JSDoc para exemplo PHP/WP.'
      )
    }

    const response = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sourceName, origin, css }),
    })

    if (!response.ok) {
      throw new Error(
        `[CssExportService] Erro do servidor: ${response.status} ${response.statusText}`
      )
    }

    return response.json()
  }
}
