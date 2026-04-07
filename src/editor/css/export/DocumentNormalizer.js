/**
 * DocumentNormalizer
 *
 * Centraliza toda a lógica de preparação do HTML para o editor e para o disco.
 * Substitui a lógica que estava distribuída entre FileManager.php e EditorStore.js.
 *
 * Fluxo:
 *   - Ao abrir: prepareForEditor(html, manifest, baseUrl)
 *       → injeta <link> com URLs absolutas no iframe
 *       → preserva <link data-location="ignore"> verbatim
 *   - Ao salvar: prepareForSave(html, manifest, docPath)
 *       → remove estilos inline do editor
 *       → injeta <link> com hrefs relativos limpos
 *       → preserva externos e ignore
 */

export class DocumentNormalizer {

  /**
   * Prepara o HTML bruto do backend para exibição no iframe do editor.
   *
   * O que faz:
   *  1. Remove todos os <link rel="stylesheet"> existentes (internal, external, ignore)
   *  2. Remove <style data-location="internal"> que possam ter sobrado de save anterior
   *  3. Injeta os <link> do manifesto com URLs absolutas (baseUrl + path)
   *     – internal  → data-location="internal" data-manifest-path="..."
   *     – external  → data-location="external" (preservado como read-only)
   *     – ignore    → data-location="ignore" (não injetado pelo manifesto — já estava no HTML)
   *
   * Links com data-location="ignore" que existiam no HTML original NÃO são
   * removidos nem reinjetados — ficam exatamente onde estavam. Não fazemos
   * nada especial com eles; apenas os internal/external do manifesto são gerenciados.
   *
   * @param {string} html       HTML bruto vindo do backend
   * @param {Array<{path:string,type:string}>} manifest  Manifesto do backend
   * @param {string} baseUrl    URL base para resolver paths internos (ex: 'http://editor.test/assets/')
   * @returns {string}          HTML pronto para o iframe
   */
  static prepareForEditor(html, manifest, baseUrl) {
    const base = (baseUrl || '').replace(/\/$/, '')

    // 1. Separa links "ignore" do restante ANTES de limpar
    const ignoreLinks = []
    const linkPattern = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi
    let match
    while ((match = linkPattern.exec(html)) !== null) {
      const tag = match[0]
      if (/\bdata-location=["']ignore["']/i.test(tag)) {
        ignoreLinks.push(tag)
      }
    }

    // 2. Remove todos os <link rel="stylesheet"> (os ignore voltam abaixo)
    html = html.replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, '')

    // 3. Remove <style data-location="internal"> residuais
    html = html.replace(
      /<style\b[^>]*\bdata-location=["']internal["'][^>]*>[\s\S]*?<\/style>/gi,
      ''
    )

    // 4. Gera <link> do manifesto com URLs absolutas
    const newLinks = manifest
      .filter(e => e.type !== 'ignore') // ignore: já estava no HTML original, não reinjetamos
      .map(({ path, type }) => {
        const href = type === 'internal'
          ? `${base}/${path.replace(/^\//, '')}`
          : path // external: já é URL absoluta
        const locAttr = `data-location="${type}"`
        const manifestAttr = type === 'internal' ? ` data-manifest-path="${path}"` : ''
        return `<link rel="stylesheet" href="${href}" ${locAttr}${manifestAttr}>`
      })
      .join('\n  ')

    // Readiciona os ignore links do HTML original após os do manifesto
    const allNewLinks = ignoreLinks.length
      ? newLinks + '\n  ' + ignoreLinks.join('\n  ')
      : newLinks

    // 5. Injeta logo após <head>
    return html.replace(/(<head\b[^>]*>)/i, `$1\n  ${allNewLinks}`)
  }

  /**
   * Prepara o HTML do iframe para salvar em disco.
   *
   * O que faz:
   *  1. Parse via DOMParser para manipulação segura
   *  2. Remove <style data-location="internal"> injetados pelo editor
   *  3. Remove todos os <link rel="stylesheet"> exceto os "ignore"
   *  4. Injeta <link> do manifesto com hrefs **relativos** ao docPath
   *     – internal  → href relativo (ex: '../../css/site.css')
   *     – external  → href absoluto, sem atributos do editor
   *     – ignore    → preservados verbatim (não tocados)
   *
   * @param {string} html       HTML serializado do iframe (já passou pelos hooks)
   * @param {Array<{path:string,type:string}>} manifest  Manifesto atual
   * @param {string} docPath    Caminho relativo do documento (ex: 'subpasta/index.html')
   * @returns {string}          HTML pronto para gravar em disco
   */
  static prepareForSave(html, manifest, docPath) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const head = doc.head

    // 1. Remove <style data-location="internal">
    head.querySelectorAll('style[data-location="internal"]').forEach(el => el.remove())

    // 2. Coleta links "ignore" ANTES de limpar (verbatim via outerHTML)
    const ignoreLinks = []
    head.querySelectorAll('link[rel="stylesheet"][data-location="ignore"]').forEach(el => {
      ignoreLinks.push(el.outerHTML)
    })

    // 3. Remove todos os <link rel="stylesheet">
    head.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove())

    // 4. Calcula prefixo relativo com base na profundidade do documento
    const depth = (docPath || '').replace(/^\//, '').split('/').length - 1
    const prefix = depth > 0 ? '../'.repeat(depth) : ''

    // 5. Insere os <link> do manifesto (na ordem do manifesto)
    const fragment = doc.createDocumentFragment()

    manifest.forEach(({ path, type }) => {
      if (type === 'ignore') return // os ignore já foram coletados acima

      const link = doc.createElement('link')
      link.rel = 'stylesheet'

      if (type === 'internal') {
        link.href = prefix + path.replace(/^\//, '')
        // Sem atributos data-location no HTML salvo (arquivo de produção limpo)
      } else {
        // external: mantém href absoluto, sem atributos do editor
        link.href = path
      }

      fragment.appendChild(link)
      fragment.appendChild(doc.createTextNode('\n  '))
    })

    // Reinsere os ignore links verbatim (como texto, para preservar todos os attrs originais)
    ignoreLinks.forEach(tagStr => {
      const temp = doc.createElement('template')
      temp.innerHTML = tagStr
      const cloned = temp.content.firstElementChild
      if (cloned) {
        fragment.appendChild(cloned)
        fragment.appendChild(doc.createTextNode('\n  '))
      }
    })

    // Insere no início do <head> (após qualquer <meta charset> que possa existir)
    const firstChild = head.firstChild
    head.insertBefore(fragment, firstChild)

    // Preserva o DOCTYPE original se presente, caso contrário adiciona
    const hasDoctype = /^\s*<!doctype/i.test(html)
    return (hasDoctype ? '' : '<!DOCTYPE html>\n') + doc.documentElement.outerHTML
  }
}
