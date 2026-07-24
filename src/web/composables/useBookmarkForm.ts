import { computed, ref, type Ref } from 'vue'
import { ElMessage } from '@/utils/feedback'
import { Item, Category } from '@/types'
import { useI18n } from 'vue-i18n'
import { useDataStore } from '@/store/data'
import { adminApi } from '@/api/admin'
import { getErrorMessage } from '@/utils/errors'
import { USER_LEVEL } from '@common/constants'
import {
  readFileAsDataUrl,
  type CategoryTreeNode
} from '@/components/SiteDialog/form-utils'

type NormalizedCategoryNode = {
  id: number
  label: string
  children: NormalizedCategoryNode[]
}

type SelectOption = {
  value: string
  label: string
}

export function useBookmarkForm(formData: Ref<Partial<Item>>, categoryTree: Ref<CategoryTreeNode[]>) {
  const { t } = useI18n()
  const dataStore = useDataStore()

  const uploadingIcon = ref(false)
  const iconInputRef = ref<HTMLInputElement | null>(null)
  const showInlineAdd = ref(false)
  const savingCat = ref(false)
  const inlineCatForm = ref<Partial<Category>>({
    name: '',
    parentId: null,
    icon: '',
    level: USER_LEVEL.GUEST
  })

  const normalizeCategoryTree = (nodes: CategoryTreeNode[]): NormalizedCategoryNode[] =>
    nodes.map((node) => ({
      id: Number(node.id ?? node.value),
      label: String(node.label ?? node.name ?? ''),
      children: normalizeCategoryTree((node.children ?? []) as CategoryTreeNode[])
    }))

  const rootCategories = computed(() => normalizeCategoryTree(categoryTree.value))

  const parentCategoryOptions = computed<SelectOption[]>(() =>
    rootCategories.value.map((node) => ({
      value: String(node.id),
      label: node.label
    }))
  )

  const selectedParentCategory = computed(
    () =>
      rootCategories.value.find(
        (node) =>
          node.id === formData.value.categoryId ||
          node.children.some((child) => child.id === formData.value.categoryId)
      ) ?? null
  )

  const childCategoryOptions = computed<SelectOption[]>(() =>
    (selectedParentCategory.value?.children ?? []).map((node) => ({
      value: String(node.id),
      label: node.label
    }))
  )

  const selectedParentCategoryId = computed({
    get: () => (selectedParentCategory.value ? String(selectedParentCategory.value.id) : ''),
    set: (value: string) => {
      if (!value) {
        formData.value.categoryId = undefined
        return
      }

      const nextParent = rootCategories.value.find((node) => String(node.id) === value)
      if (!nextParent) {
        formData.value.categoryId = undefined
        return
      }

      const currentChild = nextParent.children.find((child) => child.id === formData.value.categoryId)
      formData.value.categoryId = currentChild ? currentChild.id : nextParent.id
    }
  })

  const selectedChildCategoryId = computed({
    get: () => {
      const childId = selectedParentCategory.value?.children.find(
        (child) => child.id === formData.value.categoryId
      )?.id

      return childId ? String(childId) : ''
    },
    set: (value: string) => {
      if (!selectedParentCategory.value) {
        formData.value.categoryId = undefined
        return
      }

      formData.value.categoryId = value ? Number(value) : selectedParentCategory.value.id
    }
  })

  const selectedInlineParentId = computed({
    get: () =>
      inlineCatForm.value.parentId === undefined || inlineCatForm.value.parentId === null
        ? ''
        : String(inlineCatForm.value.parentId),
    set: (value: string) => {
      inlineCatForm.value.parentId = value ? Number(value) : null
    }
  })

  const toggleInlineAdd = () => {
    showInlineAdd.value = !showInlineAdd.value
    if (showInlineAdd.value) {
      inlineCatForm.value = {
        name: '',
        parentId: selectedParentCategory.value?.id || null,
        icon: '',
        level: USER_LEVEL.GUEST
      }
    }
  }

  const closeInlineAdd = () => {
    showInlineAdd.value = false
  }

  const triggerIconUpload = () => {
    iconInputRef.value?.click()
  }

  const handleSaveInlineCategory = async () => {
    if (!inlineCatForm.value.name) {
      ElMessage.warning(t('category.nameRequired'))
      return
    }

    savingCat.value = true
    try {
      const result = await dataStore.addCategory(inlineCatForm.value)
      if (result && result.id) {
        formData.value.categoryId = result.id
      }
      ElMessage.success(t('category.addSuccess'))
      closeInlineAdd()
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('admin.operationFailed')))
    } finally {
      savingCat.value = false
    }
  }

  const handleIconUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    uploadingIcon.value = true
    try {
      const base64Data = await readFileAsDataUrl(file)
      const data = await adminApi.uploadIconAsset(base64Data)
      if (data.success) {
        formData.value.icon = String(data.url || '')
        ElMessage.success(t('site.uploadSuccess'))
      } else {
        ElMessage.error(data.error || t('common.fail'))
      }
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('common.fail')))
    } finally {
      uploadingIcon.value = false
      input.value = ''
    }
  }

  return {
    uploadingIcon,
    iconInputRef,
    showInlineAdd,
    savingCat,
    inlineCatForm,
    parentCategoryOptions,
    childCategoryOptions,
    selectedParentCategory,
    selectedParentCategoryId,
    selectedChildCategoryId,
    selectedInlineParentId,
    toggleInlineAdd,
    closeInlineAdd,
    triggerIconUpload,
    handleSaveInlineCategory,
    handleIconUpload
  }
}
