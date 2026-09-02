<template>
  <div id="js-home-site" class="home-site">
    <div v-if="loading" class="site-container loading-state">
      <div class="category-section">
        <div class="site-item">
          <header class="category-header skeleton-header">
            <span class="skeleton-block skeleton-icon"></span>
            <span class="skeleton-line skeleton-title"></span>
          </header>
          <ul>
            <li v-for="i in 12" :key="i" class="site-wrapper">
              <div class="site-card skeleton-card">
                <div class="skeleton-row">
                  <span class="skeleton-block skeleton-avatar"></span>
                  <div class="skeleton-copy">
                    <span class="skeleton-line skeleton-name"></span>
                    <span class="skeleton-line skeleton-desc"></span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else-if="loadError" class="site-container error-state">
      <div class="sn-error-state home-error-state">
        <p class="sn-error-state__text">{{ t('common.loadFailed') }}</p>
        <button type="button" class="empty-action-button" @click="handleRetry">
          <AppIcon name="icon-md-sync" class="button-icon" />
          <span>{{ t('common.retry') }}</span>
        </button>
      </div>
    </div>

    <div v-else-if="dataValue.length === 0" class="site-container empty-state">
      <div class="sn-empty-state home-empty-state">
        <div class="empty-title">{{ t('common.noData') }}</div>
        <button
          v-if="adminStore.isAuthenticated"
          type="button"
          class="empty-action-button"
          @click="handleAddItem()"
        >
          <AppIcon name="icon-tianjia" class="button-icon" />
          <span>{{ t('site.addFirst') }}</span>
        </button>
      </div>
    </div>

    <template v-else>
      <section
        v-for="(category, catIndex) in dataValue"
        :id="`site-anchor-${category.id}`"
        :key="category.id"
        class="category-section"
        :data-cat-index="catIndex"
      >
        <SiteCategory
          :category="category"
          :cat-index="catIndex"
          :selected-category-id="props.selectedCategoryId"
          :move-state="moveState"
          :selection-mode="selectionMode"
          :selected-items="selectedItems"
          :show-add="adminStore.isAuthenticated"
          @header-contextmenu="(payload) => onCategoryContextMenu(payload, catIndex)"
          @add-item="handleAddItem"
          @item-mouseenter="onItemMouseEnter"
          @item-click="onItemClick"
          @item-contextmenu="(payload) => onItemContextMenu(payload, catIndex)"
          @item-touchstart="(payload) => onItemTouchStart(payload, catIndex)"
          @toggle-selection="toggleSelection"
        />
      </section>
    </template>

    <SiteContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :item="contextMenu.item"
      :category="contextMenu.category"
      :is-first-category="isFirstCategory"
      :is-last-category="isLastCategory"
      @selection-mode="handleSelectionMode"
      @move-item="handleStartMoveItem"
      @toggle-pin="togglePin"
      @edit-item="handleEdit"
      @delete-item="handleDelete"
      @move-category="moveCategory"
      @close="closeContextMenu"
      @edit-category="handleEditCategory"
      @delete-category="handleDeleteCategory"
    />

    <SiteDialog
      v-model="showEditDialog"
      :form="editItemForm"
      :category-form="editCategoryForm"
      :categories="availableCategories"
      :is-edit="isEditMode"
      :dialog-mode="currentDialogMode"
      @save="saveSite"
    />

    <div
      v-if="moveState.active && moveState.item"
      class="ghost-element"
      :style="{ top: moveState.y + 'px', left: moveState.x + 'px' }"
    >
      <SiteCard
        :item="moveState.item"
        :favicon-url="moveState.item.icon"
        :fallback-favicon-url="getFallbackFaviconUrl(moveState.item)"
      />
      <div class="move-tip">{{ t('context.dragDropClickHint') }}</div>
    </div>

    <SiteBatchActionsBar
      :visible="selectionMode"
      :selected-count="selectedItems.size"
      v-model:batch-move-target="batchMoveTarget"
      :categories="availableCategories"
      @batch-move="applyBatchMove"
      @batch-delete="handleBatchDelete"
      @cancel="exitSelectionMode"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useI18n } from 'vue-i18n'
