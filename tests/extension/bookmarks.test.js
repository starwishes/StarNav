/* global document, window */
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBookmarkController } from '../../clients/extension/popup/modules/bookmarks.js'

const i18n = {
  zh: {
    category: '分类',
    unknownCategory: '未知分类',
    webOnly: '只能添加网页，请切换到普通网页后重试',
    duplicateAlert: '该页面已收藏，无法重复添加',
    infoFetchFailed: '无法获取当前页面信息',
    duplicateWithName: '已存在于“{name}”，添加失败',
    addFailed: '添加失败',
    addSuccess: '添加成功',
    updateSuccess: '更新成功',
    updateFailed: '更新失败',
    invalidUrl: 'URL 无效',
    deleteSuccess: '删除成功',
    deleteFailed: '删除失败',
    confirmDelete: '确定要删除这个书签吗？',
    fillRequired: '请填写必要信息'
  }
}

const renderDom = () => {
  document.body.innerHTML = `
    <div id="addSection" style="display:block"></div>
    <div id="bookmarkList" style="display:block"></div>
    <div id="searchResults" style="display:none"></div>
    <div id="addForm" style="display:none"></div>
    <div id="duplicateWarning" style="display:none"></div>
    <span id="duplicateName"></span>
    <input id="bookmarkName" />
    <input id="bookmarkUrl" />
    <select id="bookmarkCategory"></select>
    <select id="bookmarkLevel"><option value="0">0</option></select>
    <input id="bookmarkDesc" />
    <button id="submitBookmark">保存</button>
    <input id="searchInput" value="" />
  `
}

const getElements = () => ({
  addSection: document.getElementById('addSection'),
  bookmarkList: document.getElementById('bookmarkList'),
  searchResults: document.getElementById('searchResults'),
  addForm: document.getElementById('addForm'),
  duplicateWarning: document.getElementById('duplicateWarning'),
  duplicateName: document.getElementById('duplicateName'),
  bookmarkName: document.getElementById('bookmarkName'),
  bookmarkUrl: document.getElementById('bookmarkUrl'),
  bookmarkCategory: document.getElementById('bookmarkCategory'),
  bookmarkLevel: document.getElementById('bookmarkLevel'),
  bookmarkDesc: document.getElementById('bookmarkDesc'),
  submitBookmark: document.getElementById('submitBookmark'),
  searchInput: document.getElementById('searchInput')
})

