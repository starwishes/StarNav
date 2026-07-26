import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types'

let dataStoreMock: any
let adminStoreMock: any
let dragApi: ReturnType<typeof import('@/composables/useSiteDrag').useSiteDrag> | null = null
let categoriesRef: Ref<Category[]>

const mocks = vi.hoisted(() => ({
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  messageInfo: vi.fn()
}))

vi.mock('@/store/data', () => ({
  useDataStore: () => dataStoreMock
}))

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    error: mocks.messageError,
    info: mocks.messageInfo,
    closeAll: vi.fn()
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'table.moveSuccess': '移动成功',
        'table.moveFail': '移动失败',
        'context.dragDropClickHint': '拖拽模式：点击目标位置放置书签',
        'context.dragDropReleaseHint': '拖拽模式：拖动到目标位置松手'
      }

      return messages[key] || key
    }
  })
}))

const { useSiteDrag } = await import('@/composables/useSiteDrag')

const Harness = defineComponent({
  name: 'UseSiteDragHarness',
  setup() {
    dragApi = useSiteDrag(categoriesRef)
    return () => h('div', { class: 'site-drag-harness' })
  }
})

const mountedWrappers: Array<ReturnType<typeof mount>> = []

const mountHarness = () => {
  dragApi = null
  const wrapper = mount(Harness)
  mountedWrappers.push(wrapper)
  return {
    wrapper,
    api: dragApi!
  }
}

describe('useSiteDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    categoriesRef = ref<Category[]>([
      { id: 1, name: 'Docs' },
      { id: 2, name: 'Tools' }
    ])
    dataStoreMock = {
      moveItem: vi.fn().mockResolvedValue(undefined)
    }
    adminStoreMock = {
      isAuthenticated: true
    }
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('starts mouse drag mode, tracks hover state, and commits the move on mouse up', async () => {
    const { api } = mountHarness()

    api.startMove(
      {
        id: 11,
        name: 'Docs',
        url: 'https://docs.test',
        description: '',
        categoryId: 1
      },
      0,
      0,
      100,
      120
    )
    api.handleMouseEnter(3, 2)
    // Placement is click-driven (not mouseup) to avoid double-commit on a single click.
    await api.handleMouseDragUp()

    expect(mocks.messageInfo).toHaveBeenCalledWith('拖拽模式：点击目标位置放置书签')
    expect(dataStoreMock.moveItem).toHaveBeenCalledWith(11, 2, 3)
    expect(dataStoreMock.moveItem).toHaveBeenCalledTimes(1)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('移动成功')
    expect(api.moveState.active).toBe(false)
    expect(api.moveState.item).toBeNull()
  })

  it('ignores repeated placement commits while a move request is still in flight', async () => {
    let resolveMove: (() => void) | undefined
    dataStoreMock.moveItem.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveMove = resolve
        })
    )

    const { api } = mountHarness()
    api.startMove(
      {
        id: 12,
        name: 'Slow',
        url: 'https://slow.test',
        description: '',
        categoryId: 1
      },
      0,
      0,
      10,
      20
    )
    api.handleMouseEnter(2, 2)

    const first = api.handleMouseDragUp()
    const second = api.handleMouseDragUp()
    await Promise.resolve()

    expect(dataStoreMock.moveItem).toHaveBeenCalledTimes(1)
    expect(api.moveState.active).toBe(false)

    resolveMove?.()
    await Promise.all([first, second])
    expect(mocks.messageSuccess).toHaveBeenCalledTimes(1)
  })

  it('falls back to the hovered category index when explicit hoverCategoryId is missing', async () => {
    const { api } = mountHarness()

    api.startMove(
      {
        id: 15,
        name: 'Tool',
        url: 'https://tool.test',
        description: '',
        categoryId: 1
      },
      0,
      0,
      50,
      60
    )
    api.moveState.hoverCatIndex = 1
    api.moveState.hoverCategoryId = 0
    api.moveState.hoverItemIndex = 2

    await api.handleMouseDragUp()

    expect(dataStoreMock.moveItem).toHaveBeenCalledWith(15, 2, 2)
  })

  it('reports move failures and ignores drag attempts when the user is not authenticated', async () => {
    dataStoreMock.moveItem.mockRejectedValueOnce(new Error('move failed'))

    const { api } = mountHarness()
    api.startMove(
      {
        id: 20,
        name: 'Fail',
        url: 'https://fail.test',
        description: '',
        categoryId: 1
      },
      0,
      0,
      10,
      20
    )
    api.handleMouseEnter(1, 1)
    await api.handleMouseDragUp()

    expect(mocks.messageError).toHaveBeenCalledWith('move failed')

    adminStoreMock.isAuthenticated = false
    api.startMove(
      {
        id: 21,
        name: 'Blocked',
        url: 'https://blocked.test',
        description: '',
        categoryId: 1
      },
      0,
      0,
      10,
      20
    )
    expect(api.moveState.active).toBe(false)
  })

  it('enters touch drag mode after a long press and moves to the hovered target on touch end', async () => {
    const vibrateMock = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vibrateMock
    })

    const { api } = mountHarness()

    const hoveredElement = document.createElement('div')
    hoveredElement.className = 'site-wrapper'
    hoveredElement.setAttribute('data-cat-index', '1')
    hoveredElement.setAttribute('data-cat-id', '2')
    hoveredElement.setAttribute('data-item-index', '4')
    document.body.appendChild(hoveredElement)
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(hoveredElement)
    })

    api.handleTouchStart(
      {
        touches: [{ clientX: 30, clientY: 40 }]
      } as unknown as TouchEvent,
      {
        id: 30,
        name: 'Touch',
        url: 'https://touch.test',
        description: '',
        categoryId: 1
      },
      0,
      0
    )

    vi.advanceTimersByTime(500)

    expect(vibrateMock).toHaveBeenCalledWith(50)
    expect(api.moveState.active).toBe(true)
    expect(mocks.messageInfo).toHaveBeenCalledWith('拖拽模式：拖动到目标位置松手')

    document.dispatchEvent(
      new TouchEvent('touchmove', {
        touches: [{ clientX: 80, clientY: 90 }] as any,
        cancelable: true
      })
    )
    document.dispatchEvent(new TouchEvent('touchend'))
    await Promise.resolve()

    expect(dataStoreMock.moveItem).toHaveBeenCalledWith(30, 2, 4)
  })
})
