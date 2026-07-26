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
@use './CategoryTable.scss';
</style>
