export class CopyCommand {
  constructor(nodeId, { manipulation }) {
    this.nodeId = nodeId
    this.manipulation = manipulation
  }

  execute() {
    return this.manipulation.copy(this.nodeId) // Returns clipboard object
  }
}
