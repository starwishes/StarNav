import { computed } from 'vue'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import { useI18n } from 'vue-i18n'
import { useDataStore } from '@/store/data'
import { getErrorMessage } from '@/utils/errors'
import type { ContextMenuState } from './useSiteMenu'

/**
 * 处理右键菜单的操作逻辑
 */
export function useContextMenuActions(contextMenu: ContextMenuState, closeContextMenu: () => void) {
  const { t } = useI18n()
  const dataStore = useDataStore()

  // 切换置顶状态
  const togglePin = async () => {
    if (!contextMenu.item) return
    try {
      await dataStore.updateItem({ id: contextMenu.item.id, pinned: !contextMenu.item.pinned })
      closeContextMenu()
    } catch (error) {
      // store 的 updateItem 只 throw 不上屏（对话框路径自行提示），这里补上屏
      //（第 28 轮盲审 M4）
      ElMessage.error(getErrorMessage(error, t('feedback.saveFailed')))
    }
  }

  // 移动分类（上移或下移）
  const moveCategory = async (dir: number) => {
    if (!contextMenu.category) return
    const catId = contextMenu.category.id
    const currentRealIndex = dataStore.categories.findIndex((c) => c.id === catId)
    if (currentRealIndex === -1) return
    try {
      await dataStore.moveCategory(currentRealIndex, currentRealIndex + dir)
      closeContextMenu()
    } catch {
      // store 的 moveCategory 已回滚并上屏（rethrow 供对话框等调用方感知），这里吞掉防全局二次提示
    }
  }

  // 判断是否为第一个分类
  const isFirstCategory = computed(() => {
    if (!contextMenu.category) return false
    const idx = dataStore.categories.findIndex((c) => c.id === contextMenu.category!.id)
    return idx <= 0
  })

  // 判断是否为最后一个分类
  const isLastCategory = computed(() => {
    if (!contextMenu.category) return false
    const idx = dataStore.categories.findIndex((c) => c.id === contextMenu.category!.id)
    return idx >= dataStore.categories.length - 1
  })

  // 删除书签
  const handleDelete = async () => {
    try {
      await ElMessageBox.confirm(t('bookmark.deleteConfirm'), t('common.confirm'), {
        type: 'warning'
      })
      await dataStore.deleteItem(contextMenu.item!.id)
      closeContextMenu()
      ElMessage.success(t('common.deleteSuccess'))
    } catch {
      /* empty */
    }
  }

  // 删除分类
  const handleDeleteCategory = async () => {
    if (!contextMenu.category) return
    try {
      await ElMessageBox.confirm(t('category.deleteCascadeConfirm'), t('common.tips'), {
        type: 'warning',
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel')
      })
      await dataStore.deleteCategory(contextMenu.category.id)
      closeContextMenu()
      ElMessage.success(t('category.deleteSuccess'))
    } catch {
      /* empty */
    }
  }

  return {
    togglePin,
    moveCategory,
    isFirstCategory,
    isLastCategory,
    handleDelete,
    handleDeleteCategory
  }
}
