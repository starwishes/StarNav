import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSuggestions: vi.fn(),
  openUrl: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn()
}))

let adminStoreMock: any
let dataStoreMock: any
let searchBoxFocusMock: ReturnType<typeof vi.fn>
const wrappers: Array<ReturnType<typeof mount>> = []

vi.mock('@/api', () => ({
  toolApi: {
    getSuggestions: mocks.getSuggestions
  }
}))

vi.mock('@/utils', () => ({
  openUrl: mocks.openUrl
}))

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/store/data', () => ({
  useDataStore: () => dataStoreMock
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    warning: mocks.messageWarning
  }
}))

const SearchBoxStub = defineComponent({
  name: 'SearchBox',
  props: ['modelValue', 'searchMode', 'placeholder'],
  emits: ['update:modelValue', 'update:searchMode', 'focus', 'blur', 'enter', 'clear'],
  setup(props, { emit, slots, expose }) {
    expose({
      focus: searchBoxFocusMock
    })

    return () =>
      h('div', { class: 'search-box-stub' }, [
        h('span', { class: 'search-box-placeholder' }, String(props.placeholder)),
        h('input', {
          class: 'search-input-stub',
          value: String(props.modelValue || ''),
          onInput: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLInputElement).value)
        }),
        h('button', { class: 'emit-enter', onClick: () => emit('enter') }, 'enter'),
        h('button', { class: 'emit-clear', onClick: () => emit('clear') }, 'clear'),
        slots['engine-selector']?.()
      ])
  }
})

const SearchEngineSelectorStub = defineComponent({
  name: 'SearchEngineSelector',
  props: ['engines', 'currentEngine', 'searchMode', 'showActions'],
  emits: ['update:searchMode', 'select', 'add', 'edit', 'delete', 'move', 'menu-open-change'],
  setup(props, { emit }) {
    const pickEngineByName = (name: string) =>
      (props.engines as Array<{ id?: string; name: string; url: string }>).find(
        (engine) => engine.name === name
      ) || (props.engines as Array<{ id?: string; name: string; url: string }>)[0]
    const pickGoogle = () => pickEngineByName('Google')
    const currentEngineIndex = () =>
      (props.engines as Array<{ id?: string; name: string; url: string }>).findIndex((engine) => {
        const current = props.currentEngine as { id?: string; name: string; url: string } | null
        if (!current) {
          return false
        }

        if (current.id && engine.id) {
          return current.id === engine.id
        }

        return current.name === engine.name && current.url === engine.url
      })

    return () =>
      h('div', { class: 'search-engine-selector-stub' }, [
        h(
          'span',
          { class: 'current-engine-name' },
          String((props.currentEngine as any)?.name || '')
        ),
        h('span', { class: 'show-actions-flag' }, String(props.showActions)),
        h(
          'button',
          {
            class: 'emit-select-google',
            onClick: () => {
              emit('select', pickGoogle())
              emit('update:searchMode', 'online')
            }
          },
          'select-google'
        ),
        h(
          'button',
          {
            class: 'emit-enable-online',
            onClick: () => emit('update:searchMode', 'online')
          },
          'enable-online'
        ),
        h(
          'button',
          {
            class: 'emit-edit-current-engine',
            onClick: () =>
              emit(
                'edit',
                props.currentEngine,
                currentEngineIndex() > -1 ? currentEngineIndex() : 0
              )
          },
          'edit-current'
        ),
        h(
          'button',
          {
            class: 'emit-engine-menu-open',
            onClick: () => emit('menu-open-change', true)
          },
          'menu-open'
        ),
        h(
          'button',
          {
            class: 'emit-engine-menu-close',
            onClick: () => emit('menu-open-change', false)
          },
          'menu-close'
        ),
        h('button', { class: 'emit-add-engine', onClick: () => emit('add') }, 'add')
      ])
  }
})

