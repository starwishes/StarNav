<template>
  <Teleport to="body">
    <transition name="site-dialog">
      <div v-if="visible" class="site-dialog-backdrop" @click.self="handleClose">
        <div
          ref="dialogPanelRef"
          class="site-dialog-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-dialog-title"
          tabindex="-1"
        >
          <header class="site-dialog-header">
            <div class="site-dialog-copy">
              <p class="site-dialog-kicker">{{ dialogKicker }}</p>
              <h3 id="site-dialog-title" class="site-dialog-title">{{ dialogTitle }}</h3>
            </div>
            <button
              type="button"
              class="site-dialog-close"
              :aria-label="t('common.close')"
              @click="handleClose"
            >
              ×
            </button>
          </header>

          <div class="site-dialog-body">
            <CategoryForm
              v-if="effectiveMode === 'category' || effectiveMode === 'subcategory'"
              v-model="catEditForm"
              :category-tree="categoryTree"
              :mode="effectiveMode"
              :categories="categories"
              :invalid-fields="invalidFields"
              @add-sub-category="handleAddSubCategory"
              @edit-sub-category="handleEditSubCategory"
            />

            <BookmarkForm
              v-else
              v-model="localForm"
              :category-tree="categoryTree"
              :invalid-fields="invalidFields"
            />
          </div>

          <footer class="site-dialog-footer">
            <button type="button" class="footer-button ghost" @click="handleClose">
              {{ t('common.cancel') }}
            </button>

            <button
              v-if="effectiveMode === 'category' || effectiveMode === 'subcategory'"
              type="button"
              class="footer-button primary"
              :disabled="savingCat"
              @click="handleSaveCategory"
            >
              {{ savingCat ? t('common.loading') : t('common.save') }}
            </button>

            <button
              v-else
              type="button"
              class="footer-button primary"
              :disabled="saving"
              @click="handleSave"
            >
              {{ t('common.confirm') }}
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Item, Category } from '@/types'
import { useDataStore } from '@/store/data'
import CategoryForm from './SiteDialog/CategoryForm.vue'
import BookmarkForm from './SiteDialog/BookmarkForm.vue'
import { useSiteDialogForm, type SiteDialogMode } from '@/composables/useSiteDialogForm'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    form: Partial<Item>
    categoryForm?: Partial<Category>
    categories: Category[]
    isEdit: boolean
    dialogMode?: SiteDialogMode
    /** 书签保存 in-flight：保存期间禁用确认按钮，防双击重复提交。 */
    saving?: boolean
  }>(),
  {
    dialogMode: 'site',
    saving: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:form', value: Partial<Item>): void
  (e: 'save', value: Partial<Item>): void
}>()

const dataStore = useDataStore()

const {
  t,
  effectiveMode,
  visible,
  dialogTitle,
  dialogKicker,
  dialogPanelRef,
  localForm,
  invalidFields,
  savingCat,
  catEditForm,
  categoryTree,
  handleClose,
  handleAddSubCategory,
  handleEditSubCategory,
  handleSaveCategory,
  handleSave
} = useSiteDialogForm(props, emit, dataStore)

// template ref binding is not always tracked by vue-tsc noUnusedLocals
void dialogPanelRef
</script>

<style scoped lang="scss">
.site-dialog-shell {
  --site-dialog-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  --site-dialog-border: rgba(255, 255, 255, 0.44);
  --site-dialog-text: #0f172a;
  --site-dialog-muted: rgba(15, 23, 42, 0.78);
  --site-dialog-line: rgba(148, 163, 184, 0.18);
  --site-dialog-close-bg: rgba(148, 163, 184, 0.14);
  --site-dialog-close-text: rgba(15, 23, 42, 0.7);
  --site-dialog-soft-bg: rgba(248, 250, 252, 0.92);
  --site-dialog-soft-bg-muted: rgba(248, 250, 252, 0.88);
  --site-dialog-soft-bg-subtle: rgba(248, 250, 252, 0.72);
  --site-dialog-soft-border: rgba(148, 163, 184, 0.24);
  --site-dialog-input-bg: rgba(255, 255, 255, 0.92);
  --site-dialog-input-focus-bg: rgba(255, 255, 255, 0.98);
  --site-dialog-input-border: rgba(148, 163, 184, 0.38);
  --site-dialog-placeholder: rgba(100, 116, 139, 0.74);
  --site-dialog-soft-button-bg: rgba(148, 163, 184, 0.15);
  --site-dialog-soft-button-text: rgba(15, 23, 42, 0.82);
  --site-dialog-ghost-bg: rgba(148, 163, 184, 0.14);
  --site-dialog-ghost-text: rgba(15, 23, 42, 0.82);
  --site-dialog-preview-bg: #fff;
}

