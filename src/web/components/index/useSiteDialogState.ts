import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { ElMessage } from '@/utils/feedback'
import { getErrorMessage } from '@/utils/errors'
import type { Category, Item } from '@/types'

import {
  buildAddCategoryDialogState,
  buildAddItemDialogState,
  buildAvailableCategories,
  buildEditCategoryDialogState,
  buildEditItemDialogState,
  type SiteDialogMode
} from './siteDialogHelpers'

type DataStoreLike = {
  categories: Category[]
  updateItem: (formData: Partial<Item>) => Promise<unknown>
  addItem: (formData: Partial<Item>) => Promise<unknown>
}

type ContextMenuLike = {
  category?: Category | null
  item?: Item | null
}

export const useSiteDialogState = (
  dataStore: DataStoreLike,
  contextMenu: ContextMenuLike,
  closeContextMenu: () => void
) => {
  const { t } = useI18n()
  const showEditDialog = ref(false)
  const isEditMode = ref(false)
  const editItemForm: Ref<Partial<Item>> = ref({})
  const editCategoryForm: Ref<Partial<Category>> = ref({})
  const currentDialogMode = ref<SiteDialogMode>('site')
  const batchMoveTarget = ref('')

  const availableCategories = computed(() => buildAvailableCategories(dataStore.categories))

  const applyDialogState = (state: {
    itemForm: Partial<Item>
    categoryForm: Partial<Category>
    isEditMode: boolean
    dialogMode: SiteDialogMode
  }) => {
    editItemForm.value = state.itemForm
    editCategoryForm.value = state.categoryForm
    isEditMode.value = state.isEditMode
    currentDialogMode.value = state.dialogMode
    showEditDialog.value = true
  }

  const handleAddItem = (categoryId?: number) => {
    applyDialogState(buildAddItemDialogState(categoryId, dataStore.categories))
  }

  const handleAddCategory = () => {
    applyDialogState(buildAddCategoryDialogState())
  }

  const handleEditCategory = () => {
    if (!contextMenu.category) return

    applyDialogState(buildEditCategoryDialogState(contextMenu.category))
    closeContextMenu()
  }

  const handleEdit = () => {
    if (!contextMenu.item) return

    applyDialogState(buildEditItemDialogState(contextMenu.item))
    closeContextMenu()
  }

  const saveSite = async (formData: Partial<Item>) => {
    try {
      if (isEditMode.value) {
        await dataStore.updateItem(formData)
        ElMessage.success(t('admin.updateSuccess'))
      } else {
        await dataStore.addItem(formData)
        ElMessage.success(t('admin.addSuccess'))
      }
      showEditDialog.value = false
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('admin.operationFailed')))
    }
  }

  return {
    showEditDialog,
    isEditMode,
    editItemForm,
    editCategoryForm,
    currentDialogMode,
    batchMoveTarget,
    availableCategories,
    handleAddItem,
    handleAddCategory,
    handleEditCategory,
    handleEdit,
    saveSite
  }
}
