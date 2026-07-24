import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Item } from '@/types'
import { selectAppOption } from '../helpers/appSelect'

const mocks = vi.hoisted(() => ({
  checkLinks: vi.fn(),
  confirm: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
  messageError: vi.fn()
}))

const isMobileRef = ref(false)

vi.mock('@/api', () => ({
  toolApi: {
    checkLinks: mocks.checkLinks
  }
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    warning: mocks.messageWarning,
    error: mocks.messageError
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
    isMobile: isMobileRef
  })
}))

const SiteTable = (await import('@/components/SiteTable.vue')).default

const categories = [
  { id: 1, name: 'Docs' },
  { id: 2, name: 'Tools' }
]

const buildItem = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Site ${id}`,
  url: `https://site-${id}.test`,
  description: `Description ${id}`,
  categoryId: id % 2 === 0 ? 2 : 1,
  clickCount: id,
  level: id % 4,
  ...overrides
})

const createWrapper = (items: Item[]) =>
  mount(SiteTable, {
    props: {
      items,
      categories
    }
  })

describe('SiteTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isMobileRef.value = false
    mocks.confirm.mockResolvedValue(undefined)
  })

  it('renders an empty state when there are no rows', () => {
    const wrapper = createWrapper([])

    expect(wrapper.text()).toContain('translated:common.noData')
    expect(wrapper.find('.sn-pagination').exists()).toBe(false)
  })

  it('paginates large lists, changes page size, and sorts by click count', async () => {
    const items = Array.from({ length: 22 }, (_, index) => buildItem(index + 1))
    const wrapper = createWrapper(items)

    expect(wrapper.find('.sn-pagination-meta').text()).toBe('1-20 / 22')

    await wrapper.findAll('.sn-pagination-button')[1].trigger('click')
    await nextTick()

    expect(wrapper.find('.sn-pagination-status').text()).toBe('2 / 2')
    expect(wrapper.find('tbody').text()).toContain('Site 21')

    await selectAppOption(wrapper.find('.page-size-select'), 10)
    await nextTick()

    expect(wrapper.find('.sn-pagination-status').text()).toBe('1 / 3')

    await wrapper.find('.sort-button').trigger('click')
    await nextTick()

    expect(wrapper.find('tbody tr').text()).toContain('Site 22')
  })

  it('selects a page of rows and emits batch move actions', async () => {
    const items = [buildItem(1), buildItem(2), buildItem(3)]
    const wrapper = createWrapper(items)

    await wrapper.find('thead input[type="checkbox"]').setValue(true)
    await nextTick()

    expect(wrapper.find('.selected-count').text()).toContain('3')

    await selectAppOption(wrapper.find('.batch-select'), 2)
    await wrapper.find('.batch-actions-footer .table-action.primary').trigger('click')
    await nextTick()

    expect(wrapper.emitted('batch-move')).toEqual([[[1, 2, 3], 2]])
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:table.moveSuccess')
    expect(wrapper.find('.batch-actions-footer').exists()).toBe(false)
  })

  it('confirms batch deletion and emits the selected row ids', async () => {
    const items = [buildItem(1), buildItem(2)]
    const wrapper = createWrapper(items)

    await wrapper.findAll('tbody input[type="checkbox"]')[0].setValue(true)
    await nextTick()
    await wrapper.find('.batch-actions-footer .table-action.danger').trigger('click')
    await flushPromises()

    expect(mocks.confirm).toHaveBeenCalledWith(
      'table.deleteConfirm:{"count":1}',
      'translated:common.warning',
      expect.objectContaining({
        type: 'warning'
      })
    )
    expect(wrapper.emitted('batch-delete')).toEqual([[[1]]])
  })

  it('checks selected links and renders mixed result badges', async () => {
    const items = [buildItem(1), buildItem(2)]
    mocks.checkLinks.mockResolvedValue([
      { url: items[0].url, status: 'ok' },
      { url: items[1].url, status: 'error' }
    ])

    const wrapper = createWrapper(items)

    await wrapper.find('thead input[type="checkbox"]').setValue(true)
    await nextTick()
    await wrapper.find('.batch-actions-footer .table-action.warning').trigger('click')
    await flushPromises()

    expect(mocks.checkLinks).toHaveBeenCalledWith([items[0].url, items[1].url])
    expect(mocks.messageWarning).toHaveBeenCalledWith('table.checkInvalid:{"count":1}')
    expect(wrapper.find('[aria-label="ok"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="error"]').exists()).toBe(true)
  })

  it('clears pending statuses and reports failures when link checks fail', async () => {
    const items = [buildItem(1)]
    mocks.checkLinks.mockRejectedValue(new Error('check failed'))

    const wrapper = createWrapper(items)

    await wrapper.findAll('tbody input[type="checkbox"]')[0].setValue(true)
    await nextTick()
    await wrapper.find('.batch-actions-footer .table-action.warning').trigger('click')
    await flushPromises()

    expect(mocks.messageError).toHaveBeenCalledWith('translated:table.checkFail')
    expect(wrapper.find('.status-spinner').exists()).toBe(false)
    expect(wrapper.find('[aria-label="ok"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="error"]').exists()).toBe(false)
  })
})