describe('browser extension bookmark controller', () => {
  let elements
  let state
  let ui
  let apiRequest
  let loadRecentBookmarks
  let performSearch
  let controller

  beforeEach(() => {
    renderDom()
    elements = getElements()
    state = {
      currentLang: 'zh',
      currentEditingId: null,
      categories: [{ id: 1, name: 'Root' }]
    }
    ui = {
      showLoading: vi.fn(),
      hideLoading: vi.fn(),
      showToast: vi.fn(),
      hideAddForm: vi.fn()
    }
    apiRequest = vi.fn()
    loadRecentBookmarks = vi.fn().mockResolvedValue(undefined)
    performSearch = vi.fn().mockResolvedValue(undefined)
    controller = createBookmarkController({
      apiRequest,
      normalizeUrl: (value) => value,
      elements,
      state,
      i18n,
      ui,
      loadRecentBookmarks,
      performSearch
    })

    global.chrome = {
      tabs: {
        query: vi.fn()
      },
      scripting: {
        executeScript: vi.fn()
      }
    }
    window.confirm = vi.fn(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete global.chrome
    document.body.innerHTML = ''
  })

  it('rejects non-web tabs when trying to add the current page', async () => {
    global.chrome.tabs.query.mockResolvedValue([
      { url: 'chrome://extensions', title: 'Extensions' }
    ])

    await controller.showAddForm()

    expect(ui.showToast).toHaveBeenCalledWith('只能添加网页，请切换到普通网页后重试', 'error')
    expect(elements.addForm.style.display).toBe('none')
  })

  it('prefills duplicate bookmarks from the current tab and shows the duplicate warning', async () => {
    global.chrome.tabs.query.mockResolvedValue([
      { id: 99, url: 'https://example.com', title: 'Example' }
    ])
    global.chrome.scripting.executeScript.mockResolvedValue([
      { result: { description: 'From page' } }
    ])
    apiRequest.mockResolvedValue({
      exists: true,
      item: { id: 42, name: 'Saved', url: 'https://example.com', categoryId: 1, description: '' }
    })

    await controller.showAddForm()

    expect(state.currentEditingId).toBe(42)
    expect(elements.bookmarkName.value).toBe('Saved')
    expect(elements.bookmarkUrl.value).toBe('https://example.com')
    expect(elements.bookmarkDesc.value).toBe('From page')
    expect(elements.duplicateWarning.style.display).toBe('flex')
    expect(elements.duplicateName.textContent).toContain('Saved')
    expect(ui.showToast).toHaveBeenCalledWith('该页面已收藏，无法重复添加', 'error')
    expect(elements.addForm.style.display).toBe('block')
  })

  it('refreshes active search results after deleting from a filtered list', async () => {
    elements.searchInput.value = 'git'
    elements.searchResults.style.display = 'block'

    await controller.handleDelete(7)

    expect(apiRequest).toHaveBeenCalledWith('/bookmark/7', { method: 'DELETE' })
    expect(performSearch).toHaveBeenCalledWith('git')
    expect(loadRecentBookmarks).not.toHaveBeenCalled()
    expect(ui.showToast).toHaveBeenCalledWith('删除成功', 'success')
  })

  it('shows duplicate warnings instead of saving a second bookmark with the same url', async () => {
    elements.bookmarkName.value = 'GitHub'
    elements.bookmarkUrl.value = 'https://github.com'
    elements.bookmarkCategory.innerHTML = '<option value="1">Root</option>'
    elements.bookmarkCategory.value = '1'
    apiRequest.mockResolvedValue({
      exists: true,
      item: { id: 99, name: 'Existing', url: 'https://github.com', categoryId: 1 }
    })

    await controller.submitBookmark()

    expect(elements.submitBookmark.disabled).toBe(false)
    expect(elements.duplicateWarning.style.display).toBe('flex')
    expect(ui.showToast).toHaveBeenCalledWith('已存在于“Root”，添加失败', 'error')
    expect(ui.hideAddForm).not.toHaveBeenCalled()
    expect(loadRecentBookmarks).not.toHaveBeenCalled()
  })

  it('falls back to the unknown-category label for duplicates from removed categories', async () => {
    // 反例分支：existingItem 的 categoryId 不在当前分类列表中
    apiRequest.mockResolvedValue({
      exists: true,
      item: { id: 99, name: 'Orphan', url: 'https://orphan.example.com', categoryId: 999 }
    })

    await controller.showAddFormFromCapture({ url: 'https://orphan.example.com', title: 'O' })

    // openFormForUrl 走存在分支时同样走 getCategoryName 兑底文案
    expect(elements.duplicateWarning.style.display).toBe('flex')
    expect(elements.duplicateName.textContent).toContain('未知分类')
  })

  it('rejects captures without a usable url and ignores http-only safety gap', async () => {
    await controller.showAddFormFromCapture(null)
    await controller.showAddFormFromCapture({ title: 'No url' })

    await controller.showAddFormFromCapture({ url: 'chrome://extensions/x', title: 'X' })

    expect(apiRequest).not.toHaveBeenCalled()
    expect(ui.showToast).lastCalledWith('只能添加网页，请切换到普通网页后重试', 'error')
    expect(ui.showLoading).not.toHaveBeenCalled()
  })

  it('treats captured pages as brand-new bookmarks when they are not saved yet', async () => {
    apiRequest.mockResolvedValue({ exists: false })

    await controller.showAddFormFromCapture({ url: 'https://fresh.example.com', title: '' })

    expect(state.currentEditingId).toBeNull()
    expect(elements.bookmarkName.value).toBe('https://fresh.example.com')
    expect(elements.bookmarkUrl.value).toBe('https://fresh.example.com')
    expect(elements.bookmarkDesc.value).toBe('')
    // 分类下拉无选项时 value 保持空串，但 level 回退默认 0
    expect(elements.bookmarkCategory.value).toBe('')
    expect(elements.bookmarkLevel.value).toBe('0')
    expect(elements.duplicateWarning.style.display).toBe('none')
    expect(elements.addForm.style.display).toBe('block')

    // 无分类可用：新建表单的分类 ID 兑底为空串（成功与检查失败两条路径）
    const savedCategories = state.categories
    state.categories = []

    await controller.showAddFormFromCapture({ url: 'https://nocat.example.com', title: '' })
    expect(elements.bookmarkCategory.value).toBe('')

    vi.spyOn(console, 'warn').mockImplementation(() => {})
    apiRequest.mockRejectedValueOnce(new TypeError('network down'))
    await controller.showAddFormFromCapture({ url: 'https://nocat-fail.example.com', title: '' })
    expect(elements.bookmarkCategory.value).toBe('')
    state.categories = savedCategories
  })

  it('skips duplicate-warning widgets safely when they are absent from the DOM', async () => {
    const bareController = createBookmarkController({
      apiRequest,
      normalizeUrl: (value) => value,
      elements: { ...elements, duplicateWarning: null, duplicateName: null },
      state,
      i18n,
      ui,
      loadRecentBookmarks,
      performSearch
    })
    // 检测到重复书签时，即使警告节点缺失也不应抛错
    apiRequest.mockResolvedValue({
      exists: true,
      item: { id: 42, name: 'Saved', url: 'https://fresh.example.com', categoryId: 1 }
    })

    await bareController.showAddFormFromCapture({ url: 'https://fresh.example.com', title: 'F' })

    expect(state.currentEditingId).toBe(42)
    expect(ui.showToast).toHaveBeenCalledWith('该页面已收藏，无法重复添加', 'error')
    expect(elements.addForm.style.display).toBe('block')
  })

  it('opens the blank form even if the duplication check request fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    apiRequest.mockRejectedValue(new TypeError('network down'))

    // 无标题回退：catch 分支内表单仍以页面 URL 预填名称
    await controller.showAddFormFromCapture({ url: 'https://offline.example.com', title: '' })

    expect(state.currentEditingId).toBeNull()
    expect(elements.bookmarkName.value).toBe('https://offline.example.com')
    expect(elements.bookmarkUrl.value).toBe('https://offline.example.com')
    expect(elements.addForm.style.display).toBe('block')
    expect(ui.hideLoading).toHaveBeenCalled()
  })

  it('ignores edit/delete calls with missing targets instead of hitting the API', async () => {
    await controller.handleEdit(undefined)
    await controller.handleDelete(0)

    expect(apiRequest).not.toHaveBeenCalled()
    expect(ui.showToast).not.toHaveBeenCalled()

    window.confirm = vi.fn(() => false)
    await controller.handleDelete(5)
    expect(window.confirm).toHaveBeenCalledWith('确定要删除这个书签吗？')
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('surfaces API error messages when deletion fails', async () => {
    window.confirm = vi.fn(() => true)
    apiRequest.mockRejectedValueOnce(Object.assign(new Error(), { message: '' }))
    apiRequest.mockRejectedValueOnce(new Error('cannot delete root'))

    await controller.handleDelete(8)
    expect(ui.showToast).toHaveBeenNthCalledWith(1, '删除失败', 'error')

    await controller.handleDelete(8)
    expect(ui.showToast).toHaveBeenNthCalledWith(2, 'cannot delete root', 'error')
    expect(ui.hideLoading).toHaveBeenCalledTimes(2)
  })

  it('validates the add form before calling the check endpoint', async () => {
    elements.bookmarkName.value = 'Missing URL'
    elements.bookmarkUrl.value = '   '
    await controller.submitBookmark()
    expect(ui.showToast).toHaveBeenNthCalledWith(1, 'URL 无效', 'error')
    expect(apiRequest).not.toHaveBeenCalled()

    elements.bookmarkUrl.value = 'https://ok.example.com'
    elements.bookmarkName.value = '   '
    await controller.submitBookmark()
    expect(ui.showToast).toHaveBeenNthCalledWith(2, '请填写必要信息', 'error')
    expect(apiRequest).not.toHaveBeenCalled()

    elements.bookmarkName.value = 'No Category'
    elements.bookmarkCategory.innerHTML = '<option value="">请选择</option>'
    elements.bookmarkCategory.value = ''
    await controller.submitBookmark()
    expect(ui.showToast).toHaveBeenNthCalledWith(3, '请填写必要信息', 'error')
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('posts new bookmarks through the create endpoint and reports success', async () => {
    apiRequest.mockResolvedValue({ exists: false })
    elements.bookmarkName.value = 'GitHub'
    elements.bookmarkUrl.value = 'https://github.com'
    elements.bookmarkDesc.value = 'Dev portal'
    elements.bookmarkLevel.value = '2'
    elements.bookmarkCategory.innerHTML = '<option value="1">Root</option>'
    elements.bookmarkCategory.value = '1'

    await controller.submitBookmark()

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/bookmark/check?url=https%3A%2F%2Fgithub.com')
    expect(apiRequest).toHaveBeenLastCalledWith('/bookmark', {
      method: 'POST',
      body: JSON.stringify({
        name: 'GitHub',
        url: 'https://github.com',
        categoryId: '1',
        description: 'Dev portal',
        minLevel: 0
      })
    })
    expect(state.currentEditingId).toBeNull()
    expect(ui.showToast).toHaveBeenCalledWith('添加成功', 'success')
    expect(ui.hideAddForm).toHaveBeenCalled()
    expect(loadRecentBookmarks).toHaveBeenCalled()
  })

  it('puts edits to the existing endpoint and clears stale warnings', async () => {
    // 预置一个过期警告，编辑提交后应被清除
    elements.duplicateWarning.style.display = 'flex'
    apiRequest.mockResolvedValue({ exists: false })

    await controller.handleEdit({ id: 42, name: '', url: '', description: '', level: 0 })

    elements.bookmarkName.value = 'Renamed'
    elements.bookmarkUrl.value = 'https://moved.example.com'
    elements.bookmarkCategory.innerHTML = '<option value="1">Root</option>'
    elements.bookmarkCategory.value = '1'
    await controller.submitBookmark()

    expect(apiRequest).toHaveBeenLastCalledWith('/bookmark/42', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Renamed',
        url: 'https://moved.example.com',
        categoryId: '1',
        description: '',
        minLevel: 0
      })
    })
    expect(elements.duplicateWarning.style.display).toBe('none')
    expect(ui.showToast).toHaveBeenCalledWith('更新成功', 'success')
  })

  it('falls back to generic failed messages when submitting errors carry no message', async () => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error(), { message: '' }))
    elements.bookmarkName.value = 'A'
    elements.bookmarkUrl.value = 'https://a.example.com'
    elements.bookmarkCategory.innerHTML = '<option value="1">Root</option>'
    elements.bookmarkCategory.value = '1'

    // 新增失败兜底
    await controller.submitBookmark()
    expect(ui.showToast).toHaveBeenNthCalledWith(1, '添加失败', 'error')

    // 编辑失败兜底
    state.currentEditingId = 42
    apiRequest.mockRejectedValueOnce(new TypeError())
    await controller.submitBookmark()
    expect(ui.showToast).toHaveBeenNthCalledWith(2, '更新失败', 'error')
    expect(elements.submitBookmark.disabled).toBe(false)
  })

  it('consumes the pending capture only after a successful save', async () => {
    const onPendingCaptureConsumed = vi.fn()
    controller = createBookmarkController({
      apiRequest,
      normalizeUrl: (value) => value,
      elements,
      state,
      i18n,
      ui,
      loadRecentBookmarks,
      performSearch,
      onPendingCaptureConsumed
    })
    apiRequest.mockResolvedValue({ exists: false })
    elements.bookmarkName.value = 'GitHub'
    elements.bookmarkUrl.value = 'https://github.com'
    elements.bookmarkCategory.innerHTML = '<option value="1">Root</option>'
    elements.bookmarkCategory.value = '1'

    await controller.submitBookmark()

    expect(onPendingCaptureConsumed).toHaveBeenCalledTimes(1)
    expect(loadRecentBookmarks).toHaveBeenCalled()
  })

  it('keeps the pending capture when the save fails', async () => {
    const onPendingCaptureConsumed = vi.fn()
    controller = createBookmarkController({
      apiRequest,
      normalizeUrl: (value) => value,
      elements,
      state,
      i18n,
      ui,
      loadRecentBookmarks,
      performSearch,
      onPendingCaptureConsumed
    })
    apiRequest.mockRejectedValueOnce(Object.assign(new Error(), { message: '' }))
    elements.bookmarkName.value = 'A'
    elements.bookmarkUrl.value = 'https://a.example.com'
    elements.bookmarkCategory.innerHTML = '<option value="1">Root</option>'
    elements.bookmarkCategory.value = '1'

    await controller.submitBookmark()

    // 保存失败不消费待捕获项：内容保留，popup 下次打开仍可重试
    expect(onPendingCaptureConsumed).not.toHaveBeenCalled()
    expect(ui.showToast).toHaveBeenCalledWith('添加失败', 'error')
  })

  it('works when optional status widgets are missing from the popup DOM', async () => {
    const bareController = createBookmarkController({
      apiRequest,
      normalizeUrl: (value) => value,
      elements: { ...elements, duplicateWarning: null, duplicateName: null, submitBookmark: null },
      state,
      i18n,
      ui,
      loadRecentBookmarks,
      performSearch
    })

    // clearDuplicateWarning/showDuplicateWarning/按钮禁用逻辑遇到缺失节点不应抛错
    await bareController.handleEdit({ id: 7, name: '', url: '', description: '', level: 0 })
    apiRequest.mockResolvedValue({ exists: false })
    elements.bookmarkName.value = 'X'
    elements.bookmarkUrl.value = 'https://x.example.com'
    elements.bookmarkCategory.innerHTML = '<option value="1">Root</option>'
    elements.bookmarkCategory.value = '1'
    await bareController.submitBookmark()

    expect(ui.showToast).toHaveBeenCalledWith('更新成功', 'success')
    expect(loadRecentBookmarks).toHaveBeenCalled()
  })

  it('bails out quietly when the active tab exposes no usable page data', async () => {
    global.chrome.tabs.query.mockResolvedValue([])
    await controller.showAddForm()
    expect(ui.showToast).not.toHaveBeenCalled()

    // 标签页无标题：回退空字符串；描述提取结果为空也不影响表单打开
    global.chrome.tabs.query.mockResolvedValue([{ id: 9, url: 'https://blank.example.com' }])
    global.chrome.scripting.executeScript.mockResolvedValue([])
    // 无标题 + 检查请求失败：catch 分支同样能打开表单，名称回退为空
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    apiRequest.mockRejectedValueOnce(new TypeError('network down'))
    await controller.showAddForm()
    expect(elements.bookmarkName.value).toBe('')
    expect(elements.bookmarkUrl.value).toBe('https://blank.example.com')

    global.chrome.scripting.executeScript.mockResolvedValue([])
    apiRequest.mockResolvedValue({ exists: false })
    await controller.showAddForm()

    expect(elements.bookmarkName.value).toBe('')
    expect(elements.bookmarkUrl.value).toBe('https://blank.example.com')
    expect(elements.addForm.style.display).toBe('block')
  })
})
