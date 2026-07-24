import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  parseBookmarkHtml: vi.fn(),
  buildBookmarkImportPayload: vi.fn(),
  messageWarning: vi.fn(),
  messageError: vi.fn()
}))

const mountedWrappers: Array<ReturnType<typeof mount>> = []

vi.mock('@/utils/bookmarkImport', () => ({
  parseBookmarkHtml: mocks.parseBookmarkHtml,
  buildBookmarkImportPayload: mocks.buildBookmarkImportPayload
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    warning: mocks.messageWarning,
    error: mocks.messageError
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        'bookmarkImport.previewSummary': `${params?.categories} 个分类，${params?.bookmarks} 个书签`,
        'bookmarkImport.importingTitle': '正在导入...',
        'bookmarkImport.doneTitle': '导入完成',
        'bookmarkImport.resultCopy': `成功导入 ${params?.count} 个书签`,
        'bookmarkImport.emptyWarning': '未找到有效的书签数据',
        'bookmarkImport.parseError': '文件解析失败，请确保是有效的书签文件'
      }

      return messages[key] || key
    }
  })
}))

const BookmarkImport = (await import('@/components/admin/BookmarkImport.vue')).default

const createWrapper = (modelValue = true, props: Record<string, unknown> = {}) => {
  const wrapper = mount(BookmarkImport, {
    props: {
      modelValue,
      importAction: vi.fn().mockResolvedValue(undefined),
      ...props
    },
    global: {
      stubs: {
        teleport: true
      }
    }
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

class SuccessFileReader {
  result: string | ArrayBuffer | null = '<html></html>'
  onload: null | (() => void) = null
  onerror: null | (() => void) = null

  readAsText() {
    this.onload?.()
  }
}

class ErrorFileReader {
  result: string | ArrayBuffer | null = null
  onload: null | (() => void) = null
  onerror: null | (() => void) = null

  readAsText() {
    this.onerror?.()
  }
}

describe('BookmarkImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.stubGlobal('FileReader', SuccessFileReader)
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('opens the file picker, parses bookmarks, and completes the import flow after the async import resolves', async () => {
    let resolveImport: ((count: number) => void) | undefined
    const importAction = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveImport = resolve
        })
    )

    mocks.parseBookmarkHtml.mockReturnValue([
      {
        name: 'Dev',
        selected: true,
        items: [
          { name: 'GitHub', url: 'https://github.com', description: '' },
          { name: 'Vite', url: 'https://vite.dev', description: '' }
        ]
      },
      {
        name: 'Docs',
        selected: true,
        items: [{ name: 'Vue', url: 'https://vuejs.org', description: '' }]
      }
    ])
    mocks.buildBookmarkImportPayload.mockReturnValue({
      categories: ['Dev'],
      items: [
        {
          name: 'GitHub',
          url: 'https://github.com',
          description: '',
          categoryName: 'Dev'
        },
        {
          name: 'Vite',
          url: 'https://vite.dev',
          description: '',
          categoryName: 'Dev'
        }
      ]
    })

    const wrapper = createWrapper(true, { importAction })
    const fileInput = wrapper.find('input[type="file"]')
    const inputClick = vi.spyOn(fileInput.element as HTMLInputElement, 'click')

    await wrapper.find('.upload-dropzone').trigger('click')
    expect(inputClick).toHaveBeenCalledTimes(1)

    const inputElement = fileInput.element as HTMLInputElement
    Object.defineProperty(inputElement, 'files', {
      value: [new File(['<html></html>'], 'bookmarks.html', { type: 'text/html' })],
      configurable: true
    })

    await fileInput.trigger('change')
    await wrapper.vm.$nextTick()

    expect(mocks.parseBookmarkHtml).toHaveBeenCalledWith('<html></html>')
    expect(wrapper.text()).toContain('2 个分类，3 个书签')

    const checkboxes = wrapper.findAll('input.category-checkbox')
    await checkboxes[1].setValue(false)
    await wrapper.find('.dialog-button.primary').trigger('click')

    expect(mocks.buildBookmarkImportPayload).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Dev', selected: true }),
        expect.objectContaining({ name: 'Docs', selected: false })
      ])
    )
    expect(importAction).toHaveBeenCalledWith({
      categories: ['Dev'],
      items: [
        {
          name: 'GitHub',
          url: 'https://github.com',
          description: '',
          categoryName: 'Dev'
        },
        {
          name: 'Vite',
          url: 'https://vite.dev',
          description: '',
          categoryName: 'Dev'
        }
      ]
    })
    expect(wrapper.text()).toContain('正在导入...')

    expect(resolveImport).toBeTypeOf('function')
    resolveImport?.(2)
    await flushPromises()

    expect(wrapper.text()).toContain('导入完成')
    expect(wrapper.text()).toContain('成功导入 2 个书签')
  })

  it('returns to the selection step when the async import fails', async () => {
    mocks.parseBookmarkHtml.mockReturnValue([
      {
        name: 'Dev',
        selected: true,
        items: [{ name: 'GitHub', url: 'https://github.com', description: '' }]
      }
    ])
    mocks.buildBookmarkImportPayload.mockReturnValue({
      categories: ['Dev'],
      items: [{ name: 'GitHub', url: 'https://github.com', description: '', categoryName: 'Dev' }]
    })

    const wrapper = createWrapper(true, {
      importAction: vi.fn().mockRejectedValue(new Error('sync failed'))
    })
    const inputElement = wrapper.find('input[type="file"]').element as HTMLInputElement
    Object.defineProperty(inputElement, 'files', {
      value: [new File(['<html></html>'], 'bookmarks.html', { type: 'text/html' })],
      configurable: true
    })

    await wrapper.find('input[type="file"]').trigger('change')
    await wrapper.vm.$nextTick()
    await wrapper.find('.dialog-button.primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1 个分类，1 个书签')
    expect(wrapper.text()).not.toContain('导入完成')
  })

  it('warns when the parsed bookmark list is empty', async () => {
    mocks.parseBookmarkHtml.mockReturnValue([])

    const wrapper = createWrapper()
    const inputElement = wrapper.find('input[type="file"]').element as HTMLInputElement
    Object.defineProperty(inputElement, 'files', {
      value: [new File(['<html></html>'], 'empty.html', { type: 'text/html' })],
      configurable: true
    })

    await wrapper.find('input[type="file"]').trigger('change')
    await wrapper.vm.$nextTick()

    expect(mocks.messageWarning).toHaveBeenCalledWith('未找到有效的书签数据')
    expect(wrapper.find('.upload-dropzone').exists()).toBe(true)
  })

  it('shows an error when file parsing fails', async () => {
    vi.stubGlobal('FileReader', ErrorFileReader)

    const wrapper = createWrapper()
    const inputElement = wrapper.find('input[type="file"]').element as HTMLInputElement
    Object.defineProperty(inputElement, 'files', {
      value: [new File(['broken'], 'broken.html', { type: 'text/html' })],
      configurable: true
    })

    await wrapper.find('input[type="file"]').trigger('change')
    await wrapper.vm.$nextTick()

    expect(mocks.messageError).toHaveBeenCalledWith('文件解析失败，请确保是有效的书签文件')
  })

  it('closes on backdrop or escape and resets state after the close timeout', async () => {
    vi.useFakeTimers()
    mocks.parseBookmarkHtml.mockReturnValue([
      {
        name: 'Dev',
        selected: true,
        items: [{ name: 'GitHub', url: 'https://github.com', description: '' }]
      }
    ])

    const wrapper = createWrapper()
    const inputElement = wrapper.find('input[type="file"]').element as HTMLInputElement
    Object.defineProperty(inputElement, 'files', {
      value: [new File(['<html></html>'], 'bookmarks.html', { type: 'text/html' })],
      configurable: true
    })

    await wrapper.find('input[type="file"]').trigger('change')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('1 个分类，1 个书签')

    await wrapper.find('.bookmark-import-backdrop').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])

    await wrapper.setProps({ modelValue: false })
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    await wrapper.setProps({ modelValue: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.upload-dropzone').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('1 个分类，1 个书签')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false]])
  })
})
