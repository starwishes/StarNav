import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticate = vi.fn(function authenticate(req, res, next) {
  next?.()
})
const requireAdmin = vi.fn(function requireAdmin(req, res, next) {
  next?.()
})
const optionalAuth = vi.fn(function optionalAuth(req, res, next) {
  next?.()
})
const loginLimiter = vi.fn(function loginLimiter(req, res, next) {
  next?.()
})
const dataUpdateLimiter = vi.fn(function dataUpdateLimiter(req, res, next) {
  next?.()
})
const faviconLimiter = vi.fn(function faviconLimiter(req, res, next) {
  next?.()
})
const healthLimiter = vi.fn(function healthLimiter(req, res, next) {
  next?.()
})
const clickLimiter = vi.fn(function clickLimiter(req, res, next) {
  next?.()
})

const authController = {
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn()
}

const adminController = {
  getAuditLogs: vi.fn(),
  clearAuditLogs: vi.fn(),
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn()
}

const sessionController = {
  getSessions: vi.fn(),
  revokeOthers: vi.fn(),
  revokeSession: vi.fn()
}

const bookmarkController = {
  getData: vi.fn(),
  saveData: vi.fn(),
  addBookmark: vi.fn(),
  searchBookmarks: vi.fn(),
  checkBookmark: vi.fn(),
  getSimpleCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  reorderCategories: vi.fn(),
  deleteCategory: vi.fn(),
  updateBookmark: vi.fn(),
  moveBookmark: vi.fn(),
  batchMoveBookmarks: vi.fn(),
  batchDeleteBookmarks: vi.fn(),
  deleteBookmark: vi.fn(),
  trackClick: vi.fn()
}

const systemController = {
  getHealth: vi.fn(),
  getPublicSettings: vi.fn(),
  getAdminSettings: vi.fn(),
  updateAdminSettings: vi.fn(),
  setBackground: vi.fn(),
  uploadBackground: vi.fn(),
  uploadIcon: vi.fn(),
  getUploads: vi.fn(),
  deleteUpload: vi.fn()
}

const toolController = {
  getFavicon: vi.fn(),
  getSuggestions: vi.fn(),
  checkLinks: vi.fn()
}

const statsController = {
  recordVisit: vi.fn()
}

vi.mock('../../../src/server/middleware/auth.js', () => ({
  authenticate,
  requireAdmin,
  optionalAuth
}))

vi.mock('../../../src/server/middleware/limiter.js', () => ({
  loginLimiter,
  dataUpdateLimiter,
  faviconLimiter,
  healthLimiter,
  clickLimiter
}))

vi.mock('../../../src/server/controllers/authController.js', () => ({
  authController
}))

vi.mock('../../../src/server/controllers/adminController.js', () => ({
  adminController
}))

vi.mock('../../../src/server/controllers/sessionController.js', () => ({
  sessionController
}))

vi.mock('../../../src/server/controllers/bookmarkController.js', () => ({
  bookmarkController
}))

vi.mock('../../../src/server/controllers/systemController.js', () => ({
  systemController
}))

vi.mock('../../../src/server/controllers/toolController.js', () => ({
  toolController
}))

vi.mock('../../../src/server/controllers/statsController.js', () => ({
  statsController
}))

const authRoutes = (await import('../../../src/server/routes/auth.js')).default
const bookmarkRoutes = (await import('../../../src/server/routes/bookmarks.js')).default
const systemRoutes = (await import('../../../src/server/routes/system.js')).default
const statsRoutes = (await import('../../../src/server/routes/stats.js')).default

const getHandlers = (router, method, path) => {
  const layer = router.stack.find(
    (entry) => entry.route?.path === path && entry.route.methods[method]
  )

  expect(layer, `Missing route ${method.toUpperCase()} ${path}`).toBeTruthy()

  return layer.route.stack.map((entry) => entry.handle)
}

