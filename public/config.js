/**
 * config.js — Configuração do editor sem rebuild
 *
 * Edite este arquivo para apontar para o backend correto.
 * Não é necessário rebuildar a aplicação.
 */

window.__EDITOR_CONFIG__ = {

  // ── Endpoints da API ────────────────────────────────────────────────────────
  api: {
    listDocuments:    { method: 'GET',    url: 'http://editor.test/api/?action=list_documents'      },
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
  },

}
