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
import { onMounted } from 'vue'
import { useSiteProjection } from '@/composables/useSiteProjection'
import type { Category } from '@/types'
import SidebarItem from './SidebarItem.vue'

const configStore = useConfigStore()
const { categoryTree } = useSiteProjection()

const isCollapsed = ref(true)
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

// 挂载时同步初始折叠状态给父容器，避免父容器按“展开”默认宽度渲染导致首次偏右
onMounted(() => {
  emit('collapse-change', isCollapsed.value)
})

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
.collapsible-sidebar {
  --sidebar-shell-bg: rgba(255, 255, 255, 0.82);
  --sidebar-shell-border: rgba(148, 163, 184, 0.18);
  --sidebar-shell-shadow: 12px 0 40px rgba(15, 23, 42, 0.14);
  --sidebar-shell-overlay: linear-gradient(180deg, rgba(255, 255, 255, 0.46), transparent 24%);
  --sidebar-divider: rgba(148, 163, 184, 0.16);
  --sidebar-brand-kicker: rgba(71, 85, 105, 0.68);
  --sidebar-brand-text: var(--ui-text-primary, #0f172a);
  --sidebar-logo-bg: rgba(255, 255, 255, 0.94);
  --sidebar-scrollbar: rgba(148, 163, 184, 0.3);
  --sidebar-item-text: rgba(15, 23, 42, 0.74);
  --sidebar-item-text-soft: rgba(71, 85, 105, 0.72);
  --sidebar-item-text-strong: var(--ui-text-primary, #0f172a);
  --sidebar-item-hover-bg: rgba(var(--ui-theme-rgb), 0.1);
  --sidebar-item-icon-bg: rgba(148, 163, 184, 0.16);
  --sidebar-item-active-bg: rgba(var(--ui-theme-rgb), 0.14);
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 248px;
  background: var(--sidebar-shell-bg);
  backdrop-filter: saturate(180%) blur(28px);
  -webkit-backdrop-filter: saturate(180%) blur(28px);
  border-right: 1px solid var(--sidebar-shell-border);
  box-shadow: var(--sidebar-shell-shadow);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: width 0.35s ease;
  overflow: hidden;
  user-select: none;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--sidebar-shell-overlay);
    pointer-events: none;
  }

  &.collapsed {
    width: 88px;

    .sidebar-header {
      justify-content: center;
      padding: 20px 0;
    }
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 92px;
  padding: 24px 18px 20px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--sidebar-divider);
}

.site-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 16px;
  background: var(--sidebar-logo-bg);
  padding: 7px;
}

.sidebar-brand {
  min-width: 0;
}

.site-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1.2;
  color: var(--sidebar-brand-kicker);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.site-title {
  margin: 0;
  font-family: var(--ui-font-display);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--sidebar-brand-text);
  letter-spacing: -0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 0 24px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--sidebar-scrollbar);
    border-radius: 999px;
  }
}

.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

:global(:root[theme-mode='dark'] .collapsible-sidebar) {
  --sidebar-shell-bg: rgba(2, 5, 10, 0.94);
  --sidebar-shell-border: rgba(255, 255, 255, 0.08);
  --sidebar-shell-shadow: 14px 0 44px rgba(0, 0, 0, 0.42);
  --sidebar-shell-overlay: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 24%);
  --sidebar-divider: rgba(255, 255, 255, 0.08);
  --sidebar-brand-kicker: rgba(226, 232, 240, 0.52);
  --sidebar-brand-text: #f8fafc;
  --sidebar-logo-bg: rgba(255, 255, 255, 0.92);
  --sidebar-scrollbar: rgba(255, 255, 255, 0.18);
  --sidebar-item-text: rgba(226, 232, 240, 0.78);
  --sidebar-item-text-soft: rgba(226, 232, 240, 0.62);
  --sidebar-item-text-strong: #ffffff;
  --sidebar-item-hover-bg: rgba(255, 255, 255, 0.08);
  --sidebar-item-icon-bg: rgba(255, 255, 255, 0.08);
  --sidebar-item-active-bg: rgba(var(--ui-theme-rgb), 0.18);
}

@media screen and (max-width: 768px) {
  .collapsible-sidebar {
    display: none;
  }
}
</style>
