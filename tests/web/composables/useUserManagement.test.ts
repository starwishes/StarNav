import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '@/api/client'

const mocks = vi.hoisted(() => ({
  fetchUsers: vi.fn(),
  addUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUser: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn()
}))

vi.mock('@/store/admin', () => ({
  useAdminStore: () => ({
    fetchUsers: mocks.fetchUsers,
    addUser: mocks.addUser,
    deleteUser: mocks.deleteUser,
    updateUser: mocks.updateUser,
    setAuth: vi.fn(),
    token: null,
    user: null
  })
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    error: mocks.messageError
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const { useUserManagement } = await import('@/composables/admin/useUserManagement')

const flushAsync = async () => {
  await Promise.resolve()
}

describe('useUserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and stores the user list', async () => {
    mocks.fetchUsers.mockResolvedValue([{ username: 'alice', level: 1 }])

    const { users, fetchUserList } = useUserManagement()
    await fetchUserList()

    expect(mocks.fetchUsers).toHaveBeenCalledTimes(1)
    expect(users.value).toEqual([{ username: 'alice', level: 1 }])
  })

  it('adds a user, shows success feedback, and refreshes the list', async () => {
    mocks.addUser.mockResolvedValue({ success: true })
    mocks.fetchUsers.mockResolvedValue([{ username: 'bob', level: 2 }])

    const { handleAddUser } = useUserManagement()
    await handleAddUser({ username: 'bob', password: 'secret', level: 2 })
    await flushAsync()

    expect(mocks.addUser).toHaveBeenCalledWith({
      username: 'bob',
      password: 'secret',
      level: 2
    })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:admin.addSuccess')
    expect(mocks.fetchUsers).toHaveBeenCalledTimes(1)
  })

  it('shows an error when deleting a user fails', async () => {
    mocks.deleteUser.mockResolvedValue({ success: false, error: 'delete failed' })

    const { handleDeleteUser } = useUserManagement()
    await handleDeleteUser('bob')

    expect(mocks.deleteUser).toHaveBeenCalledWith('bob')
    expect(mocks.messageError).toHaveBeenCalledWith('delete failed')
    expect(mocks.fetchUsers).not.toHaveBeenCalled()
  })

  it('surfaces thrown API errors when adding a user', async () => {
    // 服务端业务性拒绝以 ApiClientError 抛出（client.ts 封装非 2xx），message 上屏
    mocks.addUser.mockRejectedValue(new ApiClientError('密码不满足要求', 400))

    const { handleAddUser } = useUserManagement()
    await handleAddUser({ username: 'bob', password: 'weak', level: 1 })

    expect(mocks.messageError).toHaveBeenCalledWith('密码不满足要求')
    expect(mocks.fetchUsers).not.toHaveBeenCalled()
  })

  it('falls back to the localized toast for network-layer errors', async () => {
    // 网络层原生 Error（Failed to fetch 等）不回显原文，走调用方 i18n fallback
    mocks.addUser.mockRejectedValue(new TypeError('Failed to fetch'))

    const { handleAddUser } = useUserManagement()
    await handleAddUser({ username: 'bob', password: 'secret', level: 1 })

    expect(mocks.messageError).toHaveBeenCalledWith('translated:admin.operationFailed')
    expect(mocks.fetchUsers).not.toHaveBeenCalled()
  })

  it('sends newUsername when updating a user', async () => {
    mocks.updateUser.mockResolvedValue({ success: true })
    mocks.fetchUsers.mockResolvedValue([])

    const { handleUpdateUser } = useUserManagement()
    await handleUpdateUser('alice', { newUsername: 'alice2', password: 'Secret1!' })

    expect(mocks.updateUser).toHaveBeenCalledWith('alice', {
      newUsername: 'alice2',
      password: 'Secret1!'
    })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:admin.updateSuccess')
  })
})
