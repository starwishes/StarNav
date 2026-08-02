import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import { useI18n } from 'vue-i18n'
import { useDataStore } from '@/store/data'
import { storeToRefs } from 'pinia'
import { useDebounce } from '@/composables/useDebounce'
import type { Category, Item } from '@/types'

/**
 * 数据管理 Composable
 * 负责分类和书签的增删改查逻辑
 */
export function useDataManagement() {
  const { t } = useI18n()
  const dataStore = useDataStore()
  const { categories, items, loading } = storeToRefs(dataStore)

  // Dialog状态
  const categoryDialogVisible = ref(false)
  const itemDialogVisible = ref(false)
  const isEdit = ref(false)
  const categoryForm = ref<Partial<Category>>({})
  const itemForm = ref<Partial<Item>>({})

  // 筛选状态 - 使用防抖优化搜索性能
  const searchKeyword = useDebounce('', 300) // 300ms 防抖
  const activeTab = ref('categories')
  const filterCategory = ref<number>(0)

  /**
   * 过滤后的书签列表
   */
  const filteredItems = computed(() => {
    let result = items.value
    if (filterCategory.value) {
      result = result.filter((i) => i.categoryId === filterCategory.value)
    }
    if (searchKeyword.value) {
      const k = searchKeyword.value.toLowerCase()
      result = result.filter(
        (i) => i.name.toLowerCase().includes(k) || i.url.toLowerCase().includes(k)
      )
    }
    return result
  })

  /**
   * 加载数据
   */
  const loadData = () => dataStore.loadData()

  // ==================== 分类操作 ====================

  /**
   * 添加分类
   */
  const handleAddCategory = () => {
    isEdit.value = false
    categoryForm.value = { name: '', level: 0 }
    categoryDialogVisible.value = true
  }

  /**
   * 编辑分类
   */
  const handleEditCategory = (row: Category) => {
    isEdit.value = true
    categoryForm.value = { ...row }
    categoryDialogVisible.value = true
  }

  /**
   * 保存分类
   */
  const saveCategory = async () => {
    if (!categoryForm.value.name) {
      return ElMessage.warning(t('category.placeholderName'))
    }

    try {
      if (isEdit.value) {
        await dataStore.updateCategory(categoryForm.value)
        ElMessage.success(t('category.updateSuccess'))
      } else {
        await dataStore.addCategory(categoryForm.value)
        ElMessage.success(t('category.addSuccess'))
      }
      categoryDialogVisible.value = false
    } catch {
      // Error handled in store
    }
  }

  /**
   * 删除分类
   */
  const handleDeleteCategory = async (row: Category) => {
    try {
      await ElMessageBox.confirm(t('category.deleteConfirm'), t('common.delete'), {
        type: 'warning'
      })
      await dataStore.deleteCategory(row.id)
      ElMessage.success(t('category.deleteSuccess'))
    } catch {
      /* cancel */
    }
  }

  /**
   * 移动分类
   */
  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    await dataStore.moveCategory(index, target)
  }

  // ==================== 书签操作 ====================

  /**
   * 添加书签
   */
  const handleAddItem = () => {
    isEdit.value = false
    itemForm.value = {
      name: '',
      url: '',
      description: '',
      categoryId: categories.value[0]?.id || 0,
      pinned: false,
      level: 0
    }
    itemDialogVisible.value = true
  }

  /**
   * 编辑书签
   */
  const handleEditItem = (row: Item) => {
    isEdit.value = true
    itemForm.value = JSON.parse(JSON.stringify(row))
    itemDialogVisible.value = true
  }

  /**
   * 保存书签
   */
  const saveItem = async (incomingData?: Partial<Item>) => {
    const payload = incomingData && incomingData.name ? incomingData : itemForm.value

    if (!payload.name || !payload.url) {
      return ElMessage.warning(t('common.tips'))
    }

    try {
      if (isEdit.value) {
        await dataStore.updateItem(payload)
        ElMessage.success(t('admin.updateSuccess'))
      } else {
        await dataStore.addItem(payload)
        ElMessage.success(t('admin.addSuccess'))
      }
      itemDialogVisible.value = false
    } catch {
      // Error handled in store
    }
  }

  /**
   * 删除书签
   */
  const handleDeleteItem = async (row: Item) => {
    try {
      await ElMessageBox.confirm(t('table.deleteConfirm'), t('common.delete'), { type: 'warning' })
      await dataStore.deleteItem(row.id)
      ElMessage.success(t('table.deleteSuccess'))
    } catch {
      /* cancel */
    }
  }

  /**
   * 批量删除
   */
  const handleBatchDelete = async (ids: number[]) => {
    await dataStore.batchDeleteItems(ids)
    ElMessage.success(t('table.deleteSuccess'))
  }

  /**
   * 批量移动
   */
  const handleBatchMove = async (ids: number[], categoryId: number) => {
    await dataStore.batchMoveItems(ids, categoryId)
    ElMessage.success(t('table.moveSuccess'))
  }

  return {
    // 数据
    categories,
    items,
    loading,
    filteredItems,

    // 对话框状态
    categoryDialogVisible,
    itemDialogVisible,
    isEdit,
    categoryForm,
    itemForm,

    // 筛选状态
    searchKeyword,
    activeTab,
    filterCategory,

    // 方法
    loadData,

    // 分类操作
    handleAddCategory,
    handleEditCategory,
    saveCategory,
    handleDeleteCategory,
    moveCategory,

    // 书签操作
    handleAddItem,
    handleEditItem,
    saveItem,
    handleDeleteItem,
    handleBatchDelete,
    handleBatchMove
  }
}
