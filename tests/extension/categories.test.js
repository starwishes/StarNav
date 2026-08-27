/* global document */
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCategoryController } from '../../clients/extension/popup/modules/categories.js'

const i18n = {
  zh: {
    rootCategory: '根分类',
    fillRequired: '请填写必要信息',
    catAddSuccess: '分类创建成功',
    catAddFailed: '分类创建失败'
  }
}

const renderDom = () => {
  document.body.innerHTML = `
    <div id="categoryModal" style="display:none"></div>
    <input id="newCategoryName" />
    <select id="newCategoryParent"></select>
    <input id="newCategoryLevel" value="3" />
    <select id="bookmarkCategory"></select>
    <button id="submitCategory">创建</button>
  `
}

const getElements = () => ({
  categoryModal: document.getElementById('categoryModal'),
  newCategoryName: document.getElementById('newCategoryName'),
  newCategoryParent: document.getElementById('newCategoryParent'),
  newCategoryLevel: document.getElementById('newCategoryLevel'),
  bookmarkCategory: document.getElementById('bookmarkCategory'),
  submitCategory: document.getElementById('submitCategory')
})

describe('browser extension category controller', () => {
  let elements
  let state
  let ui
  let apiRequest
  let controller

  const buildController = (overrides = {}) =>
    createCategoryController({
      apiRequest: overrides.apiRequest ?? apiRequest,
      elements: { ...getElements(), ...overrides.elements },
      state: overrides.state ?? state,
      i18n,
      ui: overrides.ui ?? ui
    })

  beforeEach(() => {
    renderDom()
    elements = getElements()
    state = {
      currentLang: 'zh',
      currentEditingId: null,
      categories: []
    }
    ui = {
      showToast: vi.fn()
    }
    apiRequest = vi.fn()
    controller = buildController()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('loads simple categories and fills the selects with an optional placeholder', async () => {
    apiRequest.mockResolvedValue({
      categories: [
        { id: 1, name: 'Root' },
        { id: 2, name: 'Dev' }
      ]
    })

    await controller.loadCategories()
    expect(state.categories).toHaveLength(2)
    expect([...elements.bookmarkCategory.options].map((o) => o.textContent)).toEqual([
      'Root',
      'Dev'
    ])

    await controller.showCategoryModal()
    expect(elements.newCategoryName.value).toBe('')
    expect(elements.newCategoryLevel.value).toBe('0')
    expect([...elements.newCategoryParent.options].map((o) => o.textContent)).toEqual([
      '根分类',
      'Root',
      'Dev'
    ])
    expect(elements.categoryModal.style.display).toBe('flex')
  })

  it('normalizes malformed category payloads to an empty list', async () => {
    apiRequest.mockResolvedValue({ categories: 'not-an-array' })

    await controller.loadCategories()

    expect(state.categories).toEqual([])
    expect(elements.bookmarkCategory.children).toHaveLength(0)
  })

  it('logs failures when the categories request rejects', async () => {
    apiRequest.mockRejectedValue(new Error('offline'))

    await controller.loadCategories()

    expect(console.error).toHaveBeenCalled()
  })

  it('keeps optional widgets absent-safe for modal open/close', async () => {
    const bareController = createCategoryController({
      apiRequest,
      elements: {},
      state,
      i18n,
      ui
    })

    // 无弹窗、无名称输入框时打开/关闭均不应抛错
    bareController.showCategoryModal()
    bareController.hideCategoryModal()

    const partialController = createCategoryController({
      apiRequest,
      elements: { ...elements, categoryModal: null },
      state,
      i18n,
      ui
    })
    partialController.showCategoryModal()
    partialController.hideCategoryModal()
    expect(elements.categoryModal.style.display).toBe('none')
  })

  it('rejects empty names before touching the API', async () => {
    elements.newCategoryName.value = '   '
    elements.submitCategory.disabled = false

    await controller.createCategory()

    expect(ui.showToast).toHaveBeenCalledWith('请填写必要信息', 'error')
    expect(apiRequest).not.toHaveBeenCalled()
    expect(elements.submitCategory.disabled).toBe(false)
  })

  it('creates a category at root level and selects it afterwards', async () => {
    apiRequest.mockImplementation(async (url) =>
      String(url).startsWith('/category')
        ? { item: { id: 9 } }
        : { categories: [{ id: 9, name: 'Tools' }] }
    )
    elements.bookmarkCategory.innerHTML =
      '<option value="1">Root</option><option value=""></option>'
    elements.bookmarkCategory.value = '1'

    await controller.showCategoryModal() // 重置名称与层级后走正常流程
    elements.newCategoryName.value = 'Tools'

    await controller.createCategory()

    expect(apiRequest).toHaveBeenCalledWith('/category', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tools', parentId: null, minLevel: 0 })
    })
    expect(ui.showToast).toHaveBeenCalledWith('分类创建成功', 'success')
    expect(elements.categoryModal.style.display).toBe('none')
    // 创建成功后重新加载分类列表并选中新分类
    expect(apiRequest).toHaveBeenCalledWith('/categories/simple')
    expect(elements.bookmarkCategory.value).toBe('9')
    expect(elements.submitCategory.disabled).toBe(false)
  })

  it('carries the chosen parent id into the create request', async () => {
    apiRequest.mockResolvedValue({})
    elements.newCategoryParent.innerHTML =
      '<option value="">根分类</option><option value="2">Dev</option>'
    elements.newCategoryParent.value = '2'
    elements.newCategoryName.value = 'Nested'

    await controller.createCategory()

    expect(apiRequest).toHaveBeenCalledWith('/category', {
      method: 'POST',
      body: JSON.stringify({ name: 'Nested', parentId: '2', minLevel: 3 })
    })
    expect(ui.showToast).toHaveBeenCalledWith('分类创建成功', 'success')
    expect(apiRequest).toHaveBeenCalledWith('/categories/simple')
  })

  it('opens the modal even when some form widgets are missing', async () => {
    const partialController = createCategoryController({
      apiRequest,
      elements: {
        ...elements,
        categoryModal: elements.categoryModal,
        newCategoryName: null,
        newCategoryLevel: null
      },
      state,
      i18n,
      ui
    })

    // 名称输入框与层级输入框缺失时仍应打开弹窗且不报错
    partialController.showCategoryModal()
    expect(elements.categoryModal.style.display).toBe('flex')
    expect(ui.showToast).not.toHaveBeenCalled()
  })

  it('creates without optional level/submit widgets and keeps flows working', async () => {
    apiRequest.mockImplementation(async () => ({ item: { id: 12 } }))
    const minimalController = createCategoryController({
      apiRequest,
      elements: { ...getElements(), newCategoryLevel: null, submitCategory: null },
      state,
      i18n,
      ui
    })
    elements.newCategoryName.value = 'Tools'

    await minimalController.createCategory()

    // 缺少层级输入框时 minLevel 兑底 0；缺少提交按钮时跳过禁用切换
    expect(apiRequest).toHaveBeenCalledWith('/category', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tools', parentId: null, minLevel: 0 })
    })
    expect(ui.showToast).toHaveBeenCalledWith('分类创建成功', 'success')
  })

  it('shows API error messages (or a generic fallback) when creation fails', async () => {
    await controller.showCategoryModal()
    elements.newCategoryName.value = 'Broken'
    apiRequest.mockRejectedValueOnce(Object.assign(new Error(), { message: '' }))
    apiRequest.mockRejectedValueOnce(new Error('name conflict'))

    await controller.createCategory()
    expect(ui.showToast).toHaveBeenNthCalledWith(1, '分类创建失败', 'error')
    // 失败时弹窗保持打开，方便用户修正后重试
    expect(elements.categoryModal.style.display).toBe('flex')

    await controller.createCategory()
    expect(ui.showToast).toHaveBeenNthCalledWith(2, 'name conflict', 'error')
    expect(elements.submitCategory.disabled).toBe(false)
  })
})
