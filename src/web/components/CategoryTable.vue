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
              <th v-if="!isMobile" class="is-center" style="width: 64px">#</th>
              <th v-if="!isMobile" class="is-center" style="width: 88px">{{ t('table.id') }}</th>
              <th>{{ t('table.name') }}</th>
              <th v-if="!isMobile" class="is-center" style="width: 140px">
                {{ t('table.visibility') }}
              </th>
              <th v-if="!isMobile" class="is-center" style="width: 140px">
                {{ t('table.siteCount') }}
              </th>
              <th class="is-center" style="width: 280px">{{ t('table.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(category, index) in categories" :key="category.id">
              <td v-if="!isMobile" class="is-center">{{ index + 1 }}</td>
              <td v-if="!isMobile" class="is-center">{{ category.id }}</td>
              <td>{{ category.name }}</td>
              <td v-if="!isMobile" class="is-center">
                <span class="sn-badge" :class="getLevelClass(category.level ?? 0)">
                  {{ getLevelLabel(category.level ?? 0) }}
                </span>
              </td>
              <td v-if="!isMobile" class="is-center">
                <span class="sn-badge is-primary">{{ getItemCount(category.id) }}</span>
              </td>
              <td class="is-center">
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
import { useMobile } from '@/composables/useMobile'
import {
  countItemsInCategory,
  getCategoryLevelClass,
  getCategoryLevelLabelKey
} from './categoryTableHelpers'

const { t } = useI18n()
const { isMobile } = useMobile()

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
@import './CategoryTable.scss';
</style>
