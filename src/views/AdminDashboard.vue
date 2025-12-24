<template>
  <div class="admin-layout" :class="{ 'is-mobile': isMobile }">
    <!-- 侧边栏 -->
    <aside class="admin-sidebar glass-effect" v-if="!isMobile || sidebarVisible">
      <div class="sidebar-header">
        <div class="logo-group">
          <div class="logo-icon gradient-bg">N</div>
          <h1 class="gradient-text">{{ SITE_NAME }}</h1>
        </div>
        <el-button v-if="isMobile" circle :icon="Close" @click="sidebarVisible = false" />
      </div>

      <nav class="sidebar-menu">
        <div 
          v-for="item in menuItems" 
          :key="item.id"
          class="menu-item hover-scale"
          :class="{ active: currentView === item.id }"
          @click="handleMenuClick(item.id)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span class="menu-label">{{ item.label }}</span>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-block glass-card">
          <el-avatar :size="32" :src="adminStore.user?.avatar_url">{{ adminStore.user?.login?.charAt(0).toUpperCase() }}</el-avatar>
          <div class="user-info">
            <span class="username">{{ adminStore.user?.login }}</span>
            <el-tag size="small" :type="getLevelTag(adminStore.user?.level || 0)">{{ getLevelName(adminStore.user?.level || 0) }}</el-tag>
          </div>
        </div>
        <el-button class="logout-btn" plain @click="handleLogout">
          <el-icon><SwitchButton /></el-icon> 退出
        </el-button>
      </div>
    </aside>

    <!-- 移动端遮罩 -->
    <div v-if="isMobile && sidebarVisible" class="sidebar-mask" @click="sidebarVisible = false"></div>

    <!-- 主内容区 -->
    <main class="admin-main">
      <header class="main-header glass-effect">
        <div class="header-left">
          <el-button v-if="isMobile" circle :icon="MenuIcon" @click="sidebarVisible = true" />
          <h2 class="view-title">{{ currentViewLabel }}</h2>
        </div>
        <div class="header-actions">
          <el-button @click="goToIndex" plain class="hover-scale">
            <el-icon><HomeFilled /></el-icon> 首页
          </el-button>
          <el-button type="primary" :loading="loading" @click="loadData" class="hover-scale">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </header>

      <div class="view-content">
        <!-- 数据管理 (原逻辑) -->
        <div v-if="currentView === 'data'" class="data-view fade-in">
          <div class="toolbar-card glass-card">
            <el-tabs v-model="activeTab" class="content-tabs">
              <el-tab-pane label="分类管理" name="categories" />
              <el-tab-pane label="网站管理" name="items" />
            </el-tabs>
            <div class="global-actions">
              <el-button type="success" :loading="saving" @click="handleSave" class="hover-scale">
                <el-icon><Upload /></el-icon> 保存并同步
              </el-button>
              <el-button type="info" @click="handleExport" class="hover-scale">导出 JSON</el-button>
              <el-button type="warning" @click="triggerImport" class="hover-scale">导入 JSON</el-button>
              <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleImport" />
            </div>
          </div>

          <div v-if="activeTab === 'categories'" class="tab-content transition-box">
             <el-card shadow="never" class="glass-card table-wrapper">
                <template #header>
                  <div class="card-header">
                    <span>分类列表</span>
                    <el-button type="primary" :icon="Plus" @click="handleAddCategory">添加分类</el-button>
                  </div>
                </template>
                <CategoryTable :categories="categories" :items="items" @edit="handleEditCategory" @delete="handleDeleteCategory" />
             </el-card>
          </div>

          <div v-if="activeTab === 'items'" class="tab-content transition-box">
             <el-card shadow="never" class="glass-card table-wrapper">
                <template #header>
                  <div class="card-header">
                    <span>网站列表（{{ filteredItems.length }}）</span>
                    <div class="header-filters">
                      <el-input v-model="searchKeyword" placeholder="搜索..." clearable style="width: 200px;" />
                      <el-select v-model="filterCategory" placeholder="全部分类" clearable style="width: 150px;">
                        <el-option label="全部分类" :value="0" />
                        <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
                      </el-select>
                      <el-button type="primary" :icon="Plus" @click="handleAddItem">添加网站</el-button>
                    </div>
                  </div>
                </template>
                <SiteTable :items="filteredItems" :categories="categories" @edit="handleEditItem" @delete="handleDeleteItem" @batch-delete="handleBatchDelete" @batch-move="handleBatchMove" />
             </el-card>
          </div>
        </div>

        <!-- 用户管理 -->
        <div v-if="currentView === 'users'" class="users-view fade-in">
           <el-card shadow="never" class="glass-card">
              <template #header><span>用户管理 (管理员)</span></template>
              <UserTable 
                :users="users" 
                @update-level="handleUpdateUserLevel" 
                @add-user="handleAddUser"
                @delete-user="handleDeleteUser"
                @update-user="handleUpdateUser"
              />
           </el-card>
        </div>

        <!-- 个人资料 -->
        <div v-if="currentView === 'profile'" class="profile-view fade-in">
           <el-card shadow="never" class="glass-card" style="max-width: 600px;">
              <template #header><span>个人资料设置</span></template>
              <ProfileSettings :username="adminStore.user?.login || ''" :level="adminStore.user?.level || 0" @update="handleUpdateProfile" />
           </el-card>
        </div>

        <!-- 系统设置 -->
        <div v-if="currentView === 'settings'" class="settings-view fade-in">
           <el-card shadow="never" class="glass-card" style="max-width: 600px;">
              <template #header><span>系统配置 (管理员)</span></template>
              <SystemSettings :initialSettings="systemSettings" @save="handleSaveSettings" />
           </el-card>
        </div>
      </div>
    </main>

    <!-- Dialogs -->
    <CategoryDialog v-model="categoryDialogVisible" :form="categoryForm" :is-edit="isEdit" @save="saveCategory" />
    <SiteDialog v-model="itemDialogVisible" :form="itemForm" :categories="categories" :is-edit="isEdit" @save="saveItem" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminStore } from '@/store/admin';
