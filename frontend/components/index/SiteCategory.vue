<template>
  <div class="site-item glass-panel">
    <!-- 分类头部 -->
    <header 
      :id="`site-anchor-${category.name}`" 
      class="category-header" 
      :data-cat-index="catIndex" 
      @click.stop="$emit('header-click', $event)"
      @contextmenu.prevent="$emit('header-contextmenu', $event)"
    >
      <i class="category-icon relative left-px-2 iconfont icon-tag"></i>
      <a class="category-title" :name="category.name">{{ category.name }}</a>
      <span class="category-count">({{ (category.content || []).length }})</span>
      
    </header>

    <main>
      <ul>
        <li
          v-for="(item, itemIndex) in (category.content || [])"
          :key="item.id"
          class="site-wrapper"
          :class="{
            'is-moving': moveState.active && moveState.item?.id === item.id,
            'moving-target': isHovering(itemIndex)
          }"
          :data-cat-index="catIndex"
          :data-item-index="itemIndex"
          @mouseenter="$emit('item-mouseenter', itemIndex)"
        >
          <!-- 书签卡片 -->
          <SiteCard 
            :item="item" 
            :favicon-url="`${Favicon}${item.url}`"
            @click="(e) => $emit('item-click', { item, event: e })"
            @contextmenu="(e) => $emit('item-contextmenu', { item, itemIndex, event: e })"
            @touchstart="(e) => $emit('item-touchstart', { item, itemIndex, event: e })"
          />
        </li>
        <!-- 列表占位，保持布局整齐 -->
        <i style="width: 200px" v-for="i in 6" :key="i"></i>
      </ul>
    </main>
  </div>
</template>

<script setup lang="ts">
import SiteCard from './SiteCard.vue';
import { Favicon } from '@/config';
import type { Category } from '@/types';

const props = defineProps<{
  category: Category;
  catIndex: number;
  moveState: any;
}>();

const emit = defineEmits<{
    (e: 'header-click', event: Event): void;
    (e: 'header-contextmenu', event: Event): void;
    (e: 'item-mouseenter', itemIndex: number): void;
    (e: 'item-click', payload: { item: any; event: Event }): void;
    (e: 'item-contextmenu', payload: { item: any; itemIndex: number; event: Event }): void;
    (e: 'item-touchstart', payload: { item: any; itemIndex: number; event: Event }): void;
    (e: 'add-item', categoryId: number): void;
}>();

const isHovering = (itemIndex: number) => {
    return props.moveState.active && 
           props.moveState.hoverCatIndex === props.catIndex && 
           props.moveState.hoverItemIndex === itemIndex;
};
</script>

<style scoped lang="scss">
.site-item {
    background: rgba(0, 0, 0, 0.15) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 20px;
    transform: translateZ(0); 
    will-change: backdrop-filter;
}

.category-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    cursor: pointer;
    user-select: none;
    
    .category-title { 
      font-size: 1.25rem; 
      font-weight: 700; 
      color: #ffffff !important; 
      text-shadow: 0 2px 4px rgba(0,0,0,0.8);
      text-decoration: none;
      letter-spacing: -0.02em;
    }
    .category-count { 
      font-size: 14px; 
      color: var(--gray-400);
      margin-left: 4px;
    }
    .category-icon { 
      color: var(--ui-theme); 
      font-size: 1.2rem; 
      opacity: 0.8;
    }
}

ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  list-style: none;
  padding: 0;
}

.site-wrapper {
  transition: all 0.3s;
  &.is-moving { opacity: 0.3; transform: scale(0.95); }
  &.moving-target { border: 2px dashed var(--ui-theme); border-radius: 12px; }
}
</style>
