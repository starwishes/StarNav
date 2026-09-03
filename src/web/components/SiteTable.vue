<template>
  <div class="site-table-container">
    <div v-if="error && items.length === 0" class="sn-error-state" role="status">
      <p class="sn-error-state__text">{{ t('common.loadFailed') }}</p>
      <button type="button" class="table-action primary" @click="$emit('retry')">
        {{ t('common.retry') }}
      </button>
    </div>

    <div v-else-if="paginatedData.length === 0" class="sn-empty-state">
      {{ t('common.noData') }}
    </div>

    <div v-else class="sn-table-shell">
      <div class="sn-table-scroll">
        <table class="sn-table">
          <thead>
            <tr>
              <th class="is-center col-meta col-check" style="width: 56px">
                <label class="sn-check-cell">
                  <input
                    type="checkbox"
                    :aria-label="t('table.selectAll')"
                    :checked="allSelected"
                    @change="toggleSelectAll"
                  />
                </label>
              </th>
              <th class="is-center col-meta col-id" style="width: 72px">{{ t('table.id') }}</th>
              <th class="col-name" style="width: 160px">{{ t('table.siteName') }}</th>
              <th class="col-url">{{ t('table.siteUrl') }}</th>
              <th class="is-center col-meta col-category" style="width: 140px">
                {{ t('table.category') }}
              </th>
              <th class="is-center col-meta col-visibility" style="width: 120px">
                {{ t('table.visibility') }}
              </th>
              <th class="is-center col-meta col-clicks" style="width: 120px">
                <button type="button" class="sort-button" @click="toggleClickCountSort">
                  <span>{{ t('table.clickCount') }}</span>
                  <span class="sort-indicator">
                    {{ clickCountSort === 'asc' ? '↑' : clickCountSort === 'desc' ? '↓' : '↕' }}
                  </span>
                </button>
              </th>
              <th class="is-center col-meta col-visited" style="width: 140px">
                {{ t('table.lastVisited') }}
              </th>
              <th class="is-center col-actions" style="width: 220px">{{ t('table.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedData" :key="row.id">
              <td class="is-center col-meta col-check">
                <label class="sn-check-cell">
                  <input
                    type="checkbox"
                    :aria-label="t('table.selectRow', { name: row.name })"
                    :checked="selectedIds.includes(row.id)"
                    @change="toggleSelection(row, $event)"
                  />
                </label>
              </td>
              <td class="is-center col-meta col-id">{{ row.id }}</td>
              <td class="col-name">{{ row.name }}</td>
              <td class="col-url">
                <div class="url-cell">
                  <a
                    class="sn-table-link site-link"
                    :href="getSafeHref(row.url)"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {{ row.url }}
                  </a>
                  <span
                    v-if="linkStatus[row.id] === 'ok'"
                    class="sn-badge status-chip is-success"
                    :aria-label="t('table.linkOk')"
                  >
                    ✓
                  </span>
                  <span
                    v-else-if="linkStatus[row.id] === 'error'"
                    class="sn-badge status-chip is-danger"
                    :aria-label="t('table.linkError')"
                  >
                    ✗
                  </span>
                  <span
                    v-else-if="linkStatus[row.id] === 'checking'"
                    class="status-spinner"
                    aria-hidden="true"
                  ></span>
                </div>
              </td>
              <td class="is-center col-meta col-category">
                <span class="sn-badge is-primary">{{ getCategoryName(row.categoryId) }}</span>
              </td>
              <td class="is-center col-meta col-visibility">
                <span class="sn-badge" :class="getVisibilityClass(row.level ?? 0)">
                  {{ getVisibilityLabel(row.level ?? 0) }}
                </span>
              </td>
              <td class="is-center col-meta col-clicks">
                <span class="sn-table-cell-muted">{{ row.clickCount || 0 }}</span>
              </td>
              <td class="is-center col-meta col-visited">
                <span v-if="row.lastVisited" class="sn-table-cell-muted">
                  {{ formatDate(row.lastVisited) }}
                </span>
                <span v-else class="sn-table-cell-muted">-</span>
              </td>
              <td class="is-center col-actions">
                <div class="sn-table-actions">
                  <button
                    type="button"
                    class="table-action link primary"
                    @click="$emit('edit', row)"
                  >
                    {{ t('table.edit') }}
                  </button>
                  <button
                    type="button"
                    class="table-action link danger"
                    @click="$emit('delete', row)"
                  >
                    {{ t('table.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="items.length > 0" class="sn-pagination">
      <div class="sn-pagination-meta">{{ pageStart }}-{{ pageEnd }} / {{ items.length }}</div>
      <div class="sn-pagination-controls">
        <AppSelect
          class="sn-inline-select page-size-select"
          :label="t('table.rowsPerPage')"
          :model-value="pageSize"
          @change="handleSizeChange"
        >
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
        </AppSelect>
        <button
          class="sn-pagination-button"
          type="button"
          :disabled="currentPage <= 1"
          :aria-label="t('common.prevPage')"
          @click="currentPage -= 1"
        >
          ‹
        </button>
        <span class="sn-pagination-status">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="sn-pagination-button"
          type="button"
          :disabled="currentPage >= totalPages"
          :aria-label="t('common.nextPage')"
          @click="currentPage += 1"
        >
          ›
        </button>
      </div>
    </div>

    <div v-if="selectedPageItems.length > 0" class="batch-actions-footer glass-effect">
      <span class="selected-count">{{
        t('table.selectedCount', { count: selectedPageItems.length })
      }}</span>
      <div class="actions">
        <AppSelect
          class="sn-inline-select batch-select"
          :label="t('table.batchMovePlaceholder')"
          :model-value="batchMoveTarget ?? ''"
          @change="handleBatchTargetChange"
        >
          <option value="" disabled>{{ t('table.batchMove') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </AppSelect>
        <button
          type="button"
          class="table-action primary"
          :disabled="batchMoveTarget === null"
          @click="applyBatchMove"
        >
          {{ t('table.batchMove') }}
        </button>
        <button type="button" class="table-action danger" @click="handleBatchDelete">
          {{ t('table.batchDelete') }}
        </button>
        <button
          type="button"
          class="table-action warning"
          :disabled="checking"
          @click="handleCheckLinks"
        >
          {{ checking ? t('common.loading') : t('table.checkLinks') }}
        </button>
        <button type="button" class="table-action subtle" @click="clearSelection">
          {{ t('table.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSelect from '@/components/AppSelect.vue'
import type { Category, Item } from '@/types'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/store/config'
import { useSiteTableState } from '@/composables/useSiteTableState'
import { isSafeHttpUrl, isSafeRelativePath } from '../../shared/security/urlSafety.js'
import {
  formatRelativeDate,
  getCategoryNameById,
  getVisibilityBadgeClass,
  getVisibilityLabel as getVisibilityText
} from '@/components/siteTableHelpers'

const { t, locale } = useI18n()
const configStore = useConfigStore()

// Neutralize unsafe hrefs (javascript:, data:, ...) so the rendered link can never
// execute in this page's origin even if a bookmark URL was tampered with.
const getSafeHref = (url: string) =>
  isSafeHttpUrl(url) || isSafeRelativePath(url) ? url : undefined

const props = defineProps<{
  items: Item[]
  categories: Category[]
  /** 数据加载失败信息；非空且无数据时展示错误态 + 重试，而非“暂无数据”。 */
  error?: string
}>()

const emit = defineEmits<{
  (e: 'edit', item: Item): void
  (e: 'delete', item: Item): void
  (e: 'batch-delete', ids: number[]): void
  (e: 'batch-move', ids: number[], categoryId: number): void
  (e: 'retry'): void
}>()

const {
  linkStatus,
  checking,
  selectedIds,
  currentPage,
  pageSize,
  clickCountSort,
  batchMoveTarget,
  pageSizes,
  totalPages,
  paginatedData,
  pageStart,
  pageEnd,
  selectedPageItems,
  allSelected,
  clearSelection,
  toggleSelection,
  toggleSelectAll,
  handleSizeChange,
  handleBatchTargetChange,
  toggleClickCountSort,
  handleBatchDelete,
  applyBatchMove,
  handleCheckLinks
} = useSiteTableState(() => props.items, {
  t,
  onBatchDelete: (ids) => emit('batch-delete', ids),
  onBatchMove: (ids, categoryId) => emit('batch-move', ids, categoryId)
})

const getCategoryName = (categoryId: number) => getCategoryNameById(props.categories, categoryId, t)
const getVisibilityClass = (level: number) => getVisibilityBadgeClass(level)
const getVisibilityLabel = (level: number) => getVisibilityText(level, t)
// 相对时间超过 7 天退化为绝对日期时，显式使用站点配置时区 + 当前 locale，
// 与后台其它表格的绝对时间（useDateTimeFormatter）基准一致。
const formatDate = (dateString: string) =>
  formatRelativeDate(dateString, t, {
    locale: locale?.value || undefined,
    timeZone: configStore.siteConfig.timezone || undefined
  })
</script>

<style scoped lang="scss">
.site-table-container {
  --site-action-bg: rgba(148, 163, 184, 0.12);
  --site-action-text: var(--gray-700);
  --site-warning-bg: rgba(245, 158, 11, 0.14);
  --site-warning-border: rgba(245, 158, 11, 0.2);
  --site-warning-text: #b45309;
  --site-danger-bg: rgba(239, 68, 68, 0.12);
  --site-danger-border: rgba(239, 68, 68, 0.2);
  --site-danger-text: #b91c1c;
  --site-subtle-border: rgba(148, 163, 184, 0.18);
  --site-batch-bg: rgba(255, 255, 255, 0.9);
  --site-batch-border: var(--el-border-color-lighter);
  --site-batch-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
  position: relative;
  container-type: inline-size;
  container-name: site-table;

  .sn-table {
    min-width: 1060px;
  }

  .sn-table th,
  .sn-table td {
    white-space: nowrap;
  }

  .col-name,
  .col-url {
    white-space: nowrap;
  }
}

// Progressively hide secondary columns as the table pane shrinks
@container site-table (max-width: 980px) {
  .col-visited,
  .col-clicks {
    display: none;
  }

  .sn-table {
    min-width: 820px;
  }
}

@container site-table (max-width: 780px) {
  .col-visibility,
  .col-id {
    display: none;
  }

  .sn-table {
    min-width: 640px;
  }
}

@container site-table (max-width: 620px) {
  .col-category,
  .col-check {
    display: none;
  }

  .sn-table {
    min-width: 0;
  }

  .batch-actions-footer {
    flex-direction: column;
    align-items: stretch;
  }
}

:global(:root[theme-mode='dark'] .site-table-container) {
  --site-action-bg: rgba(51, 65, 85, 0.78);
  --site-action-text: rgba(226, 232, 240, 0.88);
  --site-warning-bg: rgba(245, 158, 11, 0.2);
  --site-warning-border: rgba(251, 191, 36, 0.22);
  --site-warning-text: #fcd34d;
  --site-danger-bg: rgba(239, 68, 68, 0.18);
  --site-danger-border: rgba(248, 113, 113, 0.22);
  --site-danger-text: #fca5a5;
  --site-subtle-border: rgba(148, 163, 184, 0.22);
  --site-batch-bg: rgba(15, 23, 42, 0.9);
  --site-batch-border: rgba(148, 163, 184, 0.18);
  --site-batch-shadow: 0 -8px 20px rgba(0, 0, 0, 0.22);
}

.url-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sn-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 220px;
  color: var(--gray-500);
}

.sn-error-state__text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.site-link {
  max-width: 240px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip {
  min-width: 24px;
  padding-inline: 0;
}

.status-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(var(--ui-theme-rgb), 0.2);
  border-top-color: rgb(var(--ui-theme-rgb));
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.sort-indicator {
  font-size: 12px;
  color: var(--gray-500);
}

.page-size-select,
.batch-select {
  min-width: 90px;
}

.table-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.25rem;
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--site-action-bg);
  color: var(--site-action-text);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.02em;
  white-space: nowrap;
  writing-mode: horizontal-tb;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.table-action.link {
  background: transparent;
  padding-inline: 0;
}

.table-action.primary {
  background: rgba(var(--ui-theme-rgb), 0.14);
  border-color: rgba(var(--ui-theme-rgb), 0.2);
  color: rgb(var(--ui-theme-rgb));
}

.table-action.warning {
  background: var(--site-warning-bg);
  border-color: var(--site-warning-border);
  color: var(--site-warning-text);
}

.table-action.danger {
  background: var(--site-danger-bg);
  border-color: var(--site-danger-border);
  color: var(--site-danger-text);
}

.table-action.subtle {
  border-color: var(--site-subtle-border);
}

.batch-actions-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  margin-top: 12px;
  padding: 12px 20px;
  background: var(--site-batch-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--site-batch-border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: var(--site-batch-shadow);

  .selected-count {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
