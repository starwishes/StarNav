import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()

  return {
    ...actual,
    defineAsyncComponent: (loader: () => Promise<unknown>) =>
      actual.defineComponent({
        name: 'ResolvedAsyncComponent',
        inheritAttrs: false,
        setup(_props, { attrs, slots }) {
          const resolved = actual.shallowRef<any>(null)
          void loader().then((component) => {
            resolved.value = actual.markRaw((component as any)?.default || component)
          })

          return () => (resolved.value ? actual.h(resolved.value, attrs, slots) : null)
        }
      })
  }
})

const mocks = vi.hoisted(() => ({
  messageSuccess: vi.fn(),
  confirm: vi.fn()
}))

let routerPushMock: ReturnType<typeof vi.fn>
let adminStoreMock: any
let dataStoreMock: any
let loadDataMock: ReturnType<typeof vi.fn>
let fetchUserListMock: ReturnType<typeof vi.fn>
let fetchSettingsMock: ReturnType<typeof vi.fn>
let handleBatchDeleteMock: ReturnType<typeof vi.fn>
let handleBookmarkImportMock: ReturnType<typeof vi.fn>
let handleCleanDuplicatesMock: ReturnType<typeof vi.fn>
let showBookmarkImportRef = ref(false)

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPushMock
  }),
  useRoute: () => ({
    params: {}
  })
}))

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/store/data', () => ({
  useDataStore: () => dataStoreMock
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess
  },
  ElMessageBox: {
    confirm: mocks.confirm
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : `translated:${key}`
  })
}))

vi.mock('@/composables/useMobile', () => ({
  useMobile: () => ({
    isMobile: ref(false)
  })
}))

vi.mock('@/composables/admin/useDataManagement', () => ({
  useDataManagement: () => ({
    categories: ref([]),
    items: ref([]),
    loading: ref(false),
    filteredItems: ref([]),
    categoryDialogVisible: ref(false),
    itemDialogVisible: ref(false),
    isEdit: ref(false),
    categoryForm: ref({}),
    itemForm: ref({}),
    searchKeyword: ref(''),
    activeTab: ref('categories'),
    filterCategory: ref(0),
    loadData: loadDataMock,
    handleAddCategory: vi.fn(),
    handleEditCategory: vi.fn(),
    saveCategory: vi.fn(),
    handleDeleteCategory: vi.fn(),
    moveCategory: vi.fn(),
    handleAddItem: vi.fn(),
    handleEditItem: vi.fn(),
    saveItem: vi.fn(),
    handleDeleteItem: vi.fn(),
    handleBatchDelete: handleBatchDeleteMock,
    handleBatchMove: vi.fn()
  })
}))

vi.mock('@/composables/admin/useUserManagement', () => ({
  useUserManagement: () => ({
    users: ref([]),
    fetchUserList: fetchUserListMock,
    handleUpdateUserLevel: vi.fn(),
    handleAddUser: vi.fn(),
    handleDeleteUser: vi.fn(),
    handleUpdateUser: vi.fn()
  })
}))

vi.mock('@/composables/admin/useSystemSettings', () => ({
  useSystemSettings: () => ({
    systemSettings: ref({ siteName: 'StarNav' }),
    fetchSettings: fetchSettingsMock,
    handleSaveSettings: vi.fn()
  })
}))

vi.mock('@/composables/admin/useImportExport', () => ({
  useImportExport: () => ({
    showBookmarkImport: showBookmarkImportRef,
    handleJsonImport: vi.fn(),
    handleBookmarkImport: handleBookmarkImportMock,
    handleCleanDuplicates: handleCleanDuplicatesMock
  })
}))

const DataManagerStub = defineComponent({
  name: 'DataManager',
  props: ['activeTab'],
  emits: ['clean-duplicates', 'show-bookmark-import'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'data-manager-stub' }, [
        h('span', { class: 'data-manager-active-tab' }, String(props.activeTab)),
        h(
          'button',
          { class: 'emit-clean-duplicates', onClick: () => emit('clean-duplicates') },
          'clean'
        ),
        h(
          'button',
          { class: 'emit-open-bookmark-import', onClick: () => emit('show-bookmark-import') },
          'import'
        )
      ])
  }
})

const SessionManagerStub = defineComponent({
  name: 'SessionManager',
  setup() {
    return () => h('div', { class: 'session-manager-stub' }, 'sessions')
  }
})

const UserTableStub = defineComponent({
  name: 'UserTable',
  props: ['users'],
  setup(props) {
    return () => h('div', { class: 'user-table-stub' }, String((props.users as any[])?.length || 0))
  }
})

const StatsDashboardStub = defineComponent({
  name: 'StatsDashboard',
  setup() {
    return () => h('div', { class: 'stats-dashboard-stub' }, 'stats')
  }
})

