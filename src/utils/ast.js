// utils/ast.js

/**
 * Busca profunda por ID: Retorna o nó ou null
 */
export function findNodeById(node, targetId) {
  if (!node || !targetId) return null
  if (node.nodeId === targetId) return node

  const children = node.children || []
  for (const child of children) {
    const found = findNodeById(child, targetId)
    if (found) return found
  }
  return null
}

/**
 * Busca o caminho (Breadcrumb): Retorna array de nós da raiz até o alvo
 */
export function findPath(node, targetId, path = []) {
  if (!node) return null
  const currentPath = [...path, node]

  if (node.nodeId === targetId) return currentPath

  for (const child of node.children || []) {
    const result = findPath(child, targetId, currentPath)
    if (result) return result
  }
  return null
}

/**
 * Busca o pai e o índice: Vital para splice (remover/inserir antes/depois)
 */
export function findParentAndIndex(root, id) {
  if (!root || !root.children) return { parent: null, index: -1 }

  const index = root.children.findIndex((c) => c.nodeId === id)
  if (index !== -1) return { parent: root, index }

  for (const child of root.children) {
    const result = findParentAndIndex(child, id)
    if (result.parent) return result
  }
  return { parent: null, index: -1 }
}

/**
 * Clona um nó e gera novos IDs recursivamente
 * Essencial para a função .clone() da Engine
 */
export function cloneAndRegenerate(node, generateIdFn) {
  const newNode = {
    ...node,
    nodeId: generateIdFn(), // Novo ID único
    attrs: { ...node.attrs }, // Deep copy dos atributos
    children: [],
  }

  if (node.children) {
    newNode.children = node.children.map((child) => cloneAndRegenerate(child, generateIdFn))
  }

  return newNode
}

export function findParentNode(root, targetId) {
  const { parent } = findParentAndIndex(root, targetId)
  return parent
}

export function getCleanNode(node) {
  if (!node) return null

  // Clonagem profunda simples
  const newNode = JSON.parse(JSON.stringify(node))

  const removeIdRecursive = (n) => {
    if (n.attrs) {
      delete n.attrs['data-node-id']
    }
    if (n.children) {
      n.children.forEach(removeIdRecursive)
    }
  }

  removeIdRecursive(newNode)
  return newNode
}
