<template>
  <div class="category-table">
    <div v-if="categories.length === 0" class="sn-empty-state">
      {{ t('common.noData') }}
    </div>

    <div v-else class="sn-table-shell">
      <div class="sn-table-scroll">
        <table class="sn-table">
          <thead>
            <tr>
              <th class="is-center col-meta col-index" style="width: 64px">#</th>
              <th class="is-center col-meta col-id" style="width: 88px">{{ t('table.id') }}</th>
              <th class="col-name">{{ t('table.name') }}</th>
              <th class="is-center col-meta col-visibility" style="width: 140px">
                {{ t('table.visibility') }}
              </th>
              <th class="is-center col-meta col-count" style="width: 140px">
                {{ t('table.siteCount') }}
              </th>
              <th class="is-center col-actions" style="width: 320px">{{ t('table.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(category, index) in categories" :key="category.id">
              <td class="is-center col-meta col-index">{{ index + 1 }}</td>
              <td class="is-center col-meta col-id">{{ category.id }}</td>
              <td class="col-name">{{ category.name }}</td>
              <td class="is-center col-meta col-visibility">
                <span class="sn-badge" :class="getLevelClass(category.level ?? 0)">
                  {{ getLevelLabel(category.level ?? 0) }}
                </span>
              </td>
              <td class="is-center col-meta col-count">
                <span class="sn-badge is-primary">{{ getItemCount(category.id) }}</span>
              </td>
              <td class="is-center col-actions">
                <div class="sn-table-actions">
                  <button
                    type="button"
                    class="table-action primary"
                    @click="$emit('edit', category)"
                  >
                    {{ t('table.edit') }}
                  </button>
                  <button
                    type="button"
                    class="table-action subtle"
                    :disabled="index === 0"
                    @click="$emit('move', index, 'up')"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="table-action subtle"
                    :disabled="index === categories.length - 1"
                    @click="$emit('move', index, 'down')"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="table-action danger"
                    @click="$emit('delete', category)"
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
  </div>
</template>

<script setup lang="ts">
import type { Category, Item } from '@/types'
import { useI18n } from 'vue-i18n'
import {
  countItemsInCategory,
  getCategoryLevelClass,
  getCategoryLevelLabelKey
} from './categoryTableHelpers'

const { t } = useI18n()

const props = defineProps<{
  categories: Category[]
  items: Item[]
}>()

defineEmits<{
  (e: 'move', index: number, direction: 'up' | 'down'): void
  (e: 'edit', category: Category): void
  (e: 'delete', category: Category): void
}>()

const getItemCount = (categoryId: number) => countItemsInCategory(props.items, categoryId)
const getLevelClass = (level: number) => getCategoryLevelClass(level)
const getLevelLabel = (level: number) => t(getCategoryLevelLabelKey(level))
</script>

<style scoped lang="scss">
.category-table {
  --category-action-bg: rgba(148, 163, 184, 0.12);
  --category-action-text: var(--gray-700);
  --category-action-subtle-border: rgba(148, 163, 184, 0.18);
  --category-danger-bg: rgba(239, 68, 68, 0.12);
  --category-danger-border: rgba(239, 68, 68, 0.2);
  --category-danger-text: #b91c1c;
  container-type: inline-size;
  container-name: category-table;

  .sn-table {
    min-width: 720px;
  }

  .sn-table th,
  .sn-table td {
    white-space: nowrap;
  }

  .col-name {
    min-width: 8rem;
    max-width: 18rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .col-actions {
    white-space: nowrap;
  }
}

// Collapse secondary columns when the table container itself is narrow
@container category-table (max-width: 700px) {
  .sn-table {
    min-width: 0;
  }

  .col-meta {
    display: none;
  }

  .col-actions {
    width: auto;
  }

  .sn-table-actions {
    justify-content: flex-end;
  }
}

@container category-table (max-width: 420px) {
  .table-action.subtle {
    display: none;
  }
}

:global(:root[theme-mode='dark'] .category-table) {
  --category-action-bg: rgba(51, 65, 85, 0.78);
  --category-action-text: rgba(226, 232, 240, 0.88);
  --category-action-subtle-border: rgba(148, 163, 184, 0.22);
  --category-danger-bg: rgba(239, 68, 68, 0.18);
  --category-danger-border: rgba(248, 113, 113, 0.22);
  --category-danger-text: #fca5a5;
}

.table-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.25rem;
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--category-action-bg);
  color: var(--category-action-text);
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

.table-action.primary {
  background: rgba(var(--ui-theme-rgb), 0.14);
  border-color: rgba(var(--ui-theme-rgb), 0.2);
  color: rgb(var(--ui-theme-rgb));
}

.table-action.subtle {
  min-width: 2.25rem;
  padding-inline: 12px;
  border-color: var(--category-action-subtle-border);
}

.table-action.danger {
  background: var(--category-danger-bg);
  border-color: var(--category-danger-border);
  color: var(--category-danger-text);
}
</style>
