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
    duplicateIn: '已存在于',
    addFailed: '添加失败',
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
    expect(ui.showToast).toHaveBeenCalledWith('添加失败: 已存在于 "Root"', 'error')
    expect(ui.hideAddForm).not.toHaveBeenCalled()
    expect(loadRecentBookmarks).not.toHaveBeenCalled()
  })
})
