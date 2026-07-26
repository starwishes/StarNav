<template>
  <aside class="collapsible-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <img
        :src="configStore.siteConfig.logoUrl || '/logo.svg?v=2'"
        :alt="configStore.displaySiteName"
        class="site-logo"
      />
      <transition name="fade">
        <div v-if="!isCollapsed" class="sidebar-brand">
          <p class="site-kicker">StarNav</p>
          <h2 class="site-title">
            {{ configStore.displaySiteName }}
          </h2>
        </div>
      </transition>
    </div>

    <nav class="sidebar-nav">
      <ul class="category-list">
        <SidebarItem
          v-for="category in categoryTree"
          :key="category.id"
          :category="category"
          :depth="0"
        />
      </ul>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, provide, reactive, unref } from 'vue'
import { useConfigStore } from '@/store/config'
import { useSiteProjection } from '@/composables/useSiteProjection'
import type { Category } from '@/types'
import SidebarItem from './SidebarItem.vue'

const configStore = useConfigStore()
const { categoryTree } = useSiteProjection()

const isCollapsed = ref(false)
const expandedIds = reactive(new Set<number>())
const activeCategoryId = ref<number | null>(null)
const activeTag = ref<string | null>(null)

const emit = defineEmits<{
  (e: 'filter', categoryId: number | null, tag: string | null): void
  (e: 'collapse-change', collapsed: boolean): void
}>()

const branchContainsCategory = (category: Category, categoryId: number): boolean => {
  if (category.id === categoryId) {
    return true
  }

  return (category.children || []).some((child) => branchContainsCategory(child, categoryId))
}

const findRootCategoryById = (categories: Category[], categoryId: number): Category | null =>
  categories.find((category) => branchContainsCategory(category, categoryId)) || null

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  emit('collapse-change', isCollapsed.value)
  if (isCollapsed.value) {
    expandedIds.clear()
  }
}

const toggleExpand = (categoryId: number) => {
  if (isCollapsed.value) {
    return
  }

  if (expandedIds.has(categoryId)) {
    expandedIds.delete(categoryId)
  } else {
    expandedIds.add(categoryId)
  }
}

const selectCategory = (categoryId: number, tag: string | null) => {
  activeCategoryId.value = categoryId
  activeTag.value = tag
  emit('filter', categoryId, tag)
  scrollToCategory(categoryId)
}

const scrollToCategory = (categoryId: number) => {
  const rootCategory = findRootCategoryById(unref(categoryTree), categoryId)
  if (!rootCategory) {
    return
  }

  const target = document.getElementById(`site-anchor-${rootCategory.id}`)
  if (target) {
    const targetTop = target.getBoundingClientRect().top + window.scrollY
    window.scroll({
      top: targetTop - 80,
      behavior: 'smooth'
    })
  }
}

provide('isSidebarCollapsed', isCollapsed)
provide('expandedIds', expandedIds)
provide('activeCategoryId', activeCategoryId)
provide('activeTag', activeTag)
provide('toggleExpand', toggleExpand)
provide('selectCategory', selectCategory)

defineExpose({ toggleSidebar })
</script>

<style scoped lang="scss">
@use './CollapsibleSidebar.scss';
</style>

