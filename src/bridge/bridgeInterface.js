/** @placeholder — implementação futura @see docs/bridge-architecture.md */

/**
 * Cria e retorna o objeto window.__editorBridge
 * Interface pública acessada pelo editor via postMessage response
 */
export function createInterface(_config) {
  return {
    setEditorActive(active) {
      window.__editorActive = active
      // TODO: ativar/desativar supressão de eventos do CMS
    },

    beginResize() {
      // TODO: suprimir window.resize handlers do CMS
    },

    endResize() {
      // TODO: reabilitar window.resize handlers do CMS
    },

    rescanNodeIds() {
      // TODO: re-injetar data-node-id em elementos sem o atributo
    },

    getStyleSources() {
      // TODO: retornar lista de <style> e <link> do head com classificação
      return []
    },
  }
}
