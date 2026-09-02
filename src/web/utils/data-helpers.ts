import type { Category, Item, SiteConfig } from '@/types'

type RawCategory = Partial<Omit<Category, 'id' | 'name' | 'level' | 'parentId'>> & {
  id?: number | string
  name?: unknown
  level?: number | string
  parentId?: number | string | null
}

type RawItem = Partial<Omit<Item, 'id' | 'name' | 'categoryId' | 'level' | 'pinned'>> & {
  id?: number | string
  name?: unknown
  categoryId?: number | string
  level?: number | string
  pinned?: unknown
}

interface RawSiteConfig {
  categories?: RawCategory[] | null
  items?: RawItem[] | null
}

const normalizeParentId = (parentId: RawCategory['parentId']) => {
  if (parentId === null || parentId === undefined || parentId === '') {
    return null
  }

  const normalized = Number(parentId)
  if (Number.isNaN(normalized) || normalized === 0) {
    return null
  }

  return normalized
}

/**
 * 将平铺的分类和书签数据转换为树形结构
 */
export const buildCategoryTree = (categories: Category[], items: Item[]): Category[] => {
  // 1. 预处理：建立书签映射
  const itemMap = new Map<number, Item[]>()
  items.forEach((item) => {
    if (!itemMap.has(item.categoryId)) {
      itemMap.set(item.categoryId, [])
    }
    itemMap.get(item.categoryId)?.push(item)
  })

  // 2. 预处理：深拷贝分类并初始化
  const catMap = new Map<number, Category>()
  const cats: Category[] = categories.map((c) => {
    const newCat = {
      ...c,
      children: [],
      content: itemMap.get(c.id) || []
    }
    catMap.set(c.id, newCat)
    return newCat
  })

  const roots: Category[] = []

  // 3. 构建层级关系
  // 写入侧已拦截新环，但历史数据/导入异常仍可能残留 parentId 环（A→B→A）。
  // 直接按 parentId 挂载会产出互相包含 children 的循环结构，导致
  // filterTree/collectTreeItems 等递归遍历无限递归 → RangeError。
  // 这里在挂载前沿 parentId 链向上回溯：若目标父级其实是该节点的后代，
  // 则挂载会成环，改把该节点作为根分类处理（成环节点不再深入）。
  const formsCycle = (catId: number, parentId: number): boolean => {
    let current: Category | undefined = catMap.get(parentId)
    const visited = new Set<number>()
    while (current && current.parentId && !visited.has(current.id)) {
      if (current.id === catId) {
        return true
      }
      visited.add(current.id)
      current = catMap.get(current.parentId)
    }
    return current?.id === catId
  }

  cats.forEach((c) => {
    if (c.parentId && catMap.has(c.parentId) && !formsCycle(c.id, c.parentId)) {
      catMap.get(c.parentId)?.children?.push(c)
    } else {
      roots.push(c)
    }
  })

  return roots
}

/**
 * 清洗从 API 获取的原始数据，确保类型健壮
 */
export const sanitizeApiData = (content: RawSiteConfig | null | undefined): SiteConfig => {
  const categories = (content?.categories || []).map((c) => ({
    ...c,
    id: Number(c.id),
    name: String(c.name || ''),
    level: Number(c.level || 0),
    parentId: normalizeParentId(c.parentId)
  }))

  const seenIds = new Set<number>()
  const rawItems = Array.isArray(content?.items) ? content.items : []
  const items = rawItems
    .filter((i) => {
      if (!i || !i.name) return false
      const id = Number(i.id)
      if (isNaN(id) || seenIds.has(id)) return false
      seenIds.add(id)
      return true
    })
    .map((i) => ({
      id: Number(i.id),
      name: String(i.name || ''),
      url: String(i.url || ''),
      description: i.description || '',
      categoryId: Number(i.categoryId),
      level: Number(i.level || 0),
      pinned: !!i.pinned,
      clickCount: i.clickCount !== undefined ? Number(i.clickCount || 0) : undefined,
      lastVisited: i.lastVisited || undefined,
      icon: i.icon || ''
    }))

  return { categories, items }
}
