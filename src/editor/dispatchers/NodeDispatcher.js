// src/editor/dispatchers/NodeDispatcher.js
import { useEditorStore } from '@/stores/EditorStore'
import { DeleteCommand } from '@/editor/commands/node/DeleteCommand'
import { AppendCommand } from '@/editor/commands/node/AppendCommand'
import { MoveCommand } from '@/editor/commands/node/MoveCommand'
import { CopyCommand } from '@/editor/commands/node/CopyCommand'
import { PasteCommand } from '@/editor/commands/node/PasteCommand'
import { DuplicateCommand } from '@/editor/commands/node/DuplicateCommand'

export const NodeDispatcher = {
  deleteNode(nodeId) {
    const store = useEditorStore()
    const cmd = new DeleteCommand(nodeId, {
      manipulation: store.manipulation,
    })
    cmd.execute()
  },

  appendElement(parentId, html) {
    const store = useEditorStore()
    const cmd = new AppendCommand(parentId, html, {
      manipulation: store.manipulation,
    })
    cmd.execute()
  },

  moveNode(nodeId, direction) {
    const store = useEditorStore()
    const cmd = new MoveCommand(nodeId, direction, {
      manipulation: store.manipulation,
    })
    cmd.execute()
  },

  copyNode(nodeId) {
    const store = useEditorStore()
    const cmd = new CopyCommand(nodeId, {
      manipulation: store.manipulation,
    })
    const result = cmd.execute()
    if (result) store.clipboard = result
  },

  pasteNode(targetId) {
    const store = useEditorStore()
    const cmd = new PasteCommand(targetId, store.clipboard, {
      manipulation: store.manipulation,
    })
    const newNode = cmd.execute()
    if (newNode) store.selectedNodeId = newNode.nodeId
  },

  duplicateNode(nodeId) {
    const store = useEditorStore()
    const cmd = new DuplicateCommand(nodeId, {
      manipulation: store.manipulation,
    })
    const newNode = cmd.execute()
    if (newNode) store.selectedNodeId = newNode.nodeId
  },
}
