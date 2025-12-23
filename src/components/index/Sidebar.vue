<template>
  <div class="wrap-sidebar">
    <ul>
      <transition name="fade">
        <li v-if="isVisible" @click="scrollToTop" class="sidebar-item glass-effect hover-scale" title="返回顶部">
          <i class="iconfont icon-md-rocket"></i>
        </li>
      </transition>
      <li class="sidebar-item glass-effect hover-scale" @click="showDrawer" title="菜单">
        <i class="iconfont icon-md-menu"></i>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useMainStore } from '@/store';
import { ref, onMounted, onUnmounted } from 'vue';

const store = useMainStore();
const isVisible = ref(false);

const showDrawer = () => {
  store.$state.isShowDrawer = true;
};

const handleScroll = () => {
  isVisible.value = window.scrollY > 300;
};

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style lang="scss" scoped>
.wrap-sidebar {
  position: fixed;
  right: 24px;
  bottom: 50px;
  z-index: 999;

  ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .sidebar-item {
      width: 48px;
      height: 48px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      
      i {
        font-size: 20px;
        color: var(--gray-700);
      }

      &.glass-effect {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      &:hover {
        background: var(--ui-theme);
        i {
          color: white;
        }
      }
    }
  }
}

.hover-scale {
  &:hover {
    transform: translateY(-4px) scale(1.05);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
