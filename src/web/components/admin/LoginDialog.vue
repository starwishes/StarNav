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
          <button
            type="button"
            class="dialog-close"
            :aria-label="t('auth.closeDialog')"
            @click="closeDialog"
          >
            ×
          </button>

          <div class="login-content">
            <div class="login-tabs" role="tablist" :aria-label="t('auth.tabsLabel')">
              <button
                type="button"
                role="tab"
                class="tab-button"
                :class="{ active: mode === 'login' }"
                :aria-selected="mode === 'login'"
                @click="mode = 'login'"
              >
                {{ t('nav.login') }}
              </button>
              <button
                v-if="registrationEnabled"
                type="button"
                role="tab"
                class="tab-button"
                :class="{ active: mode === 'register' }"
                :aria-selected="mode === 'register'"
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
                    :aria-invalid="formErrors.username || undefined"
                    @input="clearFieldError('username')"
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
                    :aria-invalid="formErrors.password || undefined"
                    @input="clearFieldError('password')"
                  />
                </div>
              </label>

              <label v-if="mode === 'login'" class="dialog-checkbox">
                <input v-model="loginForm.remember" type="checkbox" />
                <span>{{ t('auth.rememberMe') }}</span>
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
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '@/store/admin'
import { useConfigStore } from '@/store/config'
import { useDialogA11y } from '@/composables/useDialogA11y'
import { ElMessage } from '@/utils/feedback'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

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
  password: '',
  remember: false
})

// 校验失败标记：绑定 aria-invalid 供读屏播报。
// aria-describedby 暂不关联——错误以瞬态 toast 呈现，DOM 中无常驻错误文本
// 元素可指向；引入常驻错误文案会改变交互结构，本轮先做 aria-invalid。
const formErrors = reactive<{ username: boolean; password: boolean }>({
  username: false,
  password: false
})

const clearFieldError = (field: 'username' | 'password') => {
  formErrors[field] = false
}

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

onMounted(() => {
  document.addEventListener('keydown', handleDialogKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleDialogKeydown)
})

const closeDialog = () => {
  visible.value = false
}

// 打开聚焦、Tab 焦点陷阱、Esc 关闭、关闭后焦点归还触发元素。
useDialogA11y({
  isOpen: () => props.modelValue,
  getDialog: () => dialogPanelRef.value,
  getInitialFocus: () => usernameInputRef.value,
  onClose: closeDialog
})

const handleDialogKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && visible.value) {
    closeDialog()
  }
}

const handleSubmit = async () => {
  if (!loginForm.username || !loginForm.password) {
    formErrors.username = !loginForm.username
    formErrors.password = !loginForm.password
    ElMessage.warning(t('auth.loginFieldsRequired'))
    return
  }

  loading.value = true
  try {
    if (mode.value === 'login') {
      const result = await adminStore.login(
        loginForm.username,
        loginForm.password,
        loginForm.remember
      )
      if (result.success) {
        ElMessage.success(t('auth.loginSuccess'))
        closeDialog()
        // Honor an internal redirect target (router guard sets `redirect`
        // when a non-admin visits /admin/dashboard). Only allow site-relative
        // paths — never `//host` (protocol-relative) or external URLs.
        if (route.query.login || route.query.redirect) {
          const nextQuery = { ...route.query }
          delete nextQuery.login
          delete nextQuery.redirect
          const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
          if (redirect.startsWith('/') && !redirect.startsWith('//')) {
            void router.replace(redirect).catch(() => {})
          } else {
            void router.replace({ path: route.path, query: nextQuery }).catch(() => {})
          }
        }
      } else {
        ElMessage.error(result.error || t('auth.loginFailed'))
      }
    } else {
      const result = await adminStore.register(loginForm.username, loginForm.password)
      if (result.success) {
        ElMessage.success(t('auth.registerSuccess'))
        mode.value = 'login'
      } else {
        // store.register 恒返回非空 error，此兜底实际不可达；与 login 分支同口径统一为
        // auth.registerFailed（第 23 轮审查：原用 admin.operationFailed，口径不一致）
        ElMessage.error(result.error || t('auth.registerFailed'))
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
.login-dialog-backdrop {
  --login-backdrop-bg: rgba(15, 23, 42, 0.52);
  position: fixed;
  inset: 0;
  z-index: 260;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--login-backdrop-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.login-dialog-shell {
  --login-shell-bg: rgba(255, 255, 255, 0.96);
  --login-shell-border: rgba(255, 255, 255, 0.44);
  --login-shell-shadow: 0 26px 68px rgba(15, 23, 42, 0.24);
  --login-shell-inset: rgba(255, 255, 255, 0.7);
  --login-shell-text: var(--ui-text-primary, #0f172a);
  --login-shell-muted: var(--ui-text-muted, rgba(71, 85, 105, 0.78));
  --login-close-bg: rgba(148, 163, 184, 0.14);
  --login-close-text: rgba(15, 23, 42, 0.7);
  --login-tab-bg: rgba(148, 163, 184, 0.12);
  --login-tab-text: rgba(100, 116, 139, 0.92);
  --login-label-text: rgba(15, 23, 42, 0.8);
  --login-prefix-text: rgba(100, 116, 139, 0.82);
  --login-input-bg: rgba(255, 255, 255, 0.92);
  --login-input-border: rgba(148, 163, 184, 0.34);
  --login-input-focus-bg: #ffffff;
  --login-input-placeholder: rgba(100, 116, 139, 0.62);
  position: relative;
  width: min(100%, 420px);
  box-sizing: border-box;
  /* 移动端软键盘/横屏下限制高度，内容可滚动而不被视口裁剪 */
  max-height: min(86vh, 860px);
  overflow-y: auto;
  border-radius: 22px;
  border: 1px solid var(--login-shell-border);
  background: var(--login-shell-bg);
  box-shadow:
    var(--login-shell-shadow),
    inset 0 1px 0 var(--login-shell-inset);
  outline: none;
  color: var(--login-shell-text);
  transition:
    background-color 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    color 0.22s ease;
}

.dialog-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--login-close-bg);
  color: var(--login-close-text);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: rgba(var(--ui-theme-rgb), 0.12);
    color: var(--ui-theme);
    transform: rotate(90deg);
  }
}

.login-content {
  box-sizing: border-box;
  padding: 28px 32px 32px;
}

.login-tabs {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 28px;
}

.tab-button {
  min-width: 108px;
  min-height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: var(--login-tab-bg);
  color: var(--login-tab-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &.active {
    background: linear-gradient(135deg, var(--ui-theme), rgba(var(--ui-theme-rgb), 0.74));
    box-shadow: 0 12px 24px rgba(var(--ui-theme-rgb), 0.18);
    color: #fff;
  }
}

.dialog-header {
  text-align: center;
  margin-bottom: 22px;
}

.dialog-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--ui-theme-rgb), 0.82);
}

.dialog-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--login-shell-text);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--login-label-text);
}

