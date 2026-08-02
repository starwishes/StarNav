import type { Category, Item } from '@/types'

export interface CategoryTreeNode {
  id: number
  value?: number
  name: string
  label?: string
  parentId?: number | null
  level?: number
  children: CategoryTreeNode[]
}

export interface FlattenedOption {
  label: string
  value: string
}

export const buildCategoryTree = (categories: Category[]): CategoryTreeNode[] => {
  const nodeMap = new Map<number, CategoryTreeNode>()
  const tree: CategoryTreeNode[] = []

  categories.forEach((category) => {
    nodeMap.set(category.id, {
      id: category.id,
      value: category.id,
      name: category.name,
      label: category.name,
      children: []
    })
  })

  categories.forEach((category) => {
    const currentNode = nodeMap.get(category.id)
    if (!currentNode) {
      return
    }

    const parentNode =
      category.parentId === null || category.parentId === undefined
        ? null
        : nodeMap.get(category.parentId)

    if (parentNode) {
      parentNode.children.push(currentNode)
    } else {
      tree.push(currentNode)
    }
  })

  return tree
}

export const flattenCategoryTree = (nodes: CategoryTreeNode[], depth = 0): FlattenedOption[] => {
  return nodes.flatMap((node) => {
    const currentOption: FlattenedOption[] = [
      {
        value: String(node.value ?? node.id),
        label: `${'> '.repeat(depth)}${node.label ?? node.name}`
      }
    ]

    return currentOption.concat(flattenCategoryTree(node.children || [], depth + 1))
  })
}

export const cloneCategoryDraft = (category: Partial<Category> = {}): Partial<Category> => ({
  ...category
})

export const cloneItemDraft = (item: Partial<Item> = {}): Partial<Item> => ({
  ...item
})

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))

    reader.readAsDataURL(file)
  })
