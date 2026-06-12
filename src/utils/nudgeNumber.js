/**
 * Numeric scrubbing — encontra o número mais próximo do cursor numa string
 * CSS e ajusta pelo delta. Suporta inteiros, decimais e negativos dentro de
 * valores compostos como '1px 2em', 'rgba(0, 128, 255, 0.5)', 'translateX(-50%)'.
 *
 * @param {string} str       — valor atual do input
 * @param {number} cursorPos — selectionStart do input
 * @param {number} delta     — ±1, ±10 (Shift), ±0.1 (Alt)
 * @returns {{ newValue: string, selectionStart: number, selectionEnd: number } | null}
 *          null se não há número sob o cursor (caller mantém comportamento padrão)
 */
export function nudgeNumberAtCursor(str, cursorPos, delta) {
  const numberRegex = /-?\d*\.?\d+/g
  let match
  while ((match = numberRegex.exec(str)) !== null) {
    const start = match.index
    const end = start + match[0].length
    // Cursor dentro ou imediatamente adjacente ao número
    if (cursorPos >= start && cursorPos <= end) {
      const original = match[0]
      const newVal = parseFloat(original) + delta

      // Preserva casas decimais: max entre o original e o delta
      const origDec = (original.split('.')[1] ?? '').length
      const deltaDec = (String(Math.abs(delta)).split('.')[1] ?? '').length
      const precision = Math.max(origDec, deltaDec)
      const newStr = precision > 0 ? newVal.toFixed(precision) : String(Math.round(newVal))

      return {
        newValue: str.slice(0, start) + newStr + str.slice(end),
        selectionStart: start,
        selectionEnd: start + newStr.length,
      }
    }
  }
  return null
}
