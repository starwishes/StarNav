import { createScopedLogger } from '../../common/logger.js'

const buildCategoryOptions = (categories) =>
  categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('')

export function createCategoryController({ apiRequest, elements, state, i18n, ui }) {
  const logger = createScopedLogger('extension:categories')
  const getTexts = () => i18n[state.currentLang]

  const loadCategories = async () => {
    try {
      const result = await apiRequest('/categories/simple')
      state.categories = Array.isArray(result.categories) ? result.categories : []

      if (elements.bookmarkCategory) {
        elements.bookmarkCategory.innerHTML = buildCategoryOptions(state.categories)
      }
    } catch (error) {
      logger.error('Failed to load categories.', error)
    }
  }

  const showCategoryModal = () => {
    if (!elements.categoryModal) {
      return
    }

    if (elements.newCategoryName) {
      elements.newCategoryName.value = ''
    }

    if (elements.newCategoryParent) {
      elements.newCategoryParent.value = ''
      elements.newCategoryParent.innerHTML =
        `<option value="">${getTexts().rootCategory}</option>` +
        buildCategoryOptions(state.categories)
    }

    if (elements.newCategoryLevel) {
      elements.newCategoryLevel.value = '0'
    }

    elements.categoryModal.style.display = 'flex'
  }

  const hideCategoryModal = () => {
    if (elements.categoryModal) {
      elements.categoryModal.style.display = 'none'
    }
  }

  const createCategory = async () => {
    const name = elements.newCategoryName?.value.trim()
    const parentId = elements.newCategoryParent?.value || null
    const minLevel = Number.parseInt(elements.newCategoryLevel?.value || '0', 10)

    if (!name) {
      ui.showToast(getTexts().fillRequired, 'error')
      return
    }

    try {
      if (elements.submitCategory) {
        elements.submitCategory.disabled = true
      }

      const result = await apiRequest('/category', {
        method: 'POST',
        body: JSON.stringify({ name, parentId, minLevel })
      })

      ui.showToast(getTexts().catAddSuccess, 'success')
      hideCategoryModal()
      await loadCategories()

      const newCategory = result.item || null
      if (newCategory?.id && elements.bookmarkCategory) {
        elements.bookmarkCategory.value = String(newCategory.id)
      }
    } catch (error) {
      ui.showToast(error.message || getTexts().catAddFailed, 'error')
    } finally {
      if (elements.submitCategory) {
        elements.submitCategory.disabled = false
      }
    }
  }

  return {
    loadCategories,
    showCategoryModal,
    hideCategoryModal,
    createCategory
  }
}
