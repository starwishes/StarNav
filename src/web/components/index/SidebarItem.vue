<template>
  <li class="category-item" :class="{ active: isActive }" :data-depth="depth">
    <button
      type="button"
      class="category-header"
      :style="headerStyle"
      :title="isCollapsed ? category.name : ''"
      @click.stop="handleHeaderClick"
    >
      <span class="category-icon-wrapper">
        <span class="category-initial" :style="initialStyle">
          {{ displayInitials }}
        </span>
      </span>
      <span v-if="!isCollapsed" class="category-name">{{ category.name }}</span>
      <span
        v-if="!isCollapsed && hasChildren"
        class="custom-chevron"
        :class="{ 'is-expanded': isExpanded }"
      ></span>
    </button>

    <transition name="expand">
      <ul v-if="!isCollapsed && isExpanded && hasChildren" class="sub-category-list">
        <SidebarItem
          v-for="child in category.children"
          :key="child.id"
          :category="child"
          :depth="depth + 1"
        />
      </ul>
    </transition>
  </li>
</template>

<script setup lang="ts">
import { computed, inject, toRefs, unref, type Ref } from 'vue'
import type { Category } from '@/types'
import {
  getCategoryHeaderPadding,
  getCategoryInitials,
  getCategoryInitialStyle,
  hasChildCategories
} from '@/components/index/sidebarItemHelpers'

const props = defineProps<{
  category: Category
  depth: number
}>()

const { category, depth } = toRefs(props)

const isSidebarCollapsed = inject<Ref<boolean> | boolean>('isSidebarCollapsed', false)
const expandedIds = inject<Set<number>>('expandedIds')
const activeCategoryId = inject<Ref<number | null> | number | null>('activeCategoryId', null)
const toggleExpand = inject<(id: number) => void>('toggleExpand')
const selectCategory = inject<(id: number, tag: string | null) => void>('selectCategory')

const isCollapsed = computed(() => Boolean(unref(isSidebarCollapsed)))
const headerPadding = computed(() => getCategoryHeaderPadding(depth.value))
const hasChildren = computed(() => hasChildCategories(category.value))
const isExpanded = computed(() => expandedIds?.has(category.value.id) ?? false)
const isActive = computed(() => unref(activeCategoryId) === category.value.id)
const displayInitials = computed(() => getCategoryInitials(category.value.name))
const initialStyle = computed(() =>
  getCategoryInitialStyle(category.value.name, displayInitials.value)
)
const headerStyle = computed(() =>
  isCollapsed.value ? undefined : { paddingLeft: headerPadding.value }
)

const handleHeaderClick = () => {
  if (hasChildren.value && !isCollapsed.value) {
    toggleExpand?.(category.value.id)
    return
  }

  selectCategory?.(category.value.id, null)
}
</script>

<style scoped lang="scss">
.category-item {
  list-style: none;
}

.sub-category-list {
  list-style: none;
  padding: 0;
  margin: 4px 0 8px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 20px);
  min-height: 46px;
  margin: 0 10px;
  padding: 8px 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  font: inherit;
  text-align: left;
  color: var(--sidebar-item-text, rgba(15, 23, 42, 0.74));
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: var(--sidebar-item-hover-bg, rgba(var(--ui-theme-rgb), 0.1));
    color: var(--sidebar-item-text-strong, var(--ui-text-primary, #0f172a));
    transform: translateX(2px);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--ui-theme-rgb), 0.35);
    outline-offset: -2px;
  }
}

.category-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--sidebar-item-icon-bg, rgba(148, 163, 184, 0.16));
}

.category-initial {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.category-name {
  min-width: 0;
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.custom-chevron {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.56;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;

  &::after {
    content: '';
    width: 5px;
    height: 5px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(-45deg);
  }

  &.is-expanded {
    opacity: 1;
    transform: rotate(90deg);
  }
}

.category-item.active > .category-header {
  background: var(--sidebar-item-active-bg, rgba(var(--ui-theme-rgb), 0.14));
  color: var(--sidebar-item-text-strong, var(--ui-text-primary, #0f172a));
  box-shadow: inset 0 0 0 1px rgba(var(--ui-theme-rgb), 0.28);

  .category-icon-wrapper {
    background: rgba(var(--ui-theme-rgb), 0.18);
  }
}

.category-item[data-depth='1'] > .category-header,
.category-item[data-depth='2'] > .category-header,
.category-item[data-depth='3'] > .category-header {
  min-height: 40px;

  .category-icon-wrapper {
    width: 26px;
    height: 26px;
  }

  .category-name {
    font-size: 13px;
    color: var(--sidebar-item-text-soft, rgba(71, 85, 105, 0.72));
  }
}

:deep(.collapsible-sidebar.collapsed) .category-header {
  width: 48px;
  justify-content: center;
  margin: 0 auto 8px;
  padding: 8px 0 !important;
}

:deep(.collapsible-sidebar.collapsed) .category-name,
:deep(.collapsible-sidebar.collapsed) .custom-chevron {
  display: none;
}
</style>
