import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SystemSettings, User } from '@/api'

const { useAdminDashboardViews } = await import('@/composables/admin/useAdminDashboardViews')

const createOptions = (overrides = {}) => ({
  t: (key: string) => key,
  isAdmin: ref(false),
  isMobile: ref(false),
  activeTab: ref('categories'),
  searchKeyword: ref(''),
  filterCategory: ref(0),
  categories: ref([]),
  items: ref([]),
  filteredItems: ref([]),
  users: ref<User[]>([]),
  systemSettings: ref<Partial<SystemSettings>>({}),
  fetchUserList: vi.fn(),
  handleUpdateUserLevel: vi.fn(),
  handleAddUser: vi.fn(),
  handleDeleteUser: vi.fn(),
  handleUpdateUser: vi.fn(),
  fetchSettings: vi.fn(),
  handleSaveSettings: vi.fn(),
  handleAddCategory: vi.fn(),
  handleEditCategory: vi.fn(),
  handleDeleteCategory: vi.fn(),
  handleAddItem: vi.fn(),
  handleEditItem: vi.fn(),
  handleDeleteItem: vi.fn(),
  handleBatchDelete: vi.fn(),
  handleBatchMove: vi.fn(),
  moveCategory: vi.fn(),
  handleJsonImport: vi.fn(),
  openBookmarkImport: vi.fn(),
  handleCleanDuplicates: vi.fn(),
  ...overrides
})

describe('useAdminDashboardViews', () => {
  it('hides admin-only views from non-admin users', () => {
    const views = useAdminDashboardViews(createOptions())

    expect(views.menuItems.value.map((item) => item.id)).toEqual(['data'])
  })

  it('runs view onEnter hooks and closes the mobile sidebar on menu changes', async () => {
    const fetchUserList = vi.fn()
    const views = useAdminDashboardViews(
      createOptions({
        isAdmin: ref(true),
        isMobile: ref(true),
        fetchUserList
      })
    )

    views.sidebarVisible.value = true
    await views.handleMenuClick('users')

    expect(fetchUserList).toHaveBeenCalledTimes(1)
    expect(views.currentView.value).toBe('users')
    expect(views.sidebarVisible.value).toBe(false)
  })
})
