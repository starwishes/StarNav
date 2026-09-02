import { ref, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import { useI18n } from 'vue-i18n'
import type { Category, Item, ImportedBookmarkItem } from '@/types'
import { parseJsonBackupPayload, type ParsedJsonBackup } from '@/utils/jsonBackup'
import { isSafeHttpUrl } from '@common/security/urlSafety'
import { normalizeUrl } from '@common/url'

const cloneCategories = (source: Category[]) => source.map((category) => ({ ...category }))
const cloneItems = (source: Item[]) => source.map((item) => ({ ...item }))

export interface CleanDuplicatesResult {
  deleted: number
  ids: number[]
}

/**
 * 导入导出 Composable
 * 负责数据的导入导出和书签导入逻辑
 */
export function useImportExport(
  categories: Ref<Category[]>,
  items: Ref<Item[]>,
  saveDataSync: () => Promise<void>
) {
  const { t } = useI18n()
  const showBookmarkImport = ref(false)

  const persistImportedData = async (
    nextCategories: Category[],
    nextItems: Item[],
    successMessage: string
  ) => {
    const previousCategories = cloneCategories(categories.value)
    const previousItems = cloneItems(items.value)

    categories.value = nextCategories
    items.value = nextItems

    try {
      await saveDataSync()
      ElMessage.success(successMessage)
    } catch (error) {
      categories.value = previousCategories
      items.value = previousItems
      throw error
    }
  }

  /**
   * JSON 导入
   */
  const handleJsonImport = async (
    backup: ParsedJsonBackup | { categories: Category[]; items: Item[] } | { content: unknown }
  ) => {
    const parsedBackup = parseJsonBackupPayload(backup)

    if (!parsedBackup) {
      ElMessage.error(t('admin.jsonError'))
      return false
    }

    const { content } = parsedBackup

    const nextCategories = cloneCategories(categories.value)
    const nextItems = cloneItems(items.value)
    let maxCatId = nextCategories.reduce((max, cat) => Math.max(max, cat.id), 0)
    let maxItemId = nextItems.reduce((max, item) => Math.max(max, item.id), 0)

    const catMapping: Record<number, number> = {}
    const currentCatNames = new Map<string, number>()
    nextCategories.forEach((cat) => {
      currentCatNames.set(cat.name, cat.id)
    })
    // Dedup keys are normalized (same key function as handleCleanDuplicates:
    // strips trailing slashes, lowercases the origin) so https://x.com and
    // https://x.com/ collide.
    const existingUrls = new Set(nextItems.map((item) => normalizeUrl(item.url)))

    // 1. 合并分类
    // 第一遍：为每个导入分类计算目标 id（同名并入现存分类；否则分配新 id）
    content.categories.forEach((cat) => {
      const existingCategoryId = currentCatNames.get(cat.name)
      if (existingCategoryId !== undefined) {
        catMapping[Number(cat.id)] = existingCategoryId
      } else {
        maxCatId += 1
        catMapping[Number(cat.id)] = maxCatId
        currentCatNames.set(cat.name, maxCatId)
      }
    })

    // 第二遍：按映射构建新分类，并把备份 id 空间的 parentId 重映射到目标 id 空间。
    // 无映射 / 0 / null 一律归为根分类，避免子分类挂到同 id 现存分类或悬空。
    content.categories.forEach((cat) => {
      const targetId = catMapping[Number(cat.id)]
      if (nextCategories.some((existing) => existing.id === targetId)) {
        return // 已并入现存同名分类
      }

      const newCat = { ...cat, id: targetId }
      const rawParentId = cat.parentId
      if (rawParentId !== undefined && rawParentId !== null) {
        const numericParentId = Number(rawParentId)
        newCat.parentId = numericParentId > 0 ? (catMapping[numericParentId] ?? null) : null
      }
      nextCategories.push(newCat)
    })

    // 2. 合并书签（按规范化 URL 去重）
    let addedCount = 0
    content.items.forEach((item) => {
      const candidateUrl = typeof item.url === 'string' ? item.url.trim() : ''
      // Drop javascript:/data:/empty or otherwise unsafe imported URLs before
      // they enter the store.
      if (!candidateUrl || !isSafeHttpUrl(candidateUrl)) {
        return
      }
      const dedupKey = normalizeUrl(candidateUrl)
      if (existingUrls.has(dedupKey)) {
        return
      }
      maxItemId += 1
      const newItem = {
        ...item,
        id: maxItemId,
        url: candidateUrl,
        categoryId: catMapping[item.categoryId] ?? 0
      }
      nextItems.push(newItem)
      existingUrls.add(dedupKey)
      addedCount += 1
    })

    try {
      await persistImportedData(
        nextCategories,
        nextItems,
        t('admin.importSuccess', { count: addedCount })
      )
      return true
    } catch {
      return false
    }
  }

  /**
   * 浏览器书签导入
   */
  const handleBookmarkImport = async (data: {
    categories: string[]
    items: ImportedBookmarkItem[]
  }) => {
    const nextCategories = cloneCategories(categories.value)
    const nextItems = cloneItems(items.value)
    let maxCatId = nextCategories.reduce((max, cat) => Math.max(max, cat.id), 0)
    let maxItemId = nextItems.reduce((max, item) => Math.max(max, item.id), 0)

    const catNameToId = new Map<string, number>()
    nextCategories.forEach((cat) => {
      catNameToId.set(cat.name, cat.id)
    })
    const existingUrls = new Set(nextItems.map((item) => normalizeUrl(item.url)))

    data.categories.forEach((catName) => {
      if (!catNameToId.has(catName)) {
        maxCatId += 1
        nextCategories.push({ id: maxCatId, name: catName })
        catNameToId.set(catName, maxCatId)
      }
    })

    let addedCount = 0
    data.items.forEach((item) => {
      const candidateUrl = typeof item.url === 'string' ? item.url.trim() : ''
      if (!candidateUrl || !isSafeHttpUrl(candidateUrl)) {
        return
      }
      const dedupKey = normalizeUrl(candidateUrl)
      if (existingUrls.has(dedupKey)) {
        return
      }
      maxItemId += 1
      nextItems.push({
        id: maxItemId,
        name: item.name,
        url: candidateUrl,
        description: item.description || '',
        categoryId: catNameToId.get(item.categoryName) ?? nextCategories[0]?.id ?? 0,
        pinned: false,
        level: 0
      })
      existingUrls.add(dedupKey)
      addedCount += 1
    })

    await persistImportedData(
      nextCategories,
      nextItems,
      t('admin.importSuccess', { count: addedCount })
    )

    return addedCount
  }

  /**
   * 清理重复数据
   */
  const handleCleanDuplicates = async (): Promise<CleanDuplicatesResult> => {
    // 1. 按规范化 URL 分组
    const groups: Record<string, Item[]> = {}
    items.value.forEach((item) => {
      const key = normalizeUrl(item.url)
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })

    // 2. 识别重复项
    const duplicates: Item[] = []
    Object.values(groups).forEach((group) => {
      if (group.length > 1) {
        group.sort((a, b) => {
          const clicksA = a.clickCount || 0
          const clicksB = b.clickCount || 0
          if (clicksA !== clicksB) return clicksB - clicksA
          return a.id - b.id
        })
        for (let i = 1; i < group.length; i++) {
          duplicates.push(group[i])
        }
      }
    })

    if (duplicates.length === 0) {
      ElMessage.info(t('manage.noDuplicates'))
      return { deleted: 0, ids: [] }
    }

    try {
      await ElMessageBox.confirm(t('manage.cleanConfirm'), t('manage.cleanDuplicates'), {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      })

      return {
        deleted: duplicates.length,
        ids: duplicates.map((i) => i.id)
      }
    } catch {
      // 用户取消
      return { deleted: 0, ids: [] }
    }
  }

  return {
    showBookmarkImport,
    handleJsonImport,
    handleBookmarkImport,
    handleCleanDuplicates,
    normalizeUrl
  }
}
