<template>
  <Teleport to="body">
    <transition name="user-dialog">
      <div v-if="modelValue" class="user-dialog-backdrop" @click.self="$emit('close')">
        <div
          ref="dialogRef"
          class="user-dialog-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-dialog-title"
          tabindex="-1"
        >
          <header class="user-dialog-header">
            <div>
              <p class="dialog-kicker">Admin</p>
              <h3 id="add-user-dialog-title" class="dialog-title">{{ t('users.addUser') }}</h3>
            </div>
            <button
              type="button"
              class="dialog-close"
              aria-label="关闭添加用户弹窗"
              @click="$emit('close')"
            >
              ×
            </button>
          </header>

          <form class="dialog-form" @submit.prevent="$emit('confirm')">
            <label class="dialog-field">
              <span class="dialog-label">{{ t('common.username') }}</span>
              <input
                ref="usernameInputRef"
                v-model="form.username"
                class="dialog-input"
                :placeholder="t('users.inputUsername')"
                autocomplete="off"
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-label">{{ t('users.password') }}</span>
              <input
                v-model="form.password"
                class="dialog-input"
                type="password"
                :placeholder="t('users.inputPassword')"
                autocomplete="new-password"
              />
              <span class="dialog-hint">{{ t('auth.passwordTip') }}</span>
            </label>

            <label class="dialog-field">
              <span class="dialog-label">{{ t('users.level') }}</span>
              <AppSelect v-model.number="form.level" class="dialog-select">
                <option :value="1">{{ t('userLevel.user') }} (1)</option>
                <option :value="2">{{ t('userLevel.vip') }} (2)</option>
                <option :value="3">{{ t('userLevel.admin') }} (3)</option>
              </AppSelect>
            </label>

            <footer class="dialog-footer">
              <button type="button" class="dialog-button ghost" @click="$emit('close')">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" class="dialog-button primary">
                {{ t('users.confirmAdd') }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import AppSelect from '@/components/AppSelect.vue'
import { useFocusOnOpen } from '@/composables/useFocusOnOpen'

type AddForm = {
  username: string
  password: string
  level: number
}

const props = defineProps<{
  modelValue: boolean
  form: AddForm
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const { t } = useI18n()
const dialogRef = ref<HTMLElement | null>(null)
const usernameInputRef = ref<HTMLInputElement | null>(null)

useFocusOnOpen(
  toRef(props, 'modelValue'),
  () => dialogRef.value,
  () => usernameInputRef.value
)
</script>

<style scoped lang="scss">
@use './UserDialog.scss';
</style>
