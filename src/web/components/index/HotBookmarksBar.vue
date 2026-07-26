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
.hot-bookmarks-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  overflow: hidden;

  .hot-bookmarks-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--gray-600);
    white-space: nowrap;
  }

  .hot-bookmarks-list {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 4px;
    &::-webkit-scrollbar {
      height: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    .hot-bookmark-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.05);
      }

      .hot-rank {
        font-weight: 800;
        font-style: italic;
        color: var(--ui-theme);
        opacity: 0.8;
      }
      .hot-name {
        font-size: 13px;
        color: var(--gray-800);
      }

      .hot-count {
        min-height: 20px;
        padding: 3px 8px;
      }
    }
  }
}

:root[theme-mode='dark'] {
  .hot-bookmarks-bar {
    .hot-bookmark-item .hot-name {
      color: #ccc;
    }
  }
}
</style>
