/**
 * config.js — Configuração do editor sem rebuild
 *
 * Edite este arquivo para apontar para o backend correto.
 * Não é necessário rebuildar a aplicação.
 *
 * ── Backends disponíveis ────────────────────────────────────────────────────
 *   'standalone' → api/index.php (padrão, sem WordPress)
 *   'wordpress'  → wp-json/visual-editor/v1/ (plugin WP)
 */

window.__EDITOR_CONFIG__ = {

  // ── Backend ─────────────────────────────────────────────────────────────────
  backend: 'standalone', // 'standalone' | 'wordpress'

  // ── Endpoints da API (standalone) ──────────────────────────────────────────
  // Ignorado quando backend === 'wordpress' (usar apiBase abaixo)
  api: {
    listDocuments:    { method: 'GET',    url: 'http://editor.test/api/?action=list_documents'      },
    createDocument:   { method: 'POST',   url: 'http://editor.test/api/?action=create_document'     },
    readDocument:     { method: 'GET',    url: 'http://editor.test/api/?action=read_document'       },
    saveDocument:     { method: 'POST',   url: 'http://editor.test/api/?action=save_document'       },
    listAssets:       { method: 'GET',    url: 'http://editor.test/api/?action=list_assets'         },
    saveAsset:        { method: 'POST',   url: 'http://editor.test/api/?action=save_asset'          },
    createAsset:      { method: 'POST',   url: 'http://editor.test/api/?action=create_asset'        },
    renameAsset:      { method: 'POST',   url: 'http://editor.test/api/?action=rename_asset'        },
    deleteAsset:      { method: 'DELETE', url: 'http://editor.test/api/?action=delete_asset'        },
    reorderAssets:    { method: 'POST',   url: 'http://editor.test/api/?action=reorder_assets'      },
    saveManifest:     { method: 'POST',   url: 'http://editor.test/api/?action=save_manifest'       },
    trashAsset:       { method: 'POST',   url: 'http://editor.test/api/?action=trash_asset'         },
    restoreFromTrash: { method: 'POST',   url: 'http://editor.test/api/?action=restore_from_trash'  },
    listTrash:        { method: 'GET',    url: 'http://editor.test/api/?action=list_trash'          },
    
    // Novas ações de Gerenciamento de Documentos e Pastas
    renameDocument:   { method: 'POST',   url: 'http://editor.test/api/?action=rename_document'     },
    trashDocument:    { method: 'POST',   url: 'http://editor.test/api/?action=trash_document'      },
    createFolder:     { method: 'POST',   url: 'http://editor.test/api/?action=create_folder'       },
    renameFolder:     { method: 'POST',   url: 'http://editor.test/api/?action=rename_folder'       },
    trashFolder:      { method: 'POST',   url: 'http://editor.test/api/?action=trash_folder'        },
  },

  // ── WordPress (ignorado em standalone) ─────────────────────────────────────
  // apiBase e nonce são injetados via wp_localize_script() quando em modo WP.
  // Exemplo de configuração WP:
  //
  // window.__EDITOR_CONFIG__ = {
  //   backend: 'wordpress',
  //   apiBase: 'https://meusite.com/wp-json/visual-editor/v1',
  //   nonce:   'abc123...',
  //   docId:   123,
  // }

}
