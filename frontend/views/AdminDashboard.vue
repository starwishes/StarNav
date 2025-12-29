<template>
  <div class="admin-layout" :class="{ 'is-mobile': isMobile }">
    <!-- 侧边栏组件 -->
    <AdminSidebar 
      :sidebar-visible="sidebarVisible" 
      :is-mobile="isMobile" 
      :menu-items="menuItems" 
      :current-view="currentView"
      @close-sidebar="sidebarVisible = false"
      @menu-click="handleMenuClick"
      @logout="handleLogout"
    />

    <!-- 移动端遮罩 -->
    <div v-if="isMobile && sidebarVisible" class="sidebar-mask" @click="sidebarVisible = false"></div>

    <!-- 主内容区 -->
    <main class="admin-main">
      <!-- 顶部状态栏组件 -->
      <AdminHeader 
        :is-mobile="isMobile" 
        :current-view-label="currentViewLabel" 
        :loading="loading"
        :saving="saving"
        @open-sidebar="sidebarVisible = true"
        @go-home="goToIndex"
        @load-data="loadData"
      />

      <div class="view-content">
        <!-- 数据管理视图组件 -->
        <DataManager 
          v-if="currentView === 'data'"
          :active-tab="activeTab"
          @update:active-tab="activeTab = $event"
          :search-keyword="searchKeyword"
          @update:search-keyword="searchKeyword = $event"
          :filter-category="filterCategory"
          @update:filter-category="filterCategory = $event"
          :saving="saving"
          :categories="categories"
          :items="items"
          :filtered-items="filteredItems"
          @save="handleSave"
          @add-category="handleAddCategory"
          @edit-category="handleEditCategory"
          @delete-category="handleDeleteCategory"
          @add-item="handleAddItem"
          @edit-item="handleEditItem"
          @delete-item="handleDeleteItem"
          @batch-delete="handleBatchDelete"
          @batch-move="handleBatchMove"
          @show-bookmark-import="showBookmarkImport = true"
          @json-import="handleJsonImport"
          @move-category="moveCategory"
          @clean-duplicates="handleCleanDuplicates"
        />

        <!-- 用户管理 (已组件化) -->
        <div v-if="currentView === 'users'" class="users-view fade-in">
           <el-card shadow="never" class="glass-card">
              <template #header><span>{{ t('admin.userManagement') }}</span></template>
              <UserTable 
                :users="users" 
                @update-level="handleUpdateUserLevel" 
                @add="handleAddUser"
                @delete="handleDeleteUser"
                @update="handleUpdateUser"
              />
           </el-card>
        </div>

        <!-- 个人资料 (已组件化) -->
        <div v-if="currentView === 'profile'" class="profile-view fade-in">
           <el-card shadow="never" class="glass-card" style="max-width: 600px;">
              <template #header><span>{{ t('profile.settings') }}</span></template>
              <ProfileSettings :username="adminStore.user?.login || ''" :level="adminStore.user?.level || 0" @update-profile="handleUpdateProfile" />
           </el-card>
        </div>

        <!-- 系统设置 (已组件化) -->
        <div v-if="currentView === 'settings'" class="settings-view fade-in">
           <el-card shadow="never" class="glass-card" style="max-width: 600px;">
              <template #header><span>{{ t('admin.systemConfig') }}</span></template>
              <SystemSettings :initialSettings="systemSettings" @save="handleSaveSettings" />
           </el-card>
        </div>
        
        <!-- 审计日志 -->
        <div v-if="currentView === 'audit'" class="audit-view fade-in">
           <el-card shadow="never" class="glass-card">
              <AuditLog />
           </el-card>
        </div>
        
        <!-- 会话管理 -->
        <div v-if="currentView === 'sessions'" class="sessions-view fade-in">
           <el-card shadow="never" class="glass-card" style="max-width: 800px;">
              <SessionManager />
           </el-card>
        </div>
        
        <!-- 访问统计 -->
        <div v-if="currentView === 'stats'" class="stats-view fade-in">
           <StatsDashboard />
        </div>
        
        <!-- 回收站 -->
        <div v-if="currentView === 'recycle'" class="recycle-view fade-in">
           <el-card shadow="never" class="glass-card">
              <RecycleBin />
           </el-card>
        </div>
      </div>
    </main>

    <!-- 弹窗组件 -->
    <CategoryDialog 
      v-model="categoryDialogVisible" 
      v-model:form="categoryForm" 
      :is-edit="isEdit" 
      :saving="saving" 
      @save="saveCategory" 
    />
    <SiteDialog 
      v-model="itemDialogVisible" 
      v-model:form="itemForm" 
      :categories="categories" 
      :is-edit="isEdit" 
      :saving="saving" 
      @save="saveItem" 
    />
    <BookmarkImport v-model="showBookmarkImport" @import="handleBookmarkImport" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminStore } from '@/store/admin';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DataAnalysis, User, Setting, UserFilled, List, Lock, TrendCharts, Delete } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

