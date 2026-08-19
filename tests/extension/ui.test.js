/* global document, window */
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createUiHelpers, openOptionsPage } from '../../clients/extension/popup/modules/ui.js'

const i18n = {
  zh: {
    addCurrent: '添加当前页面',
    openSite: '打开导航站',
    settings: '设置',
    toggleLang: '切换语言',
    toggleTheme: '切换日/夜模式',
    newCatTip: '新建分类',
    searchPlaceholder: '搜索书签...',
    descPlaceholder: '描述...',
    catPlaceholder: '分类名',
    notConnectedTip: '请先配置服务器地址',
    tokenExpired: '登录已过期',
    edit: '编辑',
    delete: '删除'
  },
  en: {
    openSite: 'Open StarNav',
    settings: 'Settings',
    toggleLang: 'Switch Language',
    newCatTip: 'New Category',
    searchPlaceholder: 'Search...',
    descPlaceholder: 'Description...',
    catPlaceholder: 'Category name',
    notConnectedTip: 'Please configure server address',
    tokenExpired: 'Session expired',
    edit: 'Edit',
    delete: 'Delete'
  }
}

const renderDom = () => {
  document.body.innerHTML = `
    <button id="toast" style="display:none"></button>
    <div id="notConnected" style="display:none"></div>
    <div id="mainContent" style="display:none"></div>
    <div id="loading" style="display:none"></div>
    <div id="searchResults" style="display:none"></div>
    <div id="bookmarkList" style="display:block"></div>
    <div id="addSection" style="display:block"></div>
    <div id="addForm" style="display:block"></div>
    <div id="duplicateWarning" style="display:flex"></div>
    <input id="searchInput" value="" />
    <textarea id="bookmarkDesc"></textarea>
    <input id="newCategoryName" />
    <button id="openSite"></button>
    <button id="openSettings"></button>
    <button id="addCategoryBtn"></button>
    <button id="i18nToggle"><span class="main-char"></span><span class="badge-char"></span></button>
    <button id="addCurrentBtn" data-i18n="addCurrent">Add Current</button>
    <button id="searchBtn" data-i18n="searchPlaceholder">Search</button>
    <div id="listTarget"></div>
  `
}

const getElements = () => ({
  toast: document.getElementById('toast'),
  notConnected: document.getElementById('notConnected'),
  mainContent: document.getElementById('mainContent'),
  loading: document.getElementById('loading'),
  searchResults: document.getElementById('searchResults'),
  bookmarkList: document.getElementById('bookmarkList'),
  addSection: document.getElementById('addSection'),
  addForm: document.getElementById('addForm'),
  duplicateWarning: document.getElementById('duplicateWarning'),
  searchInput: document.getElementById('searchInput'),
  bookmarkDesc: document.getElementById('bookmarkDesc'),
  newCategoryName: document.getElementById('newCategoryName'),
  openSite: document.getElementById('openSite'),
  openSettings: document.getElementById('openSettings'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  i18nToggle: document.getElementById('i18nToggle')
})

describe('browser extension ui helpers', () => {
  let state
  let elements
  let onEdit
  let onDelete
  let ui

  beforeEach(() => {
    vi.useFakeTimers()
    renderDom()
    state = {
      currentLang: 'zh',
      currentEditingId: 7
    }
    elements = getElements()
    onEdit = vi.fn()
    onDelete = vi.fn()
    ui = createUiHelpers({ elements, state, i18n, onEdit, onDelete })
  })

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync()
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    delete global.chrome
  })

  it('opens the extension options page through runtime helpers with a window fallback', () => {
    global.chrome = {
      runtime: {
        openOptionsPage: vi.fn(),
        getURL: vi.fn(() => 'chrome-extension://id/options/options.html')
      }
    }
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    openOptionsPage()
    expect(global.chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1)

    global.chrome.runtime.openOptionsPage = undefined
    openOptionsPage()

    expect(global.chrome.runtime.getURL).toHaveBeenCalledWith('options/options.html')
    expect(openSpy).toHaveBeenCalledWith('chrome-extension://id/options/options.html')
  })

  it('updates localized UI text, placeholders, and language toggle badges', () => {
    ui.updateUI()

    expect(document.getElementById('addCurrentBtn').textContent).toBe('添加当前页面')
    expect(document.getElementById('searchBtn').textContent).toBe('搜索书签...')
    expect(elements.openSite.title).toBe('打开导航站')
    expect(elements.openSettings.title).toBe('设置')
    expect(elements.addCategoryBtn.title).toBe('新建分类')
    expect(elements.searchInput.placeholder).toBe('搜索书签...')
    expect(elements.bookmarkDesc.placeholder).toBe('描述...')
    expect(elements.newCategoryName.placeholder).toBe('分类名')
    expect(elements.i18nToggle.querySelector('.main-char').textContent).toBe('文')
    expect(elements.i18nToggle.querySelector('.badge-char').textContent).toBe('A')
  })

  it('shows and auto-hides toasts while switching between connected and disconnected layouts', async () => {
    ui.showToast('Saved', 'success')

    expect(elements.toast.textContent).toBe('Saved')
    expect(elements.toast.className).toBe('toast success')
    expect(elements.toast.style.display).toBe('block')

    await vi.advanceTimersByTimeAsync(3000)
    expect(elements.toast.style.display).toBe('none')

    ui.showNotConnected('tokenExpired')
    expect(elements.notConnected.style.display).toBe('flex')
    expect(elements.mainContent.style.display).toBe('none')
    expect(elements.toast.textContent).toBe('登录已过期')

    ui.showMainContent()
    expect(elements.notConnected.style.display).toBe('none')
    expect(elements.mainContent.style.display).toBe('block')
  })

  it('hides search/add panels appropriately and resets the current editing state', () => {
    elements.searchInput.value = 'query'
    ui.hideSearchResults()

    expect(elements.searchResults.style.display).toBe('none')
    expect(elements.bookmarkList.style.display).toBe('block')
    expect(elements.addSection.style.display).toBe('block')

    ui.hideAddForm()
    expect(elements.addForm.style.display).toBe('none')
    expect(elements.duplicateWarning.style.display).toBe('none')
    expect(elements.searchResults.style.display).toBe('block')
    expect(elements.bookmarkList.style.display).toBe('none')
    expect(state.currentEditingId).toBeNull()
  })

  it('renders bookmark lists safely and wires edit/delete buttons', () => {
    const target = document.getElementById('listTarget')

    ui.renderBookmarkList(target, [
      {
        id: 1,
        name: '<GitHub>',
        url: 'https://example.com/?q=<script>',
        categoryName: 'Dev & Test'
      }
    ])

    expect(target.innerHTML).toContain('&lt;GitHub&gt;')
    expect(target.innerHTML).toContain('Dev &amp; Test')

    target
      .querySelector('.edit-btn')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    target
      .querySelector('.delete-btn')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }))

    expect(onEdit).toHaveBeenCalledWith({
      id: 1,
      name: '<GitHub>',
      url: 'https://example.com/?q=<script>',
      categoryName: 'Dev & Test'
    })
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('does not render javascript: URLs as executable links', () => {
    const target = document.getElementById('listTarget')

    ui.renderBookmarkList(target, [
      {
        id: 2,
        name: 'Unsafe',
        url: 'javascript:alert(1)',
        categoryName: ''
      }
    ])

    expect(target.querySelector('.bookmark-item').getAttribute('href')).toBe('#')
    expect(target.innerHTML).not.toMatch(/href="javascript:/i)
  })
})
