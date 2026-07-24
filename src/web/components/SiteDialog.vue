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
              @add-sub-category="handleAddSubCategory"
              @edit-sub-category="handleEditSubCategory"
            />

            <BookmarkForm v-else v-model="localForm" :category-tree="categoryTree" />
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

            <button v-else type="button" class="footer-button primary" @click="handleSave">
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
  }>(),
  {
    dialogMode: 'site'
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
@import './SiteDialog.scss';
</style>
