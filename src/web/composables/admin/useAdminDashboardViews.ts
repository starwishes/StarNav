import { computed, defineAsyncComponent, ref, watch, type Component, type Ref } from 'vue'
import type { SystemSettings, User } from '@/api'
import type { Category, Item } from '@/types'
import type { ParsedJsonBackup } from '@/utils/jsonBackup'

const DataManager = defineAsyncComponent(() => import('@/components/admin/DataManager.vue'))
const MonitoringDashboard = defineAsyncComponent(
  () => import('@/components/admin/MonitoringDashboard.vue')
)
const UserTable = defineAsyncComponent(() => import('@/components/admin/UserTable.vue'))
const SystemSettings = defineAsyncComponent(() => import('@/components/admin/SystemSettings.vue'))

export type AdminDashboardViewId = 'settings' | 'users' | 'data' | 'monitor'

export interface AdminDashboardViewConfig {
  component: Component
  events?: Record<string, (...args: unknown[]) => unknown>
  menuKey: string
  icon: string
  onEnter?: () => void | Promise<void>
  panelClass?: string
  panelTitle?: string
  props?: Record<string, unknown>
  requiresAdmin?: boolean
  usePanel?: boolean
  wrapperClass?: string
}

type MaybePromise<T = void> = T | Promise<T>
type UserUpdatePayload = { username: string; password?: string }
type UserAddPayload = { username: string; password: string; level: number }

interface UseAdminDashboardViewsOptions {
  t: (key: string, params?: Record<string, unknown>) => string
  isAdmin: Ref<boolean>
  isMobile: Ref<boolean>
  activeTab: Ref<string>
  searchKeyword: Ref<string>
  filterCategory: Ref<number>
  categories: Ref<Category[]>
  items: Ref<Item[]>
  filteredItems: Ref<Item[]>
  users: Ref<User[]>
  systemSettings: Ref<Partial<SystemSettings>>
  fetchUserList: () => MaybePromise
  handleUpdateUserLevel: (username: string, level: number) => MaybePromise
  handleAddUser: (payload: UserAddPayload) => MaybePromise
  handleDeleteUser: (username: string) => MaybePromise
  handleUpdateUser: (username: string, payload: UserUpdatePayload) => MaybePromise
  fetchSettings: () => MaybePromise
  handleSaveSettings: (settings: Partial<SystemSettings>) => MaybePromise
  handleAddCategory: () => void
  handleEditCategory: (category: Category) => MaybePromise
  handleDeleteCategory: (category: Category) => MaybePromise
  handleAddItem: () => void
  handleEditItem: (item: Item) => MaybePromise
  handleDeleteItem: (item: Item) => MaybePromise
  handleBatchDelete: (ids: number[]) => MaybePromise
  handleBatchMove: (ids: number[], categoryId: number) => MaybePromise
  moveCategory: (index: number, direction: 'up' | 'down') => MaybePromise
  handleJsonImport: (
    backup: ParsedJsonBackup | { categories: Category[]; items: Item[] } | { content: unknown }
  ) => MaybePromise<boolean | void>
  openBookmarkImport: () => void
  handleCleanDuplicates: () => MaybePromise
}

export function useAdminDashboardViews(options: UseAdminDashboardViewsOptions) {
  const currentView = ref<AdminDashboardViewId>('settings')
  const sidebarVisible = ref(false)

  const viewConfigs = computed(
    () =>
      ({
        settings: {
          component: SystemSettings,
          menuKey: 'settings',
          icon: 'icon-md-settings',
          onEnter: options.fetchSettings,
          panelClass: 'narrow-panel',
          props: {
            initialSettings: options.systemSettings.value
          },
          events: {
            save: options.handleSaveSettings
          },
          requiresAdmin: true,
          usePanel: true,
          wrapperClass: 'settings-view'
        },
        users: {
          component: UserTable,
          menuKey: 'users',
          icon: 'icon-bianji-yonghu',
          onEnter: options.fetchUserList,
          props: {
            users: options.users.value
          },
          events: {
            'update-level': options.handleUpdateUserLevel,
            add: options.handleAddUser,
            delete: options.handleDeleteUser,
            update: options.handleUpdateUser
          },
          requiresAdmin: true,
          usePanel: true,
          wrapperClass: 'users-view'
        },
        data: {
          component: DataManager,
          menuKey: 'dataManage',
          icon: 'icon-fenlei',
          props: {
            activeTab: options.activeTab.value,
            searchKeyword: options.searchKeyword.value,
            filterCategory: options.filterCategory.value,
            categories: options.categories.value,
            items: options.items.value,
            filteredItems: options.filteredItems.value
          },
          events: {
            'update:active-tab': (value: unknown) => {
              options.activeTab.value = String(value)
            },
            'update:search-keyword': (value: unknown) => {
              options.searchKeyword.value = String(value)
            },
            'update:filter-category': (value: unknown) => {
              options.filterCategory.value = Number(value)
            },
            'add-category': options.handleAddCategory,
            'edit-category': options.handleEditCategory,
            'delete-category': options.handleDeleteCategory,
            'add-item': options.handleAddItem,
            'edit-item': options.handleEditItem,
            'delete-item': options.handleDeleteItem,
            'batch-delete': options.handleBatchDelete,
            'batch-move': options.handleBatchMove,
            'show-bookmark-import': options.openBookmarkImport,
            'json-import': options.handleJsonImport,
            'move-category': options.moveCategory,
            'clean-duplicates': options.handleCleanDuplicates
          },
          wrapperClass: 'data-view'
        },
        monitor: {
          component: MonitoringDashboard,
          menuKey: 'monitor',
          icon: 'icon-md-stats',
          requiresAdmin: true,
          wrapperClass: 'monitor-view'
        }
      }) as Record<AdminDashboardViewId, AdminDashboardViewConfig>
  )

  const availableViewIds = computed(() =>
    (['settings', 'users', 'data', 'monitor'] as AdminDashboardViewId[]).filter((id) => {
      const config = viewConfigs.value[id]
      return config && (!config.requiresAdmin || options.isAdmin.value)
    })
  )

  const menuItems = computed(() =>
    availableViewIds.value.map((id) => ({
      id,
      icon: viewConfigs.value[id].icon
    }))
  )

  const resolvedCurrentViewId = computed<AdminDashboardViewId>(() => {
    return availableViewIds.value.includes(currentView.value)
      ? currentView.value
      : availableViewIds.value[0] || 'data'
  })

  watch(
    resolvedCurrentViewId,
    async (viewId) => {
      if (viewId !== currentView.value) {
        currentView.value = viewId
      }

      const onEnter = viewConfigs.value[viewId]?.onEnter
      if (onEnter) {
        await onEnter()
      }
    },
    { immediate: true }
  )

  const currentViewConfig = computed(() => viewConfigs.value[resolvedCurrentViewId.value])

  const currentViewLabel = computed(() => {
    const viewConfig = currentViewConfig.value
    return viewConfig ? options.t(`menu.${viewConfig.menuKey}`) : options.t('admin.dashboard')
  })

  const handleMenuClick = async (id: AdminDashboardViewId) => {
    if (!availableViewIds.value.includes(id)) {
      return
    }

    currentView.value = id
    if (options.isMobile.value) {
      sidebarVisible.value = false
    }
  }

  return {
    currentView,
    sidebarVisible,
    menuItems,
    currentViewConfig,
    currentViewLabel,
    handleMenuClick
  }
}
