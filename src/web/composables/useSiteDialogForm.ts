import { ref, computed, watch, nextTick, onMounted, onUnmounted, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import type { Item, Category } from '@/types'
import { getErrorMessage } from '@/utils/errors'
import { normalizeUrl } from '@common/url'
import { USER_LEVEL } from '@common/constants'
import {
  buildCategoryTree,
  cloneCategoryDraft,
  cloneItemDraft
} from '@/components/SiteDialog/form-utils'

export type SiteDialogMode = 'site' | 'category' | 'subcategory'

type DataStoreLike = {
  updateCategory: (form: Partial<Category>) => Promise<unknown>
  addCategory: (form: Partial<Category>) => Promise<{ id?: number | string } | null | undefined>
  findDuplicateItem: (url: string, excludeId?: Item['id']) => Item | null | unknown
}

export interface SiteDialogFormProps {
  modelValue: boolean
  form: Partial<Item>
  categoryForm?: Partial<Category>
  categories: Category[]
  isEdit: boolean
  dialogMode?: SiteDialogMode
}

export interface SiteDialogFormEmit {
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:form', value: Partial<Item>): void
  (e: 'save', value: Partial<Item>): void
}

export const useSiteDialogForm = (
  props: SiteDialogFormProps,
  emit: SiteDialogFormEmit,
  dataStore: DataStoreLike
) => {
  const { t } = useI18n()

  const internalMode = ref<SiteDialogMode | null>(null)
  const effectiveMode = computed(() => internalMode.value || props.dialogMode || 'site')

  const visible = computed({
    get: () => props.modelValue,
    set: (val: boolean) => emit('update:modelValue', val)
  })

  const dialogTitle = computed(() => {
    if (effectiveMode.value === 'category') {
      return t('category.editCategory')
    }
    if (effectiveMode.value === 'subcategory') {
      return t('category.editSubCategory')
    }
    return props.isEdit ? t('site.edit') : t('site.add')
  })

  const dialogKicker = computed(() => {
    if (effectiveMode.value === 'site') {
      return t('site.kicker')
    }
    return t('category.kicker')
  })

  const dialogPanelRef = ref<HTMLElement | null>(null)
  const localForm = ref<Partial<Item>>({})
  const savingCat = ref(false)

  const createDefaultCategoryDraft = (): Partial<Category> => ({
    name: '',
    parentId: null,
    icon: '',
    level: USER_LEVEL.GUEST
  })

  const resolveCategoryDraft = (draft: Partial<Category> = {}): Partial<Category> => {
    const normalizedDraft = cloneCategoryDraft(draft)

    if (normalizedDraft.id !== undefined && normalizedDraft.id !== null) {
      const persistedCategory = props.categories.find(
        (category) => String(category.id) === String(normalizedDraft.id)
      )

      return {
        ...createDefaultCategoryDraft(),
        ...(persistedCategory ? cloneCategoryDraft(persistedCategory) : {}),
        ...normalizedDraft
      }
    }

    return {
      ...createDefaultCategoryDraft(),
      ...normalizedDraft
    }
  }

  const catEditForm: Ref<Partial<Category>> = ref(createDefaultCategoryDraft())

  const categoryTree = computed(() => buildCategoryTree(props.categories))

  watch(
    [() => props.modelValue, () => props.form, () => props.categoryForm, () => props.dialogMode],
    ([visibleState, newForm, newCategoryForm, mode]) => {
      if (visibleState) {
        localForm.value = cloneItemDraft(newForm || {})
        internalMode.value = null

        if (mode === 'category' || mode === 'subcategory') {
          catEditForm.value = resolveCategoryDraft(newCategoryForm || {})
        } else {
          catEditForm.value = createDefaultCategoryDraft()
        }
      }
    },
    { immediate: true, deep: true }
  )

  watch(visible, (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        dialogPanelRef.value?.focus()
      })
    }
  })

  const handleClose = () => {
    visible.value = false
  }

  const handleAddSubCategory = () => {
    catEditForm.value = {
      ...createDefaultCategoryDraft(),
      parentId: catEditForm.value.id ?? null
    }
    internalMode.value = 'subcategory'
  }

  const handleEditSubCategory = (sub: Category) => {
    catEditForm.value = cloneCategoryDraft(sub)
    internalMode.value = 'subcategory'
  }

  const handleSaveCategory = async () => {
    const categoryName = String(catEditForm.value.name || '').trim()

    if (!categoryName) {
      ElMessage.warning(t('category.nameRequired'))
      return
    }

    catEditForm.value.name = categoryName
    savingCat.value = true
    try {
      if (
        (effectiveMode.value === 'category' || effectiveMode.value === 'subcategory') &&
        catEditForm.value.id
      ) {
        await dataStore.updateCategory(catEditForm.value)
        ElMessage.success(t('category.updateSuccess'))
        handleClose()
      } else {
        const result = await dataStore.addCategory(catEditForm.value)
        if (result && result.id) {
          localForm.value.categoryId = result.id as Item['categoryId']
        }
        ElMessage.success(t('category.addSuccess'))
        if (internalMode.value === 'subcategory') {
          handleClose()
        }
      }
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('admin.operationFailed')))
    } finally {
      savingCat.value = false
    }
  }

  const handleSave = () => {
    if (!localForm.value.name || !localForm.value.url) {
      ElMessage.warning(t('common.tips'))
      return
    }

    const cleanedUrl = normalizeUrl(localForm.value.url)

    if (!cleanedUrl) {
      ElMessage.error(t('site.invalidUrl'))
      return
    }

    localForm.value.url = cleanedUrl

    const duplicate = dataStore.findDuplicateItem(
      localForm.value.url!,
      props.isEdit ? localForm.value.id : undefined
    ) as Item | null

    if (duplicate) {
      const category = props.categories.find((c) => c.id === duplicate.categoryId)
      const categoryName = category ? category.name : t('common.unknown')

      ElMessageBox.alert(
        t('site.duplicateAlert', {
          name: duplicate.name,
          categoryName
        }),
        t('site.duplicateTitle'),
        {
          confirmButtonText: t('common.confirm'),
          type: 'error'
        }
      )
      return
    }

    const finalData = cloneItemDraft(localForm.value)
    emit('update:form', finalData)
    emit('save', finalData)
  }

  const handleDialogKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && visible.value) {
      handleClose()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleDialogKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleDialogKeydown)
  })

  return {
    t,
    effectiveMode,
    visible,
    dialogTitle,
    dialogKicker,
    dialogPanelRef,
    localForm,
    savingCat,
    catEditForm,
    categoryTree,
    handleClose,
    handleAddSubCategory,
    handleEditSubCategory,
    handleSaveCategory,
    handleSave
  }
}
