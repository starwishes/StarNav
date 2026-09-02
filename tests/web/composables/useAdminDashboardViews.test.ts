import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SystemSettings, User } from '@/api'

const routerState = vi.hoisted(() => ({
  params: null as any,
  push: vi.fn()
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  routerState.params = reactive({ view: undefined })
  return {
    useRoute: () => ({ params: routerState.params }),
    useRouter: () => ({ push: routerState.push })
  }
})

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
  loadError: ref(''),
  loadData: vi.fn(),
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

  it('initializes currentView from the route param (deep-link support)', () => {
    routerState.params.view = 'users'

    const views = useAdminDashboardViews(createOptions({ isAdmin: ref(true) }))

    expect(views.currentView.value).toBe('users')
  })

  it('falls back to the default view when the route param is absent or invalid', () => {
    routerState.params.view = 'not-a-view'

    const views = useAdminDashboardViews(createOptions({ isAdmin: ref(true) }))

    expect(views.currentView.value).toBe('settings')
  })

  it('syncs currentView when the route param changes (back/forward navigation)', async () => {
    routerState.params.view = undefined
    const views = useAdminDashboardViews(createOptions({ isAdmin: ref(true) }))
    expect(views.currentView.value).toBe('settings')

    routerState.params.view = 'monitor'
    await nextTick()

    expect(views.currentView.value).toBe('monitor')
  })

  it('pushes the named route when switching to a non-default view', async () => {
    const views = useAdminDashboardViews(createOptions({ isAdmin: ref(true) }))
    routerState.push.mockClear()

    await views.handleMenuClick('users')

    expect(routerState.push).toHaveBeenCalledWith({
      name: 'AdminDashboardView',
      params: { view: 'users' }
    })
    expect(views.currentView.value).toBe('users')
  })

  it('pushes the base route when switching back to the default view', async () => {
    routerState.params.view = 'users'
    const views = useAdminDashboardViews(createOptions({ isAdmin: ref(true) }))
    routerState.push.mockClear()

    await views.handleMenuClick('settings')

    expect(routerState.push).toHaveBeenCalledWith({ name: 'AdminDashboard' })
    expect(views.currentView.value).toBe('settings')
  })
})
