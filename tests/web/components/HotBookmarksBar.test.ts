import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const HotBookmarksBar = (await import('@/components/index/HotBookmarksBar.vue')).default

const bookmarks = [
  { id: 1, name: 'Docs', url: 'https://docs.test', description: '', categoryId: 1, clickCount: 12 },
  { id: 2, name: 'Tools', url: 'https://tools.test', description: '', categoryId: 1, clickCount: 7 }
]

describe('HotBookmarksBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing while loading or when there are no bookmarks', () => {
    const loadingWrapper = mount(HotBookmarksBar, {
      props: {
        topBookmarks: bookmarks,
        loading: true
      }
    })
    const emptyWrapper = mount(HotBookmarksBar, {
      props: {
        topBookmarks: [],
        loading: false
      }
    })

    expect(loadingWrapper.html()).toBe('<!--v-if-->')
    expect(emptyWrapper.html()).toBe('<!--v-if-->')
  })

  it('renders ranks and emits the clicked bookmark payload', async () => {
    const wrapper = mount(HotBookmarksBar, {
      props: {
        topBookmarks: bookmarks,
        loading: false
      }
    })

    expect(wrapper.text()).toContain('热门访问')
    expect(wrapper.findAll('.hot-rank')[0].text()).toBe('1')
    expect(wrapper.findAll('.hot-count')[1].text()).toBe('7')

    await wrapper.findAll('.hot-bookmark-item')[1].trigger('click')

    expect(wrapper.emitted('item-click')?.[0]?.[0]).toEqual(bookmarks[1])
  })
})
