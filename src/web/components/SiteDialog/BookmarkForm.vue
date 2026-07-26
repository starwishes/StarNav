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
.bookmark-form {
  display: flex;
  flex-direction: column;
  gap: 18px;

  .form-row {
    display: flex;
    gap: 16px;
  }

  .flex-1 {
    flex: 1;
  }

  .flex-2 {
    flex: 2;
  }

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

  .dialog-input,
  .dialog-textarea {
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--site-dialog-input-border, rgba(148, 163, 184, 0.38));
    border-radius: 14px;
    background: var(--site-dialog-input-bg, rgba(255, 255, 255, 0.92));
    color: var(--site-dialog-text, #0f172a);
    font-size: 14px;
    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background-color 0.18s ease;

    &:focus {
      outline: none;
      border-color: rgba(var(--ui-theme-rgb), 0.62);
      box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.12);
      background: var(--site-dialog-input-focus-bg, rgba(255, 255, 255, 0.98));
    }

    &::placeholder {
      color: var(--site-dialog-placeholder, rgba(100, 116, 139, 0.74));
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

  .dialog-input {
    padding: 0 14px;
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

  .dialog-textarea {
    resize: vertical;
    padding: 12px 14px;
    min-height: 92px;
  }

  .category-selector-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .category-selector-wrap,
  .icon-upload-wrap,
  .input-with-prefix {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .input-with-prefix {
    position: relative;
  }

  .input-prefix {
    position: absolute;
    left: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--site-dialog-placeholder, rgba(100, 116, 139, 0.82));
    pointer-events: none;

    i {
      font-size: 16px;
    }
  }

  .with-prefix {
    padding-left: 40px;
  }

  .add-cat-btn,
  .upload-button,
  .panel-link-button,
  .action-button {
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

  .add-cat-btn {
    width: 44px;
    min-width: 44px;
    height: 44px;
    border-radius: 14px;
    background: rgba(var(--ui-theme-rgb), 0.12);
    color: var(--ui-theme);
  }

  .add-cat-icon {
    font-size: 22px;
    font-weight: 500;
    line-height: 1;
    opacity: 0.9;
  }

  .upload-button,
  .action-button {
    min-height: 42px;
    padding: 0 16px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
  }

  .upload-button {
    min-width: 92px;
    background: var(--site-dialog-soft-button-bg, rgba(148, 163, 184, 0.15));
    color: var(--site-dialog-soft-button-text, rgba(15, 23, 42, 0.82));
  }

  .action-button.primary {
    background: linear-gradient(135deg, var(--ui-theme), rgba(var(--ui-theme-rgb), 0.74));
    box-shadow: 0 12px 24px rgba(var(--ui-theme-rgb), 0.2);
    color: #fff;
  }

  .inline-cat-panel {
    padding: 16px;
    border-radius: 18px;
    background: var(--site-dialog-soft-bg, rgba(248, 250, 252, 0.92));
    border: 1px solid var(--site-dialog-soft-border, rgba(148, 163, 184, 0.24));

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .title {
        font-size: 13px;
        font-weight: 600;
        color: var(--site-dialog-text, rgba(15, 23, 42, 0.82));
      }
    }

    .panel-link-button {
      padding: 0;
      background: transparent;
      color: var(--ui-theme);
      font-size: 13px;
      font-weight: 600;
    }

    .panel-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .panel-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }
  }

  .sr-only-input {
    display: none;
  }

  .switch-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    background: var(--site-dialog-soft-bg-muted, rgba(248, 250, 252, 0.88));
    border: 1px solid var(--site-dialog-soft-border, rgba(148, 163, 184, 0.2));
  }

  .switch-copy {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--site-dialog-text, rgba(15, 23, 42, 0.82));
  }

  .toggle-control {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .toggle-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 1;
  }

  .toggle-track {
    position: relative;
    width: 54px;
    height: 30px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.36);
    transition: background-color 0.18s ease;
  }

  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.16);
    transition: transform 0.18s ease;
  }

  .toggle-input:checked + .toggle-track {
    background: rgba(var(--ui-theme-rgb), 0.88);
  }

  .toggle-input:checked + .toggle-track .toggle-thumb {
    transform: translateX(24px);
  }

  .inline-panel-enter-active,
  .inline-panel-leave-active {
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
  }

  .inline-panel-enter-from,
  .inline-panel-leave-to {
    opacity: 0;
    transform: translateY(-8px);
  }

  @media screen and (max-width: 720px) {
    .form-row {
      flex-direction: column;
    }

    .inline-cat-panel .panel-grid {
      grid-template-columns: 1fr;
    }

    .category-selector-wrap,
    .icon-upload-wrap {
      align-items: stretch;
      flex-direction: column;
    }

    .add-cat-btn,
    .upload-button,
    .action-button {
      width: 100%;
    }

    .inline-cat-panel .panel-actions {
      justify-content: stretch;
    }
  }
}
</style>
