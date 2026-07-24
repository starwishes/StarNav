<template>
  <div class="site-table-container">
    <div v-if="paginatedData.length === 0" class="sn-empty-state">
      {{ t('common.noData') }}
    </div>

    <div v-else class="sn-table-shell">
      <div class="sn-table-scroll">
        <table class="sn-table">
          <thead>
            <tr>
              <th v-if="!isMobile" class="is-center" style="width: 56px">
                <label class="sn-check-cell">
                  <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
                </label>
              </th>
              <th v-if="!isMobile" class="is-center" style="width: 72px">{{ t('table.id') }}</th>
              <th style="width: 160px">{{ t('table.siteName') }}</th>
              <th>{{ t('table.siteUrl') }}</th>
              <th v-if="!isMobile" class="is-center" style="width: 140px">
                {{ t('table.category') }}
              </th>
              <th v-if="!isMobile" class="is-center" style="width: 120px">
                {{ t('table.visibility') }}
              </th>
              <th v-if="!isMobile" class="is-center" style="width: 120px">
                <button type="button" class="sort-button" @click="toggleClickCountSort">
                  <span>{{ t('table.clickCount') }}</span>
                  <span class="sort-indicator">
                    {{ clickCountSort === 'asc' ? '↑' : clickCountSort === 'desc' ? '↓' : '↕' }}
                  </span>
                </button>
              </th>
              <th v-if="!isMobile" class="is-center" style="width: 140px">
                {{ t('table.lastVisited') }}
              </th>
              <th class="is-center" style="width: 168px">{{ t('table.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedData" :key="row.id">
              <td v-if="!isMobile" class="is-center">
                <label class="sn-check-cell">
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(row.id)"
                    @change="toggleSelection(row, $event)"
                  />
                </label>
              </td>
              <td v-if="!isMobile" class="is-center">{{ row.id }}</td>
              <td>{{ row.name }}</td>
              <td>
                <div class="url-cell">
                  <a
                    class="sn-table-link site-link"
                    :href="row.url"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {{ row.url }}
                  </a>
                  <span
                    v-if="linkStatus[row.url] === 'ok'"
                    class="sn-badge status-chip is-success"
                    aria-label="ok"
                  >
                    ✓
                  </span>
                  <span
                    v-else-if="linkStatus[row.url] === 'error'"
                    class="sn-badge status-chip is-danger"
                    aria-label="error"
                  >
                    ✗
                  </span>
                  <span
                    v-else-if="linkStatus[row.url] === 'checking'"
                    class="status-spinner"
                    aria-hidden="true"
                  ></span>
                </div>
              </td>
              <td v-if="!isMobile" class="is-center">
                <span class="sn-badge is-primary">{{ getCategoryName(row.categoryId) }}</span>
              </td>
              <td v-if="!isMobile" class="is-center">
                <span class="sn-badge" :class="getVisibilityClass(row.level ?? 0)">
                  {{ getVisibilityLabel(row.level ?? 0) }}
                </span>
              </td>
              <td v-if="!isMobile" class="is-center">
                <span class="sn-table-cell-muted">{{ row.clickCount || 0 }}</span>
              </td>
              <td v-if="!isMobile" class="is-center">
                <span v-if="row.lastVisited" class="sn-table-cell-muted">
                  {{ formatDate(row.lastVisited) }}
                </span>
                <span v-else class="sn-table-cell-muted">-</span>
              </td>
              <td class="is-center">
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
          :model-value="pageSize"
          @change="handleSizeChange"
        >
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
        </AppSelect>
        <button
          class="sn-pagination-button"
          type="button"
          :disabled="currentPage <= 1"
          @click="currentPage -= 1"
        >
          ‹
        </button>
        <span class="sn-pagination-status">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="sn-pagination-button"
          type="button"
          :disabled="currentPage >= totalPages"
          @click="currentPage += 1"
        >
          ›
        </button>
      </div>
    </div>

    <div v-if="selectedPageItems.length > 0 && !isMobile" class="batch-actions-footer glass-effect">
      <span class="selected-count">{{
        t('table.selectedCount', { count: selectedPageItems.length })
      }}</span>
      <div class="actions">
        <AppSelect
          class="sn-inline-select batch-select"
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
import { useMobile } from '@/composables/useMobile'
import { useSiteTableState } from '@/composables/useSiteTableState'
import {
  formatRelativeDate,
  getCategoryNameById,
  getVisibilityBadgeClass,
  getVisibilityLabel as getVisibilityText
} from '@/components/siteTableHelpers'

const { t } = useI18n()
const { isMobile } = useMobile()

const props = defineProps<{
  items: Item[]
  categories: Category[]
}>()

const emit = defineEmits<{
  (e: 'edit', item: Item): void
  (e: 'delete', item: Item): void
  (e: 'batch-delete', ids: number[]): void
  (e: 'batch-move', ids: number[], categoryId: number): void
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
const formatDate = (dateString: string) => formatRelativeDate(dateString, t)
</script>

<style scoped lang="scss">
@import './SiteTable.scss';
</style>
