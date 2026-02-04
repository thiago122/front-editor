export class AppendCommand {
  constructor(parentId, html, { manipulation }) {
    this.parentId = parentId
    this.html = html
    this.manipulation = manipulation
  }

  execute() {
    this.manipulation.append(this.parentId, this.html)
  }
}
