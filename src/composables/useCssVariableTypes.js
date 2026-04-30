/**
 * Composable e lógica pura para classificar variáveis CSS baseadas no nome (Nomenclatura / Tokens)
 */

const PREFIX_MAP = [
  // 1. Cores e Gradientes
  { prefixes: ['--color-', '--bg-', '--border-color-'], type: 'color' },
  { prefixes: ['--gradient-'], type: 'gradient' },
  // 2. Tipografia
  { prefixes: ['--font-family-'], type: 'font-family' },
  { prefixes: ['--font-size-'], type: 'size' },
  { prefixes: ['--font-weight-'], type: 'weight' },
  // 3. Sombras
  { prefixes: ['--shadow-', '--box-shadow-'], type: 'shadow' },
  // 4. Bordas (Radius)
  { prefixes: ['--radius-', '--border-radius-'], type: 'size' },
  // 5. Z-Index
  { prefixes: ['--z-', '--z-index-'], type: 'number' },
  // 6. Tamanhos e Espaçamentos (Regra mais genérica por último)
  { prefixes: ['--spacing-', '--size-', '--width-', '--height-', '--padding-', '--margin-', '--gap-', '--top-', '--bottom-', '--left-', '--right-'], type: 'size' }
];

/**
 * Inferir o tipo visual de uma variável CSS com base no seu nome.
 * @param {string} variableName Nome da variável (ex: "--color-primary")
 * @returns {'color' | 'size' | 'font-family' | 'weight' | 'shadow' | 'number' | 'raw'}
 */
export function getVariableTypeFromName(variableName) {
  if (!variableName || !variableName.startsWith('--')) return 'raw';

  const nameLower = variableName.toLowerCase();

  for (const mapping of PREFIX_MAP) {
    if (mapping.prefixes.some(prefix => nameLower.startsWith(prefix))) {
      return mapping.type;
    }
  }

  return 'raw'; // Fallback
}

export function useCssVariableTypes() {
  return {
    getVariableTypeFromName
  }
}
