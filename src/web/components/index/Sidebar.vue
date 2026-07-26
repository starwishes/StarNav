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
.wrap-sidebar {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  @media screen and (max-width: 768px) {
    right: 16px;
    bottom: 80px;
  }

  .sidebar-item {
    width: 44px;
    height: 44px;
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    outline: none;

    /* 统一玻璃材质基础样式 */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

    i {
      font-size: 20px;
    }

    /* 次要按钮 (火箭/菜单) */
    &.secondary {
      background: rgba(255, 255, 255, 0.6);
      i {
        color: var(--gray-800);
      }

      &:hover {
        background: #fff;
        transform: translateY(-2px);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
        i {
          color: var(--ui-theme);
        }
      }
    }

    /* 主按钮 (添加) */
    &.main-fab {
      background: rgba(255, 255, 255, 0.6);
      i {
        color: var(--gray-800);
      }

      &:hover {
        transform: scale(1.1) translateY(-2px);
        background: #fff;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        i {
          color: var(--ui-theme);
        }
      }
    }
  }
}

.fab-menu-shell {
  position: relative;
}

.fab-action-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 12px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 148px;
  padding: 8px;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
}

.fab-action-button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--gray-700);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--ui-theme-rgb), 0.1);
    color: var(--ui-theme);
  }

  span {
    line-height: 1;
    font-weight: 500;
  }
}

.action-icon {
  font-size: 16px;
}

/* 动画效果 */
.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
  transition: all 0.3s ease;
}
.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.sidebar-menu-enter-active,
.sidebar-menu-leave-active {
  transition: all 0.2s ease;
}

.sidebar-menu-enter-from,
.sidebar-menu-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

:global(:root[theme-mode='dark'] .wrap-sidebar .sidebar-item) {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
}

:global(:root[theme-mode='dark'] .wrap-sidebar .sidebar-item.secondary),
:global(:root[theme-mode='dark'] .wrap-sidebar .sidebar-item.main-fab) {
  background: rgba(15, 23, 42, 0.8);
}

:global(:root[theme-mode='dark'] .wrap-sidebar .sidebar-item.secondary i),
:global(:root[theme-mode='dark'] .wrap-sidebar .sidebar-item.main-fab i) {
  color: var(--ui-text-primary, #f8fafc);
}

:global(:root[theme-mode='dark'] .wrap-sidebar .sidebar-item.secondary:hover),
:global(:root[theme-mode='dark'] .wrap-sidebar .sidebar-item.main-fab:hover) {
  background: rgba(15, 23, 42, 0.96);
}

:global(:root[theme-mode='dark'] .fab-action-menu) {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
}

:global(:root[theme-mode='dark'] .fab-action-button) {
  color: rgba(226, 232, 240, 0.82);
}
</style>

