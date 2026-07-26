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
          @header-click="handleCategoryClick"
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
const { loading } = storeToRefs(dataStore)

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

const handleItemClick = async (item: Item) => {
  if (moveState.active) {
    await handleMouseDragUp()
    return
  }

  dataApi.trackClick(item.id).catch(() => {})
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

const handleCategoryClick = () => {}

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
@use './Site.scss';
</style>
