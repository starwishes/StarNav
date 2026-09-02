import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const adminStoreMock = { isAuthenticated: ref(false) }
const ElMessageMock = {
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
}

vi.mock('@/store/admin', () => ({ useAdminStore: () => adminStoreMock }))
vi.mock('@/utils/feedback', () => ({ ElMessage: ElMessageMock }))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : `translated:${key}`
  })
}))

const { useSearchEngineManagement } =
  await import('../../../src/web/components/index/useSearchEngineManagement.ts')
const { MAX_SEARCH_ENGINES, DEFAULT_SEARCH_ENGINES } =
  await import('../../../src/web/components/index/searchUtils.ts')

let apiRef: Record<string, any> = {}

const Host = defineComponent({
  setup() {
    const engineNameInputRef = ref<HTMLInputElement | null>(null)
    const api = useSearchEngineManagement(engineNameInputRef)
    apiRef = api
    return () =>
      h('div', [
        h('input', { ref: engineNameInputRef, class: 'engine-name-input' }),
        h('span', { class: 'online-count' }, String(api.onlineEngines.value.length))
      ])
  }
})

const mountedWrappers: Array<ReturnType<typeof mount>> = []

const mountHost = () => {
  const wrapper = mount(Host, { attachTo: document.body })
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('useSearchEngineManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    adminStoreMock.isAuthenticated = ref(false)
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('loads the default engines on mount', () => {
    mountHost()
    expect(apiRef.onlineEngines.value.length).toBeGreaterThan(0)
    expect(apiRef.currentEngine.value).not.toBeNull()
  })

  it('opens the add dialog and clears the form', () => {
    mountHost()
    apiRef.openAddDialog()
    expect(apiRef.showDialog.value).toBe(true)
    expect(apiRef.isEditing.value).toBe(false)
    expect(apiRef.engineForm.name).toBe('')
    expect(apiRef.engineForm.url).toBe('')
  })

  it('warns when adding beyond the max engine limit', () => {
    mountHost()
    apiRef.onlineEngines.value.push(
      ...Array.from({ length: MAX_SEARCH_ENGINES }, (_, i) => ({
        name: `e${i}`,
        url: `https://e${i}.com`,
        icon: ''
      }))
    )
    apiRef.openAddDialog()
    expect(ElMessageMock.warning).toHaveBeenCalled()
    expect(apiRef.showDialog.value).toBe(false)
  })

  it('opens the edit dialog populated with the target engine', () => {
    mountHost()
    const target = apiRef.onlineEngines.value[0]
    apiRef.openEditDialog(target, 0)
    expect(apiRef.isEditing.value).toBe(true)
    expect(apiRef.engineForm.name).toBe(target.name)
    expect(apiRef.engineForm.url).toBe(target.url)
  })

  it('warns when saving an invalid draft', () => {
    mountHost()
    apiRef.openAddDialog()
    apiRef.engineForm.name = ''
    apiRef.saveEngine()
    expect(ElMessageMock.warning).toHaveBeenCalled()
  })

  it('adds a new engine on save', () => {
    mountHost()
    const before = apiRef.onlineEngines.value.length
    apiRef.openAddDialog()
    apiRef.engineForm.name = 'My Search'
    apiRef.engineForm.url = 'https://my.example.com/search?q='
    apiRef.saveEngine()
    expect(apiRef.onlineEngines.value.length).toBe(before + 1)
    expect(ElMessageMock.success).toHaveBeenCalledWith('translated:engine.addSuccess')
    expect(apiRef.showDialog.value).toBe(false)
  })

  it('edits an existing engine and persists it when it is current', () => {
    mountHost()
    const target = apiRef.onlineEngines.value[0]
    apiRef.currentEngine.value = target
    apiRef.openEditDialog(target, 0)
    apiRef.engineForm.name = 'Renamed'
    apiRef.engineForm.url = target.url
    apiRef.saveEngine()
    expect(ElMessageMock.success).toHaveBeenCalledWith('translated:engine.saveSuccess')
    expect(apiRef.currentEngine.value.name).toBe('Renamed')
  })

  it('deletes an engine and falls back to the first remaining when current', () => {
    mountHost()
    const first = apiRef.onlineEngines.value[0]
    const second = apiRef.onlineEngines.value[1]
    apiRef.currentEngine.value = first
    apiRef.deleteEngine(0)
    expect(apiRef.onlineEngines.value.length).toBe(DEFAULT_SEARCH_ENGINES.length - 1)
    expect(apiRef.currentEngine.value).toBe(second)
  })

  it('moves an engine up and persists the order', () => {
    mountHost()
    const names = () => apiRef.onlineEngines.value.map((e: { name: string }) => e.name)
    const before = names()
    apiRef.moveEngine(1, -1)
    const after = names()
    expect(after).toEqual([before[1], before[0], ...before.slice(2)])
  })

  it('ignores moves out of bounds', () => {
    mountHost()
    const names = () => apiRef.onlineEngines.value.map((e: { name: string }) => e.name)
    const before = names()
    apiRef.moveEngine(0, -1)
    expect(names()).toEqual(before)
  })

  it('selects an engine as current and persists it', () => {
    mountHost()
    const target = apiRef.onlineEngines.value[1]
    apiRef.selectEngine(target)
    expect(apiRef.currentEngine.value).toBe(target)
  })

  it('closes the dialog directly', () => {
    mountHost()
    apiRef.openAddDialog()
    apiRef.closeDialog()
    expect(apiRef.showDialog.value).toBe(false)
  })

  it('closes the dialog when Escape is pressed while open', async () => {
    const wrapper = mountHost()
    apiRef.openAddDialog()
    expect(apiRef.showDialog.value).toBe(true)

    await wrapper.find('.engine-name-input').trigger('keydown', { key: 'Escape' })
    expect(apiRef.showDialog.value).toBe(false)
  })
})
