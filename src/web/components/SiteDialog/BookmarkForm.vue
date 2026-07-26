<template>
  <div v-if="formData" class="bookmark-form">
    <div class="form-row">
      <label class="dialog-field flex-2">
        <span class="dialog-label">{{ t('site.name') }}</span>
        <input
          v-model="formData.name"
          class="dialog-input"
          :placeholder="t('site.placeholderName')"
          autocomplete="off"
        />
      </label>

      <div class="dialog-field flex-1">
        <span class="dialog-label">{{ t('site.category') }}</span>
        <div class="category-selector-stack">
          <div class="category-selector-wrap">
            <AppSelect v-model="selectedParentCategoryId" class="dialog-select">
              <option disabled value="">{{ t('site.placeholderCategory') }}</option>
              <option
                v-for="option in parentCategoryOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </AppSelect>

            <button
              type="button"
              class="add-cat-btn"
              :title="t('category.add')"
              @click="toggleInlineAdd"
            >
              <span class="add-cat-icon">+</span>
            </button>
          </div>

          <AppSelect
            v-if="selectedParentCategory?.children.length"
            v-model="selectedChildCategoryId"
            class="dialog-select dialog-select--child"
          >
            <option value="">{{ t('category.placeholderSubCategory') }}</option>
            <option
              v-for="option in childCategoryOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </AppSelect>
        </div>
      </div>
    </div>

    <transition name="inline-panel">
      <div v-if="showInlineAdd" class="inline-cat-panel glass-panel">
        <header class="panel-header">
          <span class="title">{{ t('category.addCategory') }}</span>
          <button type="button" class="panel-link-button" @click="closeInlineAdd">
            {{ t('common.cancel') }}
          </button>
        </header>

        <div class="panel-content">
          <div class="panel-grid">
            <label class="dialog-field">
              <span class="dialog-label">{{ t('category.name') }}</span>
              <input v-model="inlineCatForm.name" class="dialog-input" autocomplete="off" />
            </label>

            <label class="dialog-field">
              <span class="dialog-label">{{ t('category.parent') }}</span>
              <AppSelect v-model="selectedInlineParentId" class="dialog-select">
                <option value="">{{ t('category.root') }}</option>
                <option
                  v-for="option in parentCategoryOptions"
                  :key="`inline-${option.value}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </AppSelect>
            </label>
          </div>

          <div class="panel-actions">
            <button
              type="button"
              class="action-button primary"
              :disabled="savingCat"
              @click="handleSaveInlineCategory"
            >
              {{ savingCat ? t('common.loading') : t('category.createAndSelect') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <label class="dialog-field">
      <span class="dialog-label">{{ t('site.url') }}</span>
      <div class="input-with-prefix">
        <span class="input-prefix">
          <i class="iconfont icon-md-link"></i>
        </span>
        <input
          v-model="formData.url"
          class="dialog-input with-prefix"
          :placeholder="t('site.placeholderUrl')"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </label>

    <label class="dialog-field">
      <span class="dialog-label">{{ t('site.description') }}</span>
      <textarea
        v-model="formData.description"
        class="dialog-textarea"
        :rows="2"
        :placeholder="t('site.placeholderDesc')"
      />
    </label>

    <div class="form-row">
      <label class="dialog-field flex-1">
        <span class="dialog-label">{{ t('site.permission') }}</span>
        <AppSelect v-model.number="formData.level" class="dialog-select">
          <option :value="USER_LEVEL.GUEST">{{ t('userLevel.guest') }}</option>
          <option :value="USER_LEVEL.USER">{{ t('userLevel.user') }}</option>
          <option :value="USER_LEVEL.VIP">{{ t('userLevel.vip') }}</option>
          <option :value="USER_LEVEL.ADMIN">{{ t('userLevel.admin') }}</option>
        </AppSelect>
      </label>

      <div class="dialog-field flex-2">
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
        </div>
      </div>
    </div>

    <label class="switch-item">
      <span class="switch-copy">
        <i class="iconfont icon-md-flash"></i>
        <span>{{ t('site.pinned') }}</span>
      </span>
      <span class="toggle-control">
        <input v-model="formData.pinned" class="toggle-input" type="checkbox" />
        <span class="toggle-track">
          <span class="toggle-thumb"></span>
        </span>
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import AppSelect from '@/components/AppSelect.vue'
import { Item } from '@/types'
import { useI18n } from 'vue-i18n'
import { useBookmarkForm } from '@/composables/useBookmarkForm'
import { USER_LEVEL } from '@common/constants'
import type { CategoryTreeNode } from './form-utils'

const { t } = useI18n()

interface Props {
  modelValue: Partial<Item>
  categoryTree: CategoryTreeNode[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Partial<Item>): void
}>()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const {
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
} = useBookmarkForm(formData, toRef(props, 'categoryTree'))

// Template ref binding is counted as a use site for iconInputRef.
void iconInputRef
</script>

<style scoped lang="scss">
@use './BookmarkForm.scss';
</style>
