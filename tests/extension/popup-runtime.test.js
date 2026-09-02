/* global document */
// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createBookmarkController } from '../../clients/extension/popup/modules/bookmarks.js'
import { createCategoryController } from '../../clients/extension/popup/modules/categories.js'

const i18n = {
  zh: {
    category: '分类',
    unknownCategory: '未知分类',
    fillRequired: '请填写必要信息',
    addFailed: '添加失败',
    duplicateWithName: '已存在于“{name}”，添加失败',
    updateSuccess: '更新成功',
    updateFailed: '更新失败',
    catAddSuccess: '分类创建成功',
    catAddFailed: '创建失败',
    rootCategory: '无 (根分类)'
  }
}

const renderPopupDom = () => {
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
    <div id="categoryModal" style="display:none"></div>
    <input id="newCategoryName" />
    <select id="newCategoryParent"></select>
    <select id="newCategoryLevel"><option value="0">0</option></select>
    <button id="submitCategory">创建</button>
    <input id="searchInput" />
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
  categoryModal: document.getElementById('categoryModal'),
  newCategoryName: document.getElementById('newCategoryName'),
  newCategoryParent: document.getElementById('newCategoryParent'),
  newCategoryLevel: document.getElementById('newCategoryLevel'),
  submitCategory: document.getElementById('submitCategory'),
  searchInput: document.getElementById('searchInput')
})

describe('browser extension popup runtime controllers', () => {
  beforeEach(() => {
    renderPopupDom()
  })

  it('loads categories and selects a newly created category', async () => {
    const apiRequest = vi
      .fn()
      .mockResolvedValueOnce({
        categories: [{ id: 1, name: 'Root' }]
      })
      .mockResolvedValueOnce({
        item: { id: 2, name: 'New Category' }
      })
      .mockResolvedValueOnce({
        categories: [
          { id: 1, name: 'Root' },
          { id: 2, name: 'New Category' }
        ]
      })

    const ui = {
      showToast: vi.fn()
    }
    const state = {
      currentLang: 'zh',
      categories: []
    }
    const elements = getElements()
    const controller = createCategoryController({
      apiRequest,
      elements,
      state,
      i18n,
      ui
    })

    await controller.loadCategories()
    elements.newCategoryName.value = 'New Category'

    await controller.createCategory()

    expect(state.categories).toEqual([
      { id: 1, name: 'Root' },
      { id: 2, name: 'New Category' }
    ])
    expect(elements.bookmarkCategory.value).toBe('2')
    expect(ui.showToast).toHaveBeenCalledWith('分类创建成功', 'success')
  })

  it('allows updating the current bookmark when duplicate check returns the same item', async () => {
    const apiRequest = vi
      .fn()
      .mockResolvedValueOnce({
        exists: true,
        item: { id: 42, name: 'Current', categoryId: 1 }
      })
      .mockResolvedValueOnce({ success: true })

    const ui = {
      showLoading: vi.fn(),
      hideLoading: vi.fn(),
      showToast: vi.fn(),
      hideAddForm: vi.fn()
    }
    const state = {
      currentLang: 'zh',
      currentEditingId: 42,
      categories: [{ id: 1, name: 'Root' }]
    }
    const elements = getElements()
    elements.bookmarkName.value = 'Updated Name'
    elements.bookmarkUrl.value = 'https://example.com'
    elements.bookmarkCategory.innerHTML = '<option value="1">Root</option>'
    elements.bookmarkCategory.value = '1'
    elements.bookmarkLevel.value = '0'
    elements.bookmarkDesc.value = 'Updated description'

    const controller = createBookmarkController({
      apiRequest,
      normalizeUrl: (value) => value,
      elements,
      state,
      i18n,
      ui,
      loadRecentBookmarks: vi.fn().mockResolvedValue(undefined),
      performSearch: vi.fn().mockResolvedValue(undefined)
    })

    await controller.submitBookmark()

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/bookmark/check?url=https%3A%2F%2Fexample.com')
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      '/bookmark/42',
      expect.objectContaining({
        method: 'PUT'
      })
    )
    expect(ui.showToast).toHaveBeenCalledWith('更新成功', 'success')
    expect(ui.hideAddForm).toHaveBeenCalled()
  })
})