import { ElMessage, ElMessageBox } from 'element-plus';
import { SITE_NAME } from '@/config';
import { 
  DataAnalysis, User, Setting, UserFilled, SwitchButton, 
  HomeFilled, Refresh, Upload, Plus, Close, Menu as MenuIcon
} from '@element-plus/icons-vue';

// Composables & Components
import { useAdminDashboard } from '@/composables/useAdminDashboard';
import CategoryTable from '@/components/CategoryTable.vue';
import SiteTable from '@/components/SiteTable.vue';
import CategoryDialog from '@/components/CategoryDialog.vue';
import SiteDialog from '@/components/SiteDialog.vue';
import UserTable from '@/components/admin/UserTable.vue';
import SystemSettings from '@/components/admin/SystemSettings.vue';
import ProfileSettings from '@/components/admin/ProfileSettings.vue';

const router = useRouter();
const adminStore = useAdminStore();
const currentView = ref('data');
const sidebarVisible = ref(false);
const users = ref([]);
const systemSettings = ref({});

const menuItems = computed(() => {
  const items = [
    { id: 'data', label: '数据管理', icon: DataAnalysis },
    { id: 'profile', label: '个人中心', icon: UserFilled },
  ];
  if (adminStore.user?.level === 3) {
    items.push(
      { id: 'users', label: '用户管理', icon: User },
      { id: 'settings', label: '系统设置', icon: Setting }
    );
  }
  return items;
});

const currentViewLabel = computed(() => {
  return menuItems.value.find(m => m.id === currentView.value)?.label || '管理面板';
});

const {
  loading, saving, activeTab, categories, items, filterCategory,
  searchKeyword, categoryDialogVisible, itemDialogVisible, isEdit,
  categoryForm, itemForm, filteredItems, loadData, handleSave,
  handleAddCategory, handleEditCategory, handleDeleteCategory, saveCategory,
  handleAddItem, handleEditItem, handleDeleteItem, saveItem,
  handleBatchDelete, handleBatchMove,
} = useAdminDashboard();

// Sidebar logic
const handleMenuClick = (id: string) => {
  currentView.value = id;
  if (isMobile.value) sidebarVisible.value = false;
  if (id === 'users') fetchUserList();
  if (id === 'settings') fetchSettings();
};

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(() => {
    adminStore.clearAuth();
    router.push('/index');
    ElMessage.success('已退出登录');
  });
};

