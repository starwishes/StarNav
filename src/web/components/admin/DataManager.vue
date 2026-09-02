<template>
  <div class="data-manager fade-in">
    <DataManagerToolbar
      :active-tab="internalActiveTab"
      :categories="categories"
      :items="items"
      @update:active-tab="internalActiveTab = $event"
      @show-bookmark-import="emit('show-bookmark-import')"
      @clean-duplicates="emit('clean-duplicates')"
      @json-import="(backup) => emit('json-import', backup)"
    />

    <DataManagerCategoryPanel
      v-if="internalActiveTab === 'categories'"
      :categories="categories"
      :items="items"
      @add-category="emit('add-category')"
      @edit-category="(category) => emit('edit-category', category)"
      @delete-category="(category) => emit('delete-category', category)"
      @move-category="(index, direction) => emit('move-category', index, direction)"
    />

    <DataManagerItemsPanel
      v-else
      :filtered-items="filteredItems"
      :categories="categories"
      :search-keyword="searchKeyword"
      :filter-category="filterCategory"
      :load-error="loadError"
      @update:search-keyword="(value) => emit('update:searchKeyword', value)"
      @update:filter-category="(value) => emit('update:filterCategory', value)"
      @add-item="emit('add-item')"
      @edit-item="(item) => emit('edit-item', item)"
      @delete-item="(item) => emit('delete-item', item)"
      @batch-delete="(ids) => emit('batch-delete', ids)"
      @batch-move="(ids, categoryId) => emit('batch-move', ids, categoryId)"
      @retry="emit('retry')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataManagerToolbar from '@/components/admin/DataManagerToolbar.vue'
import DataManagerCategoryPanel from '@/components/admin/DataManagerCategoryPanel.vue'
import DataManagerItemsPanel from '@/components/admin/DataManagerItemsPanel.vue'
import type { Category, Item } from '@/types'

const props = defineProps<{
  activeTab: string
  categories: Category[]
  items: Item[]
  filteredItems: Item[]
  filterCategory: number
  searchKeyword: string
  /** 数据加载失败信息；非空表示需展示错误态而非“无数据”。 */
  loadError: string
}>()

const emit = defineEmits([
  'update:activeTab',
  'update:searchKeyword',
  'update:filterCategory',
  'add-category',
  'edit-category',
  'delete-category',
  'add-item',
  'edit-item',
  'delete-item',
  'batch-delete',
  'batch-move',
  'show-bookmark-import',
  'json-import',
  'move-category',
  'clean-duplicates',
  'retry'
])

const internalActiveTab = computed({
  get: () => props.activeTab,
  set: (value: string) => emit('update:activeTab', value)
})
</script>

<style scoped lang="scss">
.data-manager {
  --data-card-bg: var(--ui-panel-bg, rgba(255, 255, 255, 0.9));
  --data-card-border: var(--ui-panel-border, rgba(148, 163, 184, 0.18));
  --data-tabs-bg: rgba(148, 163, 184, 0.12);
  --data-input-bg: var(--ui-panel-surface, rgba(255, 255, 255, 0.92));
  --data-input-border: rgba(148, 163, 184, 0.24);
  --data-input-focus-bg: rgba(255, 255, 255, 0.98);
  --data-input-placeholder: rgba(100, 116, 139, 0.78);
  --data-clear-bg: rgba(148, 163, 184, 0.14);
  --data-action-bg: rgba(148, 163, 184, 0.12);
  --data-action-text: var(--gray-700);
  --data-action-info-bg: rgba(59, 130, 246, 0.12);
  --data-action-info-border: rgba(59, 130, 246, 0.2);
  --data-action-info-text: #1d4ed8;
  --data-action-warning-bg: rgba(245, 158, 11, 0.14);
  --data-action-warning-border: rgba(245, 158, 11, 0.2);
  --data-action-warning-text: #b45309;
  --data-action-success-bg: rgba(34, 197, 94, 0.14);
  --data-action-success-border: rgba(34, 197, 94, 0.2);
  --data-action-success-text: #15803d;
  --data-action-danger-bg: rgba(239, 68, 68, 0.12);
  --data-action-danger-border: rgba(239, 68, 68, 0.2);
  --data-action-danger-text: #b91c1c;
  color: var(--ui-text-primary, #0f172a);
  display: flex;
  flex-direction: column;
  gap: 20px;
  // Respond to the admin content pane width (not full browser chrome + sidebar)
  container-type: inline-size;
  container-name: data-manager;
}

:global(:root[theme-mode='dark'] .data-manager) {
  --data-card-bg: rgba(15, 23, 42, 0.84);
  --data-card-border: rgba(148, 163, 184, 0.2);
  --data-tabs-bg: rgba(51, 65, 85, 0.72);
  --data-input-bg: rgba(15, 23, 42, 0.88);
  --data-input-border: rgba(148, 163, 184, 0.24);
  --data-input-focus-bg: rgba(15, 23, 42, 0.96);
  --data-input-placeholder: rgba(203, 213, 225, 0.56);
  --data-clear-bg: rgba(51, 65, 85, 0.82);
  --data-action-bg: rgba(51, 65, 85, 0.78);
  --data-action-text: rgba(226, 232, 240, 0.88);
  --data-action-info-bg: rgba(59, 130, 246, 0.18);
  --data-action-info-border: rgba(96, 165, 250, 0.2);
  --data-action-info-text: #93c5fd;
  --data-action-warning-bg: rgba(245, 158, 11, 0.2);
  --data-action-warning-border: rgba(251, 191, 36, 0.22);
  --data-action-warning-text: #fcd34d;
  --data-action-success-bg: rgba(34, 197, 94, 0.2);
  --data-action-success-border: rgba(74, 222, 128, 0.22);
  --data-action-success-text: #86efac;
  --data-action-danger-bg: rgba(239, 68, 68, 0.18);
  --data-action-danger-border: rgba(248, 113, 113, 0.22);
  --data-action-danger-text: #fca5a5;
  color-scheme: dark;
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
