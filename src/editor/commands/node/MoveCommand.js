export class MoveCommand {
  constructor(nodeId, direction, { manipulation }) {
    this.nodeId = nodeId
    this.direction = direction
    this.manipulation = manipulation
  }

  execute() {
    this.manipulation.move(this.nodeId, this.direction)
  }
}
