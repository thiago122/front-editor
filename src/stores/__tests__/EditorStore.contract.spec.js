import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '../EditorStore.js'

// ─── Contrato da API pública do EditorStore ───────────────────────────────────
// 44 arquivos consomem este store. Este teste congela o shape do return:
// qualquer fatia (stores/editor/*Slice.js) que esquecer um membro no spread
// quebra AQUI, não silenciosamente na UI.
// Ao adicionar um membro novo de propósito, adicione-o à lista.

const PUBLIC_API = [
  // Painéis flutuantes (panelsSlice)
  'triggerInlineEdit', 'htmlEditor', 'cssFileEditor', 'quickCodeEditor',
  'pixelPerfectEditor', 'variablesPanel', 'quickAttributesOpen',
  'openCodeEditor', 'visualEditor', 'toggleVisualPanel', 'bringPanelToTop',
  'selectorRenameConfirm',
  // AST core
  'ctx', 'ast', 'astMutationKey', 'notifyAstMutation', 'openPath',
  'loadHTML', 'pipeline', 'manipulation', 'getParent', 'getNode',
  // Seleção / hover
  'selectNode', 'selectedNode', 'selectedNodeId', 'selectedElement',
  'hoveredElement', 'hoveredNodeId', 'selectParent', 'clearSelection',
  'handleHover',
  // Inspect / overlays
  'inspectMode', 'showBoxModel', 'outlineMode', 'showEmptyPlaceholder',
  'applyEditorStyles', 'activate', 'deactivate', 'showCssExplorer',
  // Arquivos / documentos
  'fileHandle', 'fileName', 'currentDocument', 'openFile', 'saveFile',
  'saveFileAs', 'openDocument', 'openDocumentByPath', 'saveDocument',
  'fileAccessSupported', 'saveState',
  // Iframe / viewport
  'iframe', 'previewContainer', 'getIframeDoc', 'viewport', 'setViewport',
  'previewBreakpoint', 'setPreviewBreakpoint',
  // Clipboard / histórico / feedback
  'clipboard', 'canPaste', 'undo', 'redo', 'isBlinking', 'startBlink',
  // Componentes
  'refreshComponentInstances', 'unlockedComponentIds', 'unlockComponent',
  'lockComponent', 'isNodeInsideLockedComponent',
]

describe('EditorStore — contrato da API pública', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('expõe exatamente os membros do contrato', () => {
    const store = useEditorStore()
    const keys = Object.keys(store)
      .filter((k) => !k.startsWith('$') && !k.startsWith('_'))
      .sort()
    expect(keys).toEqual([...PUBLIC_API].sort())
  })

  it('funções do contrato são funções', () => {
    const store = useEditorStore()
    const fns = [
      'openCodeEditor', 'toggleVisualPanel', 'bringPanelToTop', 'loadHTML',
      'notifyAstMutation', 'selectNode', 'clearSelection', 'selectParent',
      'handleHover', 'getIframeDoc', 'getParent', 'getNode', 'undo', 'redo',
      'startBlink', 'activate', 'deactivate', 'openFile', 'saveFile',
      'saveFileAs', 'openDocument', 'openDocumentByPath', 'saveDocument',
      'setViewport', 'setPreviewBreakpoint', 'unlockComponent',
      'lockComponent', 'isNodeInsideLockedComponent',
      'refreshComponentInstances',
    ]
    for (const fn of fns) {
      expect(typeof store[fn], `${fn} deve ser função`).toBe('function')
    }
  })

  it('estado inicial básico', () => {
    const store = useEditorStore()
    expect(store.selectedNodeId).toBeNull()
    expect(store.showCssExplorer).toBe(false)
    expect(store.inspectMode).toBe(true)
    expect(store.outlineMode).toBe(true)
    expect(store.canPaste).toBe(false)
    expect(store.htmlEditor.show).toBe(false)
    expect(store.visualEditor.panels.layout.show).toBe(false)
  })

  it('openCodeEditor roteia html/css/quick', () => {
    const store = useEditorStore()
    store.openCodeEditor('html', 'n1')
    expect(store.htmlEditor.show).toBe(true)
    expect(store.htmlEditor.targetId).toBe('n1')

    store.openCodeEditor('css', 'rule::abc', { x: 10, y: 20 })
    expect(store.quickCodeEditor.show).toBe(true)
    expect(store.quickCodeEditor.x).toBe(10)

    store.openCodeEditor('css', 'file.css')
    expect(store.cssFileEditor.show).toBe(true)
    expect(store.quickCodeEditor.show).toBe(false) // quick fecha ao abrir outro
  })

  it('toggleVisualPanel abre, alterna e traz pra frente', () => {
    const store = useEditorStore()
    store.toggleVisualPanel('rule-1', 'layout', { x: 5, y: 6 })
    const panel = store.visualEditor.panels.layout
    expect(panel.show).toBe(true)
    expect(panel.x).toBe(5)
    expect(store.visualEditor.activeRuleUid).toBe('rule-1')

    // Mesma regra → toggle fecha
    store.toggleVisualPanel('rule-1', 'layout')
    expect(panel.show).toBe(false)

    // Regra nova → reabre
    store.toggleVisualPanel('rule-2', 'layout')
    expect(panel.show).toBe(true)
    expect(store.visualEditor.activeRuleUid).toBe('rule-2')
  })
})
