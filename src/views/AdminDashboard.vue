<template>
  <div class="admin-dashboard">
    <!-- 顶部导航 -->
    <div class="admin-header glass-effect">
      <div class="header-left">
        <h1 class="gradient-text">{{ SITE_NAME }} 后台管理</h1>
      </div>
      <div class="header-right">
        <el-button 
          @click="goToIndex"
          class="home-btn hover-scale"
          title="返回首页"
        >
          <el-icon><HomeFilled /></el-icon>
          <span class="btn-text">返回首页</span>
        </el-button>
        <el-button type="primary" @click="loadData" :loading="loading" title="刷新数据" class="action-btn hover-scale">
          <el-icon><Refresh /></el-icon>
          <span class="btn-text">刷新数据</span>
        </el-button>
        <el-button type="success" @click="handleSave" :loading="saving" title="保存修改" class="action-btn hover-scale">
          <el-icon><Upload /></el-icon>
          <span class="btn-text">保存修改</span>
        </el-button>
        <el-dropdown @command="handleCommand">
          <span class="user-info hover-scale">
            <el-avatar 
              :src="adminStore.user?.avatar_url" 
              :alt="adminStore.user?.login"
              :size="32"
            />
            <span class="username">{{ adminStore.user?.login }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="admin-content">
      <el-tabs v-model="activeTab" class="content-tabs">
        <!-- 分类管理 -->
        <el-tab-pane label="分类管理" name="categories">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span>分类列表</span>
                <el-button type="primary" :icon="PlusIcon" @click="handleAddCategory">
                  添加分类
                </el-button>
              </div>
            </template>
            <CategoryTable 
              :categories="categories" 
              :items="items"
              @edit="handleEditCategory"
              @delete="handleDeleteCategory"
            />
          </el-card>
        </el-tab-pane>

        <!-- 网站管理 -->
        <el-tab-pane label="网站管理" name="items">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span>网站列表（共 {{ filteredItems.length }} 个）</span>
                <div class="header-actions">
                  <el-input
                    v-model="searchKeyword"
                    :placeholder="isMobile ? '搜索' : '搜索网站名称、URL或描述'"
                    clearable
                    style="width: 250px;"
                    class="search-input"
                  >
                    <template #prefix>
                      <el-icon><Search /></el-icon>
                    </template>
                  </el-input>
                  <el-select 
                    v-model="filterCategory" 
                    placeholder="筛选分类" 
                    clearable
                    style="width: 200px; margin-right: 10px;"
                    class="filter-select"
                  >
                    <el-option label="全部分类" :value="0" />
                    <el-option 
                      v-for="cat in categories" 
                      :key="cat.id" 
                      :label="cat.name" 
                      :value="cat.id" 
                    />
                  </el-select>
                  <el-button type="primary" :icon="PlusIcon" @click="handleAddItem">
                    添加网站
                  </el-button>
                </div>
              </div>
            </template>
            <SiteTable 
              :items="filteredItems"
              :categories="categories"
              @edit="handleEditItem"
              @delete="handleDeleteItem"
            />
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 分类编辑对话框 -->
    <CategoryDialog 
      v-model="categoryDialogVisible"
      :form="categoryForm"
      :is-edit="isEdit"
      @save="saveCategory"
    />

    <!-- 网站编辑对话框 -->
    <SiteDialog 
      v-model="itemDialogVisible"
      :form="itemForm"
      :categories="categories"
      :is-edit="isEdit"
      @save="saveItem"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminStore } from '@/store/admin';
import { ElMessage } from 'element-plus';
import { SITE_NAME } from '@/config';
import { 
  Refresh, 
  Upload, 
  Plus, 
  Search,
  HomeFilled
} from '@element-plus/icons-vue';

// Composables
import { useAdminDashboard } from '@/composables/useAdminDashboard';

// 组件
import CategoryTable from '@/components/CategoryTable.vue';
import SiteTable from '@/components/SiteTable.vue';
import CategoryDialog from '@/components/CategoryDialog.vue';
import SiteDialog from '@/components/SiteDialog.vue';

// 图标
const PlusIcon = Plus;

const router = useRouter();
const adminStore = useAdminStore();
const {
  loading,
  saving,
  activeTab,
  categories,
  items,
  filterCategory,
  searchKeyword,
  categoryDialogVisible,
  itemDialogVisible,
  isEdit,
  categoryForm,
  itemForm,
  filteredItems,
  loadData,
  handleSave,
  handleAddCategory,
  handleEditCategory,
  handleDeleteCategory,
  saveCategory,
  handleAddItem,
  handleEditItem,
  handleDeleteItem,
  saveItem,
} = useAdminDashboard();

// 检测是否为移动端
const isMobile = ref(false);
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  // 检查登录状态
  if (!adminStore.isAuthenticated) {
    ElMessage.warning('请先登录');
    router.push('/index');
    return;
  }

  // 加载数据
  loadData();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

// 用户操作
const goToIndex = () => {
  router.push('/index');
};

const handleCommand = (command: string) => {
  if (command === 'logout') {
    adminStore.clearAuth();
    ElMessage.success('已退出登录');
    router.push('/index');
  }
};
</script>

<style scoped lang="scss">
@import '@/assets/css/admin.scss';
</style>

