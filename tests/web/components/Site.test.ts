import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { selectAppOption } from '../helpers/appSelect'

const mocks = vi.hoisted(() => ({
  trackClick: vi.fn(),
  openUrl: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  closeContextMenu: vi.fn(),
  handleMouseEnter: vi.fn(),
  handleTouchStart: vi.fn(),
  handleMouseDragUp: vi.fn(),
  togglePin: vi.fn(),
  moveCategory: vi.fn(),
  handleDelete: vi.fn(),
  handleDeleteCategory: vi.fn(),
  enterSelectionMode: vi.fn(),
  toggleSelection: vi.fn(),
  exitSelectionMode: vi.fn(),
  handleBatchMove: vi.fn(),
  handleBatchDelete: vi.fn()
}))

let adminStoreMock: any
let dataStoreMock: any
let loadingRef = ref(false)
let filteredDataRef = ref<any[]>([])
let contextMenuState: any
let moveState: any
let selectionModeRef = ref(false)
let selectedItems = new Set<number>()

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/store/data', () => ({
  useDataStore: () => dataStoreMock
}))

vi.mock('pinia', () => ({
  storeToRefs: () => ({
    loading: loadingRef
  })
}))

vi.mock('@/api', () => ({
  dataApi: {
    trackClick: mocks.trackClick
  }
}))

