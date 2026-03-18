/**
 * resolveRelativeUrls
 *
 * Converte URLs relativas de href/src/url() para absolutas baseadas em pageUrl.
 * URLs já absolutas passam sem alteração (new URL() garante isso).
 *
 * @param {string} html    - HTML bruto com possíveis URLs relativas
 * @param {string} pageUrl - URL base (ex: 'http://editor.test/assets/teste-2/')
 * @returns {string}
 */
export function resolveRelativeUrls(html, pageUrl) {
  // new URL('.', pageUrl) extrai o diretório corretamente:
  // 'http://editor.test/assets/teste-2/index.html' → 'http://editor.test/assets/teste-2/'
  // 'http://editor.test/assets/teste-2/'           → 'http://editor.test/assets/teste-2/'
  let baseUrl
  try {
    baseUrl = new URL('.', pageUrl).href
  } catch {
    return html // pageUrl inválida — retorna sem alteração
  }

  const resolve = (match, pre, url, post) => {
    try {
      return pre + new URL(url, baseUrl).href + post
    } catch {
      return match // URL inválida — deixa como está
    }
  }

  return html
    .replace(/(<link\b[^>]*\shref=")([^"]+)(")/gi, resolve)
    .replace(/(<script\b[^>]*\ssrc=")([^"]+)(")/gi, resolve)
    .replace(/(<img\b[^>]*\ssrc=")([^"]+)(")/gi, resolve)
    .replace(/(<source\b[^>]*\ssrc=")([^"]+)(")/gi, resolve)
    .replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
      try { return `url(${new URL(url, baseUrl).href})` }
      catch { return match }
    })
}
