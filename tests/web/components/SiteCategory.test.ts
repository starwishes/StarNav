import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, Item } from '@/types'

vi.mock('@/config', () => ({
  Favicon: 'https://favicon.test/?url='
}))

const SiteCardStub = defineComponent({
  name: 'SiteCard',
  props: ['item', 'faviconUrl', 'selectionMode', 'selected'],
  emits: ['click', 'contextmenu', 'toggle-select', 'touchstart'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: `site-card-stub site-card-${String((props.item as any).id)}` }, [
        h('span', { class: `favicon-${String((props.item as any).id)}` }, String(props.faviconUrl)),
        h('span', { class: `selected-${String((props.item as any).id)}` }, String(props.selected)),
        h(
          'button',
          {
            class: `emit-click-${String((props.item as any).id)}`,
            onClick: () => emit('click', new MouseEvent('click'))
          },
          'click'
        ),
        h(
          'button',
          {
            class: `emit-contextmenu-${String((props.item as any).id)}`,
            onClick: () => emit('contextmenu', new MouseEvent('contextmenu'))
          },
          'context'
        ),
        h(
          'button',
          {
            class: `emit-touchstart-${String((props.item as any).id)}`,
            onClick: () => emit('touchstart', new Event('touchstart'))
          },
          'touch'
        ),
        h(
          'button',
          {
            class: `emit-toggle-select-${String((props.item as any).id)}`,
            onClick: () => emit('toggle-select')
          },
          'toggle'
        )
      ])
  }
})

const SiteCategory = (await import('@/components/index/SiteCategory.vue')).default

const buildItem = (id: number, categoryId: number, name = `Site ${id}`) => ({
  id,
  name,
  url: `https://site-${id}.test`,
  description: `Description ${id}`,
  categoryId
})

const createWrapper = (
  category: Category,
  moveState: Partial<Record<string, unknown>> = {},
  selectedCategoryId: number | null = null
) =>
  mount(SiteCategory, {
    props: {
      category,
      catIndex: 0,
      selectedCategoryId,
      moveState: {
        active: false,
        item: null,
        hoverCategoryId: 0,
        hoverItemIndex: -1,
        ...moveState
      },
      selectionMode: true,
      selectedItems: new Set<number>([101])
    },
    global: {
      stubs: {
        SiteCard: SiteCardStub
      }
    }
  })

describe('SiteCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to the first child tab and preserves the child category id in forwarded events', async () => {
    const wrapper = createWrapper({
      id: 10,
      name: 'Parent',
      content: [],
      children: [
        {
          id: 11,
          name: 'Docs',
          content: [buildItem(101, 11, 'Docs Site')],
          children: []
        },
        {
          id: 12,
          name: 'Tools',
          content: [buildItem(102, 12, 'Tools Site')],
          children: []
        }
      ]
    })

    const siteRow = wrapper.find('.site-wrapper')
    expect(wrapper.findAll('.site-wrapper')).toHaveLength(1)
    expect(siteRow.attributes('data-cat-id')).toBe('11')
    expect(wrapper.find('.selected-101').text()).toBe('true')

    await siteRow.trigger('mouseenter')
    await wrapper.find('.emit-click-101').trigger('click')
    await wrapper.find('.emit-contextmenu-101').trigger('click')
    await wrapper.find('.emit-touchstart-101').trigger('click')
    await wrapper.find('.emit-toggle-select-101').trigger('click')

    expect(wrapper.emitted('item-mouseenter')).toEqual([[{ itemIndex: 0, categoryId: 11 }]])
    const clickPayload = wrapper.emitted('item-click')?.[0]?.[0] as
      | { item: Item & { realCategoryId: number } }
      | undefined
    const contextPayload = wrapper.emitted('item-contextmenu')?.[0]?.[0] as
      | { item: Item & { realCategoryId: number } }
      | undefined
    const touchPayload = wrapper.emitted('item-touchstart')?.[0]?.[0] as
      | { categoryId: number }
      | undefined
    const selectionPayload = wrapper.emitted('toggle-selection')?.[0]?.[0] as
      | (Item & { realCategoryId: number })
      | undefined

    expect(clickPayload?.item.realCategoryId).toBe(11)
    expect(contextPayload?.item.realCategoryId).toBe(11)
    expect(touchPayload?.categoryId).toBe(11)
    expect(selectionPayload?.realCategoryId).toBe(11)
  })

  it('aggregates branch items on the comprehensive tab and switches to specific child tabs', async () => {
    const wrapper = createWrapper(
      {
        id: 10,
        name: 'Parent',
        content: [buildItem(100, 10, 'Parent Site')],
        children: [
          {
            id: 11,
            name: 'Docs',
            content: [buildItem(101, 11, 'Docs Site')],
            children: [
              {
                id: 13,
                name: 'API',
                content: [buildItem(103, 13, 'API Site')],
                children: []
              }
            ]
          },
          {
            id: 12,
            name: 'Tools',
            content: [buildItem(102, 12, 'Tools Site')],
            children: []
          }
        ]
      },
      {
        active: true,
        item: { id: 999 },
        hoverCategoryId: 13,
        // Category-local index (API is the only item in cat 13), not display index.
        hoverItemIndex: 0
      }
    )

    const rows = wrapper.findAll('.site-wrapper')
    expect(rows).toHaveLength(4)
    expect(rows[2].attributes('data-cat-id')).toBe('13')
    expect(rows[2].attributes('data-item-index')).toBe('0')
    expect(rows[2].classes()).toContain('moving-target')

    await wrapper.findAll('.tab-item')[2].trigger('click')
    await nextTick()

    expect(wrapper.findAll('.site-wrapper')).toHaveLength(1)
    expect(wrapper.find('.site-wrapper').attributes('data-cat-id')).toBe('12')

    await wrapper.findAll('.tab-item')[1].trigger('contextmenu')
    const headerContextPayload = wrapper.emitted('header-contextmenu')?.[0]?.[0] as
      | { category: Category }
      | undefined
    expect(headerContextPayload?.category.id).toBe(11)
  })

  it('activates the matching child tab when the sidebar selects a subcategory', async () => {
    const wrapper = createWrapper(
      {
        id: 10,
        name: 'Parent',
        content: [buildItem(100, 10, 'Parent Site')],
        children: [
          {
            id: 11,
            name: 'Docs',
            content: [buildItem(101, 11, 'Docs Site')],
            children: []
          },
          {
            id: 12,
            name: 'Tools',
            content: [buildItem(102, 12, 'Tools Site')],
            children: []
          }
        ]
      },
      {},
      12
    )

    await nextTick()

    expect(wrapper.findAll('.site-wrapper')).toHaveLength(1)
    expect(wrapper.find('.site-wrapper').attributes('data-cat-id')).toBe('12')
    expect(wrapper.findAll('.tab-item')[2].classes()).toContain('active')
  })
})
