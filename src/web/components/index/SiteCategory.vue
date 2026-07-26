<template>
  <div class="site-item">
    <header
      class="category-header"
      :data-cat-index="catIndex"
      @click.stop="$emit('header-click', $event)"
      @contextmenu.prevent="$emit('header-contextmenu', { event: $event, category: category })"
    >
      <i class="category-icon relative left-px-2 iconfont icon-tag"></i>
      <a class="category-title" :name="category.name">{{ category.name }}</a>
    </header>

    <div v-if="hasSubCategories" class="sub-category-tabs">
      <div
        class="tab-item"
        :class="{ active: activeTabId === category.id }"
        @click.stop="activeTabId = category.id"
        @contextmenu.prevent="$emit('header-contextmenu', { event: $event, category: category })"
      >
        综合
      </div>
      <div
        v-for="child in category.children"
        :key="child.id"
        class="tab-item"
        :class="{ active: activeTabId === child.id }"
        @click.stop="activeTabId = child.id"
        @contextmenu.prevent="$emit('header-contextmenu', { event: $event, category: child })"
      >
        {{ child.name }}
      </div>
    </div>

    <main class="category-main">
      <div v-if="currentDisplayItems.length === 0" class="empty-placeholder">暂无书签</div>
      <ul
        v-else
        ref="gridRef"
        class="site-grid"
        :class="{ 'is-virtualized': virtualized }"
        :style="spacerStyle"
      >
        <li
          v-for="entry in visibleItems"
          :key="entry.item.id"
          class="site-wrapper"
          :class="{
            'is-moving': moveState.active && moveState.item?.id === entry.item.id,
            'moving-target': isHovering(
              getCategoryLocalIndex(entry.item),
              getItemCategoryId(entry.item)
            )
          }"
          :data-cat-index="catIndex"
          :data-cat-id="getItemCategoryId(entry.item)"
          :data-item-index="getCategoryLocalIndex(entry.item)"
          @mouseenter="
            $emit('item-mouseenter', {
              itemIndex: getCategoryLocalIndex(entry.item),
              categoryId: getItemCategoryId(entry.item)
            })
          "
        >
          <SiteCard
            :item="entry.item"
            :favicon-url="entry.item.icon"
            :fallback-favicon-url="getFallbackFaviconUrl(entry.item)"
            :selection-mode="selectionMode"
            :selected="selectedItems?.has(entry.item.id)"
            @click="(e) => $emit('item-click', { item: entry.item, event: e })"
            @contextmenu="
              (e) =>
                $emit('item-contextmenu', {
                  item: entry.item,
                  itemIndex: getCategoryLocalIndex(entry.item),
                  event: e
                })
            "
            @toggle-select="$emit('toggle-selection', entry.item)"
            @touchstart="
              (e) =>
                $emit('item-touchstart', {
                  item: entry.item,
                  itemIndex: getCategoryLocalIndex(entry.item),
                  event: e,
                  categoryId: getItemCategoryId(entry.item)
                })
            "
          />
        </li>
      </ul>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SiteCard from './SiteCard.vue'
import { Favicon } from '@/config'
import type { Category } from '@/types'
import { useVirtualSiteGrid } from '@/composables/useVirtualSiteGrid'
import { buildProxyIconCandidate } from './siteIconHelpers'
import {
  hasChildCategories,
  isHoveringMoveTarget,
  resolveCategoryLocalIndex,
  resolveDisplayedItems,
  resolveInitialActiveTabId,
  resolveItemCategoryId,
  resolveSelectedCategory,
  type DisplayedSiteItem,
  type SiteMoveState
} from '@/components/index/siteCategoryHelpers'

const props = defineProps<{
  category: Category
  catIndex: number
  selectedCategoryId?: number | null
  moveState: SiteMoveState
  selectionMode?: boolean
  selectedItems?: Set<number>
  showAdd?: boolean
}>()

defineEmits<{
  (e: 'header-click', event: Event): void
  (e: 'header-contextmenu', payload: { event: MouseEvent; category: Category }): void
  (e: 'item-mouseenter', payload: { itemIndex: number; categoryId: number }): void
  (e: 'item-click', payload: { item: DisplayedSiteItem; event: Event }): void
  (
    e: 'item-contextmenu',
    payload: { item: DisplayedSiteItem; itemIndex: number; event: Event }
  ): void
  (
    e: 'item-touchstart',
    payload: { item: DisplayedSiteItem; itemIndex: number; event: Event; categoryId: number }
  ): void
  (e: 'add-item', categoryId: number): void
  (e: 'toggle-selection', item: DisplayedSiteItem): void
}>()

const activeTabId = ref<number>(props.category.id)
const hasSubCategories = computed(() => hasChildCategories(props.category))

const resolveMatchedTabId = (category: Category, selectedCategoryId?: number | null) => {
  if (selectedCategoryId === undefined || selectedCategoryId === null) {
    return null
  }

  const matchedCategory =
    selectedCategoryId === category.id
      ? category
      : resolveSelectedCategory(category.children || [], selectedCategoryId)

  if (!matchedCategory) {
    return null
  }

  return matchedCategory.id === category.id ? category.id : matchedCategory.id
}

watch(
  () => props.category,
  (nextCategory) => {
    activeTabId.value = resolveInitialActiveTabId(nextCategory)
  },
  { immediate: true }
)

watch(
  () => props.selectedCategoryId,
  (selectedCategoryId) => {
    const matchedTabId = resolveMatchedTabId(props.category, selectedCategoryId)
    if (matchedTabId !== null) {
      activeTabId.value = matchedTabId
    }
  },
  { immediate: true }
)

const currentDisplayItems = computed(() => resolveDisplayedItems(props.category, activeTabId.value))
// Keep virtualization during bookmark move. Toggling full-render on moveState.active
// expands every large category at once and jumps the page scroll position.
const forceFullRender = computed(() => Boolean(props.selectionMode))
const { gridRef, virtualized, visibleItems, spacerStyle } = useVirtualSiteGrid({
  items: currentDisplayItems,
  forceFullRender
})
// TS noUnusedLocals does not treat template ref bindings as script reads.
void gridRef
const getItemCategoryId = (item: DisplayedSiteItem) =>
  resolveItemCategoryId(item, props.category.id)
const getCategoryLocalIndex = (item: DisplayedSiteItem) =>
  resolveCategoryLocalIndex(currentDisplayItems.value, item, props.category.id)
const isHovering = (itemIndex: number, categoryId: number) =>
  isHoveringMoveTarget(props.moveState, itemIndex, categoryId)
const getFallbackFaviconUrl = (item: DisplayedSiteItem) =>
  buildProxyIconCandidate(item.url, Favicon)
</script>

<style scoped lang="scss">
@use './SiteCategory.scss';
</style>