const SearchResultsStub = defineComponent({
  name: 'SearchResults',
  props: [
    'searchMode',
    'localResults',
    'suggestions',
    'loading',
    'hasSearched',
    'searchText',
    'activeSuggestionIndex'
  ],
  emits: ['itemClick', 'suggestionClick', 'update:activeSuggestionIndex'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'search-results-stub' }, [
        h('span', { class: 'results-mode' }, String(props.searchMode)),
        h(
          'span',
          { class: 'results-local-count' },
          String((props.localResults as any[])?.length || 0)
        ),
        h(
          'span',
          { class: 'results-suggestion-count' },
          String((props.suggestions as any[])?.length || 0)
        ),
        h(
          'span',
          { class: 'results-first-suggestion' },
          String((props.suggestions as any[])?.[0] || '')
        ),
        h(
          'button',
          {
            class: 'emit-item-click',
            onClick: () => emit('itemClick', (props.localResults as any[])?.[0]?.url)
          },
          'item'
        ),
        h(
          'button',
          {
            class: 'emit-suggestion-click',
            onClick: () => emit('suggestionClick', (props.suggestions as any[])?.[0])
          },
          'suggestion'
        )
      ])
  }
})

const Search = (await import('@/components/index/Search.vue')).default

const flushAsync = async () => {
  await flushPromises()
  await nextTick()
}

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve
  }
}