const SystemHealthStub = defineComponent({
  name: 'SystemHealth',
  setup() {
    return () => h('div', { class: 'system-health-stub' }, 'health')
  }
})

const AuditLogStub = defineComponent({
  name: 'AuditLog',
  setup() {
    return () => h('div', { class: 'audit-log-stub' }, 'audit')
  }
})

const MonitoringDashboardStub = defineComponent({
  name: 'MonitoringDashboard',
  setup() {
    return () => h('div', { class: 'monitoring-dashboard-stub' }, 'monitor')
  }
})

const SystemSettingsStub = defineComponent({
  name: 'SystemSettings',
  props: ['initialSettings'],
  setup(props) {
    return () =>
      h(
        'div',
        { class: 'system-settings-stub' },
        String((props.initialSettings as any)?.siteName || '')
      )
  }
})

const AdminSidebarStub = defineComponent({
  name: 'AdminSidebar',
  props: ['menuItems', 'currentView'],
  emits: ['logout', 'menu-click', 'close-sidebar'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'admin-sidebar-stub' }, [
        h('span', { class: 'sidebar-current-view' }, String(props.currentView)),
        ...((props.menuItems as Array<{ id: string }>).map((item) =>
          h(
            'button',
            { class: `menu-item-${item.id}`, onClick: () => emit('menu-click', item.id) },
            item.id
          )
        ) || []),
        h('button', { class: 'emit-logout', onClick: () => emit('logout') }, 'logout'),
        h('button', { class: 'emit-close-sidebar', onClick: () => emit('close-sidebar') }, 'close')
      ])
  }
})

const AdminHeaderStub = defineComponent({
  name: 'AdminHeader',
  props: ['currentViewLabel'],
  emits: ['open-sidebar', 'go-home'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'admin-header-stub' }, [
        h('span', { class: 'header-current-view' }, String(props.currentViewLabel)),
        h('button', { class: 'emit-open-sidebar', onClick: () => emit('open-sidebar') }, 'open'),
        h('button', { class: 'emit-go-home', onClick: () => emit('go-home') }, 'home')
      ])
  }
})

const BookmarkImportStub = defineComponent({
  name: 'BookmarkImport',
  props: ['modelValue', 'importAction'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'bookmark-import-stub' }, [
        h('span', { class: 'bookmark-import-open' }, String(props.modelValue)),
        h(
          'button',
          {
            class: 'emit-bookmark-import',
            onClick: () =>
              (props.importAction as ((payload: unknown) => unknown) | undefined)?.({
                items: [],
                categories: []
              })
          },
          'import'
        ),
        h(
          'button',
          { class: 'emit-close-import', onClick: () => emit('update:modelValue', false) },
          'close'
        )
      ])
  }
})

const CategoryDialogStub = defineComponent({ name: 'CategoryDialog', setup: () => () => h('div') })
const SiteDialogStub = defineComponent({ name: 'SiteDialog', setup: () => () => h('div') })
const asMockModule = (component: unknown) => ({
  __esModule: true,
  __isTeleport: false,
  default: component
})

vi.mock('@/components/admin/AdminSidebar.vue', () => asMockModule(AdminSidebarStub))

vi.mock('@/components/admin/AdminHeader.vue', () => asMockModule(AdminHeaderStub))

vi.mock('@/components/admin/DataManager.vue', () => asMockModule(DataManagerStub))

vi.mock('@/components/admin/SessionManager.vue', () => asMockModule(SessionManagerStub))

vi.mock('@/components/admin/UserTable.vue', () => asMockModule(UserTableStub))

vi.mock('@/components/admin/SystemSettings.vue', () => asMockModule(SystemSettingsStub))

vi.mock('@/components/admin/AuditLog.vue', () => asMockModule(AuditLogStub))

vi.mock('@/components/admin/StatsDashboard.vue', () => asMockModule(StatsDashboardStub))

vi.mock('@/components/admin/SystemHealth.vue', () => asMockModule(SystemHealthStub))

vi.mock('@/components/admin/MonitoringDashboard.vue', () => asMockModule(MonitoringDashboardStub))

vi.mock('@/components/admin/BookmarkImport.vue', () => asMockModule(BookmarkImportStub))

vi.mock('@/components/CategoryDialog.vue', () => asMockModule(CategoryDialogStub))

vi.mock('@/components/SiteDialog.vue', () => asMockModule(SiteDialogStub))

const AdminDashboard = (await import('@/views/AdminDashboard.vue')).default

