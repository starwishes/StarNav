import { Comment, Fragment, type VNode } from 'vue'

export type SelectValue = string | number | null | undefined

export interface SelectOption {
  value: SelectValue
  label: string
  disabled: boolean
}

export const flattenNodes = (nodes: VNode[], acc: VNode[] = []): VNode[] => {
  nodes.forEach((node) => {
    if (!node || node.type === Comment) {
      return
    }

    if (node.type === Fragment && Array.isArray(node.children)) {
      flattenNodes(node.children as VNode[], acc)
      return
    }

    acc.push(node)
  })

  return acc
}

export const extractNodeText = (node: VNode | string | null | undefined): string => {
  if (!node) {
    return ''
  }

  if (typeof node === 'string') {
    return node
  }

  if (Array.isArray(node.children)) {
    return node.children.map((child) => extractNodeText(child as VNode | string)).join('')
  }

  if (typeof node.children === 'string') {
    return node.children
  }

  return ''
}

export const valueEquals = (left: SelectValue, right: SelectValue) => {
  if (left == null && right == null) {
    return true
  }

  return String(left ?? '') === String(right ?? '')
}

export const buildSelectOptionsFromSlots = (slotNodes: VNode[] | undefined): SelectOption[] =>
  flattenNodes(slotNodes ?? [])
    .filter((node) => node.type === 'option')
    .map((node) => ({
      value: node.props?.value as SelectValue,
      label: extractNodeText(node).trim(),
      disabled: Boolean(node.props?.disabled)
    }))

export interface MenuPositionInput {
  rootRect: DOMRect
  menuHeight: number
  optionCount: number
  viewportWidth: number
  viewportHeight: number
  viewportPadding?: number
  gap?: number
}

export const computeMenuPosition = ({
  rootRect,
  menuHeight,
  optionCount,
  viewportWidth,
  viewportHeight,
  viewportPadding = 12,
  gap = 8
}: MenuPositionInput): Record<string, string> => {
  const resolvedMenuHeight = menuHeight || Math.min(optionCount * 40 + 12, 320)
  const spaceBelow = viewportHeight - rootRect.bottom - viewportPadding
  const spaceAbove = rootRect.top - viewportPadding
  const openAbove = spaceBelow < resolvedMenuHeight && spaceAbove > spaceBelow
  const top = openAbove
    ? Math.max(viewportPadding, rootRect.top - resolvedMenuHeight - gap)
    : rootRect.bottom + gap
  const left = Math.min(
    Math.max(viewportPadding, rootRect.left),
    Math.max(viewportPadding, viewportWidth - rootRect.width - viewportPadding)
  )
  const maxHeight = Math.max(160, openAbove ? spaceAbove - gap : spaceBelow - gap)

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${rootRect.width}px`,
    maxHeight: `${maxHeight}px`
  }
}

export const getOptionKey = (option: SelectOption, index: number) =>
  `${String(option.value ?? '')}-${index}`
