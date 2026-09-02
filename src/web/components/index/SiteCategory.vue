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

    <div
      v-if="hasSubCategories"
      class="sub-category-tabs"
      role="tablist"
      @keydown="handleTablistKeydown"
    >
      <div
        role="tab"
        :data-tab-id="category.id"
        :tabindex="activeTabId === category.id ? 0 : -1"
        :aria-selected="activeTabId === category.id"
        class="tab-item"
        :class="{ active: activeTabId === category.id }"
        @click.stop="activeTabId = category.id"
        @keydown.enter="activeTabId = category.id"
        @keydown.space.prevent="activeTabId = category.id"
        @contextmenu.prevent="$emit('header-contextmenu', { event: $event, category: category })"
      >
        {{ t('category.allTab') }}
      </div>
      <div
        v-for="child in category.children"
        :key="child.id"
        role="tab"
        :data-tab-id="child.id"
        :tabindex="activeTabId === child.id ? 0 : -1"
        :aria-selected="activeTabId === child.id"
        class="tab-item"
        :class="{ active: activeTabId === child.id }"
        @click.stop="activeTabId = child.id"
        @keydown.enter="activeTabId = child.id"
        @keydown.space.prevent="activeTabId = child.id"
        @contextmenu.prevent="$emit('header-contextmenu', { event: $event, category: child })"
      >
        {{ child.name }}
      </div>
    </div>

    <!-- 每分类一个 <main> 会违反“单页单 main landmark”规范：
         顶层 home-content 已提供唯一 main，这里用普通 div 承载内容。 -->
    <div class="category-main">
      <div v-if="currentDisplayItems.length === 0" class="empty-placeholder">
        {{ t('category.emptyItems') }}
      </div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()

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

// roving tabindex 的 tablist 键盘导航：←/→ 切换 activeTabId 并把焦点移到目标 tab。
// 子分类 tab 非激活项 tabindex=-1，键盘 Tab 无法到达，方向键是唯一入口。
// 直接从事件容器查询 tab 元素，避免模板 ref 在静态项与 v-for 项混用时收集不可靠。
const handleTablistKeydown = (event: KeyboardEvent) => {
  const tabs = Array.from(
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.tab-item')
  )
  if (tabs.length === 0) {
    return
  }

  let nextIndex: number
  // 键盘事件必然落在当前聚焦的 tab 上；用 event.target 定位比 document.activeElement 更稳
  const currentIndex = tabs.indexOf(event.target as HTMLElement)

  if (event.key === 'ArrowRight') {
    nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % tabs.length
  } else if (event.key === 'ArrowLeft') {
    nextIndex = currentIndex < 0 ? tabs.length - 1 : (currentIndex - 1 + tabs.length) % tabs.length
  } else {
    return
  }

  event.preventDefault()
  const nextTab = tabs[nextIndex]
  const tabId = Number(nextTab.dataset.tabId)
  if (!Number.isNaN(tabId)) {
    activeTabId.value = tabId
    nextTab.focus()
  }
}

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
.site-item {
  padding: clamp(28px, 4vw, 48px);
  border-radius: 40px;
  background: var(--category-surface);
  color: var(--category-text);
}

.category-header {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  margin-bottom: 24px;
  cursor: pointer;

  &:hover {
    .category-title {
      color: var(--ui-theme);
    }
  }
}

.category-icon {
  font-size: 20px;
  color: var(--ui-theme);
}

.category-title {
  font-family: var(--ui-font-display);
  font-size: clamp(30px, 4vw, 40px);
  line-height: 1.08;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: var(--category-text);
  text-decoration: none;
  transition: color 0.18s ease;
}

.sub-category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--category-tab-border);
  background: var(--category-tab-bg);
  color: var(--category-muted);
  font-size: 14px;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    color: var(--category-text);
  }

  &.active {
    background: var(--ui-theme);
    border-color: transparent;
    color: #fff;
  }
}

.category-main {
  width: 100%;
}

.site-grid {
  --site-card-min-width: 250px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--site-card-min-width)), 1fr));
  gap: 18px;
  list-style: none;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  align-content: start;
}

.site-wrapper {
  display: flex;
  min-width: 0;
  /* Skip offscreen layout/paint when the browser supports it (non-virtualized lists too). */
  content-visibility: auto;
  contain-intrinsic-size: auto 88px;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;

  &.is-moving {
    opacity: 0.34;
    transform: scale(0.96);
  }

  &.moving-target {
    outline: 2px dashed var(--ui-theme);
    outline-offset: 4px;
    border-radius: 30px;
  }
}

.empty-placeholder {
  padding: 32px 20px;
  border-radius: 28px;
  background: var(--category-chip-bg);
  border: 1px dashed var(--category-tab-border);
  text-align: center;
  color: var(--category-empty);
  font-size: 14px;
}

@media screen and (min-width: 1280px) {
  .site-grid {
    --site-card-min-width: 272px;
  }
}

@media screen and (max-width: 640px) {
  .site-item {
    padding: 24px 20px;
    border-radius: 28px;
  }

  .category-title {
    font-size: 28px;
  }

  .site-grid {
    --site-card-min-width: 100%;
  }
}
</style>