// Store
import { useDataStore } from '@/store/data';
import { storeToRefs } from 'pinia';
import { Category, Item } from '@/types';

// Components (Lazy Load for performance)
import AdminHeader from '@/components/admin/AdminHeader.vue';
import AdminSidebar from '@/components/admin/AdminSidebar.vue';

const DataManager = defineAsyncComponent(() => import('@/components/admin/DataManager.vue'));
const UserTable = defineAsyncComponent(() => import('@/components/admin/UserTable.vue'));
const ProfileSettings = defineAsyncComponent(() => import('@/components/admin/ProfileSettings.vue'));
const SystemSettings = defineAsyncComponent(() => import('@/components/admin/SystemSettings.vue'));
const AuditLog = defineAsyncComponent(() => import('@/components/admin/AuditLog.vue'));
const SessionManager = defineAsyncComponent(() => import('@/components/admin/SessionManager.vue'));
const StatsDashboard = defineAsyncComponent(() => import('@/components/admin/StatsDashboard.vue'));
const RecycleBin = defineAsyncComponent(() => import('@/components/admin/RecycleBin.vue'));
const BookmarkImport = defineAsyncComponent(() => import('@/components/admin/BookmarkImport.vue'));
const CategoryDialog = defineAsyncComponent(() => import('@/components/CategoryDialog.vue'));
const SiteDialog = defineAsyncComponent(() => import('@/components/SiteDialog.vue'));

const { t } = useI18n();
const router = useRouter();
const adminStore = useAdminStore();
const currentView = ref('profile');
const sidebarVisible = ref(false);
const users = ref([]);
const systemSettings = ref({});
const showBookmarkImport = ref(false);

const menuItems = computed(() => {
  const items = [
    { id: 'profile', label: t('menu.profile'), icon: UserFilled },
    { id: 'data', label: t('menu.dataManage'), icon: DataAnalysis },
    { id: 'sessions', label: t('menu.sessions'), icon: Lock },
  ];
  if (adminStore.user?.level === 3) {
    items.push(
      { id: 'users', label: t('menu.users'), icon: User },
      { id: 'stats', label: t('menu.stats'), icon: TrendCharts },
      { id: 'audit', label: t('menu.audit'), icon: List },
      { id: 'recycle', label: t('menu.recycle'), icon: Delete },
      { id: 'settings', label: t('menu.settings'), icon: Setting }
    );
  }
  return items;
});

const currentViewLabel = computed(() => {
  return menuItems.value.find(m => m.id === currentView.value)?.label || t('admin.dashboard');
});

const dataStore = useDataStore();
const { categories, items, loading, saving } = storeToRefs(dataStore);

// 兼容 DataManager @save 事件
const handleSave = async () => {
    await dataStore.loadData();
};

// Local State for Dialogs
const categoryDialogVisible = ref(false);
const itemDialogVisible = ref(false);
const isEdit = ref(false);
const categoryForm = ref<Partial<Category>>({});
const itemForm = ref<Partial<Item>>({});

