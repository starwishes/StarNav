type RecordLike = Record<string, unknown>

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)

const pickValue = (record: RecordLike, keys: string[]) => {
  for (const key of keys) {
    if (hasOwn(record, key)) {
      return record[key]
    }
  }

  return undefined
}

export const normalizeDbCategoryId = (categoryId: unknown) => {
  if (categoryId === undefined || categoryId === null) {
    return null
  }

  const normalizedCategoryId = Number(categoryId)
  return Number.isInteger(normalizedCategoryId) && normalizedCategoryId > 0
    ? normalizedCategoryId
    : null
}

export const normalizeApiCategoryId = (categoryId: unknown) => {
  const normalizedCategoryId = Number(categoryId)
  return Number.isInteger(normalizedCategoryId) && normalizedCategoryId > 0
    ? normalizedCategoryId
    : 0
}

export const normalizeDbParentId = (parentId: unknown) => {
  if (parentId === undefined || parentId === null) {
    return null
  }

  const normalizedParentId = Number(parentId)
  return Number.isInteger(normalizedParentId) && normalizedParentId > 0 ? normalizedParentId : null
}

export const mapBookmarkRow = (
  item: RecordLike | null | undefined,
  { includeSortOrder = false }: { includeSortOrder?: boolean } = {}
) => {
  if (!item) {
    return null
  }

  const mappedItem: RecordLike = {
    ...item,
    id: Number(item.id),
    categoryId: normalizeApiCategoryId(pickValue(item, ['categoryId', 'category_id'])),
    level: Number(item.level || 0),
    pinned: !!pickValue(item, ['pinned']),
    clickCount: Number(pickValue(item, ['clickCount', 'click_count']) || 0)
  }

  const lastVisited = pickValue(item, ['lastVisited', 'last_visited'])
  if (lastVisited !== undefined) {
    mappedItem.lastVisited = lastVisited
  }

  const sortOrder = pickValue(item, ['sortOrder', 'sort_order'])
  if (includeSortOrder && sortOrder !== undefined) {
    mappedItem.sortOrder = Number(sortOrder || 0)
  }

  return mappedItem
}

export const mapCategoryRow = (
  category: RecordLike | null | undefined,
  { includeSortOrder = false }: { includeSortOrder?: boolean } = {}
) => {
  if (!category) {
    return null
  }

  const mappedCategory: RecordLike = {
    ...category,
    id: Number(category.id),
    level: Number(category.level || 0),
    parentId: normalizeDbParentId(pickValue(category, ['parentId', 'parent_id']))
  }

  const sortOrder = pickValue(category, ['sortOrder', 'sort_order'])
  if (includeSortOrder && sortOrder !== undefined) {
    mappedCategory.sortOrder = Number(sortOrder || 0)
  }

  return mappedCategory
}

export const mapBookmarkSearchResult = (item: RecordLike | null | undefined) => {
  if (!item) {
    return null
  }

  return {
    id: Number(item.id),
    name: item.name,
    url: item.url,
    description: item.description,
    categoryId: normalizeApiCategoryId(pickValue(item, ['categoryId', 'category_id'])),
    // 后端不烘焙展示文案：无分类时返回 null，由前端按 locale 渲染"未分类"
    categoryName: (item.categoryName as string | undefined) ?? null
  }
}
