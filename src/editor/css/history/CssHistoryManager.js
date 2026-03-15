// src/editor/css/history/CssHistoryManager.js
//
// Gerenciador de histórico para operações CSS.
//
// Estratégia: snapshot antes/depois de cada mutação.
// Diferença do HTML HistoryManager (inverse-operation):
//   - HTML: cada primitiva grava o seu inverso explícito
//   - CSS:  snapshot da logicTree antes da ação → restaura no Undo
//
// O snapshot exclui arquivos 'external' (read-only) para economizar memória.
//
// API pública espelha o HistoryManager do HTML:
//   cssHistory.snapshot(logicTree)       — chame ANTES de mutar
//   cssHistory.commit(logicTree)         — chame DEPOIS (captura estado pós-mutação)
//   cssHistory.undo(logicTree, applyFn)  — restaura estado anterior
//   cssHistory.redo(logicTree, applyFn)  — refaz estado posterior
//   cssHistory.canUndo / canRedo         — para a UI

import { reactive } from 'vue'

// ─── Helpers de snapshot ─────────────────────────────────────────────────────

/**
 * Serializa a logicTree excluindo arquivos externos (read-only).
 * Retorna uma string JSON que pode ser restaurada com deserialize().
 *
 * @param {Array} logicTree
 * @returns {string}
 */
function serialize(logicTree) {
  if (!logicTree) return '[]'
  const editable = logicTree.filter(file => file.origin !== 'external')
  return JSON.stringify(editable)
}

/**
 * Desserializa um snapshot e faz merge de volta na logicTree.
 * Os arquivos 'external' são preservados pois não entram no snapshot.
 *
 * @param {Array}  logicTree  — referência reativa ATUAL
 * @param {string} snapshot   — snapshot gerado por serialize()
 */
function deserialize(logicTree, snapshot) {
  if (!logicTree) return

  const restored = JSON.parse(snapshot)

  // Remove todos os arquivos editáveis da lista atual
  const externals = logicTree.filter(file => file.origin === 'external')

  // Reconstrói: externos (preservados) + restaurados
  logicTree.splice(0, logicTree.length, ...externals, ...restored)
}

// ─── Classe ──────────────────────────────────────────────────────────────────

class CssHistoryManager {
  /**
   * @param {number} limit  — máximo de entradas no histórico
   */
  constructor(limit = 50) {
    this.limit      = limit
    this.undoStack  = []  // Array de { before: string, after: string }
    this.redoStack  = []

    /** Snapshot pendente (capturado antes da mutação). */
    this._pending = null
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  /**
   * Captura o estado ANTES da mutação.
   * Deve ser chamado imediatamente antes de alterar a logicTree.
   *
   * @param {Array} logicTree
   */
  snapshot(logicTree) {
    this._pending = serialize(logicTree)
  }

  /**
   * Finaliza a entrada de histórico com o estado APÓS a mutação.
   * Deve ser chamado depois que a logicTree foi alterada.
   * Se não houver snapshot pendente, não faz nada.
   *
   * @param {Array} logicTree
   */
  commit(logicTree) {
    if (this._pending === null) return

    const after = serialize(logicTree)

    // Só grava se algo realmente mudou
    if (this._pending !== after) {
      this.undoStack.push({ before: this._pending, after })
      this.redoStack = []
      this._trim()
    }

    this._pending = null
  }

  /**
   * Desfaz a última mutação CSS.
   *
   * @param {Array}    logicTree  — referência reativa da cssLogicTree
   * @param {Function} applyFn   — callback para sincronizar ao DOM após restaurar
   *                               ex: () => styleStore.applyMutation(doc)
   */
  undo(logicTree, applyFn) {
    if (this.undoStack.length === 0) return

    const entry = this.undoStack.pop()
    this.redoStack.push(entry)

    deserialize(logicTree, entry.before)
    applyFn()
  }

  /**
   * Refaz a última mutação desfeita.
   *
   * @param {Array}    logicTree
   * @param {Function} applyFn
   */
  redo(logicTree, applyFn) {
    if (this.redoStack.length === 0) return

    const entry = this.redoStack.pop()
    this.undoStack.push(entry)

    deserialize(logicTree, entry.after)
    applyFn()
  }

  /** @returns {boolean} */
  get canUndo() { return this.undoStack.length > 0 }

  /** @returns {boolean} */
  get canRedo() { return this.redoStack.length > 0 }

  // ── Interno ─────────────────────────────────────────────────────────────────

  _trim() {
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }
  }
}

// Singleton reativo — mesmo padrão do HTML HistoryManager
export const cssHistory = reactive(new CssHistoryManager())
