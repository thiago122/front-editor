/**
 * gen-shorthand-map.mjs
 *
 * Gera o mapa shorthand → longhands-folha a partir do mdn-data (fonte de
 * verdade, derivada das specs W3C). Roda em BUILD-TIME — o resultado é colado
 * estaticamente em src/editor/css/shared/cssConstants.js (SHORTHAND_LEAVES).
 *
 * "Folha" = expansão recursiva: border → border-width → border-top-width…
 * Usado pelo calculateOverrides para detectar que `margin` sobrescreve
 * `margin-top` (comportamento do Chrome DevTools).
 *
 * Uso:
 *   node scripts/gen-shorthand-map.mjs
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const properties = require('mdn-data/css/properties.json')

const isShorthand = (name) =>
  Array.isArray(properties[name]?.computed) &&
  (properties[name].status === 'standard' || properties[name].status === 'experimental')

/** Expande recursivamente até as folhas (com guarda de ciclo). */
function leavesOf(name, seen = new Set()) {
  if (seen.has(name)) return []
  seen.add(name)
  if (!isShorthand(name)) return [name]
  return properties[name].computed.flatMap((c) => leavesOf(c, seen))
}

const shorthands = Object.keys(properties)
  .filter((name) => isShorthand(name) && !name.startsWith('--'))
  .sort()

console.log(`// ${shorthands.length} shorthands — gerado por scripts/gen-shorthand-map.mjs`)
console.log('export const SHORTHAND_LEAVES = {')
for (const name of shorthands) {
  const leaves = [...new Set(leavesOf(name))].sort()
  console.log(`  '${name}': [${leaves.map((l) => `'${l}'`).join(', ')}],`)
}
console.log('}')
