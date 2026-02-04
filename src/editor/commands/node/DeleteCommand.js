// src/editor/commands/node/DeleteCommand.js

export class DeleteCommand {
  constructor(nodeId, { manipulation }) {
    this.nodeId = nodeId
    this.manipulation = manipulation
  }

  execute() {
    // A engine gerencia validação, DOM sync e histórico (Undo) automagicamente
    this.manipulation.remove(this.nodeId)
  }
}
