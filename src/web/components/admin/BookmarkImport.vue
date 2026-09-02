<template>
  <Teleport to="body">
    <transition name="bookmark-import">
      <div v-if="visible" class="bookmark-import-backdrop" @click.self="handleClose">
        <div
          ref="dialogPanelRef"
          class="bookmark-import-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bookmark-import-title"
          tabindex="-1"
        >
          <header class="dialog-header">
            <div>
              <p class="dialog-kicker">{{ t('bookmarkImport.kicker') }}</p>
              <h3 id="bookmark-import-title" class="dialog-title">
                {{ t('bookmarkImport.title') }}
              </h3>
              <p class="dialog-copy">{{ t('bookmarkImport.copy') }}</p>
            </div>
            <button
              type="button"
              class="dialog-close"
              :aria-label="t('bookmarkImport.closeAria')"
              @click="handleClose"
            >
              ×
            </button>
          </header>

          <input
            ref="fileInputRef"
            class="sr-only-input"
            type="file"
            accept=".html,.htm,text/html"
            @change="handleFileSelection"
          />

          <BookmarkImportStepUpload
            v-if="step === 1"
            :selected-file-name="selectedFileName"
            @pick="triggerFilePicker"
            @drop="handleDrop"
          />
          <BookmarkImportStepPreview
            v-else-if="step === 2"
            :parsed-categories="parsedCategories"
            :total-bookmarks="totalBookmarks"
            @toggle-category="onToggleCategory"
          />
          <BookmarkImportStepResult
            v-else
            :importing="importing"
            :imported-count="importedCount"
            @close="handleClose"
          />

          <footer v-if="step !== 3" class="dialog-footer">
            <div v-if="step === 1" class="footer-actions single">
              <button type="button" class="dialog-button ghost" @click="handleClose">
                {{ t('common.cancel') }}
              </button>
            </div>
            <div v-else class="footer-actions">
              <button type="button" class="dialog-button ghost" @click="step = 1">
                {{ t('bookmarkImport.back') }}
              </button>
              <button
                type="button"
                class="dialog-button primary"
                :disabled="selectedCount === 0"
                @click="handleImport"
              >
                {{ t('bookmarkImport.importSelected', { count: selectedCount }) }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportedBookmarkItem } from '@/types'
import BookmarkImportStepUpload from '@/components/admin/BookmarkImportStepUpload.vue'
import BookmarkImportStepPreview from '@/components/admin/BookmarkImportStepPreview.vue'
import BookmarkImportStepResult from '@/components/admin/BookmarkImportStepResult.vue'
import { useBookmarkImportDialog } from '@/composables/useBookmarkImportDialog'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  importAction?: (data: {
    categories: string[]
    items: ImportedBookmarkItem[]
  }) => Promise<number | void> | number | void
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const {
  step,
  parsedCategories,
  importing,
  importedCount,
  selectedFileName,
  fileInputRef,
  dialogPanelRef,
  totalBookmarks,
  selectedCount,
  triggerFilePicker,
  handleFileSelection,
  handleDrop,
  handleImport,
  handleClose
} = useBookmarkImportDialog({
  getModelValue: () => props.modelValue,
  setModelValue: (value) => emit('update:modelValue', value),
  importAction: (...args) => props.importAction?.(...args)
})

const onToggleCategory = (name: string, checked: boolean) => {
  // 子组件 emit (name, checked)，这里按 name 映射更新父组件持有的 parsedCategories 对象，
  // 避免跨组件边界按引用修改 prop 数组元素（vue/no-mutating-props）。
  const cat = parsedCategories.value.find((c) => c.name === name)
  if (cat) {
    cat.selected = checked
  }
}

// Template binds via ref="..."; vue-tsc noUnusedLocals does not count that as a read
void fileInputRef
void dialogPanelRef
</script>

<style scoped lang="scss">
.bookmark-import-shell {
  --bookmark-import-bg: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98),
    rgba(248, 250, 252, 0.96)
  );
  --bookmark-import-border: rgba(255, 255, 255, 0.45);
  --bookmark-import-text: #0f172a;
  --bookmark-import-muted: rgba(100, 116, 139, 0.9);
  --bookmark-import-line: rgba(148, 163, 184, 0.18);
  --bookmark-import-close-bg: rgba(148, 163, 184, 0.14);
  --bookmark-import-close-text: rgba(15, 23, 42, 0.7);
  --bookmark-import-surface: rgba(255, 255, 255, 0.88);
}

:global(:root[theme-mode='dark'] .bookmark-import-shell) {
  --bookmark-import-bg: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.92));
  --bookmark-import-border: rgba(148, 163, 184, 0.2);
  --bookmark-import-text: #f8fafc;
  --bookmark-import-muted: rgba(226, 232, 240, 0.72);
  --bookmark-import-line: rgba(148, 163, 184, 0.18);
  --bookmark-import-close-bg: rgba(51, 65, 85, 0.78);
  --bookmark-import-close-text: rgba(226, 232, 240, 0.84);
  --bookmark-import-surface: rgba(15, 23, 42, 0.88);
  color-scheme: dark;
}

.bookmark-import-backdrop {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(20px);
}

.bookmark-import-shell {
  width: min(100%, 720px);
  /* 移动端软键盘/横屏下限制高度，内容可滚动而不被视口裁剪 */
  max-height: min(86vh, 860px);
  overflow-y: auto;
  border-radius: 24px;
  border: 1px solid var(--bookmark-import-border);
  background: var(--bookmark-import-bg);
  box-shadow:
    0 26px 68px rgba(15, 23, 42, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  color: var(--bookmark-import-text);
  outline: none;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 16px;
  border-bottom: 1px solid var(--bookmark-import-line);
}

.dialog-kicker {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--ui-theme-rgb), 0.82);
}

.dialog-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.dialog-copy {
  margin: 8px 0 0;
  color: var(--bookmark-import-muted);
  font-size: 14px;
}

.dialog-close,
.dialog-button {
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.dialog-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--bookmark-import-close-bg);
  color: var(--bookmark-import-close-text);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: rgba(var(--ui-theme-rgb), 0.12);
    color: var(--ui-theme);
    transform: rotate(90deg);
  }
}

.import-step {
  min-height: 300px;
  padding: 22px;
}

.dialog-footer {
  padding: 0 22px 22px;
}

.footer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.footer-actions.single {
  justify-content: flex-end;
}

.dialog-button {
  border: none;
  border-radius: 12px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.dialog-button.ghost {
  background: rgba(148, 163, 184, 0.12);
  color: var(--gray-700);
}

.dialog-button.primary {
  background: linear-gradient(135deg, rgb(var(--ui-theme-rgb)), rgba(var(--ui-theme-rgb), 0.82));
  color: #fff;
  box-shadow: 0 14px 30px rgba(var(--ui-theme-rgb), 0.2);
}

.sr-only-input {
  display: none;
}

@media (max-width: 768px) {
  .bookmark-import-backdrop {
    padding: 16px;
  }

  .dialog-header,
  .footer-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
