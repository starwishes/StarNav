<template>
  <div class="import-step">
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
            <input
              :checked="cat.selected"
              type="checkbox"
              class="category-checkbox"
              @change="onToggleCategory(cat, $event)"
            />
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
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ParsedBookmarkCategory } from '@/utils/bookmarkImport'

const { t } = useI18n()

defineProps<{
  parsedCategories: ParsedBookmarkCategory[]
  totalBookmarks: number
}>()

const emit = defineEmits<{
  (e: 'toggle-category', name: string, checked: boolean): void
}>()

const onToggleCategory = (cat: ParsedBookmarkCategory, event: Event) => {
  emit('toggle-category', cat.name, (event.target as HTMLInputElement).checked)
}
</script>

<style scoped lang="scss">
.preview-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding: 10px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.preview-list {
  max-height: 400px;
  overflow-y: auto;
}

.preview-category {
  margin-bottom: 15px;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--bookmark-import-surface);
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
  cursor: pointer;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-checkbox {
  width: 16px;
  height: 16px;
}

.preview-count {
  min-height: 20px;
  padding: 3px 8px;
}

.category-items {
  padding-left: 26px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-url {
  flex: 1;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}

.more-items {
  padding: 5px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .category-header {
    flex-direction: column;
    align-items: stretch;
  }

  .preview-item {
    flex-direction: column;
  }

  .item-url {
    text-align: left;
  }
}
</style>
