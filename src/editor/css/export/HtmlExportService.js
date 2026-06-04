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

    // Clona o documento para não mutar o iframe em produção
    const clone = iframeDoc.documentElement.cloneNode(true)
    HtmlExportService._processSlots(clone)

    const doctype = '<!DOCTYPE html>\n'
    return doctype + clone.outerHTML
  }

  /**
   * Processa todos os elementos com data-slot no clone do documento,
   * aplicando as regras de export: data-slot-replace, data-slot-hide-empty,
   * e limpando atributos de controle do editor.
   * @param {HTMLElement} root
   */
  static _processSlots(root) {
    const SLOT_CONTROL_ATTRS = ['data-slot', 'data-slot-replace', 'data-slot-hide-empty', 'data-slot-no-fallback']

    // Processa do mais profundo para o mais superficial para evitar
    // que o replace quebre referências de nós ainda não processados
    const slots = Array.from(root.querySelectorAll('[data-slot]')).reverse()

    slots.forEach(el => {
      const isEmpty = el.children.length === 0 && el.textContent.trim() === ''
      const shouldReplace = el.hasAttribute('data-slot-replace')
      const shouldHideEmpty = el.hasAttribute('data-slot-hide-empty')

      // 1. Remover atributos de controle
      SLOT_CONTROL_ATTRS.forEach(attr => el.removeAttribute(attr))

      // 2. data-slot-hide-empty: remove o elemento se vazio
      if (shouldHideEmpty && isEmpty) {
        el.remove()
        return
      }

      // 3. data-slot-replace: substitui o elemento pelos seus filhos
      if (shouldReplace) {
        const parent = el.parentNode
        if (parent) {
          // Move todos os filhos para antes do elemento
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el)
          }
          el.remove()
        }
      }
    })
  }

  /**
   * Extrai o HTML de um elemento específico, removendo atributos internos do editor.
   * @param {HTMLElement} el 
   * @returns {string}
   */
  static generateNodeHtml(el) {
    if (!el) return ''
    const clone = el.cloneNode(true)
    
    // Limpeza recursiva de atributos internos
    const clean = (node) => {
      if (node.nodeType === 1) { // ELEMENT_NODE
        node.removeAttribute('data-node-id')
        node.removeAttribute('data-selected')
        node.removeAttribute('data-editor-hovered')
        node.removeAttribute('data-component') // O master não deve ter este atributo
        
        // Limpa recursivamente os filhos
        Array.from(node.children).forEach(clean)
      }
    }
    
    clean(clone)
    return clone.outerHTML
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
