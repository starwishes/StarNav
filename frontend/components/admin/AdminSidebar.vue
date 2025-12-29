<template>
  <aside class="admin-sidebar glass-effect" :class="{ 'mobile-visible': sidebarVisible }">
    <div class="sidebar-header">
      <div class="logo-group" @click="$router.push('/')">
        <div class="logo-icon gradient-bg">N</div>
        <h1 class="gradient-text">{{ mainStore.settings?.siteName || t('notification.siteName') }}</h1>
      </div>
      <el-button v-if="isMobile" circle :icon="Close" @click="$emit('close-sidebar')" />
    </div>

    <nav class="sidebar-menu">
      <div 
        v-for="item in menuItems" 
        :key="item.id"
        class="menu-item hover-scale"
        :class="{ active: currentView === item.id }"
        @click="$emit('menu-click', item.id)"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span class="menu-label">{{ t('menu.' + getMenuKey(item.id)) }}</span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <el-button class="extension-btn" type="primary" plain @click="downloadExtension">
        <el-icon><Download /></el-icon> {{ t('menu.extension') }}
      </el-button>
      <div class="user-block glass-card">
        <el-avatar :size="32" :src="adminStore.user?.avatar_url">{{ adminStore.user?.login?.charAt(0).toUpperCase() }}</el-avatar>
        <div class="user-info">
          <span class="username">{{ adminStore.user?.login }}</span>
          <el-tag size="small" :type="getLevelTag(adminStore.user?.level || 0)">{{ getLevelName(adminStore.user?.level || 0) }}</el-tag>
        </div>
      </div>
      <el-button class="logout-btn" plain @click="$emit('logout')">
        <el-icon><SwitchButton /></el-icon> {{ t('nav.logout') }}
      </el-button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAdminStore } from '@/store/admin';
import { useMainStore } from '@/store';
import { Close, SwitchButton, Download } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

const { t } = useI18n();

defineProps<{
  sidebarVisible: boolean;
  isMobile: boolean;
  menuItems: any[];
  currentView: string;
}>();

defineEmits(['close-sidebar', 'menu-click', 'logout']);

const adminStore = useAdminStore();
const mainStore = useMainStore();

const getLevelName = (level: number) => {
  const keys = ['guest', 'user', 'vip', 'admin'];
  return t(`userLevel.${keys[level] || 'unknown'}`);
};
const getLevelTag = (level: number) => ['info', '', 'warning', 'danger'][level] || 'info';

const getMenuKey = (id: string) => {
  // Map 'data' to 'dataManage' because key in locale is dataManage
  if (id === 'data') return 'dataManage';
  return id;
}

// 下载预配置的浏览器插件
const downloadExtension = async () => {
  try {
    const token = adminStore.token;
    if (!token) {
      ElMessage.error(t('notification.loginRequired'));
      return;
    }
    
    // 创建隐藏的 a 标签触发下载
    const link = document.createElement('a');
    link.href = `/api/extension/download`;
    link.setAttribute('download', 'starnav-extension.zip');
    
    // 需要通过 fetch 带上 Authorization header
    const response = await fetch('/api/extension/download', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    ElMessage.success(t('notification.downloadSuccess'));
  } catch (error) {
    console.error('Download extension error:', error);
    ElMessage.error(t('notification.downloadFailed'));
  }
}
</script>

<style scoped lang="scss">
.admin-sidebar {
  width: 260px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
    
    .logo-group {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: opacity 0.3s;

      &:hover {
        opacity: 0.8;
      }

      .logo-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
      }
      h1 {
        font-size: 1.2rem;
        font-weight: 700;
      }
    }
  }
  
  .sidebar-menu {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      cursor: pointer;
      color: var(--gray-700);
      transition: all 0.2s;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--ui-theme);
      }
      &.active {
        background: var(--ui-theme);
        color: white;
        box-shadow: 0 4px 12px rgba(var(--ui-theme-rgb), 0.3);
      }
      .el-icon { font-size: 1.2rem; }
    }
  }
  
  .sidebar-footer {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    
    .extension-btn { 
      width: 100%; 
      border-radius: 10px; 
    }
    .user-block {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      .user-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .username { font-weight: 600; font-size: 14px; }
      }
    }
    .logout-btn { width: 100%; border-radius: 10px; }
  }
}

:root[theme-mode='dark'] {
  .admin-sidebar { background: rgba(0, 0, 0, 0.2); }
  .menu-item { color: #a3a3a3; }
  .menu-item:hover { background: rgba(255, 255, 255, 0.05); }
}

// 移动端展示逻辑
@media screen and (max-width: 992px) {
  .admin-sidebar {
    position: fixed;
    left: -280px;
    top: 0;
    bottom: 0;
    &.mobile-visible {
      left: 0;
    }
  }
}
</style>
