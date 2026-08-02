import { computed, onUnmounted, ref, watch, type Ref } from 'vue'

import { toolApi } from '@/api'
import { useDebounce } from '@/composables/useDebounce'
import { useAdminStore } from '@/store/admin'
import { useDataStore } from '@/store/data'
import { openUrl } from '@/utils'
import { createScopedLogger } from '../../../shared/logger.js'

import {
  buildSearchPlaceholder,
  getSuggestionProviderType,
  searchLocalBookmarks,
  type SearchEngineOption
} from './searchUtils'
import type { SearchResultItem } from './SearchResults.vue'

type SearchMode = 'local' | 'online'

type FocusTarget = {
  focus?: () => void
}

type UseSearchExecutionOptions = {
  searchBoxRef: Ref<FocusTarget | null>
  searchContainerRef: Ref<HTMLElement | null>
  searchMode: Ref<SearchMode>
  currentEngine: Ref<SearchEngineOption | null>
}

export const useSearchExecution = ({
  searchBoxRef,
  searchContainerRef,
  searchMode,
  currentEngine
}: UseSearchExecutionOptions) => {
  const logger = createScopedLogger('web:search')
  const adminStore = useAdminStore()
  const dataStore = useDataStore()

  const searchText = ref('')
  const debouncedSearchText = useDebounce('', 300)
  const searchResults = ref<SearchResultItem[]>([])
  const hasSearched = ref(false)
  const loading = ref(false)
  const isActive = ref(false)
  const suggestions = ref<string[]>([])
  const activeSuggestionIndex = ref(-1)
  const latestSearchRequestId = ref(0)
  const suggestionAbortController = ref<AbortController | null>(null)

  const placeholder = computed(() => buildSearchPlaceholder(searchMode.value, currentEngine.value))

  const invalidateSearchRequests = () => {
    latestSearchRequestId.value += 1
  }

  const isLatestSearchRequest = (requestId: number) => latestSearchRequestId.value === requestId

  const cancelSuggestionRequest = () => {
    suggestionAbortController.value?.abort()
    suggestionAbortController.value = null
  }

  const clearVisibleSearchState = () => {
    searchResults.value = []
    suggestions.value = []
    hasSearched.value = false
    loading.value = false
    activeSuggestionIndex.value = -1
  }

  const resetSearchState = () => {
    invalidateSearchRequests()
    cancelSuggestionRequest()
    clearVisibleSearchState()
  }

  const ensureLocalData = async () => {
    // Share in-flight loadData (store dedupes concurrent callers).
    if (!dataStore.initialized) {
      await dataStore.loadData()
    }
  }

  const performLocalSearch = async (keyword: string, requestId: number) => {
    if (!keyword.trim()) return

    loading.value = true
    hasSearched.value = true

    try {
      await ensureLocalData()
      if (!isLatestSearchRequest(requestId)) {
        return
      }

      searchResults.value = searchLocalBookmarks(
        dataStore.items,
        keyword,
        adminStore.user?.level || 0
      )
        .map((item) => ({
          ...item,
          name: item.name || item.url || '未命名书签',
          description: item.description || '',
          url: item.url || ''
        }))
        .filter((item) => item.url) as SearchResultItem[]
    } catch (error) {
      logger.error('Local bookmark search failed.', error)
      if (isLatestSearchRequest(requestId)) {
        searchResults.value = []
      }
    } finally {
      if (isLatestSearchRequest(requestId)) {
        loading.value = false
      }
    }
  }

  const fetchSuggestions = async (keyword: string, requestId: number) => {
    if (!keyword.trim() || !currentEngine.value?.url) return

    const type = getSuggestionProviderType(currentEngine.value)
    if (!type) {
      cancelSuggestionRequest()
      if (isLatestSearchRequest(requestId)) {
        suggestions.value = []
        hasSearched.value = false
        loading.value = false
        activeSuggestionIndex.value = -1
      }
      return
    }

    loading.value = true
    hasSearched.value = true
    cancelSuggestionRequest()
    const abortController = new AbortController()
    suggestionAbortController.value = abortController

    try {
      const nextSuggestions = await toolApi.getSuggestions(keyword, type, {
        signal: abortController.signal
      })
      if (!isLatestSearchRequest(requestId) || abortController.signal.aborted) {
        return
      }

      suggestions.value = nextSuggestions
    } catch (error) {
      if (
        abortController.signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        return
      }

      logger.error('Failed to fetch search suggestions.', error)
      if (isLatestSearchRequest(requestId)) {
        suggestions.value = []
      }
    } finally {
      if (suggestionAbortController.value === abortController) {
        suggestionAbortController.value = null
      }
      if (isLatestSearchRequest(requestId)) {
        loading.value = false
      }
    }
  }

  const handleFocus = () => {
    isActive.value = true
  }

  const handleBlur = (event: FocusEvent) => {
    const target = event.relatedTarget as HTMLElement | null
    const isClickInsideSearch = searchContainerRef.value?.contains(target)
    if (!isClickInsideSearch) {
      window.setTimeout(() => {
        isActive.value = false
      }, 200)
    }
  }

  const clearSearch = () => {
    searchText.value = ''
    resetSearchState()
  }

  const handleEnter = () => {
    if (!searchText.value.trim()) return

    if (searchMode.value === 'local') {
      const firstResult = searchResults.value[0]
      if (firstResult?.url) {
        openUrl(firstResult.url)
      }
      return
    }

    if (currentEngine.value?.url) {
      window.open(currentEngine.value.url + encodeURIComponent(searchText.value), '_blank')
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    searchText.value = suggestion
    suggestions.value = []
    handleEnter()
  }

  const handleItemClick = (url: string) => {
    window.setTimeout(() => {
      isActive.value = false
    }, 100)
    openUrl(url)
  }

  watch(searchText, (value) => {
    debouncedSearchText.value = value

    if (!value.trim()) {
      resetSearchState()
      return
    }

    isActive.value = true
  })

  watch(
    [
      debouncedSearchText,
      searchMode,
      () => (searchMode.value === 'online' ? currentEngine.value : null),
      () => (searchMode.value === 'local' ? dataStore.items : null),
      () => (searchMode.value === 'local' ? adminStore.user?.level : null)
    ],
    async ([keyword, mode]) => {
      const normalizedKeyword = keyword.trim()
      if (!normalizedKeyword) {
        resetSearchState()
        return
      }

      cancelSuggestionRequest()
      clearVisibleSearchState()

      const requestId = latestSearchRequestId.value + 1
      latestSearchRequestId.value = requestId

      if (mode === 'local') {
        await performLocalSearch(normalizedKeyword, requestId)
        return
      }

      await fetchSuggestions(normalizedKeyword, requestId)
    }
  )

  watch(searchMode, () => {
    searchBoxRef.value?.focus?.()
  })

  onUnmounted(() => {
    cancelSuggestionRequest()
  })

  return {
    searchText,
    searchResults,
    hasSearched,
    loading,
    isActive,
    suggestions,
    activeSuggestionIndex,
    placeholder,
    handleFocus,
    handleBlur,
    clearSearch,
    handleEnter,
    handleSuggestionClick,
    handleItemClick
  }
}
