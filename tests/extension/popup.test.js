/* global document */
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  initApi: vi.fn(),
  apiRequest: vi.fn(),
  normalizeUrl: vi.fn((value) => value),
  getStorage: vi.fn(),
  setStorage: vi.fn(),
  getMergedStorage: vi.fn(),
  removeStorage: vi.fn(),
  openOptionsPage: vi.fn(),
  bookmarkShowAddForm: vi.fn(),
  bookmarkShowAddFormFromCapture: vi.fn(),
  bookmarkSubmitBookmark: vi.fn(),
  bookmarkHandleEdit: vi.fn(),
  bookmarkHandleDelete: vi.fn(),
  categoryLoadCategories: vi.fn(),
  categoryShowCategoryModal: vi.fn(),
  categoryHideCategoryModal: vi.fn(),
  categoryCreateCategory: vi.fn(),
  searchLoadRecentBookmarks: vi.fn(),
  searchPerformSearch: vi.fn(),
  searchHandleSearchInput: vi.fn(),
  searchClearSearch: vi.fn(),
  uiUpdateUI: vi.fn(),
  uiShowNotConnected: vi.fn(),
  uiShowMainContent: vi.fn(),
  uiHideAddForm: vi.fn(),
  popupState: null,
  authErrorCallback: null
}))

const renderDom = () => {
  document.body.innerHTML = `
    <button id="openSettings"></button>
    <button id="i18nToggle"></button>
    <input id="searchInput" />
    <button id="clearSearch"></button>
    <button id="addCurrentBtn"></button>
    <button id="cancelAdd"></button>
    <button id="submitBookmark"></button>
    <button id="openSite"></button>
    <button id="addCategoryBtn"></button>
    <button id="closeCategoryModal"></button>
    <button id="submitCategory"></button>
    <div id="mainContent"></div>
    <div id="bookmarkList"></div>
    <div id="searchResults"></div>
    <div id="recentBookmarks"></div>
    <div id="addSection"></div>
    <div id="addForm"></div>
    <div id="notConnected"></div>
    <div id="loading"></div>
    <select id="bookmarkCategory"></select>
    <div id="duplicateWarning"></div>
    <span id="duplicateName"></span>
    <input id="bookmarkName" />
    <input id="bookmarkUrl" />
    <select id="bookmarkLevel"></select>
    <input id="bookmarkDesc" />
    <div id="categoryModal"></div>
    <input id="newCategoryName" />
    <select id="newCategoryParent"></select>
    <select id="newCategoryLevel"></select>
    <button id="toast"></button>
  `
}

