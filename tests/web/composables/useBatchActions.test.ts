import { beforeEach, describe, expect, it, vi } from 'vitest'

let dataStoreMock: any

const mocks = vi.hoisted(() => ({
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/store/data', () => ({
  useDataStore: () => dataStoreMock
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    error: mocks.messageError
  },
  ElMessageBox: {
    confirm: mocks.confirm
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key
  })
}))

const { useBatchActions } = await import('@/composables/useBatchActions')

describe('useBatchActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataStoreMock = {
      batchMoveItems: vi.fn().mockResolvedValue(undefined),
      batchDeleteItems: vi.fn().mockResolvedValue(undefined)
    }
  })

  it('enters selection mode, toggles items, and exits cleanly', () => {
    const closeContextMenu = vi.fn()
    const composable = useBatchActions(closeContextMenu)

    composable.enterSelectionMode(10)
    expect(composable.selectionMode.value).toBe(true)
    expect(Array.from(composable.selectedItems)).toEqual([10])
    expect(closeContextMenu).toHaveBeenCalledTimes(1)

    composable.toggleSelection({ id: 11 })
    composable.toggleSelection({ id: 10 })
    expect(Array.from(composable.selectedItems)).toEqual([11])

    composable.exitSelectionMode()
    expect(composable.selectionMode.value).toBe(false)
    expect(composable.selectedItems.size).toBe(0)
  })

  it('moves selected items and resets the selection on success', async () => {
    const composable = useBatchActions(vi.fn())
    composable.enterSelectionMode(1)
    composable.toggleSelection({ id: 2 })

    await composable.handleBatchMove(9)

    expect(dataStoreMock.batchMoveItems).toHaveBeenCalledWith([1, 2], 9)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('table.batchMoveSuccess:{"count":2}')
    expect(composable.selectionMode.value).toBe(false)
    expect(composable.selectedItems.size).toBe(0)
  })

  it('shows an error when batch move fails and leaves the selection intact', async () => {
    dataStoreMock.batchMoveItems.mockRejectedValueOnce(new Error('move failed'))

    const composable = useBatchActions(vi.fn())
    composable.enterSelectionMode(7)

    await composable.handleBatchMove(2)

    expect(mocks.messageError).toHaveBeenCalledWith('move failed')
    expect(composable.selectionMode.value).toBe(true)
    expect(Array.from(composable.selectedItems)).toEqual([7])
  })

  it('confirms batch deletion, deletes the selected ids, and ignores cancellation', async () => {
    mocks.confirm.mockResolvedValueOnce('confirm')

    const composable = useBatchActions(vi.fn())
    composable.enterSelectionMode(3)
    composable.toggleSelection({ id: 4 })

    await composable.handleBatchDelete()

    expect(mocks.confirm).toHaveBeenCalledWith(
      'table.deleteConfirm:{"count":2}',
      'table.batchDelete',
      {
        type: 'warning'
      }
    )
    expect(dataStoreMock.batchDeleteItems).toHaveBeenCalledWith([3, 4])
    expect(mocks.messageSuccess).toHaveBeenCalledWith(
      'table.batchDeleteSuccessWithCount:{"count":2}'
    )
    expect(composable.selectedItems.size).toBe(0)

    vi.clearAllMocks()
    mocks.confirm.mockRejectedValueOnce(new Error('cancel'))
    composable.enterSelectionMode(6)

    await composable.handleBatchDelete()

    expect(dataStoreMock.batchDeleteItems).not.toHaveBeenCalled()
    expect(composable.selectionMode.value).toBe(true)
    expect(Array.from(composable.selectedItems)).toEqual([6])
  })
})
