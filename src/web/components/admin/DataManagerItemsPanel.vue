<template>
  <section class="panel-card table-wrapper">
    <div class="card-header">
      <span class="card-title">{{ t('manage.siteList') }}（{{ filteredItems.length }})</span>
      <div class="header-filters">
        <label class="search-field">
          <input
            v-model="searchKeyword"
            class="filter-input"
            type="search"
            :placeholder="t('manage.searchPlaceholder')"
          />
          <button
            v-if="searchKeyword"
            type="button"
            class="clear-button"
            :aria-label="t('manage.clearSearch')"
            @click="searchKeyword = ''"
          >
            ×
          </button>
        </label>
        <AppSelect v-model.number="filterCategory" class="filter-select sn-inline-select">
          <option :value="0">{{ t('manage.allCategories') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </AppSelect>
        <button type="button" class="action-button primary" @click="emit('add-item')">
          {{ t('manage.addSite') }}
        </button>
      </div>
    </div>
    <SiteTable
      :items="filteredItems"
      :categories="categories"
      :error="loadError"
      @edit="onEditItem"
      @delete="onDeleteItem"
      @batch-delete="onBatchDelete"
      @batch-move="onBatchMove"
      @retry="emit('retry')"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppSelect from '@/components/AppSelect.vue'
import SiteTable from '@/components/SiteTable.vue'
import type { Category, Item } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  filteredItems: Item[]
  categories: Category[]
  searchKeyword: string
  filterCategory: number
  /** 数据加载失败信息；非空表示需展示错误态而非“无数据”。 */
  loadError: string
}>()

const emit = defineEmits<{
  (e: 'update:searchKeyword', value: string): void
  (e: 'update:filterCategory', value: number): void
  (e: 'add-item'): void
  (e: 'edit-item', item: Item): void
  (e: 'delete-item', item: Item): void
  (e: 'batch-delete', ids: number[]): void
  (e: 'batch-move', ids: number[], categoryId: number): void
  (e: 'retry'): void
}>()

const searchKeyword = computed({
  get: () => props.searchKeyword,
  set: (value: string) => emit('update:searchKeyword', value)
})

const filterCategory = computed({
  get: () => props.filterCategory,
  set: (value: number) => emit('update:filterCategory', value)
})

const onEditItem = (item: Item) => emit('edit-item', item)

const onDeleteItem = (item: Item) => emit('delete-item', item)

const onBatchDelete = (ids: number[]) => emit('batch-delete', ids)

const onBatchMove = (ids: number[], categoryId: number) => emit('batch-move', ids, categoryId)
</script>

<style scoped lang="scss">
// 拆分子组件共享 .panel-card 样式与 @container data-manager 断点块：样式按需复制，改一处需同步另两处（Toolbar/CategoryPanel/ItemsPanel）。
.panel-card {
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--data-card-border);
  background: var(--data-card-bg);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}

.card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 18px;
}

.card-title {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  color: var(--gray-800);
  font-size: 16px;
  font-weight: 700;
  flex: 0 1 auto;
}

.card-header > .action-button {
  flex: 0 0 auto;
  width: auto;
  margin-left: auto;
}

.header-filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-left: auto;
}

.header-filters .action-button {
  flex: 0 0 auto;
  width: auto;
}

.search-field {
  position: relative;
  min-width: 180px;
  flex: 1 1 180px;
}

.filter-input {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--data-input-border);
  border-radius: 12px;
  background: var(--data-input-bg);
  color: var(--ui-text-primary, var(--gray-700));
  padding: 9px 38px 9px 14px;
  font-size: 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;

  &::placeholder {
    color: var(--data-input-placeholder);
  }

  &:focus {
    outline: none;
    border-color: rgba(var(--ui-theme-rgb), 0.42);
    box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.1);
    background: var(--data-input-focus-bg);
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--ui-text-primary, var(--gray-700));
    -webkit-box-shadow: 0 0 0 1000px var(--data-input-focus-bg) inset;
    transition: background-color 9999s ease-in-out 0s;
  }
}

.clear-button {
  position: absolute;
  top: 50%;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--data-clear-bg);
  color: var(--gray-500);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: rgba(var(--ui-theme-rgb), 0.14);
    color: rgb(var(--ui-theme-rgb));
  }
}

.filter-select {
  min-width: 160px;
}

.action-button {
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--data-action-bg);
  color: var(--data-action-text);
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  flex: 0 0 auto;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--ui-theme-rgb), 0.25);
    outline-offset: 2px;
  }
}

.action-button.primary {
  background: linear-gradient(135deg, rgb(var(--ui-theme-rgb)), rgba(var(--ui-theme-rgb), 0.82));
  color: #fff;
}

// ---- Content-width breakpoints (sidebar-aware) ----

// Compact content pane: stack toolbar, keep list add-buttons compact
@container data-manager (max-width: 860px) {
  .header-filters {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }

  .search-field,
  .filter-select {
    flex: 1 1 160px;
    min-width: 0;
  }

  // Never stretch primary add actions into a full-width slab
  .card-header > .action-button,
  .header-filters .action-button {
    flex: 0 0 auto;
    width: auto;
    min-height: 40px;
    margin-left: auto;
  }
}

// Phone-narrow content: wrap more tightly, still keep add button pill-sized
@container data-manager (max-width: 520px) {
  .card-header {
    gap: 10px;
  }

  .header-filters {
    gap: 8px;
  }

  .search-field,
  .filter-select {
    flex: 1 1 100%;
  }

  .card-header > .action-button,
  .header-filters .action-button {
    margin-left: auto;
    width: auto;
    max-width: 100%;
  }
}

// Fallback when container queries unsupported: viewport media
@supports not (container-type: inline-size) {
  @media (max-width: 1100px) {
    .header-filters {
      width: 100%;
      margin-left: 0;
    }

    .card-header > .action-button,
    .header-filters .action-button {
      flex: 0 0 auto;
      width: auto;
      margin-left: auto;
    }
  }
}
</style>