// Filter State
const searchKeyword = ref('');
const activeTab = ref('categories');
const filterCategory = ref<number>(0);

// Computed
const filteredItems = computed(() => {
  let result = items.value;
  if (filterCategory.value) {
    result = result.filter(i => i.categoryId === filterCategory.value);
  }
  if (searchKeyword.value) {
    const k = searchKeyword.value.toLowerCase();
    result = result.filter(i => i.name.toLowerCase().includes(k) || i.url.toLowerCase().includes(k));
  }
  return result;
});

// Actions Wrappers
const loadData = () => dataStore.loadData();

const handleAddCategory = () => {
  isEdit.value = false;
  categoryForm.value = { name: '', level: 0 };
  categoryDialogVisible.value = true;
};

const handleEditCategory = (row: Category) => {
  isEdit.value = true;
  categoryForm.value = { ...row };
  categoryDialogVisible.value = true;
};

const saveCategory = async (/* categoryForm is v-model bound */) => {
  if (!categoryForm.value.name) return ElMessage.warning(t('category.placeholderName'));
  try {
    if (isEdit.value) {
      await dataStore.updateCategory(categoryForm.value);
      ElMessage.success(t('category.updateSuccess'));
    } else {
      await dataStore.addCategory(categoryForm.value);
      ElMessage.success(t('category.addSuccess'));
    }
    categoryDialogVisible.value = false;
  } catch (e) {
    // Error handled in store
  }
};

const handleDeleteCategory = async (row: Category) => {
  try {
    await ElMessageBox.confirm(t('category.deleteConfirm'), t('common.delete'), { type: 'warning' });
    await dataStore.deleteCategory(row.id);
    ElMessage.success(t('category.deleteSuccess'));
  } catch (e) { /* cancel */ }
};

const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    await dataStore.moveCategory(index, target);
};

const handleAddItem = () => {
  isEdit.value = false;
  itemForm.value = {
    name: '', url: '', description: '',
    categoryId: categories.value[0]?.id || 0,
    pinned: false, level: 0, tags: []
  };
  itemDialogVisible.value = true;
};

const handleEditItem = (row: Item) => {
  isEdit.value = true;
  // Deep copy to break reference
  itemForm.value = JSON.parse(JSON.stringify(row));
  itemDialogVisible.value = true;
};

const saveItem = async (incomingData?: Partial<Item>) => {
    // 兼容旧的事件传参方式，优先使用传入数据
    const payload = incomingData && incomingData.name ? incomingData : itemForm.value;
    
    if (!payload.name || !payload.url) return ElMessage.warning(t('common.tips'));

    try {
        if (isEdit.value) {
            await dataStore.updateItem(payload);
            ElMessage.success(t('admin.updateSuccess'));
        } else {
            await dataStore.addItem(payload);
            ElMessage.success(t('admin.addSuccess'));
        }
        itemDialogVisible.value = false;
    } catch (e) {
        // Error handled in store
    }
};

const handleDeleteItem = async (row: Item) => {
  try {
    await ElMessageBox.confirm(t('table.deleteConfirm'), t('common.delete'), { type: 'warning' });
    await dataStore.deleteItem(row.id);
    ElMessage.success(t('table.deleteSuccess'));
  } catch (e) { /* cancel */ }
};

const handleBatchDelete = async (ids: number[]) => {
    await dataStore.batchDeleteItems(ids);
    ElMessage.success(t('table.deleteSuccess'));
};

const handleBatchMove = async (ids: number[], categoryId: number) => {
    await dataStore.batchMoveItems(ids, categoryId);
    ElMessage.success(t('table.moveSuccess'));
};

// 兼容导入逻辑中对 reload 的需求
const saveDataSync = async () => {
    // Store 的 action 每一步都会 sync，这里可以调用 loadData 确保一致，或者直接不做
    // 为了兼容旧逻辑（导入后刷新），我们重新 load
    await dataStore.loadData();
};

// Sidebar logic
const handleMenuClick = (id: string) => {
  currentView.value = id;
  if (isMobile.value) sidebarVisible.value = false;
  if (id === 'users') fetchUserList();
  if (id === 'settings') fetchSettings();
};

