export function emptyDSLPlugin() {
  return {
    name: 'empty-dsl',

    tokenize(_ctx) {
      // futuro: detectar {{ }} ou comentários especiais
    },

    transformAST(_ctx) {
      // futuro: transformar AST
    },
  }
}
