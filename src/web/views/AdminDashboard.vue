<template>
  <div class="admin-layout" :class="{ 'is-mobile': isMobile }">
    <AdminSidebar
      :sidebar-visible="sidebarVisible"
      :is-mobile="isMobile"
      :menu-items="menuItems"
      :current-view="currentView"
      @close-sidebar="sidebarVisible = false"
      @menu-click="handleMenuClick"
      @logout="handleLogout"
    />

    <div
      v-if="isMobile && sidebarVisible"
      class="sidebar-mask"
      @click="sidebarVisible = false"
    ></div>

    <main class="admin-main">
      <AdminHeader
        :is-mobile="isMobile"
        :current-view-label="currentViewLabel"
        @open-sidebar="sidebarVisible = true"
        @go-home="goToIndex"
      />

      <div class="view-content">
        <div v-if="currentViewConfig" class="fade-in">
          <component
            :is="currentViewConfig.component"
            v-bind="currentViewConfig.props"
            v-on="currentViewConfig.events || {}"
          />
        </div>
      </div>
    </main>

    <CategoryDialog
      v-model="categoryDialogVisible"
      v-model:form="categoryForm"
      :is-edit="isEdit"
      @save="saveCategory"
    />
    <SiteDialog
      v-model="itemDialogVisible"
      v-model:form="itemForm"
      :categories="categories"
      :is-edit="isEdit"
      @save="saveItem"
    />
    <BookmarkImport v-model="showBookmarkImport" :import-action="handleBookmarkImport" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/store/admin'
import { useDataStore } from '@/store/data'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import { useI18n } from 'vue-i18n'

import { useDataManagement } from '@/composables/admin/useDataManagement'
import { useAdminDashboardViews } from '@/composables/admin/useAdminDashboardViews'
import { useUserManagement } from '@/composables/admin/useUserManagement'
import { useImportExport } from '@/composables/admin/useImportExport'
import { useSystemSettings } from '@/composables/admin/useSystemSettings'
import { useMobile } from '@/composables/useMobile'

import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import BookmarkImport from '@/components/admin/BookmarkImport.vue'
import CategoryDialog from '@/components/CategoryDialog.vue'
import SiteDialog from '@/components/SiteDialog.vue'

const { t } = useI18n()
const router = useRouter()
const adminStore = useAdminStore()
const dataStore = useDataStore()

const {
  categories,
  items,
  filteredItems,
  categoryDialogVisible,
  itemDialogVisible,
  isEdit,
  categoryForm,
  itemForm,
  searchKeyword,
  activeTab,
  filterCategory,
  loadData,
  handleAddCategory,
  handleEditCategory,
  saveCategory,
  handleDeleteCategory,
  moveCategory,
  handleAddItem,
  handleEditItem,
  saveItem,
  handleDeleteItem,
  handleBatchDelete,
  handleBatchMove
} = useDataManagement()

const {
  users,
  fetchUserList,
  handleUpdateUserLevel,
  handleAddUser,
  handleDeleteUser,
  handleUpdateUser
} = useUserManagement()

const { systemSettings, fetchSettings, handleSaveSettings } = useSystemSettings()

const saveDataSync = async () => {
  await dataStore.saveData('import')
}

const { showBookmarkImport, handleJsonImport, handleBookmarkImport, handleCleanDuplicates } =
  useImportExport(categories, items, saveDataSync)

const handleCleanDuplicatesWrapper = async () => {
  const duplicateIds = await handleCleanDuplicates()
  if (duplicateIds && duplicateIds.length > 0) {
    await handleBatchDelete(duplicateIds)
    ElMessage.success(t('manage.cleanSuccess', { count: duplicateIds.length }))
  }
}

const { isMobile } = useMobile()
const isAdmin = computed(() => adminStore.user?.level === 3)

const {
  currentView,
  sidebarVisible,
  menuItems,
  currentViewConfig,
  currentViewLabel,
  handleMenuClick
} = useAdminDashboardViews({
  t,
  isAdmin,
  isMobile,
  activeTab,
  searchKeyword,
  filterCategory,
  categories,
  items,
  filteredItems,
  users,
  systemSettings,
  fetchUserList,
  handleUpdateUserLevel,
  handleAddUser,
  handleDeleteUser,
  handleUpdateUser,
  fetchSettings,
  handleSaveSettings,
  handleAddCategory,
  handleEditCategory,
  handleDeleteCategory,
  handleAddItem,
  handleEditItem,
  handleDeleteItem,
  handleBatchDelete,
  handleBatchMove,
  moveCategory,
  handleJsonImport,
  openBookmarkImport: () => {
    showBookmarkImport.value = true
  },
  handleCleanDuplicates: handleCleanDuplicatesWrapper
})

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(t('admin.confirmLogout'), t('common.warning'), {
      type: 'warning'
    })
    await adminStore.logout()
    router.push('/')
    ElMessage.success(t('admin.logoutMessage'))
  } catch {
    // ignore
  }
}

const goToIndex = () => router.push('/')

onMounted(() => {
  if (!adminStore.isAuthenticated || adminStore.user?.level !== 3) {
    router.push('/')
    return
  }
  loadData()
})
</script>

<style scoped lang="scss">
@use './AdminDashboard.scss';
</style>

