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
.top-bookmarks-card {
  --top-bookmarks-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  --top-bookmarks-border: rgba(255, 255, 255, 0.6);
  --top-bookmarks-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  margin-top: 20px;
  padding: 24px;
  background: var(--top-bookmarks-bg);
  border: 1px solid var(--top-bookmarks-border);
  box-shadow: var(--top-bookmarks-shadow);
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

:global(:root[theme-mode='dark'] .top-bookmarks-card) {
  --top-bookmarks-bg: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.82));
  --top-bookmarks-border: rgba(148, 163, 184, 0.18);
  --top-bookmarks-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
}

.top-bookmarks-header {
  margin: 0 0 18px;
  font-size: 17px;
  font-weight: 700;
  color: var(--gray-800);
}

.top-bookmarks-table {
  margin-top: 6px;
}
</style>

