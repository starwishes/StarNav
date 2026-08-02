import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import { useDataStore } from '@/store/data'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from 'vue-i18n'

/**
 * 处理批量选择和批量操作逻辑
 */
export function useBatchActions(closeContextMenu: () => void) {
  const { t } = useI18n()
  const dataStore = useDataStore()

  // 批量选择模式
  const selectionMode = ref(false)
  const selectedItems = reactive(new Set<number>())

  // 进入选择模式（从右键菜单触发）
  const enterSelectionMode = (itemId?: number) => {
    if (itemId) {
      selectedItems.add(itemId)
    }
    selectionMode.value = true
    closeContextMenu()
  }

  // 切换选中状态
  const toggleSelection = (item: { id: number }) => {
    if (selectedItems.has(item.id)) {
      selectedItems.delete(item.id)
    } else {
      selectedItems.add(item.id)
    }
  }

  // 退出选择模式
  const exitSelectionMode = () => {
    selectionMode.value = false
    selectedItems.clear()
  }

  // 批量移动
  const handleBatchMove = async (targetCatId: number) => {
    if (selectedItems.size === 0) return
    try {
      const ids = Array.from(selectedItems)
      await dataStore.batchMoveItems(ids, targetCatId)
      ElMessage.success(t('table.batchMoveSuccess', { count: ids.length }))
      exitSelectionMode()
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('table.batchMoveFail')))
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return
    try {
      await ElMessageBox.confirm(
        t('table.deleteConfirm', { count: selectedItems.size }),
        t('table.batchDelete'),
        {
          type: 'warning'
        }
      )
      const ids = Array.from(selectedItems)
      await dataStore.batchDeleteItems(ids)
      ElMessage.success(t('table.batchDeleteSuccessWithCount', { count: ids.length }))
      exitSelectionMode()
    } catch {
      /* cancel */
    }
  }

  return {
    selectionMode,
    selectedItems,
    enterSelectionMode,
    toggleSelection,
    exitSelectionMode,
    handleBatchMove,
    handleBatchDelete
  }
}
