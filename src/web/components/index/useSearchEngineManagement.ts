import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAdminStore } from '@/store/admin'
import { ElMessage } from '@/utils/feedback'

import {
  DEFAULT_SEARCH_ENGINES,
  isSameSearchEngine,
  loadSearchEngineState,
  MAX_SEARCH_ENGINES,
  normalizeSearchEngine,
  prepareSearchEngineDraft,
  persistCurrentEngine,
  persistSearchEngines,
  type SearchEngineOption
} from './searchUtils'

export const useSearchEngineManagement = (engineNameInputRef: Ref<HTMLInputElement | null>) => {
  const { t } = useI18n()
  const adminStore = useAdminStore()

  const searchEngines = ref<SearchEngineOption[]>([...DEFAULT_SEARCH_ENGINES])
  const currentEngine = ref<SearchEngineOption | null>(DEFAULT_SEARCH_ENGINES[0])
  const onlineEngines = computed(() => searchEngines.value.filter((engine) => engine.url))

  const showDialog = ref(false)
  const isEditing = ref(false)
  const editingIndex = ref(-1)
  const engineForm = reactive({ name: '', url: '' })

  const closeDialog = () => {
    showDialog.value = false
  }

  const selectEngine = (engine: SearchEngineOption) => {
    currentEngine.value = engine
    persistCurrentEngine(engine)
  }

  const openAddDialog = () => {
    if (onlineEngines.value.length >= MAX_SEARCH_ENGINES) {
      ElMessage.warning(t('engine.maxEngines', { count: MAX_SEARCH_ENGINES }))
      return
    }

    isEditing.value = false
    editingIndex.value = -1
    engineForm.name = ''
    engineForm.url = ''
    showDialog.value = true
  }

  const openEditDialog = (engine: SearchEngineOption, index: number) => {
    isEditing.value = true
    editingIndex.value = index
    engineForm.name = engine.name
    engineForm.url = engine.url
    showDialog.value = true
  }

  const saveEngine = () => {
    const preparedDraft = prepareSearchEngineDraft(engineForm)
    const errorKey = preparedDraft.error
    if (errorKey) {
      ElMessage.warning(t(errorKey))
      return
    }
    const nextEngineValue = preparedDraft.value

    if (!isEditing.value && onlineEngines.value.length >= MAX_SEARCH_ENGINES) {
      ElMessage.warning(t('engine.maxEngines', { count: MAX_SEARCH_ENGINES }))
      return
    }

    if (isEditing.value && editingIndex.value > -1) {
      const editingEngine = onlineEngines.value[editingIndex.value]
      const realIndex = searchEngines.value.findIndex(
        (engine) => editingEngine && isSameSearchEngine(engine, editingEngine)
      )

      if (realIndex > -1) {
        const isCurrent = currentEngine.value
          ? isSameSearchEngine(currentEngine.value, searchEngines.value[realIndex])
          : false

        searchEngines.value[realIndex] = {
          ...searchEngines.value[realIndex],
          ...nextEngineValue
        }

        if (isCurrent) {
          currentEngine.value = searchEngines.value[realIndex]
          persistCurrentEngine(currentEngine.value)
        }
      }

      ElMessage.success(t('engine.saveSuccess'))
    } else {
      searchEngines.value.push(normalizeSearchEngine(nextEngineValue))
      ElMessage.success(t('engine.addSuccess'))
    }

    persistSearchEngines(searchEngines.value)
    closeDialog()
  }

  const deleteEngine = (index: number) => {
    const targetEngine = onlineEngines.value[index]
    if (!targetEngine) return

    if (onlineEngines.value.length <= 1) {
      ElMessage.warning(t('engine.keepOne'))
      return
    }

    const realIndex = searchEngines.value.findIndex((engine) =>
      isSameSearchEngine(engine, targetEngine)
    )
    if (realIndex === -1) return

    const isCurrent = currentEngine.value
      ? isSameSearchEngine(currentEngine.value, targetEngine)
      : false
    searchEngines.value.splice(realIndex, 1)
    persistSearchEngines(searchEngines.value)

    if (isCurrent) {
      currentEngine.value = onlineEngines.value[0] || DEFAULT_SEARCH_ENGINES[0]
      persistCurrentEngine(currentEngine.value)
    }
  }

  const moveEngine = (index: number, direction: number) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= onlineEngines.value.length) return

    const firstEngine = onlineEngines.value[index]
    const secondEngine = onlineEngines.value[newIndex]
    const firstRealIndex = searchEngines.value.findIndex((engine) =>
      isSameSearchEngine(engine, firstEngine)
    )
    const secondRealIndex = searchEngines.value.findIndex((engine) =>
      isSameSearchEngine(engine, secondEngine)
    )

    if (firstRealIndex === -1 || secondRealIndex === -1) return

    const swapped = [...searchEngines.value]
    ;[swapped[firstRealIndex], swapped[secondRealIndex]] = [
      swapped[secondRealIndex],
      swapped[firstRealIndex]
    ]
    searchEngines.value = swapped
    persistSearchEngines(searchEngines.value)
  }

  watch(
    () => adminStore.isAuthenticated,
    (isAuthenticated) => {
      const nextState = loadSearchEngineState(isAuthenticated)
      searchEngines.value = [...nextState.searchEngines]
      currentEngine.value = nextState.currentEngine
    },
    { immediate: true }
  )

  watch(showDialog, (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        engineNameInputRef.value?.focus()
      })
    }
  })

  const handleDialogKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && showDialog.value) {
      closeDialog()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleDialogKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleDialogKeydown)
  })

  return {
    currentEngine,
    onlineEngines,
    showDialog,
    isEditing,
    engineForm,
    closeDialog,
    selectEngine,
    openAddDialog,
    openEditDialog,
    saveEngine,
    deleteEngine,
    moveEngine
  }
}