describe('route mounting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wires auth routes with the expected middleware chain', () => {
    expect(getHandlers(authRoutes, 'post', '/login')).toEqual([loginLimiter, authController.login])
    expect(getHandlers(authRoutes, 'post', '/logout')).toEqual([
      authenticate,
      authController.logout
    ])
    expect(getHandlers(authRoutes, 'post', '/register')).toEqual([
      loginLimiter,
      authController.register
    ])
    expect(getHandlers(authRoutes, 'get', '/sessions')).toEqual([
      authenticate,
      sessionController.getSessions
    ])
    expect(getHandlers(authRoutes, 'post', '/sessions/revoke-others')).toEqual([
      authenticate,
      sessionController.revokeOthers
    ])
    expect(getHandlers(authRoutes, 'delete', '/sessions/:sessionId')).toEqual([
      authenticate,
      sessionController.revokeSession
    ])
    expect(getHandlers(authRoutes, 'get', '/admin/audit')).toEqual([
      authenticate,
      requireAdmin,
      adminController.getAuditLogs
    ])
    expect(getHandlers(authRoutes, 'delete', '/admin/audit')).toEqual([
      authenticate,
      requireAdmin,
      adminController.clearAuditLogs
    ])
    expect(getHandlers(authRoutes, 'get', '/admin/users')).toEqual([
      authenticate,
      requireAdmin,
      adminController.getUsers
    ])
    expect(getHandlers(authRoutes, 'post', '/admin/users')).toEqual([
      authenticate,
      requireAdmin,
      adminController.createUser
    ])
    expect(getHandlers(authRoutes, 'patch', '/admin/users/:username')).toEqual([
      authenticate,
      requireAdmin,
      adminController.updateUser
    ])
    expect(getHandlers(authRoutes, 'delete', '/admin/users/:username')).toEqual([
      authenticate,
      requireAdmin,
      adminController.deleteUser
    ])
  })

  it('wires bookmark routes with public and protected middleware correctly', () => {
    expect(getHandlers(bookmarkRoutes, 'get', '/data')).toEqual([
      optionalAuth,
      bookmarkController.getData
    ])
    expect(getHandlers(bookmarkRoutes, 'post', '/data')).toEqual([
      authenticate,
      requireAdmin,
      dataUpdateLimiter,
      bookmarkController.saveData
    ])
    expect(getHandlers(bookmarkRoutes, 'post', '/bookmark')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.addBookmark
    ])
    expect(getHandlers(bookmarkRoutes, 'get', '/bookmark/search')).toEqual([
      authenticate,
      bookmarkController.searchBookmarks
    ])
    expect(getHandlers(bookmarkRoutes, 'get', '/bookmark/check')).toEqual([
      authenticate,
      bookmarkController.checkBookmark
    ])
    expect(getHandlers(bookmarkRoutes, 'get', '/categories/simple')).toEqual([
      authenticate,
      bookmarkController.getSimpleCategories
    ])
    expect(getHandlers(bookmarkRoutes, 'put', '/categories/reorder')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.reorderCategories
    ])
    expect(getHandlers(bookmarkRoutes, 'post', '/category')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.createCategory
    ])
    expect(getHandlers(bookmarkRoutes, 'put', '/category/:id')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.updateCategory
    ])
    expect(getHandlers(bookmarkRoutes, 'delete', '/category/:id')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.deleteCategory
    ])
    expect(getHandlers(bookmarkRoutes, 'post', '/bookmark/batch-move')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.batchMoveBookmarks
    ])
    expect(getHandlers(bookmarkRoutes, 'post', '/bookmark/batch-delete')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.batchDeleteBookmarks
    ])
    expect(getHandlers(bookmarkRoutes, 'put', '/bookmark/:id/move')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.moveBookmark
    ])
    expect(getHandlers(bookmarkRoutes, 'put', '/bookmark/:id')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.updateBookmark
    ])
    expect(getHandlers(bookmarkRoutes, 'delete', '/bookmark/:id')).toEqual([
      authenticate,
      requireAdmin,
      bookmarkController.deleteBookmark
    ])
    expect(getHandlers(bookmarkRoutes, 'post', '/sites/:id/click')).toEqual([
      clickLimiter,
      bookmarkController.trackClick
    ])
  })

  it('wires system routes with public tools and protected admin handlers', () => {
    expect(getHandlers(systemRoutes, 'get', '/health')).toEqual([
      healthLimiter,
      systemController.getHealth
    ])
    expect(getHandlers(systemRoutes, 'get', '/settings')).toEqual([
      systemController.getPublicSettings
    ])
    expect(getHandlers(systemRoutes, 'get', '/admin/settings')).toEqual([
      authenticate,
      requireAdmin,
      systemController.getAdminSettings
    ])
    expect(getHandlers(systemRoutes, 'post', '/admin/settings')).toEqual([
      authenticate,
      requireAdmin,
      systemController.updateAdminSettings
    ])
    expect(getHandlers(systemRoutes, 'post', '/set-background')).toEqual([
      authenticate,
      requireAdmin,
      systemController.setBackground
    ])
    expect(getHandlers(systemRoutes, 'post', '/upload-background')).toEqual([
      authenticate,
      requireAdmin,
      systemController.uploadBackground
    ])
    expect(getHandlers(systemRoutes, 'post', '/upload-icon')).toEqual([
      authenticate,
      requireAdmin,
      systemController.uploadIcon
    ])
    expect(getHandlers(systemRoutes, 'get', '/uploads')).toEqual([
      authenticate,
      requireAdmin,
      systemController.getUploads
    ])
    expect(getHandlers(systemRoutes, 'delete', '/uploads/:filename')).toEqual([
      authenticate,
      requireAdmin,
      systemController.deleteUpload
    ])
    expect(getHandlers(systemRoutes, 'get', '/favicon')).toEqual([
      faviconLimiter,
      toolController.getFavicon
    ])
    expect(getHandlers(systemRoutes, 'get', '/suggest')).toEqual([toolController.getSuggestions])
    expect(getHandlers(systemRoutes, 'post', '/check-links')).toEqual([
      authenticate,
      requireAdmin,
      toolController.checkLinks
    ])
  })

  it('wires stats routes with the expected guards', () => {
    expect(getHandlers(statsRoutes, 'post', '/visit')).toEqual([
      dataUpdateLimiter,
      statsController.recordVisit
    ])
  })
})
