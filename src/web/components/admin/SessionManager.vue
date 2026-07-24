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
@import './SessionManager.scss';
</style>