import { useDataStore } from '@/store/data'
import { useAdminStore } from '@/store/admin'
import { storeToRefs } from 'pinia'
import { Favicon } from '@/config'
import { openUrl as utilsOpenUrl } from '@/utils'
import { dataApi } from '@/api'
import type { Category, Item } from '@/types'
import { useSiteDialogState } from './useSiteDialogState'
import { buildProxyIconCandidate } from './siteIconHelpers'

import {
  useSiteMenu,
  useSiteDrag,
  useSiteFilter,
  useContextMenuActions,
  useBatchActions
} from '@/composables'

import SiteCard from './SiteCard.vue'
import SiteCategory from './SiteCategory.vue'
import SiteContextMenu from './SiteContextMenu.vue'
import SiteBatchActionsBar from './SiteBatchActionsBar.vue'
import SiteDialog from '@/components/SiteDialog.vue'

const props = defineProps<{
  selectedCategoryId?: number | null
}>()

const { t } = useI18n()
const adminStore = useAdminStore()
const dataStore = useDataStore()
const getFallbackFaviconUrl = (item: Pick<Item, 'url'>) =>
  buildProxyIconCandidate(item.url, Favicon)
const { loading, loadError } = storeToRefs(dataStore)

const emit = defineEmits<{
  (e: 'loaded'): void
}>()

const { contextMenu, showContextMenu, showCategoryContextMenu, closeContextMenu } = useSiteMenu()

const {
  togglePin,
  moveCategory,
  isFirstCategory,
  isLastCategory,
  handleDelete,
  handleDeleteCategory
} = useContextMenuActions(contextMenu, closeContextMenu)

const {
  selectionMode,
  selectedItems,
  enterSelectionMode,
  toggleSelection,
  exitSelectionMode,
  handleBatchMove,
  handleBatchDelete
} = useBatchActions(closeContextMenu)

const { moveState, startMove, handleMouseEnter, handleTouchStart, handleMouseDragUp } = useSiteDrag(
  () => dataValue.value
)

const { filteredData } = useSiteFilter(moveState)
const dataValue = computed(() => filteredData.value)

const {
  showEditDialog,
  isEditMode,
  editItemForm,
  editCategoryForm,
  currentDialogMode,
  batchMoveTarget,
  availableCategories,
  handleAddItem,
  handleAddCategory,
  handleEditCategory,
  handleEdit,
  saveSite
} = useSiteDialogState(dataStore, contextMenu, closeContextMenu)

const handleRetry = () => {
  void dataStore.loadData()
}

const handleItemClick = async (item: Item) => {
  if (moveState.active) {
    await handleMouseDragUp()
    return
  }

  dataApi
    .trackClick(item.id)
    .then((tracked) => {
      if (tracked) {
        dataStore.patchItemClick(tracked.id, tracked.clickCount, tracked.lastVisited)
      }
    })
    .catch(() => {})
  utilsOpenUrl(item.url)
}

const onItemClick = (payload: { item: Item }) => {
  void handleItemClick(payload.item)
}

const onItemMouseEnter = (payload: { itemIndex: number; categoryId: number }) => {
  handleMouseEnter(payload.itemIndex, payload.categoryId)
}

const onItemContextMenu = (
  payload: { item: Item; itemIndex: number; event: Event },
  catIndex: number
) => {
  showContextMenu(payload.event as MouseEvent, payload.item, catIndex, payload.itemIndex)
}

const onItemTouchStart = (
  payload: { item: Item; itemIndex: number; event: Event },
  catIndex: number
) => {
  handleTouchStart(payload.event as TouchEvent, payload.item, catIndex, payload.itemIndex)
}

const onCategoryContextMenu = (
  payload: { event: MouseEvent; category: Category },
  catIndex: number
) => {
  showCategoryContextMenu(payload.event, payload.category, catIndex)
}

const handleSelectionMode = () => {
  enterSelectionMode(contextMenu.item?.id)
}

const handleStartMoveItem = () => {
  if (!contextMenu.item) {
    return
  }

  startMove(
    contextMenu.item,
    contextMenu.catIndex,
    contextMenu.itemIndex,
    contextMenu.x,
    contextMenu.y,
    closeContextMenu
  )
}