const handleLogout = () => {
  ElMessageBox.confirm(t('admin.confirmLogout'), t('common.warning'), { type: 'warning' }).then(() => {
    adminStore.clearAuth();
    router.push('/');
    ElMessage.success(t('admin.logoutMessage'));
  });
};

const goToIndex = () => router.push('/');

const fetchUserList = async () => {
  users.value = await adminStore.fetchUsers();
};

const fetchSettings = async () => {
  systemSettings.value = await adminStore.getAdminSettings();
};

const handleUpdateUserLevel = async (username: string, level: number) => {
  const res = await adminStore.updateUser(username, { level });
  if (res.success) {
    ElMessage.success(t('admin.updateSuccess'));
    fetchUserList();
  } else {
    ElMessage.error(res.error || t('admin.operationFailed'));
  }
};

const handleAddUser = async (userData: any) => {
  const res = await adminStore.addUser(userData);
  if (res.success) {
    ElMessage.success(t('admin.addSuccess'));
    fetchUserList();
  } else {
    ElMessage.error(res.error || t('admin.operationFailed'));
  }
};

const handleDeleteUser = async (username: string) => {
  const res = await adminStore.deleteUser(username);
  if (res.success) {
    ElMessage.success(t('admin.deleteSuccess'));
    fetchUserList();
  } else {
    ElMessage.error(res.error || t('admin.operationFailed'));
  }
};

const handleUpdateUser = async (oldUsername: string, updateData: any) => {
  const res = await adminStore.updateUser(oldUsername, updateData);
  if (res.success) {
    ElMessage.success(t('admin.updateSuccess'));
    fetchUserList();
  } else {
    ElMessage.error(res.error || t('admin.operationFailed'));
  }
};

const handleSaveSettings = async (newSettings: any) => {
  const res = await adminStore.updateAdminSettings(newSettings);
  if (res.success) ElMessage.success(t('settings.saveSettings') + ' ' + t('common.success'));
};

const handleUpdateProfile = async (profileData: any) => {
  try {
    const res = await adminStore.updateProfile(profileData);
    if (res.success) {
      ElMessage.success(t('admin.updateSuccess'));
    } else {
      const errorMsg = res.error === 'ERR_PASSWORD_WEAK' ? t('auth.passwordWeak') : (res.error || t('common.operationFailed'));
      ElMessage.error(errorMsg);
    }
  } catch (e: any) {
    ElMessage.error(e.message || t('common.operationFailed'));
  }
};

// Responsive
const isMobile = ref(false);
const checkMobile = () => { isMobile.value = window.innerWidth <= 992; };
onMounted(() => {

  checkMobile();
  window.addEventListener('resize', checkMobile);
  if (!adminStore.isAuthenticated) { router.push('/'); return; }
  loadData();
});
onUnmounted(() => window.removeEventListener('resize', checkMobile));

const handleJsonImport = (content: any) => {
  if (!content.categories || !content.items) {
    ElMessage.error(t('admin.jsonError'));
    return;
  }
  
  let maxCatId = categories.value.reduce((max: number, cat: any) => Math.max(max, cat.id), 0);
  let maxItemId = items.value.reduce((max: number, item: any) => Math.max(max, item.id), 0);
  
  const catMapping: Record<number, number> = {};
  const currentCatNames: Record<string, number> = {};
  categories.value.forEach((cat: any) => { currentCatNames[cat.name] = cat.id; });
  
  // 1. 合并分类
  content.categories.forEach((cat: any) => {
    if (currentCatNames[cat.name]) {
      catMapping[cat.id] = currentCatNames[cat.name];
    } else {
      maxCatId++;
      const newCat = { ...cat, id: maxCatId };
      categories.value.push(newCat);
      catMapping[cat.id] = maxCatId;
      currentCatNames[cat.name] = maxCatId;
    }
  });
  
  // 2. 合并网站 (按 URL 去重)
  let addedCount = 0;
  content.items.forEach((item: any) => {
    const exists = items.value.some((i: any) => i.url === item.url);
    if (!exists) {
      maxItemId++;
      const newItem = { 
        ...item, 
        id: maxItemId,
        categoryId: catMapping[item.categoryId] || categories.value[0]?.id || 1 
      };
      items.value.push(newItem);
      addedCount++;
    }
  });

  ElMessage.success(t('admin.importSuccess', { count: addedCount }) + '. ' + t('admin.importConfirm'));
  saveDataSync(); // 导入后自动静默同步
};