const getElements = () => ({
  mainContent: document.getElementById('mainContent'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  searchResults: document.getElementById('searchResults'),
  bookmarkList: document.getElementById('bookmarkList'),
  recentBookmarks: document.getElementById('recentBookmarks'),
  addSection: document.getElementById('addSection'),
  addCurrentBtn: document.getElementById('addCurrentBtn'),
  addForm: document.getElementById('addForm'),
  cancelAdd: document.getElementById('cancelAdd'),
  bookmarkName: document.getElementById('bookmarkName'),
  bookmarkUrl: document.getElementById('bookmarkUrl'),
  bookmarkCategory: document.getElementById('bookmarkCategory'),
  bookmarkLevel: document.getElementById('bookmarkLevel'),
  bookmarkDesc: document.getElementById('bookmarkDesc'),
  submitBookmark: document.getElementById('submitBookmark'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  categoryModal: document.getElementById('categoryModal'),
  closeCategoryModal: document.getElementById('closeCategoryModal'),
  newCategoryName: document.getElementById('newCategoryName'),
  newCategoryParent: document.getElementById('newCategoryParent'),
  newCategoryLevel: document.getElementById('newCategoryLevel'),
  submitCategory: document.getElementById('submitCategory'),
  duplicateWarning: document.getElementById('duplicateWarning'),
  duplicateName: document.getElementById('duplicateName'),
  i18nToggle: document.getElementById('i18nToggle'),
  toast: document.getElementById('toast'),
  openSite: document.getElementById('openSite'),
  openSettings: document.getElementById('openSettings'),
  notConnected: document.getElementById('notConnected'),
  loading: document.getElementById('loading')
})

vi.mock('../../clients/extension/utils/url.js', () => ({
  normalizeUrl: (...args) => mocks.normalizeUrl(...args)
}))

vi.mock('../../clients/extension/utils/api.js', () => ({
  initApi: (...args) => mocks.initApi(...args),
  apiRequest: (...args) => mocks.apiRequest(...args)
}))

vi.mock('../../clients/extension/popup/modules/storage.js', () => ({
  getStorage: (...args) => mocks.getStorage(...args),
  setStorage: (...args) => mocks.setStorage(...args),
  getMergedStorage: (...args) => mocks.getMergedStorage(...args),
  removeStorage: (...args) => mocks.removeStorage(...args)
}))

vi.mock('../../clients/extension/popup/modules/ui.js', () => ({
  openOptionsPage: (...args) => mocks.openOptionsPage(...args),
  createUiHelpers: () => ({
    updateUI: (...args) => mocks.uiUpdateUI(...args),
    showNotConnected: (...args) => mocks.uiShowNotConnected(...args),
    showMainContent: (...args) => mocks.uiShowMainContent(...args),
    hideAddForm: (...args) => mocks.uiHideAddForm(...args)
  })
}))

vi.mock('../../clients/extension/popup/modules/bookmarks.js', () => ({
  createBookmarkController: () => ({
    showAddForm: (...args) => mocks.bookmarkShowAddForm(...args),
    showAddFormFromCapture: (...args) => mocks.bookmarkShowAddFormFromCapture(...args),
    submitBookmark: (...args) => mocks.bookmarkSubmitBookmark(...args),
    handleEdit: (...args) => mocks.bookmarkHandleEdit(...args),
    handleDelete: (...args) => mocks.bookmarkHandleDelete(...args)
  })
}))

vi.mock('../../clients/extension/popup/modules/categories.js', () => ({
  createCategoryController: () => ({
    loadCategories: (...args) => mocks.categoryLoadCategories(...args),
    showCategoryModal: (...args) => mocks.categoryShowCategoryModal(...args),
    hideCategoryModal: (...args) => mocks.categoryHideCategoryModal(...args),
    createCategory: (...args) => mocks.categoryCreateCategory(...args)
  })
}))

vi.mock('../../clients/extension/popup/modules/search.js', () => ({
  createSearchController: () => ({
    loadRecentBookmarks: (...args) => mocks.searchLoadRecentBookmarks(...args),
    performSearch: (...args) => mocks.searchPerformSearch(...args),
    handleSearchInput: (...args) => mocks.searchHandleSearchInput(...args),
    clearSearch: (...args) => mocks.searchClearSearch(...args)
  })
}))

const loadPopup = async () => {
  vi.resetModules()
  renderDom()

  const elements = getElements()
  const popupState = {
    currentLang: 'zh',
    config: {
      serverUrl: '',
      token: ''
    },
    categories: [],
    debounceTimer: null,
    currentEditingId: null
  }

  mocks.popupState = popupState
  mocks.authErrorCallback = null

  vi.doMock('../../clients/extension/popup/modules/constants.js', () => ({
    elements,
    i18n: {
      zh: {
        tokenExpired: '登录已过期',
        tokenInvalid: '登录令牌无效，请重新配置'
      },
      en: {
        tokenExpired: 'Session expired',
        tokenInvalid: 'Invalid token'
      }
    },
    createPopupState: () => popupState
  }))

  let domReadyHandler = null
  const originalAddEventListener = document.addEventListener.bind(document)
  const addEventListenerSpy = vi
    .spyOn(document, 'addEventListener')
    .mockImplementation((type, listener, options) => {
      if (type === 'DOMContentLoaded') {
        domReadyHandler = listener
        return
      }

      return originalAddEventListener(type, listener, options)
    })

  await import('../../clients/extension/popup/popup.js')
  addEventListenerSpy.mockRestore()

  await domReadyHandler?.()
  await Promise.resolve()
  await Promise.resolve()

  return {
    elements,
    popupState
  }
}

describe('browser extension popup bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.initApi.mockReset()
    mocks.apiRequest.mockReset()
    mocks.normalizeUrl.mockClear()
    mocks.getStorage.mockReset()
    mocks.setStorage.mockReset()
    mocks.getMergedStorage.mockReset()
    mocks.removeStorage.mockReset()
    mocks.getMergedStorage.mockResolvedValue({})
    mocks.removeStorage.mockResolvedValue(undefined)
    mocks.openOptionsPage.mockReset()
    mocks.bookmarkShowAddForm.mockReset()
    mocks.bookmarkShowAddFormFromCapture.mockReset()
    mocks.bookmarkSubmitBookmark.mockReset()
    mocks.categoryLoadCategories.mockReset()
    mocks.categoryShowCategoryModal.mockReset()
    mocks.categoryHideCategoryModal.mockReset()
    mocks.categoryCreateCategory.mockReset()
    mocks.searchLoadRecentBookmarks.mockReset()
    mocks.searchPerformSearch.mockReset()
    mocks.searchHandleSearchInput.mockReset()
    mocks.searchClearSearch.mockReset()
    mocks.uiUpdateUI.mockReset()
    mocks.uiShowNotConnected.mockReset()
    mocks.uiShowMainContent.mockReset()
    mocks.uiHideAddForm.mockReset()

    global.chrome = {
      tabs: {
        create: vi.fn()
      },
      storage: {
        sync: {
          remove: vi.fn().mockResolvedValue(undefined)
        },
        local: {
          remove: vi.fn().mockResolvedValue(undefined)
        }
      }
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete global.chrome
    document.body.innerHTML = ''
  })

  it('shows the disconnected state when config is incomplete', async () => {
    mocks.getMergedStorage.mockResolvedValue({ lang: 'en' })
    mocks.initApi.mockImplementation(async (callback) => {
      mocks.authErrorCallback = callback
      return { serverUrl: '', token: '' }
    })

    const { popupState } = await loadPopup()

    expect(mocks.getMergedStorage).toHaveBeenCalledWith([
      'lang',
      'locale',
      'themeMode',
      'theme-mode'
    ])
    expect(popupState.currentLang).toBe('en')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
    expect(document.documentElement.getAttribute('theme-mode')).toBe('light')
    expect(mocks.uiUpdateUI).toHaveBeenCalledTimes(1)
    expect(mocks.uiShowNotConnected).toHaveBeenCalledTimes(1)
    expect(mocks.uiShowMainContent).not.toHaveBeenCalled()
    expect(mocks.categoryLoadCategories).not.toHaveBeenCalled()
    expect(mocks.searchLoadRecentBookmarks).not.toHaveBeenCalled()
  })

  it('loads data and wires all popup event listeners once config is available', async () => {
    mocks.getMergedStorage.mockResolvedValue({})
    mocks.setStorage.mockResolvedValue(undefined)
    mocks.initApi.mockImplementation(async (callback) => {
      mocks.authErrorCallback = callback
      return { serverUrl: 'https://nav.example.com', token: 'signed-token' }
    })

    const { elements, popupState } = await loadPopup()

    expect(mocks.uiShowMainContent).toHaveBeenCalledTimes(1)
    expect(mocks.categoryLoadCategories).toHaveBeenCalledTimes(1)
    expect(mocks.searchLoadRecentBookmarks).toHaveBeenCalledTimes(1)

    elements.openSettings.click()
    elements.i18nToggle.click()
    elements.searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    elements.clearSearch.click()
    elements.addCurrentBtn.click()
    elements.cancelAdd.click()
    elements.submitBookmark.click()
    elements.openSite.click()
    elements.addCategoryBtn.click()
    elements.closeCategoryModal.click()
    elements.submitCategory.click()

    await Promise.resolve()

    expect(mocks.openOptionsPage).toHaveBeenCalledTimes(1)
    expect(mocks.setStorage).toHaveBeenCalledWith({ lang: 'zh', locale: 'zh-CN' })
    expect(popupState.currentLang).toBe('zh')
    expect(mocks.uiUpdateUI).toHaveBeenCalledTimes(2)
    expect(mocks.searchHandleSearchInput).toHaveBeenCalledTimes(1)
    expect(mocks.searchClearSearch).toHaveBeenCalledTimes(1)
    expect(mocks.bookmarkShowAddForm).toHaveBeenCalledTimes(1)
    expect(mocks.uiHideAddForm).toHaveBeenCalledTimes(1)
    expect(mocks.bookmarkSubmitBookmark).toHaveBeenCalledTimes(1)
    expect(global.chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://nav.example.com' })
    expect(mocks.categoryShowCategoryModal).toHaveBeenCalledTimes(1)
    expect(mocks.categoryHideCategoryModal).toHaveBeenCalledTimes(1)
    expect(mocks.categoryCreateCategory).toHaveBeenCalledTimes(1)
  })

  it('clears stored auth state when initApi reports an auth error callback', async () => {
    mocks.getMergedStorage.mockResolvedValue({})
    mocks.initApi.mockImplementation(async (callback) => {
      mocks.authErrorCallback = callback
      return { serverUrl: 'https://nav.example.com', token: 'signed-token' }
    })

    const { popupState } = await loadPopup()
    await mocks.authErrorCallback('令牌已过期')

    expect(popupState.config.token).toBe('')
    expect(mocks.removeStorage).toHaveBeenCalledWith(['token', 'user'], 'local')
    expect(mocks.removeStorage).toHaveBeenCalledWith(['token', 'user'], 'sync')
    expect(mocks.uiShowNotConnected).toHaveBeenCalledWith('tokenExpired')
  })
})
