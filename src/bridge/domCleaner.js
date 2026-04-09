/** @placeholder — implementação futura @see docs/bridge-architecture.md */
export function setupDomCleaner(config) {
  if (config.neutralizeDocumentWrite) {
    document.write   = () => {}
    document.writeln = () => {}
  }
  // TODO: remover elementos de config.removeOnLoad após DOMContentLoaded
}
