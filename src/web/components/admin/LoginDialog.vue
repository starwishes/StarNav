<template>
  <Teleport to="body">
    <transition name="login-dialog">
      <div v-if="visible" class="login-dialog-backdrop" @click.self="closeDialog">
        <div
          ref="dialogPanelRef"
          class="login-dialog-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-dialog-title"
          tabindex="-1"
        >
          <button type="button" class="dialog-close" aria-label="关闭登录弹窗" @click="closeDialog">
            ×
          </button>

          <div class="login-content">
            <div class="login-tabs">
              <button
                type="button"
                class="tab-button"
                :class="{ active: mode === 'login' }"
                @click="mode = 'login'"
              >
                {{ t('nav.login') }}
              </button>
              <button
                v-if="registrationEnabled"
                type="button"
                class="tab-button"
                :class="{ active: mode === 'register' }"
                @click="mode = 'register'"
              >
                {{ t('nav.register') }}
              </button>
            </div>

            <div class="dialog-header">
              <p class="dialog-kicker">StarNav Admin</p>
              <h2 id="login-dialog-title">
                {{ mode === 'login' ? t('nav.login') : t('nav.register') }}
              </h2>
            </div>

            <form class="auth-form" @submit.prevent="handleSubmit">
              <label class="dialog-field">
                <span class="dialog-label">{{ t('auth.username') }}</span>
                <div class="input-with-prefix">
                  <span class="input-prefix">
                    <AppIcon name="icon-md-contact" class="prefix-icon" />
                  </span>
                  <input
                    ref="usernameInputRef"
                    v-model="loginForm.username"
                    class="dialog-input with-prefix"
                    :placeholder="t('auth.username')"
                    autocomplete="username"
                  />
                </div>
              </label>

              <label class="dialog-field">
                <span class="dialog-label">{{ t('auth.password') }}</span>
                <div class="input-with-prefix">
                  <span class="input-prefix">
                    <AppIcon name="icon-md-lock" class="prefix-icon" />
                  </span>
                  <input
                    v-model="loginForm.password"
                    class="dialog-input with-prefix"
                    type="password"
                    :placeholder="t('auth.password')"
                    :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                  />
                </div>
              </label>

              <button type="submit" class="login-btn" :disabled="loading">
                {{
                  loading
                    ? t('common.loading')
                    : mode === 'login'
                      ? t('nav.login')
                      : t('nav.register')
                }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { computed, onMounted, onUnmounted, reactive, ref, watch, nextTick } from 'vue'
import { useAdminStore } from '@/store/admin'
import { useConfigStore } from '@/store/config'
import { ElMessage } from '@/utils/feedback'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const adminStore = useAdminStore()
const configStore = useConfigStore()
const loading = ref(false)
const mode = ref<'login' | 'register'>('login')
const dialogPanelRef = ref<HTMLElement | null>(null)
const usernameInputRef = ref<HTMLInputElement | null>(null)

const loginForm = reactive({
  username: '',
  password: ''
})

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const registrationEnabled = computed(() => configStore.siteConfig.registrationEnabled)

watch(
  registrationEnabled,
  (enabled) => {
    if (!enabled && mode.value === 'register') {
      mode.value = 'login'
    }
  },
  { immediate: true }
)

watch(visible, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      dialogPanelRef.value?.focus()
      usernameInputRef.value?.focus()
    })
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleDialogKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleDialogKeydown)
})

const closeDialog = () => {
  visible.value = false
}

const handleDialogKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && visible.value) {
    closeDialog()
  }
}

const handleSubmit = async () => {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning(t('auth.loginFailed'))
    return
  }

  loading.value = true
  try {
    if (mode.value === 'login') {
      const result = await adminStore.login(loginForm.username, loginForm.password)
      if (result.success) {
        ElMessage.success(t('auth.loginSuccess'))
        closeDialog()
      } else {
        ElMessage.error(result.error || t('auth.loginFailed'))
      }
    } else {
      const result = await adminStore.register(loginForm.username, loginForm.password)
      if (result.success) {
        ElMessage.success(t('auth.registerSuccess'))
        mode.value = 'login'
      } else {
        ElMessage.error(result.error || t('admin.operationFailed'))
      }
    }
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, t('admin.operationFailed')))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
@import './LoginDialog.scss';
</style>
