import { computed, reactive, ref, watch, type Ref } from 'vue'
import type { Item } from '@/types'
import { toolApi } from '@/api'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import {
  SITE_TABLE_PAGE_SIZES,
  cycleClickCountSort,
  getPaginationRange,
  getTotalPages,
  paginateItems,
  parseOptionalNumber,
  selectItemsByIds,
  selectPageItemIds,
  sortItemsByClickCount,
  toggleSelectedId,
  type ClickCountSort
} from '@/components/siteTableHelpers'

type Translate = (key: string, params?: Record<string, unknown>) => string

export const useSiteTableState = (
  items: Ref<Item[]> | (() => Item[]),
  options: {
    t: Translate
    onBatchDelete: (ids: number[]) => Promise<void> | void
    onBatchMove: (ids: number[], categoryId: number) => Promise<void> | void
  }
) => {
  const getItems = () => (typeof items === 'function' ? items() : items.value)

  const linkStatus = reactive<Record<string, string>>({})
  const checking = ref(false)
  const selectedIds = ref<number[]>([])
  const currentPage = ref(1)
  const pageSize = ref(20)
  const clickCountSort = ref<ClickCountSort>('default')
  const batchMoveTarget = ref<number | null>(null)
  const pageSizes = SITE_TABLE_PAGE_SIZES

  const clearSelection = () => {
    selectedIds.value = []
    batchMoveTarget.value = null
  }

  // 只按条数变化重置分页/选中：单条编辑（updateItem 等）会整体替换数组但条数
  // 不变，此时不应把用户从当前页踢回第 1 页；增删、跨分类移动等条数变化才重置。
  watch(
    () => getItems().length,
    () => {
      currentPage.value = 1
      clearSelection()
    }
  )

  watch([currentPage, pageSize, clickCountSort], () => {
    clearSelection()
  })

  const sortedItems = computed(() => sortItemsByClickCount(getItems(), clickCountSort.value))
  const totalPages = computed(() => getTotalPages(sortedItems.value.length, pageSize.value))
  const paginatedData = computed(() =>
    paginateItems(sortedItems.value, currentPage.value, pageSize.value)
  )
  const paginationRange = computed(() =>
    getPaginationRange(getItems().length, currentPage.value, pageSize.value)
  )
  const pageStart = computed(() => paginationRange.value.start)
  const pageEnd = computed(() => paginationRange.value.end)
  const selectedIdSet = computed(() => new Set(selectedIds.value))
  const selectedPageItems = computed(() =>
    selectItemsByIds(paginatedData.value, selectedIdSet.value)
  )

  const allSelected = computed(
    () =>
      paginatedData.value.length > 0 &&
      paginatedData.value.every((item) => selectedIdSet.value.has(item.id))
  )

  const toggleSelection = (row: Item, event: Event) => {
    const checked = (event.target as HTMLInputElement).checked
    selectedIds.value = toggleSelectedId(selectedIds.value, row.id, checked)
  }

  const toggleSelectAll = (event: Event) => {
    const checked = (event.target as HTMLInputElement).checked
    selectedIds.value = selectPageItemIds(paginatedData.value, checked)
  }

  const handleSizeChange = (value: string | number | null | undefined) => {
    pageSize.value = Number(value)
    currentPage.value = 1
  }

  const handleBatchTargetChange = (value: string | number | null | undefined) => {
    batchMoveTarget.value = parseOptionalNumber(value)
  }

  const toggleClickCountSort = () => {
    clickCountSort.value = cycleClickCountSort(clickCountSort.value)
  }

  const handleBatchDelete = async () => {
    try {
      await ElMessageBox.confirm(
        options.t('table.deleteConfirm', { count: selectedPageItems.value.length }),
        options.t('common.warning'),
        {
          type: 'warning',
          confirmButtonText: options.t('table.confirm'),
          cancelButtonText: options.t('table.cancel')
        }
      )
    } catch {
      return
    }

    const ids = selectedPageItems.value.map((item) => item.id)
    if (ids.length === 0) return

    try {
      await options.onBatchDelete(ids)
      clearSelection()
    } catch {
      // 失败时保留选中以便重试；错误提示由 store / 上层负责
    }
  }

  const applyBatchMove = async () => {
    const target = batchMoveTarget.value
    if (target === null || selectedPageItems.value.length === 0) return

    const ids = selectedPageItems.value.map((item) => item.id)

    try {
      await options.onBatchMove(ids, target)
      // 成功 toast 由上层（useDataManagement.handleBatchMove）统一提示，这里不重复
      clearSelection()
    } catch {
      // 保留选中以便重试
    }
  }

  const handleCheckLinks = async () => {
    if (selectedPageItems.value.length === 0) return

    checking.value = true
    const itemsToCheck = selectedPageItems.value
    // 检测结果按 URL 返回；url→id[] 映射回写，共享同一 URL 的书签都要更新状态
    const urlToIds = new Map<string, number[]>()
    itemsToCheck.forEach((item) => {
      const ids = urlToIds.get(item.url) || []
      ids.push(item.id)
      urlToIds.set(item.url, ids)
    })

    itemsToCheck.forEach((item) => {
      linkStatus[String(item.id)] = 'checking'
    })

    try {
      const results = await toolApi.checkLinks(itemsToCheck.map((item) => item.url))

      results.forEach((result) => {
        const ids = urlToIds.get(result.url)
        ids?.forEach((id) => {
          linkStatus[String(id)] = result.status
        })
      })

      const errorCount = results.filter((result) => result.status === 'error').length
      if (errorCount === 0) {
        ElMessage.success(options.t('table.checkSuccess'))
      } else {
        ElMessage.warning(options.t('table.checkInvalid', { count: errorCount }))
      }
    } catch {
      ElMessage.error(options.t('table.checkFail'))
      itemsToCheck.forEach((item) => {
        delete linkStatus[String(item.id)]
      })
    } finally {
      checking.value = false
    }
  }

  return {
    linkStatus,
    checking,
    selectedIds,
    currentPage,
    pageSize,
    clickCountSort,
    batchMoveTarget,
    pageSizes,
    sortedItems,
    totalPages,
    paginatedData,
    pageStart,
    pageEnd,
    selectedPageItems,
    allSelected,
    clearSelection,
    toggleSelection,
    toggleSelectAll,
    handleSizeChange,
    handleBatchTargetChange,
    toggleClickCountSort,
    handleBatchDelete,
    applyBatchMove,
    handleCheckLinks
  }
}
