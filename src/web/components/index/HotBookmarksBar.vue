<template>
  <div v-if="topBookmarks.length > 0 && !loading" class="hot-bookmarks-bar">
    <div class="hot-bookmarks-label">🔥 热门访问：</div>
    <div class="hot-bookmarks-list">
      <a
        v-for="(item, index) in topBookmarks"
        :key="item.id"
        :href="item.url"
        class="hot-bookmark-item"
        target="_blank"
        @click.prevent="$emit('item-click', item, $event)"
      >
        <span class="hot-rank">{{ index + 1 }}</span>
        <span class="hot-name">{{ item.name }}</span>
        <span class="sn-badge is-warning hot-count">{{ item.clickCount || 0 }}</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Item } from '@/types'

defineProps<{
  topBookmarks: Item[]
  loading: boolean
}>()

defineEmits<{
  (e: 'item-click', item: Item, event: MouseEvent): void
}>()
</script>

<style scoped lang="scss">
@import './HotBookmarksBar.scss';
</style>
