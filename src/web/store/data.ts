import { defineStore } from 'pinia'
import { ref } from 'vue'

import { dataApi } from '@/api'
import type { Category, Item, SiteConfig } from '@/types'
import {
  batchMoveItemsLocally,
  buildSyncPayload,
  cloneCategories,
  cloneItems,
  findDuplicateItemByUrl,
  moveItemLocally as moveItemStateLocally,
  normalizeCategory,
  normalizeItem,
  removeCategoryLocally as removeCategoryStateLocally,
  replaceItemLocally as replaceItemStateLocally
} from '@/store/dataStoreHelpers'
import { sanitizeApiData } from '@/utils/data-helpers'
import { ElMessage } from '@/utils/feedback'
import { createScopedLogger } from '../../shared/logger.js'

const logger = createScopedLogger('web:data-store')

export const useDataStore = defineStore('data', () => {
  const categories = ref<Category[]>([])
  const items = ref<Item[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const initialized = ref(false)
  /** In-flight load so concurrent callers share one request (search + homepage). */
  let loadDataPromise: Promise<void> | null = null

  const applyLoadedContent = (content: SiteConfig | null | undefined) => {
    const sanitized = sanitizeApiData(content)
    categories.value = sanitized.categories
    items.value = sanitized.items
    initialized.value = true
  }

  const withSaving = async <T>(operation: () => Promise<T>): Promise<T> => {
    saving.value = true
    try {
      return await operation()
    } finally {
      saving.value = false
    }
  }

  const appendCategory = (category: Category) => {
    categories.value = [...categories.value, category]
  }

  const replaceCategory = (category: Category) => {
    categories.value = categories.value.map((existing) =>
      existing.id === category.id ? category : existing
    )
  }

  const removeCategoryLocally = (id: number) => {
    const nextState = removeCategoryStateLocally(categories.value, items.value, id)
    categories.value = nextState.categories
    items.value = nextState.items
  }

  const appendItem = (item: Item) => {
    items.value = [...items.value, item]
  }

  const replaceItem = (item: Item, { appendToCategoryEnd = false } = {}) => {
    items.value = replaceItemStateLocally(items.value, item, { appendToCategoryEnd })
  }

  const snapshotState = () => ({
    categories: cloneCategories(categories.value),
    items: cloneItems(items.value)
  })

  const restoreState = (snapshot: { categories: Category[]; items: Item[] }) => {
    categories.value = snapshot.categories
    items.value = snapshot.items
  }

  const loadData = async () => {
    if (loadDataPromise) {
      return loadDataPromise
    }

    loadDataPromise = (async () => {
      loading.value = true
      try {
        applyLoadedContent(await dataApi.getContent())
      } catch (error) {
        logger.error('Failed to load data.', error)
        const message = error instanceof Error ? error.message : '加载失败'
        ElMessage.error('加载失败: ' + message)
      } finally {
        loading.value = false
        loadDataPromise = null
      }
    })()

    return loadDataPromise
  }

  // NOTE: Full-content sync is a last-write-wins wholesale replace — the client
  // POSTs the whole tree to /api/data and the server responds by DELETE-all +
  // INSERT-all. This is intentional for import flows (the imported snapshot
  // becomes the source of truth), but it means concurrent editors can silently
  // overwrite each other's changes. Do not change this behavior.
  const sync = async (action?: string) => {
    await withSaving(async () => {
      await dataApi.saveContent(buildSyncPayload(categories.value, items.value, action))
    }).catch((error) => {
      logger.error('Full content sync failed.', error)
      const message = error instanceof Error ? error.message : '保存失败'
      ElMessage.error(message)
      throw error
    })
  }

  const addCategory = async (catData: Partial<Category>): Promise<Category> =>
    withSaving(async () => {
      const createdCategory = await dataApi.addCategory(catData)
      if (!createdCategory) {
        throw new Error('分类创建失败')
      }

      const normalizedCategory = normalizeCategory(createdCategory)
      appendCategory(normalizedCategory)
      return normalizedCategory
    })

  const updateCategory = async (catData: Partial<Category>) => {
    if (!catData.id) {
      return
    }

    await withSaving(async () => {
      const updatedCategory = await dataApi.updateCategory(Number(catData.id), catData)
      if (!updatedCategory) {
        throw new Error('分类更新失败')
      }

      replaceCategory(normalizeCategory(updatedCategory))
    })
  }

  const deleteCategory = async (id: number) => {
    const targetId = Number(id)
    if (!categories.value.some((category) => category.id === targetId)) {
      return
    }

    await withSaving(async () => {
      await dataApi.deleteCategory(targetId)
      removeCategoryLocally(targetId)
    })
  }

  const moveCategory = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= categories.value.length) {
      return
    }

    const originalCategories = [...categories.value]
    const reorderedCategories = [...categories.value]
    const [moved] = reorderedCategories.splice(fromIndex, 1)
    reorderedCategories.splice(toIndex, 0, moved)
    categories.value = reorderedCategories

    try {
      const updatedCategories = await withSaving(() =>
        dataApi.reorderCategories(reorderedCategories.map((category) => category.id))
      )

      if (updatedCategories.length > 0) {
        categories.value = updatedCategories.map((category) => normalizeCategory(category))
      }
    } catch (error) {
      categories.value = originalCategories
      const message = error instanceof Error ? error.message : '保存失败'
      ElMessage.error(message)
      throw error
    }
  }

  const addItem = async (itemData: Partial<Item>): Promise<Item> =>
    withSaving(async () => {
      const createdItem = await dataApi.addItem(itemData)
      if (!createdItem) {
        throw new Error('书签添加失败')
      }

      const normalizedItem = normalizeItem(createdItem)
      appendItem(normalizedItem)
      return normalizedItem
    })

  const updateItem = async (itemData: Partial<Item>) => {
    if (!itemData.id) {
      return
    }

    const originalItem = items.value.find((item) => item.id === Number(itemData.id))
    if (!originalItem) {
      return
    }

    await withSaving(async () => {
      const updatedItem = await dataApi.updateItem(Number(itemData.id), itemData)
      if (!updatedItem) {
        throw new Error('书签更新失败')
      }

      const normalizedItem = normalizeItem(updatedItem)
      replaceItem(normalizedItem, {
        appendToCategoryEnd:
          itemData.categoryId !== undefined &&
          Number(itemData.categoryId) !== originalItem.categoryId
      })
    })
  }

  const deleteItem = async (id: number) => {
    const targetId = Number(id)

    await withSaving(async () => {
      await dataApi.deleteItem(targetId)
      items.value = items.value.filter((item) => item.id !== targetId)
    })
  }

  const batchDeleteItems = async (ids: number[]) => {
    const targetIds = new Set(ids.map(Number))
    const deletedCount = items.value.reduce(
      (count, item) => count + (targetIds.has(item.id) ? 1 : 0),
      0
    )

    if (deletedCount === 0) {
      return
    }

    const originalState = snapshotState()
    items.value = items.value.filter((item) => !targetIds.has(item.id))

    try {
      await withSaving(() => dataApi.batchDeleteItems(Array.from(targetIds)))
    } catch (error) {
      restoreState(originalState)
      const message = error instanceof Error ? error.message : '保存失败'
      ElMessage.error(message)
      throw error
    }
  }

  const batchMoveItems = async (ids: number[], targetCatId: number) => {
    const normalizedTargetCatId = Number(targetCatId)
    const movedCount = ids.reduce((count, id) => {
      const existingItem = items.value.find((item) => item.id === Number(id))
      return count + (existingItem && existingItem.categoryId !== normalizedTargetCatId ? 1 : 0)
    }, 0)

    if (movedCount === 0) {
      return
    }

    const originalState = snapshotState()
    items.value = batchMoveItemsLocally(items.value, ids, normalizedTargetCatId)

    try {
      await withSaving(() => dataApi.batchMoveItems(ids, normalizedTargetCatId))
    } catch (error) {
      restoreState(originalState)
      const message = error instanceof Error ? error.message : '保存失败'
      ElMessage.error(message)
      throw error
    }
  }

  const moveItem = async (itemId: number, targetCatId: number, targetIndex: number) => {
    const existingItem = items.value.find((item) => item.id === itemId)
    if (!existingItem) {
      return
    }

    const originalState = snapshotState()
    items.value = moveItemStateLocally(items.value, itemId, targetCatId, targetIndex)

    try {
      const movedItem = await withSaving(() =>
        dataApi.moveItem(itemId, { categoryId: targetCatId, targetIndex })
      )
      if (!movedItem) {
        throw new Error('移动失败')
      }
    } catch (error) {
      restoreState(originalState)
      const message = error instanceof Error ? error.message : '保存失败'
      ElMessage.error(message)
      throw error
    }
  }

  const findDuplicateItem = (url: string, excludeId?: number) => {
    return findDuplicateItemByUrl(items.value, url, excludeId)
  }

  return {
    categories,
    items,
    loading,
    saving,
    initialized,
    loadData,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    addItem,
    updateItem,
    deleteItem,
    batchDeleteItems,
    batchMoveItems,
    moveItem,
    findDuplicateItem,
    saveData: sync
  }
})
