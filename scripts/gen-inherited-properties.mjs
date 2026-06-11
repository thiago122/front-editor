/**
 * gen-inherited-properties.mjs
 *
 * Gera a lista de propriedades CSS herdadas a partir do mdn-data (fonte de verdade,
 * derivada das specs W3C). Roda em BUILD-TIME — o resultado é colado estaticamente
 * em src/editor/css/shared/cssConstants.js (INHERITED_PROPERTIES).
 *
 * Não embarcamos o mdn-data no bundle: ele é apenas devDependency deste gerador.
 *
 * Uso:
 *   node scripts/gen-inherited-properties.mjs
 *
 * Critério: inherited === true, status 'standard' ou 'experimental'
 * (exclui obsolete/nonstandard para evitar ruído de vendor legado), sem custom props.
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const properties = require('mdn-data/css/properties.json')

const inherited = Object.entries(properties)
  .filter(([name, def]) =>
    def.inherited === true &&
    (def.status === 'standard' || def.status === 'experimental') &&
    !name.startsWith('--')
  )
  .map(([name]) => name)
  .sort()

// Imprime o array literal pronto para colar em cssConstants.js
const lines = []
for (let i = 0; i < inherited.length; i += 6) {
  lines.push('  ' + inherited.slice(i, i + 6).map((p) => `'${p}'`).join(', ') + ',')
}

console.log(`// ${inherited.length} propriedades herdadas — gerado por scripts/gen-inherited-properties.mjs`)
console.log('export const INHERITED_PROPERTIES = [')
console.log(lines.join('\n'))
console.log(']')
