import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDialogA11y } from '@/composables/useDialogA11y'
import {
  buildBookmarkImportPayload,
  parseBookmarkHtml,
  type ParsedBookmarkCategory
} from '@/utils/bookmarkImport'
import { ElMessage } from '@/utils/feedback'
import type { ImportedBookmarkItem } from '@/types'
import { createScopedLogger } from '../../shared/logger.js'

const logger = createScopedLogger('web:bookmark-import')

/** 书签 HTML 导入文件大小上限：避免超大文件被整读进内存并阻塞主线程。 */
const IMPORT_FILE_MAX_BYTES = 10 * 1024 * 1024

export interface BookmarkImportDialogOptions {
  modelValue: Ref<boolean> | (() => boolean)
  setModelValue: (value: boolean) => void
  importAction?: (data: {
    categories: string[]
    items: ImportedBookmarkItem[]
  }) => Promise<number | void> | number | void
}

export const useBookmarkImportDialog = (options: {
  getModelValue: () => boolean
  setModelValue: (value: boolean) => void
  importAction?: BookmarkImportDialogOptions['importAction']
}) => {
  const { t } = useI18n()

  const step = ref(1)
  const parsedCategories = ref<ParsedBookmarkCategory[]>([])
  const importing = ref(false)
  const importedCount = ref(0)
  const selectedFileName = ref('')
  const fileInputRef = ref<HTMLInputElement | null>(null)
  const dialogPanelRef = ref<HTMLElement | null>(null)

  const totalBookmarks = computed(() =>
    parsedCategories.value.reduce((sum, cat) => sum + cat.items.length, 0)
  )

  const selectedCount = computed(() =>
    parsedCategories.value
      .filter((cat) => cat.selected)
      .reduce((sum, cat) => sum + cat.items.length, 0)
  )

  const resetState = () => {
    step.value = 1
    parsedCategories.value = []
    importing.value = false
    importedCount.value = 0
    selectedFileName.value = ''
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }

  const triggerFilePicker = () => {
    fileInputRef.value?.click()
  }

  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })

  const processFile = async (file?: File | null) => {
    if (!file) return
    selectedFileName.value = file.name

    if (file.size > IMPORT_FILE_MAX_BYTES) {
      ElMessage.error(t('bookmarkImport.fileTooLarge', { size: '10MB' }))
      return
    }

    try {
      const content = await readFile(file)
      const parsed = parseBookmarkHtml(content, t('admin.unnamedCategory'))
      if (parsed.length === 0) {
        ElMessage.warning(t('bookmarkImport.emptyWarning'))
        return
      }
      parsedCategories.value = parsed
      step.value = 2
    } catch (err) {
      ElMessage.error(t('bookmarkImport.parseError'))
      logger.error('Failed to parse bookmark import file.', err)
    } finally {
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
    }
  }

  const handleFileSelection = async (event: Event) => {
    const target = event.target as HTMLInputElement
    await processFile(target.files?.[0] || null)
  }

  const handleDrop = async (event: DragEvent) => {
    await processFile(event.dataTransfer?.files?.[0] || null)
  }

  const handleImport = async () => {
    if (importing.value) return
    step.value = 3
    importing.value = true
    const payload = buildBookmarkImportPayload(parsedCategories.value)
    importedCount.value = payload.items.length
    try {
      const result = await options.importAction?.(payload)
      if (typeof result === 'number') {
        importedCount.value = result
      }
      importing.value = false
    } catch {
      importing.value = false
      step.value = 2
    }
  }

  const handleClose = () => {
    options.setModelValue(false)
    setTimeout(() => {
      resetState()
    }, 200)
  }

  // 打开聚焦、Tab 焦点陷阱、Esc 关闭、关闭后焦点归还触发元素。
  useDialogA11y({
    isOpen: () => options.getModelValue(),
    getDialog: () => dialogPanelRef.value,
    onClose: handleClose
  })

  const handleDialogKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && options.getModelValue()) {
      handleClose()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleDialogKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleDialogKeydown)
  })

  return {
    step,
    parsedCategories,
    importing,
    importedCount,
    selectedFileName,
    fileInputRef,
    dialogPanelRef,
    totalBookmarks,
    selectedCount,
    triggerFilePicker,
    processFile,
    handleFileSelection,
    handleDrop,
    handleImport,
    handleClose
  }
}
