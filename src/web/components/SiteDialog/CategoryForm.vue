<template>
  <div class="category-form">
    <label class="dialog-field">
      <span class="dialog-label">{{ t('category.name') }}</span>
      <input
        v-model="formData.name"
        class="dialog-input"
        :placeholder="t('category.placeholderName')"
        autocomplete="off"
      />
    </label>

    <label v-if="mode === 'subcategory'" class="dialog-field">
      <span class="dialog-label">{{ t('category.parent') }}</span>
      <AppSelect v-model="selectedParentId" class="dialog-select">
        <option value="">{{ t('category.root') }}</option>
        <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </AppSelect>
    </label>

    <div v-if="mode !== 'subcategory'" class="dialog-field">
      <span class="dialog-label">{{ t('site.icon') }}</span>
      <div class="icon-upload-wrap">
        <input
          v-model="formData.icon"
          class="dialog-input"
          :placeholder="t('site.iconPlaceholder')"
          autocomplete="off"
          spellcheck="false"
        />

        <input
          ref="iconInputRef"
          class="sr-only-input"
          type="file"
          accept="image/*"
          @change="handleIconUpload"
        />

        <button
          type="button"
          class="upload-button"
          :disabled="uploadingIcon"
          @click="triggerIconUpload"
        >
          {{ uploadingIcon ? t('common.loading') : t('site.upload') }}
        </button>

        <img v-if="formData.icon" :src="formData.icon" class="cat-icon-preview" />
      </div>
    </div>

    <label class="dialog-field">
      <span class="dialog-label">{{ t('site.permission') }}</span>
      <AppSelect v-model.number="formData.level" class="dialog-select">
        <option :value="USER_LEVEL.GUEST">{{ t('userLevel.guest') }}</option>
        <option :value="USER_LEVEL.USER">{{ t('userLevel.user') }}</option>
        <option :value="USER_LEVEL.VIP">{{ t('userLevel.vip') }}</option>
        <option :value="USER_LEVEL.ADMIN">{{ t('userLevel.admin') }}</option>
      </AppSelect>
    </label>

    <div v-if="mode === 'category' && formData.id" class="subcategory-manager">
      <div class="sub-header">
        <span class="label">{{ t('category.subCategoryManage') }}</span>
        <button type="button" class="sub-toolbar-button" @click="handleAddSubCategory">
          <AppIcon name="icon-tianjia" class="button-icon" />
          <span>{{ t('category.addSubCategory') }}</span>
        </button>
      </div>

      <div v-if="subCategories.length > 0" class="sub-list glass-panel">
        <div v-for="sub in subCategories" :key="sub.id" class="sub-item">
          <span class="sub-name">{{ sub.name }}</span>
          <div class="sub-actions">
            <button
              type="button"
              class="sub-icon-button"
              :aria-label="t('common.edit')"
              @click="handleEditSubCategory(sub)"
            >
              <AppIcon name="icon-bianji" />
            </button>
            <button
              type="button"
              class="sub-icon-button danger"
              :aria-label="t('common.delete')"
              @click="handleDeleteSubCategory(sub)"
            >
              <AppIcon name="icon-md-trash" />
            </button>
          </div>
        </div>
      </div>

      <div v-else class="sub-empty">
        {{ t('category.noSubCategories') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSelect from '@/components/AppSelect.vue'
import AppIcon from '@/components/AppIcon.vue'
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import { Category } from '@/types'
import { useI18n } from 'vue-i18n'
import { useDataStore } from '@/store/data'
import { adminApi } from '@/api/admin'
import { getErrorMessage } from '@/utils/errors'
import { USER_LEVEL } from '@common/constants'
import { flattenCategoryTree, readFileAsDataUrl, type CategoryTreeNode } from './form-utils'

const { t } = useI18n()
const dataStore = useDataStore()

interface Props {
  modelValue: Partial<Category>
  categoryTree: CategoryTreeNode[]
  mode: 'category' | 'subcategory'
  categories: Category[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Partial<Category>): void
  (e: 'addSubCategory'): void
  (e: 'editSubCategory', sub: Category): void
}>()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const iconInputRef = ref<HTMLInputElement | null>(null)
const uploadingIcon = ref(false)

const categoryOptions = computed(() => flattenCategoryTree(props.categoryTree))

const selectedParentId = computed({
  get: () =>
    formData.value.parentId === undefined || formData.value.parentId === null
      ? ''
      : String(formData.value.parentId),
  set: (value: string) => {
    formData.value.parentId = value ? Number(value) : null
  }
})

const subCategories = computed(() => {
  if (props.mode !== 'category' || !formData.value.id) return []
  return props.categories.filter((c) => String(c.parentId) === String(formData.value.id))
})

const triggerIconUpload = () => {
  iconInputRef.value?.click()
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

const handleAddSubCategory = () => {
  emit('addSubCategory')
}

const handleEditSubCategory = (sub: Category) => {
  emit('editSubCategory', sub)
}

const handleDeleteSubCategory = async (sub: Category) => {
  try {
    await ElMessageBox.confirm(t('category.deleteConfirm'), t('common.confirm'), {
      type: 'warning'
    })
    await dataStore.deleteCategory(sub.id)
    ElMessage.success(t('common.deleteSuccess'))
  } catch {
    /* empty */
  }
}
</script>

<style scoped lang="scss">
@import './CategoryForm.scss';
</style>

