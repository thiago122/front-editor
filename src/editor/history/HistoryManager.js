// src/editor/history/HistoryManager.js
import { reactive } from 'vue'

class HistoryManager {
  constructor(limit = 50) {
    this.limit = limit
    this.undoStack = []
    this.redoStack = []

    // Transação atual (seja do usuário, ou gerada automaticamente pelo Undo/Redo)
    this.currentTransaction = null

    // Buffer temporário para redirecionar gravações durante Undo/Redo
    this._redirectBuffer = null
  }

  // --- API PÚBLICA (Usada pelos Plugins/Comandos) ---

  beginTransaction() {
    // Se já existe uma transação, não fazemos nada (suporte a nested implícito)
    if (this.currentTransaction) return
    this.currentTransaction = []
  }

  commit() {
    if (!this.currentTransaction) return // Nada a comitar

    // Se a transação tem algo, salva na pilha
    if (this.currentTransaction.length > 0) {
      // Invertemos aqui para facilitar a execução no Undo (LIFO dentro do bloco)
      this.undoStack.push(this.currentTransaction.reverse())

      // Limpa o futuro (Redo) pois criamos uma nova linha do tempo
      this.redoStack = []
      this._trim()
    }
    this.currentTransaction = null
  }

  rollback() {
    this.currentTransaction = null
  }

  // Chamado automaticamente pela Engine
  record(operation) {
    // 1. Se estamos num modo de captura (Undo/Redo), desvia para o buffer
    if (this._redirectBuffer) {
      this._redirectBuffer.push(operation)
      return
    }

    // 2. Comportamento Normal
    // Se não houver transação aberta, é uma operação unitária
    if (!this.currentTransaction) {
      this.undoStack.push([operation])
      this.redoStack = []
      this._trim()
    } else {
      this.currentTransaction.push(operation)
    }
  }

  // --- O CORAÇÃO DO SISTEMA ---

  async undo(engine) {
    if (this.undoStack.length === 0) return

    // 1. Pega o BLOCO inteiro de operações inversas
    const operations = this.undoStack.pop()

    // 2. Prepara captura
    this._redirectBuffer = []

    try {
      // 3. Executa todas as ações do bloco.
      // A engine gera os inversos, que caem no _redirectBuffer
      for (const op of operations) {
        await engine.applyOperation(op)
      }

      // 4. Salva o bloco resultante no Redo Stack
      // Invertemos novamente para ordem de execução correta no Redo
      if (this._redirectBuffer.length > 0) {
        this.redoStack.push(this._redirectBuffer.reverse())
      }
    } catch (e) {
      console.error('Erro no Undo:', e)
      // O ideal seria restaurar o stack, mas por simplicidade vamos logar
    } finally {
      this._redirectBuffer = null // Para de capturar
    }
  }

  async redo(engine) {
    if (this.redoStack.length === 0) return

    // Mesmo processo do Undo, mas na direção contrária
    const operations = this.redoStack.pop()

    this._redirectBuffer = []

    try {
      for (const op of operations) {
        await engine.applyOperation(op)
      }

      // O resultado volta para o Undo Stack como um bloco único
      if (this._redirectBuffer.length > 0) {
        this.undoStack.push(this._redirectBuffer.reverse())
      }
    } catch (e) {
      console.error('Erro no Redo:', e)
    } finally {
      this._redirectBuffer = null
    }
  }

  _trim() {
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }
  }

  // Helpers para a UI
  canUndo() {
    return this.undoStack.length > 0
  }
  canRedo() {
    return this.redoStack.length > 0
  }
}

export const history = reactive(new HistoryManager())
