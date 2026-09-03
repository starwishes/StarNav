import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import i18n from '@/plugins/i18n'
import { dataApi } from '@/api'
import { ApiClientError } from '@/api/client'
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
import { getErrorMessage } from '@/utils/errors'

const logger = createScopedLogger('web:data-store')

/**
 * 写路径错误文案：判定逻辑收敛到 utils/errors.getErrorMessage——ApiClientError（服务端返回的
 * 业务文案，如 400/409 校验提示）保留上屏；其余网络层异常（TypeError: Failed to fetch /
 * TimeoutError 等）不把原文上屏（可能携带堆栈/内部细节），显示固定失败文案（与 loadData
 * 第 16 轮固定文案一致）。
 */
const getWriteErrorMessage = (error: unknown): string => {
  const message = getErrorMessage(error, i18n.global.t('feedback.saveFailed'))
  if (error instanceof ApiClientError) {
    if (typeof error.status === 'number' && error.status > 0) {
      // 服务端业务性拒绝（4xx 校验提示等）属预期路径，debug 级留痕便于排查即可
      logger.debug('Write operation rejected by server.', error)
    } else {
      // status 0 = 客户端防御性抛出（2xx-但信封空/缺字段，见各 add*/update*/moveItem 路径），
      // 非服务端拒绝，debug 文案区分开，避免误导排查（第 23 轮审查）
      logger.debug('Write operation rejected by client-side guard.', error)
    }
  } else {
    logger.error('Write operation failed.', error)
  }
  return message
}

export const useDataStore = defineStore('data', () => {
  const categories = ref<Category[]>([])
  const items = ref<Item[]>([])
  const loading = ref(false)
  // 并发写计数：多个操作同时在途时，只有最后一个完成才把 saving 置回 false，
  // 避免单个 ref 被先完成者提前清零而误报"空闲"。
  const savingCount = ref(0)
  const saving = computed(() => savingCount.value > 0)
  const initialized = ref(false)
  /** 最近一次 loadData 失败的错误信息；空串表示无错误（用于区分“加载失败”与“确实无数据”）。 */
  const loadError = ref('')
  /** In-flight load so concurrent callers share one request (search + homepage). */
  let loadDataPromise: Promise<void> | null = null

  const applyLoadedContent = (content: SiteConfig | null | undefined) => {
    const sanitized = sanitizeApiData(content)
    categories.value = sanitized.categories
    items.value = sanitized.items
    initialized.value = true
  }

  const withSaving = async <T>(operation: () => Promise<T>): Promise<T> => {
    savingCount.value += 1
    try {
      return await operation()
    } finally {
      savingCount.value -= 1
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
    // 本地写操作在途时跳过刷新：并发返回的旧快照可能覆盖刚完成的乐观结果
    //（如 moveItem/batchDelete 已本地更新、服务端旧数据仍在返回）。写完成后
    // 下一次 visibilitychange / 手动刷新会正常拉取最新数据。
    if (saving.value) {
      return
    }

    if (loadDataPromise) {
      return loadDataPromise
    }

    loadDataPromise = (async () => {
      loading.value = true
      try {
        const content = await dataApi.getContent()
        // 若请求期间有写操作进入在途（saving 已置真），本次快照可能已过期，
        // 不应用以免覆盖刚完成的乐观结果；下次刷新会拉到最新数据。
        if (saving.value) {
          return
        }
        applyLoadedContent(content)
        loadError.value = ''
      } catch (error) {
        logger.error('Failed to load data.', error)
        // UI 只显示固定文案，不把 error.message 原文上屏（error 可能携带服务端堆栈/内部
        // 路径等敏感细节，见第 16 轮审查）；完整错误进 logger 供排查。
        const message = i18n.global.t('feedback.loadFailed')
        loadError.value = message
        ElMessage.error(message)
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
      const message = getWriteErrorMessage(error)
      ElMessage.error(message)
      throw error
    })
  }

  const addCategory = async (catData: Partial<Category>): Promise<Category> =>
    withSaving(async () => {
      const createdCategory = await dataApi.addCategory(catData)
      if (!createdCategory) {
        // 2xx-但-信封无 item 的防御路径：以 ApiClientError(0) 携带业务文案，使调用方的
        // getErrorMessage 保留细分文案（普通 Error 会被回退成通用 fallback，见第 22 轮审查）
        throw new ApiClientError(i18n.global.t('feedback.categoryCreateFailed'), 0)
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
        throw new ApiClientError(i18n.global.t('feedback.categoryUpdateFailed'), 0)
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
    if (fromIndex < 0 || fromIndex >= categories.value.length) {
      return
    }
    if (toIndex < 0 || toIndex >= categories.value.length) {
      return
    }
    if (fromIndex === toIndex) {
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
      ElMessage.error(getWriteErrorMessage(error))
      throw error
    }
  }

  const addItem = async (itemData: Partial<Item>): Promise<Item> =>
    withSaving(async () => {
      const createdItem = await dataApi.addItem(itemData)
      if (!createdItem) {
        throw new ApiClientError(i18n.global.t('feedback.bookmarkAddFailed'), 0)
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
        throw new ApiClientError(i18n.global.t('feedback.bookmarkUpdateFailed'), 0)
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
      ElMessage.error(getWriteErrorMessage(error))
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
      ElMessage.error(getWriteErrorMessage(error))
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
        throw new ApiClientError(i18n.global.t('feedback.moveFailed'), 0)
      }
    } catch (error) {
      restoreState(originalState)
      ElMessage.error(getWriteErrorMessage(error))
      throw error
    }
  }

  const findDuplicateItem = (url: string, excludeId?: number) => {
    return findDuplicateItemByUrl(items.value, url, excludeId)
  }

  /** 应用点击统计响应：本地即时更新 clickCount/lastVisited，游客无需整页刷新 */
  const patchItemClick = (itemId: number, clickCount: number, lastVisited: string | null) => {
    const target = items.value.find((item) => item.id === itemId)
    if (target) {
      target.clickCount = clickCount
      if (lastVisited) {
        target.lastVisited = lastVisited
      }
    }
  }

  return {
    categories,
    items,
    loading,
    saving,
    initialized,
    loadError,
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
    patchItemClick,
    saveData: sync
  }
})