vi.mock('@/utils', () => ({
  openUrl: mocks.openUrl
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    error: mocks.messageError
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

vi.mock('@/composables', () => ({
  useSiteMenu: () => ({
    contextMenu: contextMenuState,
    showContextMenu: vi.fn(),
    showCategoryContextMenu: vi.fn(),
    closeContextMenu: mocks.closeContextMenu
  }),
  useSiteDrag: () => ({
    moveState,
    handleMouseEnter: mocks.handleMouseEnter,
    handleTouchStart: mocks.handleTouchStart,
    handleMouseDragUp: mocks.handleMouseDragUp
  }),
  useSiteFilter: () => ({
    filteredData: filteredDataRef
  }),
  useContextMenuActions: () => ({
    togglePin: mocks.togglePin,
    moveCategory: mocks.moveCategory,
    isFirstCategory: ref(false),
    isLastCategory: ref(false),
    handleDelete: mocks.handleDelete,
    handleDeleteCategory: mocks.handleDeleteCategory
  }),
  useBatchActions: () => ({
    selectionMode: selectionModeRef,
    selectedItems,
    enterSelectionMode: mocks.enterSelectionMode,
    toggleSelection: mocks.toggleSelection,
    exitSelectionMode: mocks.exitSelectionMode,
    handleBatchMove: mocks.handleBatchMove,
    handleBatchDelete: mocks.handleBatchDelete
  })
}))

const SiteCategoryStub = defineComponent({
  name: 'SiteCategory',
  props: ['category', 'catIndex'],
  emits: [
    'header-click',
    'header-contextmenu',
    'mouseenter',
    'add-item',
    'item-mouseenter',
    'item-click',
    'item-contextmenu',
    'item-touchstart',
    'toggle-selection'
  ],
  setup(props, { emit }) {
    const firstItem = () =>
      (props.category as any)?.content?.[0] || {
        id: 10,
        name: 'StarNav',
        url: 'https://star.test',
        description: '',
        categoryId: (props.category as any)?.id || 0
      }

    return () =>
      h('div', { class: 'site-category-stub' }, [
        h('span', { class: 'category-name' }, String((props.category as any)?.name || '')),
        h(
          'button',
          {
            class: `emit-item-click-${String((props.category as any)?.id || 0)}`,
            onClick: () => emit('item-click', { item: firstItem(), event: new MouseEvent('click') })
          },
          'item'
        )
      ])
  }
})

const SiteDialogStub = defineComponent({
  name: 'SiteDialog',
  props: ['modelValue', 'form', 'categoryForm', 'categories', 'isEdit', 'dialogMode'],
  emits: ['save', 'update:modelValue'],
  setup(props, { emit }) {
    const activeForm = () =>
      props.dialogMode === 'category' || props.dialogMode === 'subcategory'
        ? props.categoryForm
        : props.form

    return () =>
      props.modelValue
        ? h('div', { class: 'site-dialog-stub' }, [
            h('span', { class: 'dialog-mode' }, String(props.dialogMode)),
            h('span', { class: 'dialog-is-edit' }, String(props.isEdit)),
            h('span', { class: 'dialog-form' }, JSON.stringify(activeForm())),
            h(
              'button',
              {
                class: 'emit-save-site',
                onClick: () =>
                  emit('save', {
                    name: 'New Site',
                    url: 'https://new.test',
                    description: '',
                    categoryId: Number((props.form as any)?.categoryId || 0)
                  })
              },
              'save'
            )
          ])
        : h('div', { class: 'site-dialog-stub-closed' }, 'closed')
  }
})

const Site = (await import('@/components/index/Site.vue')).default

const flushAsync = async () => {
  await flushPromises()
  await nextTick()
}

const createWrapper = () =>
  mount(Site, {
    global: {
      stubs: {
        AppIcon: true,
        SiteCard: true,
        SiteCategory: SiteCategoryStub,
        SiteDialog: SiteDialogStub
      }
    }
  })

describe('Site', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadingRef = ref(false)
    filteredDataRef = ref([])
    selectionModeRef = ref(false)
    selectedItems = new Set<number>()
    contextMenuState = reactive({
      visible: false,
      x: 10,
      y: 20,
      item: null,
      category: null,
      catIndex: 0,
      itemIndex: 0
    })
    moveState = reactive({
      active: false,
      item: null,
      y: 0,
      x: 0,
      hoverCategoryId: 0,
      hoverItemIndex: -1
    })

    adminStoreMock = {
      isAuthenticated: true
    }

    dataStoreMock = {
      categories: [
        { id: 7, name: 'Docs', parentId: null },
        { id: 9, name: 'Tools', parentId: null }
      ],
      loadData: vi.fn().mockResolvedValue(undefined),
      addItem: vi.fn().mockResolvedValue(undefined),
      updateItem: vi.fn().mockResolvedValue(undefined)
    }

    mocks.trackClick.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads data on mount, emits loaded, and opens the add-site dialog from the empty state', async () => {
    const wrapper = createWrapper()
    await flushAsync()

    expect(dataStoreMock.loadData).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('loaded')).toHaveLength(1)
    expect(wrapper.find('.empty-action-button').exists()).toBe(true)

    await wrapper.find('.empty-action-button').trigger('click')
    await flushAsync()

    expect(wrapper.find('.dialog-mode').text()).toBe('site')
    expect(wrapper.find('.dialog-is-edit').text()).toBe('false')
    expect(wrapper.find('.dialog-form').text()).toContain('"categoryId":7')
  })

  it('keeps all category sections on a unified tone instead of alternating black and white blocks', async () => {
    filteredDataRef.value = [
      {
        id: 7,
        name: 'Docs',
        content: [],
        children: []
      },
      {
        id: 9,
        name: 'Tools',
        content: [],
        children: []
      }
    ]

    const wrapper = createWrapper()
    await flushAsync()

    const sections = wrapper.findAll('.category-section')
    expect(sections).toHaveLength(2)

    for (const section of sections) {
      expect(section.classes()).not.toContain('tone-light')
      expect(section.classes()).not.toContain('tone-dark')
    }
  })

  it('tracks normal item clicks and short-circuits to drag placement while moving', async () => {
    filteredDataRef.value = [
      {
        id: 7,
        name: 'Docs',
        content: [
          {
            id: 10,
            name: 'StarNav',
            url: 'https://star.test',
            description: '',
            categoryId: 7
          }
        ],
        children: []
      }
    ]

    const wrapper = createWrapper()
    await flushAsync()

    await wrapper.find('.emit-item-click-7').trigger('click')
    await flushAsync()

    expect(mocks.trackClick).toHaveBeenCalledWith(10)
    expect(mocks.openUrl).toHaveBeenCalledWith('https://star.test')

    mocks.trackClick.mockClear()
    mocks.openUrl.mockClear()
    moveState.active = true

    await wrapper.find('.emit-item-click-7').trigger('click')
    await flushAsync()

    expect(mocks.handleMouseDragUp).toHaveBeenCalledTimes(1)
    expect(mocks.trackClick).not.toHaveBeenCalled()
    expect(mocks.openUrl).not.toHaveBeenCalled()
  })

  it('opens category edit mode from the context menu and delegates batch actions', async () => {
    selectionModeRef.value = true
    selectedItems = new Set([1, 2])
    contextMenuState.visible = true
    contextMenuState.category = {
      id: 9,
      name: 'Tools',
      parentId: null
    }

    const wrapper = createWrapper()
    await flushAsync()

    await wrapper.findAll('.context-menu .menu-item')[2].trigger('click')
    await flushAsync()

    expect(wrapper.find('.dialog-mode').text()).toBe('category')
    expect(wrapper.find('.dialog-is-edit').text()).toBe('true')
    expect(wrapper.find('.dialog-form').text()).toContain('"id":9')

    await selectAppOption(wrapper.find('.batch-select'), 9)
    await wrapper.find('.batch-button.is-primary').trigger('click')
    await wrapper.find('.batch-button.is-danger').trigger('click')
    await wrapper.findAll('.batch-button')[2].trigger('click')

    expect(mocks.handleBatchMove).toHaveBeenCalledWith(9)
    expect(mocks.handleBatchDelete).toHaveBeenCalledTimes(1)
    expect(mocks.exitSelectionMode).toHaveBeenCalledTimes(1)
  })

  it('saves new site drafts through the store and reports failures', async () => {
    const wrapper = createWrapper()
    await flushAsync()
    ;(wrapper.vm as any).handleAddItem(9)
    await flushAsync()
    await wrapper.find('.emit-save-site').trigger('click')
    await flushAsync()

    expect(dataStoreMock.addItem).toHaveBeenCalledWith({
      name: 'New Site',
      url: 'https://new.test',
      description: '',
      categoryId: 9
    })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:admin.addSuccess')

    dataStoreMock.addItem.mockRejectedValueOnce(new Error('save failed'))
    ;(wrapper.vm as any).handleAddItem(7)
    await flushAsync()
    await wrapper.find('.emit-save-site').trigger('click')
    await flushAsync()

    expect(mocks.messageError).toHaveBeenCalledWith('save failed')
  })
})
