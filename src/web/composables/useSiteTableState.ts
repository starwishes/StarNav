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
    onBatchDelete: (ids: number[]) => void
    onBatchMove: (ids: number[], categoryId: number) => void
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

  watch(
    () => getItems(),
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

    options.onBatchDelete(ids)
    clearSelection()
  }

  const applyBatchMove = () => {
    if (batchMoveTarget.value === null || selectedPageItems.value.length === 0) return

    options.onBatchMove(
      selectedPageItems.value.map((item) => item.id),
      batchMoveTarget.value
    )
    ElMessage.success(options.t('table.moveSuccess'))
    clearSelection()
  }

  const handleCheckLinks = async () => {
    if (selectedPageItems.value.length === 0) return

    checking.value = true
    const urls = selectedPageItems.value.map((item) => item.url)

    urls.forEach((url) => {
      linkStatus[url] = 'checking'
    })

    try {
      const results = await toolApi.checkLinks(urls)

      results.forEach((result) => {
        linkStatus[result.url] = result.status
      })

      const errorCount = results.filter((result) => result.status === 'error').length
      if (errorCount === 0) {
        ElMessage.success(options.t('table.checkSuccess'))
      } else {
        ElMessage.warning(options.t('table.checkInvalid', { count: errorCount }))
      }
    } catch {
      ElMessage.error(options.t('table.checkFail'))
      urls.forEach((url) => {
        delete linkStatus[url]
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
