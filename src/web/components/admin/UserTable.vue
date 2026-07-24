<template>
  <div class="user-table">
    <div class="table-toolbar">
      <button type="button" class="toolbar-button" @click="openAddDialog">
        <AppIcon name="icon-tianjia-yonghu" class="button-icon" />
        <span>{{ t('users.addUser') }}</span>
      </button>
    </div>

    <div v-if="users.length === 0" class="sn-empty-state">
      {{ t('common.noData') }}
    </div>

    <div v-else class="sn-table-shell">
      <div class="sn-table-scroll">
        <table class="sn-table">
          <thead>
            <tr>
              <th>{{ t('common.username') }}</th>
              <th style="width: 160px">{{ t('users.level') }}</th>
              <th style="width: 220px">{{ t('users.regTime') }}</th>
              <th class="is-center" style="width: 320px">{{ t('common.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in users" :key="row.username">
              <td>{{ row.username }}</td>
              <td>
                <span class="sn-badge" :class="getLevelClass(row.level)">
                  {{ getLevelName(row.level) }}
                </span>
              </td>
              <td>{{ formatDate(row.createdAt) }}</td>
              <td class="is-center">
                <div class="sn-table-actions">
                  <AppSelect
                    class="sn-inline-select level-select"
                    :model-value="row.level"
                    :disabled="isLevelChangeDisabled(row.username)"
                    @change="(value) => handleLevelChange(row, value)"
                  >
                    <option :value="1">{{ t('userLevel.user') }} (1)</option>
                    <option :value="2">{{ t('userLevel.vip') }} (2)</option>
                    <option :value="3">{{ t('userLevel.admin') }} (3)</option>
                  </AppSelect>

                  <button
                    type="button"
                    class="table-link-button primary"
                    :disabled="isEditDisabled(row.username, adminStore.user?.login)"
                    @click="handleEdit(row)"
                  >
                    {{ t('common.edit') }}
                  </button>

                  <button
                    type="button"
                    class="table-link-button danger"
                    :disabled="isDeleteDisabled(row.username, adminStore.user?.login)"
                    @click="handleDelete(row)"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <UserAddDialog
      :model-value="showAddDialog"
      :form="addForm"
      @close="closeAddDialog"
      @confirm="confirmAdd"
    />

    <UserEditDialog
      :model-value="showEditDialog"
      :form="editForm"
      @close="closeEditDialog"
      @confirm="confirmEdit"
    />
  </div>
</template>

<script setup lang="ts">
import AppSelect from '@/components/AppSelect.vue'
import AppIcon from '@/components/AppIcon.vue'
import UserAddDialog from '@/components/admin/UserAddDialog.vue'
import UserEditDialog from '@/components/admin/UserEditDialog.vue'
import { useAdminStore } from '@/store/admin'
import { useI18n } from 'vue-i18n'
import {
  getUserLevelClass,
  getUserLevelTranslationKey,
  isDeleteDisabled,
  isEditDisabled,
  isLevelChangeDisabled
} from '@/components/admin/userTableHelpers'
import type { User as ApiUser } from '@/api'
import { useDateTimeFormatter } from '@/composables/useDateTimeFormatter'
import { useUserTableDialogs } from '@/components/admin/useUserTableDialogs'

type UserRow = ApiUser & {
  createdAt?: string
}

const { t } = useI18n()
const { formatDateTime } = useDateTimeFormatter()

defineProps<{ users: UserRow[] }>()

const emit = defineEmits<{
  (e: 'update-level', username: string, level: number): void
  (e: 'delete', username: string): void
  (e: 'add', payload: { username: string; password: string; level: number }): void
  (e: 'update', username: string, payload: { username: string; password?: string }): void
}>()

const adminStore = useAdminStore()
const {
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
} = useUserTableDialogs(emit, t)

const formatDate = (value?: string) => {
  return formatDateTime(value)
}

const getLevelName = (level: number) => {
  return t(getUserLevelTranslationKey(level))
}

const getLevelClass = (level: number) => {
  return getUserLevelClass(level)
}
</script>

<style scoped lang="scss">
@import './UserTable.scss';
</style>
