/**
 * config.js — Configuração do editor sem rebuild
 *
 * Edite este arquivo para apontar para o backend correto.
 * Não é necessário rebuildar a aplicação.
 */

window.__EDITOR_CONFIG__ = {

  /**
   * URL base pública onde os arquivos editáveis são servidos.
   * Usada para resolver URLs relativas (CSS, imagens, JS) no HTML carregado.
   * Deve terminar com barra.
   *
   * Exemplos:
   *   PHP/Laragon : 'http://editor.test/assets/'
   *   WordPress   : 'https://seusite.com/wp-content/themes/meutema/'
   */
  assetsBaseUrl: 'http://editor.test/assets/',

  // ── Endpoints da API ────────────────────────────────────────────────────────
  api: {
    listDocuments: { method: 'GET',    url: 'http://editor.test/api/?action=list_documents' },
    readDocument:  { method: 'GET',    url: 'http://editor.test/api/?action=read_document'  },
    saveDocument:  { method: 'POST',   url: 'http://editor.test/api/?action=save_document'  },
    listAssets:    { method: 'GET',    url: 'http://editor.test/api/?action=list_assets'    },
    saveAsset:     { method: 'POST',   url: 'http://editor.test/api/?action=save_asset'     },
    createAsset:   { method: 'POST',   url: 'http://editor.test/api/?action=create_asset'   },
    renameAsset:   { method: 'POST',   url: 'http://editor.test/api/?action=rename_asset'   },
    deleteAsset:   { method: 'DELETE', url: 'http://editor.test/api/?action=delete_asset'   },
  },

}