const goToIndex = () => router.push('/index');

// New API Logic
const fetchUserList = async () => {
  users.value = await adminStore.fetchUsers();
};

const fetchSettings = async () => {
  systemSettings.value = await adminStore.getAdminSettings();
};

const handleUpdateUserLevel = async (username: string, level: number) => {
  const res = await adminStore.updateUser(username, { level });
  if (res.success) {
    ElMessage.success('等级更新成功');
    fetchUserList();
  } else {
    ElMessage.error(res.error || '更新失败');
  }
};

const handleAddUser = async (userData: any) => {
  const res = await adminStore.addUser(userData);
  if (res.success) {
    ElMessage.success('用户添加成功');
    fetchUserList();
  } else {
    ElMessage.error(res.error || '添加失败');
  }
};

const handleDeleteUser = async (username: string) => {
  const res = await adminStore.deleteUser(username);
  if (res.success) {
    ElMessage.success('用户已删除');
    fetchUserList();
  } else {
    ElMessage.error(res.error || '删除失败');
  }
};

const handleUpdateUser = async (oldUsername: string, updateData: any) => {
  const res = await adminStore.updateUser(oldUsername, updateData);
  if (res.success) {
    ElMessage.success('信息更新成功');
    fetchUserList();
  } else {
    ElMessage.error(res.error || '修改失败');
  }
};

const handleSaveSettings = async (newSettings: any) => {
  const res = await adminStore.updateAdminSettings(newSettings);
  if (res.success) ElMessage.success('系统设置已保存');
};

const handleUpdateProfile = async (profileData: any) => {
  const res = await adminStore.updateProfile(profileData);
  if (res.success) ElMessage.success('资料更新成功');
};

// Utils
const getLevelName = (level: number) => ['游客', '注册用户', 'VIP用户', '管理员'][level] || '未知';
const getLevelTag = (level: number) => ['info', '', 'warning', 'danger'][level] || 'info';

// Responsive
const isMobile = ref(false);
const checkMobile = () => { isMobile.value = window.innerWidth <= 992; };
onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  if (!adminStore.isAuthenticated) { router.push('/index'); return; }
  loadData();
});
onUnmounted(() => window.removeEventListener('resize', checkMobile));

// Import/Export
const fileInput = ref<HTMLInputElement | null>(null);
const handleExport = () => {
  const data = { content: { categories: categories.value, items: items.value } };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `starnav-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success('导出成功');
};
const triggerImport = () => fileInput.value?.click();
const handleImport = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const json = JSON.parse(event.target?.result as string);
      if (json.content?.categories && json.content?.items) {
        categories.value = json.content.categories;
        items.value = json.content.items;
        ElMessage.success('导入成功，请点击“保存并同步”');
      }
    } catch (err) { ElMessage.error('导入失败'); }
    finally { target.value = ''; }
  };
  reader.readAsText(file);
};
</script>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--gray-0);
  transition: all 0.3s ease;
  
  // 侧边栏
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
    
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 40px;
      
      .logo-group {
        display: flex;
        align-items: center;
        gap: 12px;
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

  // 主内容区
  .admin-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px;
    background: radial-gradient(circle at top right, rgba(var(--ui-theme-rgb), 0.05), transparent);
    
    .main-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-radius: 16px;
      margin-bottom: 24px;
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
        .view-title { font-size: 1.4rem; font-weight: 600; margin: 0; }
      }
      .header-actions { display: flex; gap: 12px; }
    }
    
    .view-content {
      flex: 1;
      .fade-in { animation: fadeIn 0.3s ease-out; }
    }
  }
}

// 移动端适配
.admin-layout.is-mobile {
  .admin-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 280px;
  }
  .sidebar-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 90;
  }
  .admin-main { padding: 16px; }
}

// 内部组件样式微调
.glass-card {
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 16px !important;
}

.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  margin-bottom: 20px;
  .global-actions { display: flex; gap: 8px; flex-wrap: wrap; }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .header-filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

:root[theme-mode='dark'] {
  .admin-sidebar { background: rgba(0, 0, 0, 0.2); }
  .menu-item { color: #a3a3a3; }
  .menu-item:hover { background: rgba(255, 255, 255, 0.05); }
}
</style>