:global(:root[theme-mode='dark'] .site-dialog-shell) {
  --site-dialog-bg: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.92));
  --site-dialog-border: rgba(148, 163, 184, 0.2);
  --site-dialog-text: #f8fafc;
  --site-dialog-muted: rgba(226, 232, 240, 0.84);
  --site-dialog-line: rgba(148, 163, 184, 0.18);
  --site-dialog-close-bg: rgba(51, 65, 85, 0.78);
  --site-dialog-close-text: rgba(226, 232, 240, 0.84);
  --site-dialog-soft-bg: rgba(15, 23, 42, 0.9);
  --site-dialog-soft-bg-muted: rgba(15, 23, 42, 0.82);
  --site-dialog-soft-bg-subtle: rgba(30, 41, 59, 0.78);
  --site-dialog-soft-border: rgba(148, 163, 184, 0.22);
  --site-dialog-input-bg: rgba(15, 23, 42, 0.88);
  --site-dialog-input-focus-bg: rgba(15, 23, 42, 0.96);
  --site-dialog-input-border: rgba(148, 163, 184, 0.26);
  --site-dialog-placeholder: rgba(203, 213, 225, 0.56);
  --site-dialog-soft-button-bg: rgba(51, 65, 85, 0.78);
  --site-dialog-soft-button-text: rgba(226, 232, 240, 0.88);
  --site-dialog-ghost-bg: rgba(51, 65, 85, 0.78);
  --site-dialog-ghost-text: rgba(226, 232, 240, 0.88);
  --site-dialog-preview-bg: rgba(15, 23, 42, 0.96);
  color-scheme: dark;
}

.site-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(20px);
}

.site-dialog-shell {
  width: min(100%, 560px);
  max-height: min(86vh, 860px);
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  border: 1px solid var(--site-dialog-border);
  background: var(--site-dialog-bg);
  box-shadow:
    0 28px 70px rgba(15, 23, 42, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
  color: var(--site-dialog-text);
  outline: none;
}

.site-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 26px 18px;
  border-bottom: 1px solid var(--site-dialog-line);
}

.site-dialog-copy {
  min-width: 0;
}

.site-dialog-kicker {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--ui-theme-rgb), 0.82);
}

.site-dialog-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.site-dialog-close {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: var(--site-dialog-close-bg);
  color: var(--site-dialog-close-text);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    transform 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: rgba(var(--ui-theme-rgb), 0.12);
    color: var(--ui-theme);
    transform: rotate(90deg);
  }
}

.site-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px 26px;
}

.site-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px 24px;
  border-top: 1px solid var(--site-dialog-line);
}

.footer-button {
  min-width: 96px;
  min-height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
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
    opacity: 0.68;
  }

  &.ghost {
    background: var(--site-dialog-ghost-bg);
    color: var(--site-dialog-ghost-text);
  }

  &.primary {
    background: linear-gradient(135deg, var(--ui-theme), rgba(var(--ui-theme-rgb), 0.76));
    box-shadow: 0 14px 28px rgba(var(--ui-theme-rgb), 0.2);
    color: #fff;
  }
}

.site-dialog-enter-active,
.site-dialog-leave-active {
  transition: opacity 0.22s ease;
}

.site-dialog-enter-active .site-dialog-shell,
.site-dialog-leave-active .site-dialog-shell {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.site-dialog-enter-from,
.site-dialog-leave-to {
  opacity: 0;
}

.site-dialog-enter-from .site-dialog-shell,
.site-dialog-leave-to .site-dialog-shell {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media screen and (max-width: 640px) {
  .site-dialog-backdrop {
    padding: 16px;
  }

  .site-dialog-shell {
    border-radius: 22px;
    max-height: min(90vh, 860px);
  }

  .site-dialog-header,
  .site-dialog-body,
  .site-dialog-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .site-dialog-title {
    font-size: 21px;
  }

  .site-dialog-footer {
    flex-direction: column-reverse;
  }

  .footer-button {
    width: 100%;
  }
}
</style>
