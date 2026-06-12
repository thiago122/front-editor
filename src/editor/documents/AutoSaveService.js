/**
 * AutoSaveService
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidades:
 *   Salvar e recuperar o HTML do editor no localStorage automaticamente,
 *   protegendo o trabalho do usuário em caso de falhas inesperadas.
 *
 * Para desenvolvedores júnior:
 *   - Esta classe é PURA: sem Vue, sem Pinia, sem dependências externas.
 *   - Todos os métodos são estáticos — use direto: AutoSaveService.save(html)
 *   - Somente o HTML é salvo. O CSS já vive dentro do HTML (tags <style>).
 *
 * Estrutura salva no localStorage:
 *   {
 *     html:    string,   // HTML completo do iframe
 *     savedAt: string    // ISO 8601 — ex: "2026-03-15T10:42:00.000Z"
 *   }
 *
 * Camadas relacionadas:
 *   HtmlExportService  →  AutoSaveService  →  localStorage
 *   EditorView.vue     →  AutoSaveService  →  localStorage
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Chave usada no localStorage. Mude aqui se precisar isolar entre projetos. */
const STORAGE_KEY = 'front-editor:autosave'

/** Intervalo padrão de auto-save em milissegundos (60 segundos). */
export const AUTOSAVE_INTERVAL_MS = 60_000

// ─── Serviço ──────────────────────────────────────────────────────────────────

export class AutoSaveService {

  // ─── Escrita ──────────────────────────────────────────────────────────────

  /**
   * Salva o HTML atual no localStorage com um timestamp ISO 8601.
   *
   * @param {string} html - HTML completo gerado pelo HtmlExportService
   * @returns {boolean}   - true se salvou com sucesso, false se houve erro
   *
   * @example
   *   const html = HtmlExportService.generateHtml(iframeDoc)
   *   AutoSaveService.save(html)
   */
  static save(html) {
    if (!html) {
      console.warn('[AutoSaveService] HTML vazio, save ignorado.')
      return false
    }

    try {
      const payload = JSON.stringify({ html, savedAt: new Date().toISOString() })
      localStorage.setItem(STORAGE_KEY, payload)
      console.log('[AutoSaveService] Sessão salva em', AutoSaveService.formatDate(new Date().toISOString()))
      return true
    } catch (error) {
      // Pode ocorrer se o localStorage estiver cheio (QuotaExceededError)
      console.error('[AutoSaveService] Falha ao salvar no localStorage:', error)
      return false
    }
  }

  /**
   * Remove o save do localStorage.
   * Chame após o usuário restaurar a sessão ou descartar o backup.
   */
  static clear() {
    localStorage.removeItem(STORAGE_KEY)
  }

  // ─── Leitura ──────────────────────────────────────────────────────────────

  /**
   * Verifica se existe um save disponível.
   *
   * @returns {boolean}
   */
  static hasSave() {
    return localStorage.getItem(STORAGE_KEY) !== null
  }

  /**
   * Carrega o save do localStorage.
   *
   * @returns {{ html: string, savedAt: string } | null}
   *   Retorna o objeto salvo, ou null se não houver save ou o dado for inválido.
   *
   * @example
   *   const save = AutoSaveService.load()
   *   if (save) {
   *     console.log('Salvo em:', save.savedAt)
   *     input.value = save.html
   *   }
   */
  static load() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    try {
      return JSON.parse(raw)
    } catch {
      console.warn('[AutoSaveService] Dado corrompido no localStorage. Limpando.')
      AutoSaveService.clear()
      return null
    }
  }

  // ─── Formatação ───────────────────────────────────────────────────────────

  /**
   * Formata a data de um save para exibição amigável ao usuário.
   *
   * @param {string} isoString - Data no formato ISO 8601 (vinda de `savedAt`)
   * @returns {string}         - Ex: "15/03/2026 às 10:42"
   *
   * @example
   *   AutoSaveService.formatDate(save.savedAt) // "15/03/2026 às 10:42"
   */
  static formatDate(isoString) {
    return new Date(isoString).toLocaleString('pt-BR', {
      day:    '2-digit',
      month:  '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    }).replace(',', ' às')
  }
}