.input-with-prefix {
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

.input-prefix {
  position: absolute;
  inset: 0 auto 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--login-prefix-text);
  pointer-events: none;
}

.prefix-icon {
  width: 16px;
  height: 16px;
}

.dialog-input {
  width: 100%;
  min-height: 48px;
  box-sizing: border-box;
  padding: 0 14px;
  border: 1px solid var(--login-input-border);
  border-radius: 14px;
  background: var(--login-input-bg);
  color: var(--login-shell-text);
  font-size: 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &::placeholder {
    color: var(--login-input-placeholder);
  }

  &:focus {
    outline: none;
    border-color: rgba(var(--ui-theme-rgb), 0.6);
    box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.12);
    background: var(--login-input-focus-bg);
  }
}

.with-prefix {
  padding-left: 42px;
}

.login-btn {
  width: 100%;
  min-height: 48px;
  margin-top: 4px;
  box-sizing: border-box;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--ui-theme), rgba(var(--ui-theme-rgb), 0.74));
  box-shadow: 0 14px 28px rgba(var(--ui-theme-rgb), 0.2);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }
}

.login-dialog-enter-active,
.login-dialog-leave-active {
  transition: opacity 0.22s ease;
}

.login-dialog-enter-active .login-dialog-shell,
.login-dialog-leave-active .login-dialog-shell {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.login-dialog-enter-from,
.login-dialog-leave-to {
  opacity: 0;
}

.login-dialog-enter-from .login-dialog-shell,
.login-dialog-leave-to .login-dialog-shell {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

:global(:root[theme-mode='dark'] .login-dialog-backdrop) {
  --login-backdrop-bg: rgba(2, 6, 23, 0.72);
}

:global(:root[theme-mode='dark'] .login-dialog-shell) {
  --login-shell-bg: rgba(8, 12, 20, 0.94);
  --login-shell-border: rgba(255, 255, 255, 0.08);
  --login-shell-shadow: 0 30px 72px rgba(0, 0, 0, 0.42);
  --login-shell-inset: rgba(255, 255, 255, 0.08);
  --login-shell-text: #f8fafc;
  --login-shell-muted: rgba(226, 232, 240, 0.74);
  --login-close-bg: rgba(255, 255, 255, 0.08);
  --login-close-text: rgba(226, 232, 240, 0.72);
  --login-tab-bg: rgba(255, 255, 255, 0.06);
  --login-tab-text: rgba(226, 232, 240, 0.66);
  --login-label-text: rgba(226, 232, 240, 0.82);
  --login-prefix-text: rgba(226, 232, 240, 0.56);
  --login-input-bg: rgba(255, 255, 255, 0.06);
  --login-input-border: rgba(255, 255, 255, 0.12);
  --login-input-focus-bg: rgba(255, 255, 255, 0.1);
  --login-input-placeholder: rgba(226, 232, 240, 0.46);
}

@media screen and (max-width: 768px) {
  .login-dialog-shell {
    width: min(100%, 320px);
  }
}

@media screen and (max-width: 480px) {
  .login-dialog-backdrop {
    padding: 16px;
  }

  .login-dialog-shell {
    width: min(100%, 280px);
  }

  .login-content {
    padding: 24px 20px 20px;
  }

  .login-tabs {
    gap: 8px;
  }

  .tab-button {
    min-width: 0;
    flex: 1;
  }
}

@media screen and (max-width: 375px) {
  .login-dialog-shell {
    width: min(100%, 260px);
  }

  .login-content {
    padding: 22px 16px 16px;
  }
}
</style>
