// src/editor/history/UnifiedHistoryManager.js
//
// Gerenciador de histórico UNIFICADO para o editor.
//
// Arquitetura: Command Pattern
//   - Uma única pilha cronológica de comandos (Commands)
//   - Cada Command sabe se desfazer (undo) e refazer (redo)
//   - Domínios independentes (HTML, CSS, JS futuro...) registram
//     seus próprios Commands sem que o manager saiba os detalhes
//
// Dois tipos de Command embutidos:
//
//   HtmlCommand  — estratégia "inverse-operation" (como estava antes)
//                  Cada operação da ManipulationEngine grava sua inversa.
//                  Undo executa as inversas → captura as novas inversas → Redo.
//
//   CssCommand   — estratégia "snapshot before/after"
//                  Tira foto da logicTree antes e depois da mutação.
//                  Undo restaura "before"; Redo restaura "after".
//
// Para adicionar um novo domínio (ex: JS):
//   const cmd = createGenericCommand(
//     () => editor.setValue(before),  // undo
//     () => editor.setValue(after),   // redo
//   )
//   unifiedHistory.push(cmd)

import { reactive } from 'vue'

// ─── CSS helpers ──────────────────────────────────────────────────────────────

/**
 * Serializa a logicTree excluindo arquivos externos (read-only).
 * @param {Array} logicTree
 * @returns {string}
 */
function serializeCss(logicTree) {
  const editable = logicTree.filter(f => f.origin !== 'external')
  return JSON.stringify(editable)
}

/**
 * Restaura um snapshot na logicTree, preservando os arquivos externos.
 * Modifica o array em place para manter a referência reativa.
 * @param {Array}  logicTree
 * @param {string} snapshot
 */
function deserializeCss(logicTree, snapshot) {
  const restored  = JSON.parse(snapshot)
  const externals = logicTree.filter(f => f.origin === 'external')
  logicTree.splice(0, logicTree.length, ...externals, ...restored)
}

// ─── Command factories ────────────────────────────────────────────────────────

/**
 * Cria um HtmlCommand a partir de um array de operações inversas.
 *
 * Quando undo() é chamado:
 *   1. As ops (inversas da ação original) são executadas pela engine
 *   2. A engine gera novas inversas via history.record() → capturadas no buffer
 *   3. As novas inversas viram um novo HtmlCommand → push no redoStack
 *
 * redo() tem a mesma mecânica (porque a engine sempre gera inversas).
 *
 * @param {Object[]} ops         — operações inversas a executar
 * @param {Object}   historyRef  — referência ao UnifiedHistoryManager (para _captureBuffer e _engine)
 * @returns {Object} Command
 */
function createHtmlCommand(ops, historyRef) {
  async function run() {
    const buffer = []
    historyRef._captureBuffer = buffer
    try {
      for (const op of ops) {
        await historyRef._engine.applyOperation(op)
      }
    } finally {
      historyRef._captureBuffer = null
    }
    return buffer.length > 0
      ? createHtmlCommand(buffer.reverse(), historyRef)
      : null
  }

  return {
    _type: 'html',
    undo: run,
    redo: run, // mesma mecânica: execute ops → capture inverses
  }
}

/**
 * Cria um CssCommand a partir de snapshots before/after.
 *
 * @param {string}   before     — snapshot JSON da logicTree antes da mutação
 * @param {string}   after      — snapshot JSON da logicTree após a mutação
 * @param {Array}    logicTree  — referência ao array real (para modificar in-place)
 * @param {Function} applyFn   — sincroniza logicTree → DOM + notifica Vue
 * @returns {Object} Command
 */
function createCssCommand(before, after, logicTree, applyFn) {
  return {
    _type: 'css',
    undo() { deserializeCss(logicTree, before); applyFn() },
    redo() { deserializeCss(logicTree, after);  applyFn() },
  }
}

/**
 * Fábrica genérica: qualquer domínio pode criar um Command
 * passando apenas as duas funções.
 *
 * @param {Function} undoFn
 * @param {Function} redoFn
 * @param {string}   [type='generic']
 * @returns {Object} Command
 */
export function createGenericCommand(undoFn, redoFn, type = 'generic') {
  return {
    _type: type,
    undo: undoFn,
    redo: redoFn,
  }
}

// ─── UnifiedHistoryManager ────────────────────────────────────────────────────

class UnifiedHistoryManager {
  /**
   * @param {number} limit — máximo de entradas no histórico
   */
  constructor(limit = 50) {
    this.limit = limit
    this.undoStack = []  // Command[]
    this.redoStack = []  // Command[]

    // ── HTML: engine reference (set by ManipulationEngine constructor)
    this._engine = null

    // ── HTML: acumulador de operações inversas para transações
    this._currentTransaction = null

    // ── HTML: durante undo/redo, redireciona record() para este buffer
    this._captureBuffer = null

    // ── CSS: snapshot pendente (before), aguardando commit
    this._cssPending = null
  }

  // ── Registro da engine ─────────────────────────────────────────────────────

  /**
   * Registra a ManipulationEngine. Chamado no constructor da engine.
   * Necessário para HtmlCommand executar applyOperation() durante undo/redo.
   * @param {Object} engine
   */
  setEngine(engine) {
    this._engine = engine
  }

  // ── Interface HTML (inverse-operation) ────────────────────────────────────

