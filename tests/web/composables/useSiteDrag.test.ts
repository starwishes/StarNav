import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types'
import { ApiClientError } from '@/api/client'

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

  it('commits a drop onto the virtual uncategorized slot (categoryId 0)', async () => {
    // 第 25 轮盲审 M3：未分类虚拟分类 id=0 是合法 move 目标，此前被 finalTargetId>0
    // 判定为"无落点"静默 no-op。handleMouseEnter(itemIndex, categoryId=0) 表示指针停在
    // 未分类条目槽上，应触发 categoryId=0 的移动。
    const { api } = mountHarness()

    api.startMove(
      {
        id: 21,
        name: 'FromDocs',
        url: 'https://docs.test',
        description: '',
        categoryId: 2
      },
      1,
      0,
      100,
      120
    )
    api.handleMouseEnter(0, 0)
    await api.handleMouseDragUp()

    expect(dataStoreMock.moveItem).toHaveBeenCalledWith(21, 0, 0)
    expect(dataStoreMock.moveItem).toHaveBeenCalledTimes(1)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('移动成功')
  })

  it('does not double-toast move failures and ignores drag attempts when unauthenticated', async () => {
    // 失败 toast 由 store moveItem 统一上屏（本测试 mock 了 store，故 composable 空吞不弹）；
    // 此处断言"不重复弹"——真正提示职责在 store（data.test 覆盖）（第 29 轮盲审 L2）
    dataStoreMock.moveItem.mockRejectedValueOnce(new ApiClientError('move failed', 400))

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

    expect(dataStoreMock.moveItem).toHaveBeenCalledWith(20, 1, 1)
    expect(mocks.messageError).not.toHaveBeenCalled()

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
