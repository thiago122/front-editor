import { useEditorStore } from '@/stores/EditorStore'

/**
 * HtmlExportService
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidades:
 *   1. Extrair o HTML atual do iframe (estado live, incluindo edições)
 *   2. Disparar download de arquivo .html no navegador
 *   3. Enviar HTML para um endpoint de API (stub para PHP / WordPress)
 *
 * Para desenvolvedores júnior:
 *   - Esta classe NÃO muta nada — só lê o iframe e gera texto.
 *   - O HTML exportado reflete o estado atual do DOM (após todas as edições).
 *   - Para salvar via API no futuro, implemente apenas o método `saveToServer`.
 *
 * Camadas relacionadas:
 *   EditorStore.iframe  →  HtmlExportService  →  download / API
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class HtmlExportService {

  // ─── Geração ────────────────────────────────────────────────────────────────

  /**
   * Extrai o HTML completo do iframe no estado atual.
   * Inclui todas as edições feitas no editor (DOM live).
   *
   * @param {Document} iframeDoc - Documento do iframe (EditorStore.getIframeDoc())
   * @returns {string} HTML completo com doctype
   */
  static generateHtml(iframeDoc) {
    if (!iframeDoc) {
      console.warn('[HtmlExportService] iframeDoc não disponível.')
      return ''
    }
    const doctype = '<!DOCTYPE html>\n'
    return doctype + iframeDoc.documentElement.outerHTML
  }

  // ─── Download (navegador) ───────────────────────────────────────────────────

  /**
   * Dispara o download do HTML atual como arquivo.
   *
   * @param {Document} iframeDoc - Documento do iframe
   * @param {string}   filename  - Nome do arquivo (default: 'index.html')
   */
  static downloadFile(iframeDoc, filename = 'index.html') {
    const html = HtmlExportService.generateHtml(iframeDoc)
    if (!html) return

    const name = filename.endsWith('.html') ? filename : `${filename}.html`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
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

  // ─── Salvar via API (stub para PHP / WordPress) ─────────────────────────────

  /**
   * Envia o HTML atual para um endpoint de API.
   *
   * COMO IMPLEMENTAR:
   *   O endpoint deve aceitar POST com JSON:
   *   { "filename": "index.html", "html": "<!DOCTYPE html>..." }
   *
   *   Exemplo em PHP / WordPress:
   *   ```php
   *   $data = json_decode(file_get_contents('php://input'), true);
   *   file_put_contents(get_stylesheet_directory() . '/' . $data['filename'], $data['html']);
   *   ```
   *
   * @param {Document} iframeDoc - Documento do iframe
   * @param {string}   filename  - Nome do arquivo no servidor
   * @param {string}   endpoint  - URL da API (ex: '/wp-admin/admin-ajax.php?action=save_html')
   * @returns {Promise<any>}    - Resposta JSON do servidor
   * @throws {Error}            - Se endpoint não configurado ou servidor retornar erro
   */
  static async saveToServer(iframeDoc, filename, endpoint) {
    if (!endpoint) {
      throw new Error(
        '[HtmlExportService] saveToServer: endpoint não configurado.\n' +
        'Passe a URL da API como 3º argumento. Ver JSDoc para exemplo PHP/WP.'
      )
    }

    const html = HtmlExportService.generateHtml(iframeDoc)
    if (!html) throw new Error('[HtmlExportService] HTML vazio, abortando envio.')

    const response = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ filename, html }),
    })

    if (!response.ok) {
      throw new Error(
        `[HtmlExportService] Erro do servidor: ${response.status} ${response.statusText}`
      )
    }

    return response.json()
  }
}