  /**
   * Inicia uma transação: agrupa múltiplas operações em um único undo.
   * Se já existe transação aberta, não faz nada (nested implícito).
   */
  beginTransaction() {
    if (this._currentTransaction) return
    this._currentTransaction = []
  }

  /**
   * Grava uma operação inversa.
   * Durante undo/redo: redireciona para _captureBuffer.
   * Com transação aberta: acumula na transação.
   * Sem transação: cria entry unitária imediatamente.
   * @param {Object} op — { type: string, args: any[] }
   */
  record(op) {
    // 1. Durante undo/redo: captura inversa no buffer (não vai para a pilha)
    if (this._captureBuffer !== null) {
      this._captureBuffer.push(op)
      return
    }

    // 2. Com transação aberta: acumula
    if (this._currentTransaction !== null) {
      this._currentTransaction.push(op)
      return
    }

    // 3. Operação unitária: push direto
    this._pushHtmlCommand([op])
  }

  /**
   * Fecha e consolida a transação corrente.
   * As operações são revertidas (LIFO) para execução correta no undo.
   */
  commit() {
    if (!this._currentTransaction) return
    const ops = this._currentTransaction.reverse()
    this._currentTransaction = null
    if (ops.length > 0) this._pushHtmlCommand(ops)
  }

  /** Descarta a transação corrente sem gravar. */
  rollback() {
    this._currentTransaction = null
  }

  _pushHtmlCommand(ops) {
    this.undoStack.push(createHtmlCommand(ops, this))
    this.redoStack = []
    this._trim()
  }

  // ── Interface CSS (snapshot) ───────────────────────────────────────────────

  /**
   * Tira snapshot ANTES da mutação CSS.
   * Chamar imediatamente antes de alterar a logicTree.
   *
   * @param {Array}    logicTree — styleStore.cssLogicTree (array raw, auto-unwrapped pelo Pinia)
   * @param {Function} applyFn  — () => styleStore.applyMutation(doc)
   *                              Função que sincroniza logicTree → DOM + notifica Vue.
   *                              Deve obter o `doc` dinamicamente dentro da função.
   */
  snapshotCss(logicTree, applyFn) {
    this._cssPending = {
      before:    serializeCss(logicTree),
      logicTree, // referência para modify in-place no undo/redo
      applyFn,
    }
  }

  /**
   * Finaliza o registro da operação CSS com o estado APÓS a mutação.
   * Só grava se algo realmente mudou.
   * Chamar após applyMutation().
   *
   * @param {Array} logicTree — mesmo array passado em snapshotCss()
   */
  commitCss(logicTree) {
    if (!this._cssPending) return
    const { before, logicTree: tree, applyFn } = this._cssPending
    this._cssPending = null

    const after = serializeCss(logicTree ?? tree)
    if (before === after) return // nenhuma mudança real

    this.undoStack.push(createCssCommand(before, after, tree, applyFn))
    this.redoStack = []
    this._trim()
  }

  /** Descarta snapshot CSS pendente (ex: quando a operação não alterou nada). */
  discardCssSnapshot() {
    this._cssPending = null
  }

  /**
   * Remove TODOS os Commands CSS das pilhas.
   * Chamar quando a logicTree for reconstruída do zero (rebuildLogicTree),
   * pois os snapshots antigos referem um array que não existe mais.
   */
  clearCssHistory() {
    this.undoStack = this.undoStack.filter(cmd => cmd._type !== 'css')
    this.redoStack = this.redoStack.filter(cmd => cmd._type !== 'css')
  }

  // ── Interface genérica ─────────────────────────────────────────────────────

  /**
   * Empurra qualquer Command externo diretamente na pilha.
   * Use com `createGenericCommand()` para domínios customizados.
   * @param {Object} command — { undo: Function, redo: Function }
   */
  push(command) {
    this.undoStack.push(command)
    this.redoStack = []
    this._trim()
  }

  // ── Undo / Redo ────────────────────────────────────────────────────────────

  /**
   * Desfaz a última operação registrada (qualquer domínio, ordem cronológica).
   */
  async undo() {
    if (!this.undoStack.length) return
    const cmd     = this.undoStack.pop()
    const redoCmd = await cmd.undo()
    // HtmlCommand retorna um novo Command (as inversas das inversas)
    // CssCommand retorna undefined → reutiliza o mesmo command (tem before/after)
    this.redoStack.push(redoCmd ?? cmd)
  }

  /**
   * Refaz a última operação desfeita (qualquer domínio, ordem cronológica).
   */
  async redo() {
    if (!this.redoStack.length) return
    const cmd     = this.redoStack.pop()
    const undoCmd = await cmd.redo()
    this.undoStack.push(undoCmd ?? cmd)
  }

  // ── Helpers para a UI ──────────────────────────────────────────────────────

  /** @returns {boolean} */
  get canUndo() { return this.undoStack.length > 0 }

  /** @returns {boolean} */
  get canRedo() { return this.redoStack.length > 0 }

  // ── Interno ────────────────────────────────────────────────────────────────

  _trim() {
    if (this.undoStack.length > this.limit) this.undoStack.shift()
  }
}

// Singleton reativo — padrão idêntico ao HistoryManager anterior.
// reactive() torna canUndo/canRedo observáveis pelo Vue sem computed extras.
export const unifiedHistory = reactive(new UnifiedHistoryManager(120))
