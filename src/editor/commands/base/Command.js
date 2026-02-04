// src/editor/commands/Command.js
export class Command {
  execute() {
    throw new Error('Método execute() deve ser implementado')
  }
  undo() {
    throw new Error('Método undo() deve ser implementado')
  }
}
