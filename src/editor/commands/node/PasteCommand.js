export class PasteCommand {
  constructor(targetId, clipboardData, { manipulation }) {
    this.targetId = targetId
    this.clipboardData = clipboardData
    this.manipulation = manipulation
  }

  execute() {
    return this.manipulation.paste(this.targetId, this.clipboardData)
  }
}
