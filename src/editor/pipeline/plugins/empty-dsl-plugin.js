export function emptyDSLPlugin() {
  return {
    name: 'empty-dsl',

    tokenize(ctx) {
      // futuro: detectar {{ }} ou comentários especiais
    },

    transformAST(ctx) {
      // futuro: transformar AST
    },
  }
}