watch(selectionMode, (active: boolean) => {
  if (!active) {
    batchMoveTarget.value = ''
  }
})

const applyBatchMove = async () => {
  if (!batchMoveTarget.value) return
  await handleBatchMove(Number(batchMoveTarget.value))
  batchMoveTarget.value = ''
}

defineExpose({
  handleAddItem,
  handleAddCategory
})

onMounted(async () => {
  await dataStore.loadData()
  emit('loaded')
})
</script>

<style scoped lang="scss">
.home-site {
  width: min(100%, 1280px);
  margin: 0 auto;
  padding: 0 0 48px;
}

.site-container,
.category-section {
  --category-surface: var(--ui-page-backdrop);
  --category-text: var(--ui-text-primary);
  --category-muted: var(--ui-text-muted);
  --category-chip-bg: rgba(var(--ui-theme-rgb), 0.08);
  --category-tab-bg: var(--ui-panel-bg);
  --category-tab-border: var(--ui-panel-border);
  --category-card-bg: var(--ui-panel-surface);
  --category-card-border: var(--ui-panel-border);
  --category-card-shadow: var(--ui-panel-shadow);
  --category-card-text: var(--ui-text-primary);
  --category-card-muted: var(--ui-text-muted);
  --category-icon-bg: rgba(var(--ui-theme-rgb), 0.1);
  --category-empty: var(--ui-text-muted);
  --category-skeleton: rgba(var(--ui-theme-rgb), 0.12);
}

.site-container {
  padding: clamp(32px, 4vw, 48px);
  border-radius: 40px;
  background: var(--category-surface);
  border: 1px solid var(--ui-panel-border);
  box-shadow: var(--ui-panel-shadow);
  backdrop-filter: blur(20px);
  color: var(--category-text);
}

.loading-state .site-item,
.empty-state .site-item {
  background: transparent;
}

.loading-state .category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.loading-state .site-card {
  border-radius: 28px;
  background: var(--category-card-bg);
  border: 1px solid var(--category-card-border);
  box-shadow: var(--category-card-shadow);
}

.category-section {
  margin-bottom: 24px;
  /* Large home pages: skip layout/paint for off-screen category blocks. */
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
}

.skeleton-header {
  opacity: 0.9;
}

.skeleton-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.skeleton-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-block,
.skeleton-line {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  background: var(--category-skeleton);
  border-radius: 999px;
}

.skeleton-block::after,
.skeleton-line::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(var(--ui-theme-rgb), 0.18), transparent);
  animation: skeleton-shimmer 1.25s ease-in-out infinite;
}

.skeleton-icon {
  width: 28px;
  height: 28px;
}

.skeleton-avatar {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  flex-shrink: 0;
}

.skeleton-title {
  width: 180px;
  height: 28px;
}

.skeleton-name {
  width: 62%;
  height: 16px;
}

.skeleton-desc {
  width: 90%;
  height: 12px;
}

.home-empty-state {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.home-error-state {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.sn-error-state__text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--category-empty);
}

.empty-title {
  font-size: 15px;
  color: var(--category-empty);
}

.empty-action-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--ui-theme);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(var(--ui-theme-rgb), 0.25);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 32px rgba(var(--ui-theme-rgb), 0.3);
  }
}

.button-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.ghost-element {
  --move-tip-bg: rgba(255, 255, 255, 0.96);
  --move-tip-text: #0f172a;
  --move-tip-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);

  position: fixed;
  z-index: 9999;
  width: 240px;
  pointer-events: none;
  opacity: 0.92;
  transform: rotate(2deg);

  .move-tip {
    margin-top: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--move-tip-bg);
    color: var(--move-tip-text);
    box-shadow: var(--move-tip-shadow);
    font-size: 12px;
    text-align: center;
  }
}

:global(:root[theme-mode='dark'] .ghost-element) {
  --move-tip-bg: rgba(20, 20, 22, 0.88);
  --move-tip-text: #fff;
  --move-tip-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
}

.skeleton-card {
  padding: 20px;
}

@media screen and (max-width: 640px) {
  .site-container {
    padding: 24px 20px;
    border-radius: 28px;
  }
}

@keyframes skeleton-shimmer {
  to {
    transform: translateX(100%);
  }
}
</style>
