<template>
  <section class="top-bookmarks-card">
    <div class="top-bookmarks-header">{{ title }}</div>
    <div class="sn-table-scroll top-bookmarks-table">
      <table class="sn-table">
        <thead>
          <tr>
            <th class="is-center" style="width: 56px">#</th>
            <th>{{ t('stats.name') }}</th>
            <th class="is-center" style="width: 120px">{{ t('stats.clickCount') }}</th>
            <th style="width: 140px">{{ t('stats.category') }}</th>
            <th style="width: 190px">{{ t('stats.lastVisited') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(bookmark, index) in items" :key="bookmark.id">
            <td class="is-center">{{ index + 1 }}</td>
            <td>{{ bookmark.name }}</td>
            <td class="is-center">
              <span class="sn-badge is-primary">{{ bookmark.clickCount || 0 }}</span>
            </td>
            <td>{{ bookmark.categoryName }}</td>
            <td>{{ bookmark.lastVisited ? formatDateTime(bookmark.lastVisited) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDateTimeFormatter } from '@/composables/useDateTimeFormatter'
import type { TopBookmarkRow } from '@/composables/admin/useStatsDashboard'

defineProps<{
  title: string
  items: TopBookmarkRow[]
}>()

const { t } = useI18n()
const { formatDateTime } = useDateTimeFormatter()
</script>

<style scoped lang="scss">
@use './TopBookmarksTable.scss';
</style>

