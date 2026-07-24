<template>
  <li class="category-item" :class="{ active: isActive }" :data-depth="depth">
    <div
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
    </div>

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
@import './SidebarItem.scss';
</style>

