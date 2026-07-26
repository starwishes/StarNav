<template>
  <div class="user-table">
    <section class="panel-card">
      <div class="card-header">
        <span class="card-title">{{ t('menu.users') }}</span>
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
                <th class="col-name">{{ t('common.username') }}</th>
                <th class="col-meta col-level" style="width: 160px">{{ t('users.level') }}</th>
                <th class="col-meta col-time" style="width: 220px">{{ t('users.regTime') }}</th>
                <th class="is-center col-actions" style="width: 320px">{{ t('common.action') }}</th>
              </tr>
            </thead>
          <tbody>
            <tr v-for="row in users" :key="row.username">
              <td class="col-name">{{ row.username }}</td>
              <td class="col-meta col-level">
                <span class="sn-badge" :class="getLevelClass(row.level)">
                  {{ getLevelName(row.level) }}
                </span>
              </td>
              <td class="col-meta col-time">{{ formatDate(row.createdAt) }}</td>
              <td class="is-center col-actions">
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
    </section>

    <UserAddDialog
      :model-value="showAddDialog"
      v-model:form="addForm"
      @close="closeAddDialog"
      @confirm="confirmAdd"
    />

    <UserEditDialog
      :model-value="showEditDialog"
      v-model:form="editForm"
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
  (
    e: 'update',
    username: string,
    payload: { newUsername: string; password?: string }
  ): void
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
.user-table {
  --user-panel-bg: var(--ui-panel-bg, rgba(255, 255, 255, 0.9));
  --user-panel-border: var(--ui-panel-border, rgba(148, 163, 184, 0.18));
  color: var(--ui-text-primary, #0f172a);
  container-type: inline-size;
  container-name: user-table;

  .panel-card {
    padding: 18px 20px;
    border-radius: 22px;
    border: 1px solid var(--user-panel-border);
    background: var(--user-panel-bg);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(14px);
  }

  .card-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--gray-800);
    white-space: nowrap;
  }

  .sn-table {
    min-width: 760px;
  }

  .sn-table th,
  .sn-table td {
    white-space: nowrap;
  }

  .sn-table-actions {
    flex-wrap: nowrap;
  }
}

@container user-table (max-width: 720px) {
  .col-time {
    display: none;
  }

  .sn-table {
    min-width: 560px;
  }
}

@container user-table (max-width: 520px) {
  .col-level {
    display: none;
  }

  .sn-table {
    min-width: 0;
  }

  .card-header {
    flex-wrap: wrap;
  }

  .toolbar-button {
    margin-left: auto;
  }
}

:global(:root[theme-mode='dark'] .user-table) {
  --user-panel-bg: rgba(15, 23, 42, 0.84);
  --user-panel-border: rgba(148, 163, 184, 0.2);
  color-scheme: dark;
}

.toolbar-button,
.table-link-button {
  border: none;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.toolbar-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  flex: 0 0 auto;
  white-space: nowrap;
  background: linear-gradient(135deg, var(--ui-theme), rgba(var(--ui-theme-rgb), 0.72));
  box-shadow: 0 10px 20px rgba(var(--ui-theme-rgb), 0.16);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.button-icon {
  width: 16px;
  height: 16px;
}

.level-select {
  min-width: 132px;
}

.table-link-button {
  padding: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 600;

  &.primary {
    color: var(--ui-theme);
  }

  &.danger {
    color: #dc2626;
  }
}

:global(:root[theme-mode='dark'] .user-table .level-select) {
  color-scheme: dark;
}
</style>
