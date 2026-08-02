import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config', () => ({
  Favicon: 'https://favicon.test/?url='
}))

const SearchResults = (await import('@/components/index/SearchResults.vue')).default

const createWrapper = (overrides: Record<string, unknown> = {}) =>
  mount(SearchResults, {
    props: {
      searchMode: 'local',
      localResults: [
        {
          id: 1,
          name: 'StarNav',
          description: 'Navigation',
          url: 'https://star.test',
          categoryId: 7
        }
      ],
      suggestions: [],
      loading: false,
      hasSearched: true,
      searchText: 'star',
      activeSuggestionIndex: -1,
      ...overrides
    },
    global: {
      stubs: {
        AppIcon: true
      }
    }
  })

describe('SearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders local bookmark results and falls back to the default app icon before initials', async () => {
    const wrapper = createWrapper({
      localResults: [
        {
          id: 1,
          name: 'StarNav',
          description: 'Navigation',
          url: 'https://star.test',
          icon: 'https://cdn.test/star.png',
          categoryId: 7
        }
      ]
    })

    expect(wrapper.find('.result-button').exists()).toBe(true)
    expect(wrapper.text()).toContain('StarNav')
    expect(wrapper.find('img.result-avatar').attributes('src')).toBe('https://cdn.test/star.png')

    await wrapper.find('img.result-avatar').trigger('error')
    expect(wrapper.find('img.result-avatar').attributes('src')).toBe(
      'https://star.test/favicon.ico'
    )

    await wrapper.find('img.result-avatar').trigger('error')
    expect(wrapper.find('img.result-avatar').attributes('src')).toBe(
      'https://favicon.test/?url=https://star.test'
    )

    await wrapper.find('img.result-avatar').trigger('error')
    expect(wrapper.find('img.result-avatar').attributes('src')).toBe('/logo.svg?v=2')

    await wrapper.find('img.result-avatar').trigger('error')

    expect(wrapper.find('.result-avatar.placeholder').text()).toBe('S')
  })

  it('skips unusable explicit icon values and falls back to the site favicon chain', () => {
    const wrapper = createWrapper({
      localResults: [
        {
          id: 1,
          name: 'StarNav',
          description: 'Navigation',
          url: 'https://star.test',
          icon: 'icon-md-star',
          categoryId: 7
        }
      ]
    })

    expect(wrapper.find('img.result-avatar').attributes('src')).toBe(
      'https://star.test/favicon.ico'
    )
  })

  it('reuses the default app icon after a missing favicon chain is cached', async () => {
    const firstWrapper = createWrapper({
      localResults: [
        {
          id: 1,
          name: 'StarNav',
          description: 'Navigation',
          url: 'https://star.test',
          icon: 'https://cdn.test/star.png',
          categoryId: 7
        }
      ]
    })

    await firstWrapper.find('img.result-avatar').trigger('error')
    await firstWrapper.find('img.result-avatar').trigger('error')
    await firstWrapper.find('img.result-avatar').trigger('error')
    await firstWrapper.find('img.result-avatar').trigger('error')

    expect(firstWrapper.find('.result-avatar.placeholder').text()).toBe('S')
    firstWrapper.unmount()

    const secondWrapper = createWrapper({
      localResults: [
        {
          id: 1,
          name: 'StarNav',
          description: 'Navigation',
          url: 'https://star.test',
          icon: 'https://cdn.test/star.png',
          categoryId: 7
        }
      ]
    })

    expect(secondWrapper.find('img.result-avatar').exists()).toBe(true)
    expect(secondWrapper.find('img.result-avatar').attributes('src')).toBe('/logo.svg?v=2')
  })

  it('uses the default app icon when no favicon candidate can be resolved', () => {
    const wrapper = createWrapper({
      localResults: [
        {
          id: 1,
          name: 'StarNav',
          description: 'Navigation',
          url: 'not a valid url',
          icon: 'icon-md-star',
          categoryId: 7
        }
      ]
    })

    expect(wrapper.find('img.result-avatar').attributes('src')).toBe('/logo.svg?v=2')
  })

  it('emits local result clicks and online suggestion interactions', async () => {
    const wrapper = createWrapper({
      searchMode: 'online',
      localResults: [],
      suggestions: ['alpha', 'beta'],
      activeSuggestionIndex: 1
    })

    const items = wrapper.findAll('.suggestion-item')
    expect(items).toHaveLength(2)
    expect(items[1].classes()).toContain('active')

    await items[0].trigger('mouseenter')
    await items[0].trigger('click')

    expect(wrapper.emitted('update:activeSuggestionIndex')).toEqual([[0]])
    expect(wrapper.emitted('suggestionClick')).toEqual([['alpha']])
  })

  it('shows empty and loading states under the expected conditions', () => {
    const emptyWrapper = createWrapper({
      localResults: [],
      hasSearched: true,
      searchText: 'missing'
    })

    expect(emptyWrapper.text()).toContain('未找到相关书签')

    const loadingWrapper = createWrapper({
      localResults: [],
      loading: true,
      hasSearched: false,
      searchText: ''
    })

    expect(loadingWrapper.findAll('.loading-row')).toHaveLength(2)
  })
})
