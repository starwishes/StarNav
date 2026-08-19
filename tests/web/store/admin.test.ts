import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser, User } from '@/types'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  getAdminSettings: vi.fn(),
  updateAdminSettings: vi.fn(),
  getUsers: vi.fn(),
  addUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUser: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminApi: {
    getAdminSettings: mocks.getAdminSettings,
    updateAdminSettings: mocks.updateAdminSettings,
    getUsers: mocks.getUsers,
    addUser: mocks.addUser,
    deleteUser: mocks.deleteUser,
    updateUser: mocks.updateUser
  }
}))

vi.mock('@/api', () => ({
  authApi: {
    login: mocks.login,
    logout: mocks.logout,
    register: mocks.register
  }
}))

import { useAdminStore } from '@/store/admin'

const authUser: AuthUser = {
  login: 'admin',
  name: 'Administrator',
  level: 3
}

describe('admin store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('hydrates persisted auth hints, updates them through setAuth, and clears them', () => {
    localStorage.setItem('admin_user', JSON.stringify(authUser))

    const store = useAdminStore()

    expect(store.token).toBeNull()
    expect(store.user).toEqual(authUser)
    expect(store.isAuthenticated).toBe(true)

    store.setAuth('next-token', { ...authUser, name: 'Renamed' })
    expect(store.token).toBe('next-token')
    expect(JSON.parse(localStorage.getItem('admin_user') || '{}')).toMatchObject({
      name: 'Renamed'
    })

    store.clearAuth()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('admin_user')).toBeNull()
  })

  it('treats corrupt persisted admin_user json as unauthenticated instead of throwing', () => {
    localStorage.setItem('admin_user', '{not valid json')

    const store = useAdminStore()

    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('logs in successfully and maps login failures to auth results', async () => {
    mocks.login.mockResolvedValueOnce({
      token: 'jwt-token',
      user: authUser
    })

    const store = useAdminStore()

    await expect(store.login('admin', 'secret')).resolves.toEqual({ success: true })
    expect(mocks.login).toHaveBeenCalledWith({
      username: 'admin',
      password: 'secret',
      remember: false
    })
    expect(store.token).toBe('jwt-token')
    expect(store.user).toEqual(authUser)
    expect(JSON.parse(localStorage.getItem('admin_user') || '{}')).toMatchObject(authUser)

    mocks.login.mockResolvedValueOnce({
      error: 'bad credentials'
    })
    await expect(store.login('admin', 'wrong')).resolves.toEqual({
      success: false,
      error: 'bad credentials'
    })

    mocks.login.mockRejectedValueOnce(new Error('network failed'))
    await expect(store.login('admin', 'secret')).resolves.toEqual({
      success: false,
      error: 'network failed'
    })
  })

  it('returns success and failure states for registration', async () => {
    const store = useAdminStore()

    mocks.register.mockResolvedValueOnce(undefined)
    await expect(store.register('alice', 'secret')).resolves.toEqual({ success: true })

    mocks.register.mockRejectedValueOnce(new Error('register failed'))
    await expect(store.register('alice', 'secret')).resolves.toEqual({
      success: false,
      error: 'register failed'
    })
  })

  it('clears local auth state after logout even when the request fails', async () => {
    const store = useAdminStore()
    store.setAuth('jwt-token', authUser)

    mocks.logout.mockResolvedValueOnce({ success: true })
    await expect(store.logout()).resolves.toBeUndefined()
    expect(mocks.logout).toHaveBeenCalledTimes(1)
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()

    store.setAuth('jwt-token', authUser)
    mocks.logout.mockRejectedValueOnce(new Error('network failed'))
    await expect(store.logout()).resolves.toBeUndefined()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
  })

  it('passes through settings and user management methods', async () => {
    const store = useAdminStore()
    const settings = { siteName: 'StarNav', registrationEnabled: true }
    const users: User[] = [{ username: 'admin', level: 3 }]

    mocks.getAdminSettings.mockResolvedValueOnce(settings)
    mocks.updateAdminSettings.mockResolvedValueOnce({ success: true })
    mocks.getUsers.mockResolvedValueOnce(users)
    mocks.addUser.mockResolvedValueOnce({ success: true })
    mocks.deleteUser.mockResolvedValueOnce({ success: true })
    mocks.updateUser.mockResolvedValueOnce({ success: true })

    await expect(store.getAdminSettings()).resolves.toEqual(settings)
    await expect(store.updateAdminSettings({ siteName: 'Next' })).resolves.toEqual({
      success: true
    })
    await expect(store.fetchUsers()).resolves.toEqual(users)
    await expect(
      store.addUser({ username: 'alice', password: 'secret', level: 1 })
    ).resolves.toEqual({ success: true })
    await expect(store.deleteUser('alice')).resolves.toEqual({ success: true })
    await expect(store.updateUser('alice', { level: 2 })).resolves.toEqual({ success: true })
  })
})
