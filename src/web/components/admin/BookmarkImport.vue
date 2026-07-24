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

          <div v-if="step === 1" class="import-step">
            <input
              ref="fileInputRef"
              class="sr-only-input"
              type="file"
              accept=".html,.htm,text/html"
              @change="handleFileSelection"
            />

            <button
              type="button"
              class="upload-dropzone"
              :class="{ active: dragActive }"
              @click="triggerFilePicker"
              @dragenter.prevent="dragActive = true"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="handleDrop"
            >
              <span class="upload-icon" aria-hidden="true">↥</span>
              <span class="upload-title">{{ t('bookmarkImport.dropzoneTitle') }}</span>
              <span class="upload-copy">{{ t('bookmarkImport.dropzoneCopy') }}</span>
              <span v-if="selectedFileName" class="upload-file">{{ selectedFileName }}</span>
            </button>

            <div class="import-help">
              <h4>{{ t('bookmarkImport.helpTitle') }}</h4>
              <ul>
                <li><strong>Chrome:</strong> {{ t('bookmarkImport.chromeGuide') }}</li>
                <li><strong>Firefox:</strong> {{ t('bookmarkImport.firefoxGuide') }}</li>
                <li><strong>Edge:</strong> {{ t('bookmarkImport.edgeGuide') }}</li>
              </ul>
            </div>
          </div>

          <div v-else-if="step === 2" class="import-step">
            <div class="preview-header">
              <span class="sn-badge is-success">{{ t('bookmarkImport.parsedBadge') }}</span>
              <span>
                {{
                  t('bookmarkImport.previewSummary', {
                    categories: parsedCategories.length,
                    bookmarks: totalBookmarks
                  })
                }}
              </span>
            </div>

            <div class="preview-list">
              <div v-for="cat in parsedCategories" :key="cat.name" class="preview-category">
                <label class="category-header">
                  <span class="checkbox-row">
                    <input v-model="cat.selected" type="checkbox" class="category-checkbox" />
                    <strong>{{ cat.name }}</strong>
                  </span>
                  <span class="sn-badge is-info preview-count">
                    {{ t('bookmarkImport.bookmarkCount', { count: cat.items.length }) }}
                  </span>
                </label>
                <div v-if="cat.selected" class="category-items">
                  <div v-for="item in cat.items.slice(0, 5)" :key="item.url" class="preview-item">
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-url">{{ item.url }}</span>
                  </div>
                  <div v-if="cat.items.length > 5" class="more-items">
                    {{ t('bookmarkImport.moreItems', { count: cat.items.length - 5 }) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="import-step import-result">
            <div class="result-panel">
              <div class="result-icon" :class="{ importing }">{{ importing ? '…' : '✓' }}</div>
              <h4 class="result-title">
                {{ importing ? t('bookmarkImport.importingTitle') : t('bookmarkImport.doneTitle') }}
              </h4>
              <p class="result-copy">
                {{
                  importing
                    ? t('bookmarkImport.importingCopy')
                    : t('bookmarkImport.resultCopy', { count: importedCount })
                }}
              </p>
              <button
                v-if="!importing"
                type="button"
                class="dialog-button primary"
                @click="handleClose"
              >
                {{ t('bookmarkImport.doneAction') }}
              </button>
            </div>
          </div>

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
  dragActive,
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

// Template binds via ref="..."; vue-tsc noUnusedLocals does not count that as a read
void fileInputRef
void dialogPanelRef
</script>

<style scoped lang="scss">
@import './BookmarkImport.scss';
</style>
