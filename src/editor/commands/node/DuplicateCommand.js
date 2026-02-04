export class DuplicateCommand {
  constructor(nodeId, { manipulation }) {
    this.nodeId = nodeId
    this.manipulation = manipulation
  }

  execute() {
    return this.manipulation.duplicate(this.nodeId)
  }
}
