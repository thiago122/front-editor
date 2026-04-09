import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Build de biblioteca para o Editor Bridge.
 * Gera um arquivo IIFE auto-contido que não depende de Vue/Pinia.
 * Destinado a ser injetado pelo backend dentro do iframe do CMS.
 */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/bridge/editor-bridge.js'),
      name: 'EditorBridge',
      formats: ['iife'],
      fileName: () => 'bridge.iife.js',
    },
    outDir: 'dist/bridge',
    emptyOutDir: true,
    rollupOptions: {
      // Garante que não haja dependências externas no bundle final
      external: [],
    },
  },
});
