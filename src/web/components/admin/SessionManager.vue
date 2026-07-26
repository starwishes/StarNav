<template>
  <div class="session-manager">
    <div class="header">
      <h3>{{ t('sessions.title') }}</h3>
      <button type="button" class="table-button danger" @click="revokeOthers" :disabled="revoking">
        {{ t('sessions.revokeOthers') }}
      </button>
    </div>

    <div class="sn-table-shell" :class="{ 'is-loading': loading }" :aria-busy="loading">
      <div v-if="loading" class="table-loading">
        <div class="loading-spinner" aria-hidden="true"></div>
      </div>
      <div v-if="sessions.length === 0 && !loading" class="sn-empty-state">
        {{ t('common.empty') || 'No data' }}
      </div>
      <div v-else class="sn-table-scroll">
        <table class="sn-table">
          <thead>
            <tr>
              <th class="is-center" style="width: 90px"></th>
              <th style="width: 140px">{{ t('common.ip') }}</th>
              <th>{{ t('common.device') }}</th>
              <th style="width: 180px">{{ t('sessions.loginTime') }}</th>
              <th style="width: 180px">{{ t('sessions.lastActive') }}</th>
              <th class="is-center" style="width: 110px">{{ t('common.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in sessions" :key="session.sessionId">
              <td class="is-center">
                <span v-if="session.isCurrent" class="sn-badge is-success">
                  {{ t('sessions.current') }}
                </span>
              </td>
              <td>{{ session.ip || '-' }}</td>
              <td>{{ parseDevice(session.userAgent) }}</td>
              <td>{{ formatTime(session.createdAt) }}</td>
              <td>{{ formatTime(session.lastActiveAt) }}</td>
              <td class="is-center">
                <button
                  v-if="!session.isCurrent"
                  type="button"
                  class="table-button link danger"
                  @click="revokeSession(session.sessionId)"
                >
                  {{ t('sessions.revokeCurrent') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import { useI18n } from 'vue-i18n'
import { adminApi, type SessionRecord } from '@/api/admin'
import { useDateTimeFormatter } from '@/composables/useDateTimeFormatter'
import { describeUserAgent } from '@/utils/userAgent'
import { createScopedLogger } from '../../../shared/logger.js'

const { t } = useI18n()
const { formatDateTime } = useDateTimeFormatter()
const logger = createScopedLogger('web:session-manager')
const sessions = ref<SessionRecord[]>([])
const loading = ref(false)
const revoking = ref(false)

const fetchSessions = async () => {
  loading.value = true
  try {
    sessions.value = await adminApi.getSessions()
  } catch (err) {
    logger.error('Failed to fetch sessions.', err)
    ElMessage.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

const revokeSession = async (sessionId: string) => {
  try {
    await ElMessageBox.confirm(t('sessions.revokeConfirm'), t('common.confirm'), {
      type: 'warning'
    })
    await adminApi.revokeSession(sessionId)
    ElMessage.success(t('common.success'))
    fetchSessions()
  } catch {
    // 取消操作
  }
}

const revokeOthers = async () => {
  try {
    await ElMessageBox.confirm(t('sessions.revokeAllConfirm'), t('common.confirm'), {
      type: 'warning'
    })
    revoking.value = true
    const revokedCount = await adminApi.revokeOtherSessions()
    ElMessage.success(t('common.success') + ` ${revokedCount}`)
    fetchSessions()
  } catch {
    // 取消操作
  } finally {
    revoking.value = false
  }
}

const formatTime = (timestamp: string) => formatDateTime(timestamp)

const parseDevice = (ua: string) => describeUserAgent(ua, t('common.unknown'))

onMounted(fetchSessions)
</script>

<style scoped lang="scss">
.session-manager {
  --session-button-bg: rgba(255, 255, 255, 0.92);
  --session-button-border: rgba(148, 163, 184, 0.22);
  --session-button-text: var(--gray-700);
  --session-danger-bg: rgba(239, 68, 68, 0.12);
  --session-danger-border: rgba(239, 68, 68, 0.2);
  --session-danger-text: #b91c1c;
  --session-loading-bg: rgba(255, 255, 255, 0.62);
  color: var(--ui-text-primary, #0f172a);

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      margin: 0;
      font-size: 16px;
    }
  }
}

:global(:root[theme-mode='dark'] .session-manager) {
  --session-button-bg: rgba(15, 23, 42, 0.92);
  --session-button-border: rgba(148, 163, 184, 0.24);
  --session-button-text: rgba(226, 232, 240, 0.88);
  --session-danger-bg: rgba(239, 68, 68, 0.18);
  --session-danger-border: rgba(248, 113, 113, 0.22);
  --session-danger-text: #fca5a5;
  --session-loading-bg: rgba(2, 6, 23, 0.56);
}

.table-button {
  border: 1px solid var(--session-button-border);
  border-radius: 999px;
  background: var(--session-button-bg);
  color: var(--session-button-text);
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.table-button.link {
  border-color: transparent;
  background: transparent;
  padding: 0;
}

.table-button.danger {
  background: var(--session-danger-bg);
  border-color: var(--session-danger-border);
  color: var(--session-danger-text);
}

.sn-table-shell {
  position: relative;
}

.table-loading {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--session-loading-bg);
  backdrop-filter: blur(2px);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(var(--ui-theme-rgb), 0.15);
  border-top-color: rgb(var(--ui-theme-rgb));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