const createWrapper = () => mount(AdminDashboard)
const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    routerPushMock = vi.fn()
    loadDataMock = vi.fn()
    fetchUserListMock = vi.fn()
    fetchSettingsMock = vi.fn()
    handleBatchDeleteMock = vi.fn().mockResolvedValue(undefined)
    handleBookmarkImportMock = vi.fn().mockResolvedValue(0)
    handleCleanDuplicatesMock = vi.fn().mockResolvedValue({ deleted: 2, ids: [11, 22] })
    showBookmarkImportRef = ref(false)

    adminStoreMock = {
      isAuthenticated: true,
      logout: vi.fn().mockResolvedValue(undefined),
      user: {
        login: 'admin',
        level: 3
      }
    }

    dataStoreMock = {
      saveData: vi.fn().mockResolvedValue(undefined),
      loadData: vi.fn().mockResolvedValue(undefined)
    }
    mocks.confirm.mockResolvedValue('confirm')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects unauthenticated users away from the dashboard', async () => {
    adminStoreMock.isAuthenticated = false

    createWrapper()
    await flushUi()

    expect(routerPushMock).toHaveBeenCalledWith('/')
    expect(loadDataMock).not.toHaveBeenCalled()
  })

  it('loads dashboard data for authenticated users and renders the current view', async () => {
    const wrapper = createWrapper()
    await flushUi()

    expect(loadDataMock).toHaveBeenCalledTimes(1)
    expect(fetchSettingsMock).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.system-settings-stub').exists()).toBe(true)
    expect(wrapper.find('.fade-in').exists()).toBe(true)
    expect(wrapper.find('.sidebar-current-view').text()).toBe('settings')
    expect(wrapper.find('.header-current-view').text()).toBe('translated:menu.settings')
    expect(wrapper.find('.admin-overview').exists()).toBe(false)
    expect(wrapper.find('.view-panel').exists()).toBe(false)
  })

  it('hides admin-only menu entries for non-admin users', async () => {
    adminStoreMock.user.level = 1

    const wrapper = createWrapper()
    await flushUi()

    expect(wrapper.find('.menu-item-data').exists()).toBe(true)
    expect(wrapper.find('.menu-item-settings').exists()).toBe(false)
    expect(wrapper.find('.menu-item-users').exists()).toBe(false)
    expect(wrapper.find('.menu-item-monitor').exists()).toBe(false)
    expect(wrapper.find('.sidebar-current-view').text()).toBe('data')
  })

  it('switches through the real admin view config and runs view entry hooks', async () => {
    const wrapper = createWrapper()
    await flushUi()

    await wrapper.find('.menu-item-users').trigger('click')
    await flushUi()

    expect(fetchUserListMock).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.user-table-stub').exists()).toBe(true)
    expect(wrapper.find('.header-current-view').text()).toBe('translated:menu.users')

    await wrapper.find('.menu-item-monitor').trigger('click')
    await flushUi()

    expect(wrapper.find('.monitoring-dashboard-stub').exists()).toBe(true)
    expect(wrapper.find('.sidebar-current-view').text()).toBe('monitor')
    expect(wrapper.find('.header-current-view').text()).toBe('translated:menu.monitor')
  })

  it('switches to the real data view and keeps header actions wired', async () => {
    const wrapper = createWrapper()
    await flushUi()

    await wrapper.find('.menu-item-data').trigger('click')
    await flushUi()

    expect(wrapper.find('.data-manager-stub').exists()).toBe(true)
    expect(wrapper.find('.header-current-view').text()).toBe('translated:menu.dataManage')

    await wrapper.find('.emit-go-home').trigger('click')

    expect(loadDataMock).toHaveBeenCalledTimes(1)
    expect(routerPushMock).toHaveBeenCalledWith('/')
  })

  it('wires bookmark imports through the async import action prop', async () => {
    const wrapper = createWrapper()
    await flushUi()

    await wrapper.find('.menu-item-data').trigger('click')
    await flushUi()

    await wrapper.find('.emit-open-bookmark-import').trigger('click')
    await flushUi()

    expect(wrapper.find('.bookmark-import-open').text()).toBe('true')

    await wrapper.find('.emit-bookmark-import').trigger('click')
    await flushUi()

    expect(handleBookmarkImportMock).toHaveBeenCalledWith({ items: [], categories: [] })
  })

  it('confirms logout, clears auth, redirects home, and shows a success message', async () => {
    const wrapper = createWrapper()
    await flushUi()

    await wrapper.find('.emit-logout').trigger('click')
    await flushUi()

    expect(mocks.confirm).toHaveBeenCalledWith(
      'translated:admin.confirmLogout',
      'translated:common.warning',
      {
        type: 'warning'
      }
    )
    expect(adminStoreMock.logout).toHaveBeenCalledTimes(1)
    expect(routerPushMock).toHaveBeenCalledWith('/')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:admin.logoutMessage')
  })
})