// 浏览器书签导入处理
const handleBookmarkImport = (data: { categories: string[]; items: any[] }) => {
  let maxCatId = categories.value.reduce((max: number, cat: any) => Math.max(max, cat.id), 0);
  let maxItemId = items.value.reduce((max: number, item: any) => Math.max(max, item.id), 0);
  
  const catNameToId: Record<string, number> = {};
  categories.value.forEach((cat: any) => { catNameToId[cat.name] = cat.id; });
  
  data.categories.forEach(catName => {
    if (!catNameToId[catName]) {
      maxCatId++;
      categories.value.push({ id: maxCatId, name: catName });
      catNameToId[catName] = maxCatId;
    }
  });
  
  data.items.forEach((item: any) => {
    const exists = items.value.some((i: any) => i.url === item.url);
    if (!exists) {
      maxItemId++;
      items.value.push({
        id: maxItemId,
        name: item.name,
        url: item.url,
        description: item.description || '',
        categoryId: catNameToId[item.categoryName] || categories.value[0]?.id || 1,
        pinned: false,
        level: 0,
        tags: []
      });
    }
  });
  ElMessage.success(`导入成功，现已自动同步并生效`);
  saveDataSync(); // 导入后自动静默同步
};
const normalizeUrl = (url: string) => {
  try {
    const u = new URL(url);
    // Remove trailing slash
    let p = u.pathname;
    if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1);
    return u.origin + p + u.search;
  } catch (e) {
    // Fallback for invalid URLs: just trim and lowercase
    let s = url.trim().toLowerCase();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  }
};

const handleCleanDuplicates = async () => {
    // 1. Group items by normalized URL
    const groups: Record<string, Item[]> = {};
    items.value.forEach(item => {
        const key = normalizeUrl(item.url);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    // 2. Identify duplicates
    const duplicates: Item[] = [];
    Object.values(groups).forEach(group => {
        if (group.length > 1) {
            // Sort by clickCount desc, then ID asc (older first if clicks same)
            group.sort((a, b) => {
                const clicksA = a.clickCount || 0;
                const clicksB = b.clickCount || 0;
                if (clicksA !== clicksB) return clicksB - clicksA;
                return a.id - b.id;
            });
            // Keep the first one, mark others for deletion
            for (let i = 1; i < group.length; i++) {
                duplicates.push(group[i]);
            }
        }
    });

    if (duplicates.length === 0) {
        ElMessage.info(t('manage.noDuplicates'));
        return;
    }

    try {
        await ElMessageBox.confirm(
            t('manage.cleanConfirm'), 
            t('manage.cleanDuplicates'), 
            { 
                confirmButtonText: t('common.confirm'),
                cancelButtonText: t('common.cancel'),
                type: 'warning' 
            }
        );

        await dataStore.batchDeleteItems(duplicates.map(i => i.id));
        ElMessage.success(t('manage.cleanSuccess', { count: duplicates.length }));
        saveDataSync();
    } catch (e) {
        // Cancelled
    }
};
</script>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--gray-0);
  transition: all 0.3s ease;
}

// 主内容区
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: radial-gradient(circle at top right, rgba(var(--ui-theme-rgb), 0.05), transparent);
  
  .view-content {
    flex: 1;
    .fade-in { animation: fadeIn 0.3s ease-out; }
  }
}

// 移动端适配
.admin-layout.is-mobile {
  .sidebar-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 90;
  }
  .admin-main { padding: 16px; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