const createWrapper = () => {
  const wrapper = mount(Search, {
    attachTo: document.body,
    global: {
      stubs: {
        Teleport: true,
        SearchBox: SearchBoxStub,
        SearchEngineSelector: SearchEngineSelectorStub,
        SearchResults: SearchResultsStub
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('Search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    localStorage.clear()
    searchBoxFocusMock = vi.fn()

    adminStoreMock = {
      isAuthenticated: true,
      user: {
        level: 2
      }
    }

    dataStoreMock = {
      initialized: true,
      loading: false,
      items: [
        {
          id: 1,
          name: 'StarNav',
          description: 'Navigation',
          url: 'https://star.test',
          categoryId: 1,
          level: 0
        },
        {
          id: 2,
          name: 'Hidden',
          description: 'Secret',
          url: 'https://hidden.test',
          categoryId: 1,
          level: 3
        }
      ],
      loadData: vi.fn()
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount()
    }
    document.body.innerHTML = ''
  })

  it('performs debounced local search and routes result actions to openUrl', async () => {
    const wrapper = createWrapper()

    expect(wrapper.find('.search-container').classes()).not.toContain('is-overlay-active')
    expect(wrapper.emitted('overlay-active-change')).toEqual([[false]])

    await wrapper.find('.search-input-stub').setValue('star')
    vi.advanceTimersByTime(300)
    await flushAsync()

    expect(dataStoreMock.loadData).not.toHaveBeenCalled()
    expect(wrapper.find('.results-mode').text()).toBe('local')
    expect(wrapper.find('.results-local-count').text()).toBe('1')
    expect(wrapper.find('.search-container').classes()).toContain('is-overlay-active')

    await wrapper.find('.emit-enter').trigger('click')
    await wrapper.find('.emit-item-click').trigger('click')

    expect(mocks.openUrl).toHaveBeenNthCalledWith(1, 'https://star.test')
    expect(mocks.openUrl).toHaveBeenNthCalledWith(2, 'https://star.test')
    expect(wrapper.emitted('overlay-active-change')).toEqual([[false], [true]])

    await wrapper.find('.emit-clear').trigger('click')
    await flushAsync()

    expect(wrapper.find('.search-results-stub').exists()).toBe(false)
    expect(wrapper.find('.search-container').classes()).not.toContain('is-overlay-active')
    expect(wrapper.emitted('overlay-active-change')).toEqual([[false], [true], [false]])
  })

  it('switches to online mode, fetches suggestions, and opens the selected query', async () => {
    mocks.getSuggestions.mockResolvedValue(['gpt 5'])

    const wrapper = createWrapper()
    await wrapper.find('.emit-select-google').trigger('click')
    await flushAsync()

    expect(searchBoxFocusMock).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.search-box-placeholder').text()).toContain('Google')
    expect(wrapper.find('.current-engine-name').text()).toBe('Google')

    await wrapper.find('.search-input-stub').setValue('gpt')
    vi.advanceTimersByTime(300)
    await flushAsync()

    expect(mocks.getSuggestions).toHaveBeenCalledWith(
      'gpt',
      'google',
      expect.objectContaining({
        signal: expect.any(AbortSignal)
      })
    )
    expect(wrapper.find('.results-mode').text()).toBe('online')
    expect(wrapper.find('.results-suggestion-count').text()).toBe('1')
    expect(wrapper.find('.search-container').classes()).toContain('is-overlay-active')
    expect(wrapper.emitted('overlay-active-change')).toEqual([[false], [true]])

    await wrapper.find('.emit-suggestion-click').trigger('click')

    expect(mocks.openUrl).toHaveBeenCalledWith('https://www.google.com/search?q=gpt%205')
  })

  it('re-runs the current keyword immediately when switching from local to online mode', async () => {
    mocks.getSuggestions.mockResolvedValue(['star nav'])

    const wrapper = createWrapper()

    await wrapper.find('.search-input-stub').setValue('star')
    vi.advanceTimersByTime(300)
    await flushAsync()

    await wrapper.find('.emit-select-google').trigger('click')
    await flushAsync()
    await flushAsync()

    expect(mocks.getSuggestions).toHaveBeenCalledWith(
      'star',
      'google',
      expect.objectContaining({
        signal: expect.any(AbortSignal)
      })
    )
    expect(wrapper.find('.results-mode').text()).toBe('online')
    expect(wrapper.find('.results-first-suggestion').text()).toBe('star nav')
  })

  it.each([
    {
      provider: 'bing',
      engine: { id: 'bing', name: 'Bing', url: 'https://cn.bing.com/search?q=' }
    },
    {
      provider: 'duckduckgo',
      engine: { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' }
    }
  ])('routes $provider engines to their own suggestion provider', async ({ provider, engine }) => {
    localStorage.setItem('user_search_engines', JSON.stringify([engine]))
    localStorage.setItem('current_search_engine', JSON.stringify(engine))
    mocks.getSuggestions.mockResolvedValue([`${provider} suggestion`])

    const wrapper = createWrapper()
    await wrapper.find('.emit-enable-online').trigger('click')
    await flushAsync()

    await wrapper.find('.search-input-stub').setValue('star')
    vi.advanceTimersByTime(300)
    await flushAsync()

    expect(mocks.getSuggestions).toHaveBeenCalledWith(
      'star',
      provider,
      expect.objectContaining({
        signal: expect.any(AbortSignal)
      })
    )
    expect(wrapper.find('.results-suggestion-count').text()).toBe('1')
  })

  it('ignores stale suggestion responses when a newer search finishes later', async () => {
    const firstRequest = createDeferred<string[]>()
    const secondRequest = createDeferred<string[]>()
    mocks.getSuggestions
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise)

    const wrapper = createWrapper()
    await wrapper.find('.emit-select-google').trigger('click')
    await flushAsync()

    await wrapper.find('.search-input-stub').setValue('sta')
    vi.advanceTimersByTime(300)
    await flushAsync()

    await wrapper.find('.search-input-stub').setValue('star')
    vi.advanceTimersByTime(300)
    await flushAsync()

    secondRequest.resolve(['starbucks'])
    await flushAsync()

    expect(wrapper.find('.results-first-suggestion').text()).toBe('starbucks')

    firstRequest.resolve(['stale result'])
    await flushAsync()

    expect(wrapper.find('.results-first-suggestion').text()).toBe('starbucks')
  })

  it('does not request suggestions for Brave engines', async () => {
    const engine = { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q=' }
    localStorage.setItem('user_search_engines', JSON.stringify([engine]))
    localStorage.setItem('current_search_engine', JSON.stringify(engine))

    const wrapper = createWrapper()
    await wrapper.find('.emit-enable-online').trigger('click')
    await flushAsync()

    await wrapper.find('.search-input-stub').setValue('star')
    vi.advanceTimersByTime(300)
    await flushAsync()

    expect(mocks.getSuggestions).not.toHaveBeenCalled()
    expect(wrapper.find('.search-results-stub').exists()).toBe(false)
  })

  it('keeps the search layer elevated while the engine menu is open', async () => {
    const wrapper = createWrapper()

    await wrapper.find('.emit-engine-menu-open').trigger('click')
    await flushAsync()

    expect(wrapper.find('.search-container').classes()).toContain('is-overlay-active')
    expect(wrapper.emitted('overlay-active-change')).toEqual([[false], [true]])

    await wrapper.find('.emit-engine-menu-close').trigger('click')
    await flushAsync()

    expect(wrapper.find('.search-container').classes()).not.toContain('is-overlay-active')
    expect(wrapper.emitted('overlay-active-change')).toEqual([[false], [true], [false]])
  })

  it('keeps search results active when focus moves within the search container', async () => {
    const wrapper = createWrapper()

    await wrapper.find('.search-input-stub').setValue('star')
    vi.advanceTimersByTime(300)
    await flushAsync()

    await wrapper.find('.search-input-stub').trigger('blur', {
      relatedTarget: wrapper.find('.emit-enter').element
    })
    vi.advanceTimersByTime(200)
    await flushAsync()

    expect(wrapper.find('.search-results-stub').exists()).toBe(true)
    expect(wrapper.find('.search-container').classes()).toContain('is-overlay-active')
  })

  it('blocks adding more than five search engines', async () => {
    localStorage.setItem(
      'user_search_engines',
      JSON.stringify([
        { name: '百度', url: 'https://www.baidu.com/s?wd=' },
        { name: 'Bing', url: 'https://cn.bing.com/search?q=' },
        { name: 'Google', url: 'https://www.google.com/search?q=' },
        { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
        { name: 'Brave', url: 'https://search.brave.com/search?q=' }
      ])
    )

    const wrapper = createWrapper()
    await wrapper.find('.emit-add-engine').trigger('click')
    await flushAsync()

    expect(mocks.messageWarning).toHaveBeenCalledWith('最多支持 5 个搜索引擎')
    expect(wrapper.text()).not.toContain('添加搜索引擎')
  })

  it('keeps the current engine selected when it is renamed', async () => {
    localStorage.setItem(
      'user_search_engines',
      JSON.stringify([
        { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=' },
        { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=' }
      ])
    )
    localStorage.setItem(
      'current_search_engine',
      JSON.stringify({ id: 'google', name: 'Google', url: 'https://www.google.com/search?q=' })
    )

    const wrapper = createWrapper()
    await wrapper.find('.emit-edit-current-engine').trigger('click')
    await flushAsync()

    const inputs = wrapper.findAll('.engine-form__input')
    await inputs[0].setValue('Google CN')
    await wrapper.find('form').trigger('submit')
    await flushAsync()

    expect(wrapper.find('.current-engine-name').text()).toBe('Google CN')
    expect(JSON.parse(localStorage.getItem('current_search_engine') || '{}')).toEqual(
      expect.objectContaining({
        id: 'google',
        name: 'Google CN',
        url: 'https://www.google.com/search?q='
      })
    )
  })

  it('validates and saves custom search engines through the dialog flow', async () => {
    const wrapper = createWrapper()

    await wrapper.find('.emit-add-engine').trigger('click')
    await flushAsync()

    expect(wrapper.text()).toContain('添加搜索引擎')
    await wrapper.find('form').trigger('submit')
    expect(mocks.messageWarning).toHaveBeenCalledWith('请填写完整信息')

    const inputs = wrapper.findAll('.engine-form__input')
    await inputs[0].setValue('DuckDuckGo')
    await inputs[1].setValue('https://duckduckgo.com/?q=')
    await wrapper.find('form').trigger('submit')
    await flushAsync()

    expect(mocks.messageSuccess).toHaveBeenCalledWith('添加成功')
    expect(JSON.parse(localStorage.getItem('user_search_engines') || '[]')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'DuckDuckGo',
          url: 'https://duckduckgo.com/?q='
        })
      ])
    )

    await wrapper.find('.emit-add-engine').trigger('click')
    await flushAsync()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushAsync()

    expect(wrapper.text()).not.toContain('添加搜索引擎')
  })

  it('normalizes search engine urls and rejects invalid search templates', async () => {
    const wrapper = createWrapper()

    await wrapper.find('.emit-add-engine').trigger('click')
    await flushAsync()

    const inputs = wrapper.findAll('.engine-form__input')
    await inputs[0].setValue('Brave')
    await inputs[1].setValue('search.brave.com/search')
    await wrapper.find('form').trigger('submit')
    await flushAsync()

    expect(mocks.messageWarning).toHaveBeenCalledWith(
      '搜索地址需以查询参数赋值结尾，例如 https://www.google.com/search?q='
    )

    await inputs[1].setValue('duckduckgo.com/?q=')
    await wrapper.find('form').trigger('submit')
    await flushAsync()

    expect(JSON.parse(localStorage.getItem('user_search_engines') || '[]')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Brave',
          url: 'https://duckduckgo.com/?q='
        })
      ])
    )
  })
})
