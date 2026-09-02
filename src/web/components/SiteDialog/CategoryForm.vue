<template>
  <div class="category-form">
    <label class="dialog-field">
      <span class="dialog-label">{{ t('category.name') }}</span>
      <input
        v-model="formData.name"
        class="dialog-input"
        :placeholder="t('category.placeholderName')"
        autocomplete="off"
        :aria-invalid="invalidFields?.categoryName || undefined"
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

        <img v-if="formData.icon" :src="formData.icon" class="cat-icon-preview" alt="" />
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
  /** 校验失败标记（categoryName），由父级校验后注入以绑定 aria-invalid */
  invalidFields?: {
    categoryName?: boolean
  }
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
.category-form {
  display: flex;
  flex-direction: column;
  gap: 18px;

  .dialog-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .dialog-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--site-dialog-muted, rgba(15, 23, 42, 0.78));
  }

  .dialog-input {
    width: 100%;
    min-height: 46px;
    padding: 0 14px;
    border: 1px solid var(--site-dialog-input-border, rgba(148, 163, 184, 0.38));
    border-radius: 14px;
    background: var(--site-dialog-input-bg, rgba(255, 255, 255, 0.92));
    color: var(--site-dialog-text, #0f172a);
    font-size: 14px;
    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background-color 0.18s ease;

    &::placeholder {
      color: var(--site-dialog-placeholder, rgba(100, 116, 139, 0.74));
    }

    &:focus {
      outline: none;
      border-color: rgba(var(--ui-theme-rgb), 0.62);
      box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.12);
      background: var(--site-dialog-input-focus-bg, rgba(255, 255, 255, 0.98));
    }

    &:-webkit-autofill,
    &:-webkit-autofill:hover,
    &:-webkit-autofill:focus {
      -webkit-text-fill-color: var(--site-dialog-text, #0f172a);
      -webkit-box-shadow: 0 0 0 1000px var(--site-dialog-input-focus-bg, rgba(255, 255, 255, 0.98))
        inset;
      transition: background-color 9999s ease-in-out 0s;
    }
  }

  .dialog-select {
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--site-dialog-input-border, rgba(148, 163, 184, 0.38));
    border-radius: 14px;
    background: var(--site-dialog-input-bg, rgba(255, 255, 255, 0.92));
    color: var(--site-dialog-text, #0f172a);
    font-size: 14px;
    padding: 0 40px 0 14px;
    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      color 0.18s ease;

    &:focus {
      outline: none;
      border-color: rgba(var(--ui-theme-rgb), 0.62);
      box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.12);
    }
  }

  .dialog-select option,
  .dialog-select optgroup {
    background: var(--site-dialog-input-bg, rgba(255, 255, 255, 0.92));
    color: var(--site-dialog-text, #0f172a);
  }

  .icon-upload-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .sr-only-input {
    display: none;
  }

  .upload-button,
  .sub-toolbar-button,
  .sub-icon-button {
    border: none;
    cursor: pointer;
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      background-color 0.18s ease,
      color 0.18s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }
  }

  .upload-button {
    min-width: 92px;
    min-height: 42px;
    padding: 0 16px;
    border-radius: 999px;
    background: var(--site-dialog-soft-button-bg, rgba(148, 163, 184, 0.15));
    color: var(--site-dialog-soft-button-text, rgba(15, 23, 42, 0.82));
    font-size: 13px;
    font-weight: 600;
  }

  .cat-icon-preview {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    object-fit: contain;
    background: var(--site-dialog-preview-bg, #fff);
    border: 1px solid rgba(148, 163, 184, 0.32);
    flex-shrink: 0;
  }

  .subcategory-manager {
    margin-top: 8px;
    padding-top: 18px;
    border-top: 1px solid var(--site-dialog-soft-border, rgba(148, 163, 184, 0.22));

    .sub-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;

      .label {
        font-size: 14px;
        font-weight: 600;
        color: var(--site-dialog-text, rgba(15, 23, 42, 0.82));
      }
    }

    .sub-toolbar-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 38px;
      padding: 0 14px;
      border-radius: 999px;
      background: rgba(var(--ui-theme-rgb), 0.12);
      color: var(--ui-theme);
      font-size: 13px;
      font-weight: 600;
    }

    .button-icon {
      width: 14px;
      height: 14px;
    }

    .sub-list {
      max-height: 180px;
      overflow-y: auto;
      padding: 6px;
      border-radius: 16px;
      background: var(--site-dialog-soft-bg-muted, rgba(248, 250, 252, 0.88));
    }

    .sub-empty {
      text-align: center;
      color: var(--site-dialog-placeholder, rgba(100, 116, 139, 0.86));
      font-size: 12px;
      padding: 12px;
      border-radius: 14px;
      background: var(--site-dialog-soft-bg-subtle, rgba(248, 250, 252, 0.72));
    }

    .sub-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 12px;

      &:hover {
        background: rgba(var(--ui-theme-rgb), 0.07);
      }
    }

    .sub-name {
      font-size: 13px;
      color: var(--site-dialog-text, rgba(15, 23, 42, 0.88));
    }

    .sub-actions {
      display: flex;
      gap: 6px;
    }

    .sub-icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--site-dialog-soft-button-bg, rgba(148, 163, 184, 0.12));
      color: var(--ui-theme);

      &.danger {
        color: #dc2626;
        background: rgba(220, 38, 38, 0.1);
      }

      :deep(svg) {
        width: 15px;
        height: 15px;
      }
    }
  }

  @media screen and (max-width: 720px) {
    .icon-upload-wrap,
    .subcategory-manager .sub-header {
      align-items: stretch;
      flex-direction: column;
    }

    .upload-button,
    .subcategory-manager .sub-toolbar-button {
      width: 100%;
      justify-content: center;
    }

    .subcategory-manager .sub-item {
      align-items: flex-start;
      flex-direction: column;
    }

    .subcategory-manager .sub-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
}
</style>
