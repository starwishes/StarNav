import { onMounted, onUnmounted, reactive, ref } from 'vue'

import { ElMessage, ElMessageBox } from '@/utils/feedback'

import {
  buildUserUpdatePayload,
  createAddUserForm,
  createEditUserForm
} from '@/components/admin/userTableHelpers'

type UserRow = {
  username: string
  level: number
}

type UserTableEmit = {
  (event: 'update-level', username: string, level: number): void
  (
    event: 'add',
    payload: {
      username: string
      password: string
      level: number
    }
  ): void
  (
    event: 'update',
    username: string,
    payload: {
      newUsername: string
      password?: string
    }
  ): void
  (event: 'delete', username: string): void
}

export const useUserTableDialogs = (emit: UserTableEmit, t: (key: string) => string) => {
  const showAddDialog = ref(false)
  const addForm = reactive(createAddUserForm())

  const showEditDialog = ref(false)
  const currentEditUser = ref('')
  const editForm = reactive(createEditUserForm())

  const resetAddForm = () => {
    Object.assign(addForm, createAddUserForm())
  }

  const openAddDialog = () => {
    resetAddForm()
    showAddDialog.value = true
  }

  const closeAddDialog = () => {
    showAddDialog.value = false
  }

  const confirmAdd = () => {
    if (!addForm.username || !addForm.password) {
      ElMessage.warning(t('admin.userFieldsRequired'))
      return
    }

    emit('add', { ...addForm })
    closeAddDialog()
    resetAddForm()
  }

  const closeEditDialog = () => {
    showEditDialog.value = false
  }

  const handleEdit = (row: UserRow) => {
    currentEditUser.value = row.username
    Object.assign(editForm, createEditUserForm(row.username))
    showEditDialog.value = true
  }

  const confirmEdit = () => {
    emit(
      'update',
      currentEditUser.value,
      buildUserUpdatePayload(editForm.newUsername, editForm.password)
    )
    closeEditDialog()
  }

  const handleDelete = async (row: UserRow) => {
    try {
      await ElMessageBox.confirm(t('users.deleteConfirm'), t('common.warning'), {
        type: 'warning',
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel')
      })
      emit('delete', row.username)
    } catch {
      /* cancelled */
    }
  }

  const handleLevelChange = (row: UserRow, nextValue: string | number | null | undefined) => {
    const level = Number(nextValue)
    if (level !== row.level) {
      emit('update-level', row.username, level)
    }
  }

  const handleDialogKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return

    if (showEditDialog.value) {
      closeEditDialog()
      return
    }

    if (showAddDialog.value) {
      closeAddDialog()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleDialogKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleDialogKeydown)
  })

  return {
    showAddDialog,
    addForm,
    openAddDialog,
    closeAddDialog,
    confirmAdd,
    showEditDialog,
    editForm,
    closeEditDialog,
    handleEdit,
    confirmEdit,
    handleDelete,
    handleLevelChange
  }
}
