import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { selectAppOption } from '../helpers/appSelect'

const mocks = vi.hoisted(() => ({
  messageSuccess: vi.fn(),
  messageError: vi.fn()
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    error: mocks.messageError
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

const CategoryTableStub = defineComponent({
  props: ['categories', 'items'],
  emits: ['edit', 'delete', 'move'],
  setup(_props, { emit }) {
    return () =>
      h('div', { class: 'category-table-stub' }, [
        h('button', { class: 'emit-edit-category', onClick: () => emit('edit', { id: 7 }) }),
        h('button', {
          class: 'emit-delete-category',
          onClick: () => emit('delete', { id: 9, name: 'Docs' })
        }),
        h('button', { class: 'emit-move-category', onClick: () => emit('move', 1, 'down') })
      ])
  }
})

const SiteTableStub = defineComponent({
  props: ['items', 'categories'],
  emits: ['edit', 'delete', 'batch-delete', 'batch-move'],
  setup(_props, { emit }) {
    return () =>
      h('div', { class: 'site-table-stub' }, [
        h('button', { class: 'emit-edit-item', onClick: () => emit('edit', { id: 11 }) }),
        h('button', { class: 'emit-delete-item', onClick: () => emit('delete', 12) }),
        h('button', { class: 'emit-batch-delete', onClick: () => emit('batch-delete', [1, 2]) }),
        h('button', { class: 'emit-batch-move', onClick: () => emit('batch-move', [3], 8) }, 'move')
      ])
  }
})

const DataManager = (await import('@/components/admin/DataManager.vue')).default

const createWrapper = (overrides: Record<string, unknown> = {}) =>
  mount(DataManager, {
    props: {
      activeTab: 'categories',
      categories: [
        { id: 1, name: 'Docs' },
        { id: 2, name: 'Tools' }
      ],
      items: [
        { id: 10, name: 'StarNav', url: 'https://star.test', description: '', categoryId: 1 }
      ],
      filteredItems: [
        { id: 10, name: 'StarNav', url: 'https://star.test', description: '', categoryId: 1 }
      ],
      filterCategory: 0,
      searchKeyword: '',
      loadError: '',
      ...overrides
    },
    global: {
      stubs: {
        CategoryTable: CategoryTableStub,
        SiteTable: SiteTableStub
      }
    }
  })

describe('DataManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('switches tabs and forwards category-table actions', async () => {
    const wrapper = createWrapper()
    const tabButtons = wrapper.findAll('.tab-button')

    await tabButtons[1].trigger('click')
    expect(wrapper.emitted('update:activeTab')).toEqual([['items']])

    await wrapper.find('.emit-edit-category').trigger('click')
    await wrapper.find('.emit-delete-category').trigger('click')
    await wrapper.find('.emit-move-category').trigger('click')

    expect(wrapper.emitted('edit-category')).toEqual([[{ id: 7 }]])
    expect(wrapper.emitted('delete-category')).toEqual([[{ id: 9, name: 'Docs' }]])
    expect(wrapper.emitted('move-category')).toEqual([[1, 'down']])
  })

  it('forwards item-tab filter updates and site-table actions', async () => {
    const wrapper = createWrapper({
      activeTab: 'items',
      searchKeyword: 'star',
      filterCategory: 1
    })

    const searchInput = wrapper.find('input[type="search"]')
    await searchInput.setValue('utils')
    await selectAppOption(wrapper.find('.filter-select'), 2)
    await wrapper.find('.clear-button').trigger('click')
    await wrapper.find('.emit-edit-item').trigger('click')
    await wrapper.find('.emit-delete-item').trigger('click')
    await wrapper.find('.emit-batch-delete').trigger('click')
    await wrapper.find('.emit-batch-move').trigger('click')

    expect(wrapper.emitted('update:searchKeyword')).toEqual([['utils'], ['']])
    expect(wrapper.emitted('update:filterCategory')).toEqual([[2]])
    expect(wrapper.emitted('edit-item')).toEqual([[{ id: 11 }]])
    expect(wrapper.emitted('delete-item')).toEqual([[12]])
    expect(wrapper.emitted('batch-delete')).toEqual([[[1, 2]]])
    expect(wrapper.emitted('batch-move')).toEqual([[[3], 8]])
  })

  it('exports the current data as a timestamped backup file', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-13T10:11:12.000Z'))

    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const anchor = document.createElement('a')
    const anchorClick = vi.spyOn(anchor, 'click').mockImplementation(() => {})
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) =>
      tagName === 'a' ? anchor : originalCreateElement(tagName)) as typeof document.createElement)

    const wrapper = createWrapper()
    await wrapper.findAll('.global-actions .action-button')[0].trigger('click')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
    expect(anchor.download).toBe('starnav-backup-2026-04-13T10-11-12.json')
    expect(anchor.href).toBe('blob:test')
    expect(anchorClick).toHaveBeenCalledTimes(1)
    // revokeObjectURL 延迟到 setTimeout(0) 之后执行，规避 Firefox 同 tick 撤销取消下载
    vi.advanceTimersByTime(0)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('manage.exportSuccess')
  })

  it('triggers the hidden file input and emits parsed json imports', async () => {
    class MockFileReader {
      onload: null | ((event: { target: { result: string } }) => void) = null

      readAsText() {
        this.onload?.({
          target: {
            result: JSON.stringify({
              meta: {
                schemaVersion: 1,
                exportedAt: '2026-04-13T10:00:00.000Z',
                categoryCount: 1,
                itemCount: 1
              },
              content: {
                categories: [{ id: 1, name: 'Docs' }],
                items: [
                  {
                    id: 2,
                    name: 'StarNav',
                    url: 'https://star.test',
                    description: '',
                    categoryId: 1
                  }
                ]
              }
            })
          }
        })
      }
    }

    vi.stubGlobal('FileReader', MockFileReader)

    const wrapper = createWrapper()
    const fileInput = wrapper.find('input[type="file"]')
    const inputClick = vi.spyOn(fileInput.element as HTMLInputElement, 'click')

    await wrapper.findAll('.global-actions .action-button')[1].trigger('click')
    expect(inputClick).toHaveBeenCalledTimes(1)

    const inputElement = fileInput.element as HTMLInputElement
    Object.defineProperty(inputElement, 'files', {
      value: [new File(['{}'], 'backup.json', { type: 'application/json' })],
      configurable: true
    })

    await fileInput.trigger('change')

    expect(wrapper.emitted('json-import')).toEqual([
      [
        {
          meta: {
            schemaVersion: 1,
            exportedAt: '2026-04-13T10:00:00.000Z',
            categoryCount: 1,
            itemCount: 1
          },
          content: {
            categories: [{ id: 1, name: 'Docs' }],
            items: [
              {
                id: 2,
                name: 'StarNav',
                url: 'https://star.test',
                description: '',
                categoryId: 1
              }
            ]
          }
        }
      ]
    ])
    expect(mocks.messageSuccess).not.toHaveBeenCalled()
    expect(inputElement.value).toBe('')
  })

  it('reports invalid imports and forwards toolbar actions', async () => {
    class MockFileReader {
      onload: null | ((event: { target: { result: string } }) => void) = null

      readAsText() {
        this.onload?.({
          target: {
            result: '{"broken": true}'
          }
        })
      }
    }

    vi.stubGlobal('FileReader', MockFileReader)

    const wrapper = createWrapper()
    const actionButtons = wrapper.findAll('.global-actions .action-button')

    await actionButtons[2].trigger('click')
    await actionButtons[3].trigger('click')

    expect(wrapper.emitted('show-bookmark-import')).toEqual([[]])
    expect(wrapper.emitted('clean-duplicates')).toEqual([[]])

    const inputElement = wrapper.find('input[type="file"]').element as HTMLInputElement
    Object.defineProperty(inputElement, 'files', {
      value: [new File(['{}'], 'backup.json', { type: 'application/json' })],
      configurable: true
    })

    await wrapper.find('input[type="file"]').trigger('change')

    expect(wrapper.emitted('json-import')).toBeUndefined()
    expect(mocks.messageError).toHaveBeenCalledWith('manage.importFail')
    expect(inputElement.value).toBe('')
  })
})
