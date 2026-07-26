import { createScopedLogger } from '../../common/logger.js'
import { extractActiveTabDetails } from '../../utils/pageDetails.js'

export function createBookmarkController({
  apiRequest,
  normalizeUrl,
  elements,
  state,
  i18n,
  ui,
  loadRecentBookmarks,
  performSearch
}) {
  const logger = createScopedLogger('extension:bookmarks')
  const getTexts = () => i18n[state.currentLang]

  const getCategoryName = (categoryId) => {
    const category = state.categories.find((entry) => String(entry.id) === String(categoryId))
    return category?.name || getTexts().unknownCategory
  }

  const showAddFormPanel = () => {
    elements.addSection.style.display = 'none'
    elements.bookmarkList.style.display = 'none'
    elements.searchResults.style.display = 'none'
    elements.addForm.style.display = 'block'
  }

  const fillBookmarkForm = (item, description = '') => {
    elements.bookmarkName.value = item?.name || ''
    elements.bookmarkUrl.value = item?.url || ''
    elements.bookmarkDesc.value = item?.description || description
    elements.bookmarkCategory.value = item?.categoryId ? String(item.categoryId) : ''
    elements.bookmarkLevel.value = String(item?.level || 0)
  }

  const showDuplicateWarning = (item, categoryName) => {
    if (!elements.duplicateWarning || !elements.duplicateName) {
      return
    }

    elements.duplicateWarning.style.display = 'flex'
    elements.duplicateName.textContent = `${item.name} (${getTexts().category}: ${categoryName})`
  }

  const clearDuplicateWarning = () => {
    if (elements.duplicateWarning) {
      elements.duplicateWarning.style.display = 'none'
    }
  }

  const openFormForUrl = async ({ url, title = '', description = '' }) => {
    if (!url?.startsWith('http://') && !url?.startsWith('https://')) {
      ui.showToast(getTexts().webOnly, 'error')
      return
    }

    ui.showLoading()

    try {
      const checkResult = await apiRequest(`/bookmark/check?url=${encodeURIComponent(url)}`)
      const existingItem = checkResult.item || null

      if (checkResult.exists && existingItem) {
        state.currentEditingId = existingItem.id
        fillBookmarkForm(existingItem, description)
        showDuplicateWarning(existingItem, getCategoryName(existingItem.categoryId))
        ui.showToast(getTexts().duplicateAlert, 'error')
      } else {
        state.currentEditingId = null
        clearDuplicateWarning()
        fillBookmarkForm(
          {
            name: title || '',
            url,
            categoryId: state.categories[0]?.id || '',
            level: 0
          },
          description
        )
      }
    } catch (error) {
      logger.error('Failed to check bookmark duplication before showing add form.', error)
      state.currentEditingId = null
      clearDuplicateWarning()
      fillBookmarkForm(
        {
          name: title || '',
          url,
          categoryId: state.categories[0]?.id || '',
          level: 0
        },
        description
      )
    } finally {
      ui.hideLoading()
    }

    showAddFormPanel()
  }

  const handleEdit = async (item) => {
    if (!item) {
      return
    }

    state.currentEditingId = item.id
    clearDuplicateWarning()
    fillBookmarkForm(item)
    showAddFormPanel()
  }

  const handleDelete = async (id) => {
    if (!id || !window.confirm(getTexts().confirmDelete)) {
      return
    }

    try {
      ui.showLoading()
      await apiRequest(`/bookmark/${id}`, { method: 'DELETE' })
      ui.showToast(getTexts().deleteSuccess, 'success')

      const activeQuery = elements.searchInput?.value.trim()
      if (activeQuery && elements.searchResults?.style.display !== 'none') {
        await performSearch(activeQuery)
        return
      }

      await loadRecentBookmarks()
    } catch (error) {
      ui.showToast(error.message || getTexts().deleteFailed, 'error')
    } finally {
      ui.hideLoading()
    }
  }

  const submitBookmark = async () => {
    const name = elements.bookmarkName?.value.trim()
    const url = normalizeUrl(elements.bookmarkUrl?.value.trim())
    const categoryId = elements.bookmarkCategory?.value
    const description = elements.bookmarkDesc?.value.trim() || ''
    const minLevel = Number.parseInt(elements.bookmarkLevel?.value || '0', 10)

    if (!url) {
      ui.showToast(getTexts().invalidUrl, 'error')
      return
    }

    if (!name || !categoryId) {
      ui.showToast(getTexts().fillRequired, 'error')
      return
    }

    try {
      if (elements.submitBookmark) {
        elements.submitBookmark.disabled = true
      }

      ui.showLoading()

      const checkResult = await apiRequest(`/bookmark/check?url=${encodeURIComponent(url)}`)
      const existingItem = checkResult.item || null

      if (
        checkResult.exists &&
        existingItem &&
        String(existingItem.id) !== String(state.currentEditingId)
      ) {
        const categoryName = getCategoryName(existingItem.categoryId)

        showDuplicateWarning(existingItem, categoryName)
        ui.showToast(
          `${getTexts().addFailed}: ${getTexts().duplicateIn} "${categoryName}"`,
          'error'
        )
        return
      }

      const endpoint = state.currentEditingId ? `/bookmark/${state.currentEditingId}` : '/bookmark'
      const method = state.currentEditingId ? 'PUT' : 'POST'

      await apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          name,
          url,
          categoryId,
          description,
          minLevel
        })
      })

      ui.showToast(
        state.currentEditingId ? getTexts().updateSuccess : getTexts().addSuccess,
        'success'
      )
      ui.hideAddForm()
      await loadRecentBookmarks()
    } catch (error) {
      ui.showToast(
        error.message || (state.currentEditingId ? getTexts().updateFailed : getTexts().addFailed),
        'error'
      )
    } finally {
      if (elements.submitBookmark) {
        elements.submitBookmark.disabled = false
      }

      ui.hideLoading()
    }
  }

  const showAddForm = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.url) {
        return
      }

      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        ui.showToast(getTexts().webOnly, 'error')
        return
      }

      let extractedDesc = ''
      try {
        const details = await extractActiveTabDetails(tab.id)
        extractedDesc = details?.description || ''
      } catch (error) {
        logger.warn('Smart extraction failed, skipping.', error)
      }

      await openFormForUrl({
        url: tab.url,
        title: tab.title || '',
        description: extractedDesc
      })
    } catch (error) {
      logger.error('Failed to open add bookmark form.', error)
      ui.showToast(getTexts().infoFetchFailed, 'error')
      ui.hideLoading()
    }
  }

  const showAddFormFromCapture = async (capture) => {
    if (!capture?.url) {
      return
    }

    await openFormForUrl({
      url: capture.url,
      title: capture.title || capture.url,
      description: ''
    })
  }

  return {
    submitBookmark,
    handleEdit,
    handleDelete,
    showAddForm,
    showAddFormFromCapture
  }
}
