<template>
  <div class="wrap-sidebar">
    <!-- 1. 返回顶部 (独立) -->
    <transition name="sidebar-fade">
      <button
        v-if="isVisible"
        class="sidebar-item glass-effect secondary"
        type="button"
        @click="scrollToTop"
        title="返回顶部"
      >
        <i class="iconfont icon-md-rocket"></i>
      </button>
    </transition>

    <!-- 2. 切换侧边栏 (独立) -->
    <button
      class="sidebar-item glass-effect secondary"
      type="button"
      @click="toggleSidebar"
      title="菜单"
    >
      <i class="iconfont icon-md-menu"></i>
    </button>

    <!-- 3. 添加按钮 -->
    <div v-if="adminStore.isAuthenticated" ref="menuRoot" class="fab-menu-shell">
      <button
        class="sidebar-item main-fab glass-effect"
        type="button"
        title="添加"
        @click.stop="toggleActionMenu"
      >
        <i class="iconfont icon-tianjia"></i>
      </button>

      <transition name="sidebar-menu">
        <div v-if="menuOpen" class="fab-action-menu" @click.stop>
          <button type="button" class="fab-action-button" @click="handleAction('add')">
            <i class="iconfont icon-lianjie action-icon"></i>
            <span>添加网站</span>
          </button>
          <button type="button" class="fab-action-button" @click="handleAction('add-category')">
            <i class="iconfont icon-leimupinleifenleileibie action-icon"></i>
            <span>添加分类</span>
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminStore } from '@/store/admin'
import { ref, onMounted, onUnmounted, inject } from 'vue'

const adminStore = useAdminStore()
const isVisible = ref(false)
const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

// 注入父组件的 toggleSidebar 函数
const toggleSidebar = inject('toggleSidebar', () => {})

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'add-category'): void
}>()

const handleScroll = () => {
  isVisible.value = window.scrollY > 300
}

const toggleActionMenu = () => {
  menuOpen.value = !menuOpen.value
}

const handleAction = (command: 'add' | 'add-category') => {
  if (command === 'add') {
    emit('add')
  } else {
    emit('add-category')
  }

  menuOpen.value = false
}

const handleDocumentClick = (event: MouseEvent) => {
  if (!menuRoot.value?.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped lang="scss">
@use './Sidebar.scss';
</style>

