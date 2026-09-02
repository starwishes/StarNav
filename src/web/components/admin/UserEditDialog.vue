<template>
  <Teleport to="body">
    <transition name="user-dialog">
      <div v-if="modelValue" class="user-dialog-backdrop" @click.self="$emit('close')">
        <div
          ref="dialogRef"
          class="user-dialog-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-dialog-title"
          tabindex="-1"
        >
          <header class="user-dialog-header">
            <div>
              <p class="dialog-kicker">Admin</p>
              <h3 id="edit-user-dialog-title" class="dialog-title">{{ t('users.editUser') }}</h3>
            </div>
            <button
              type="button"
              class="dialog-close"
              :aria-label="t('users.closeEditDialog')"
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
                v-model="formModel.newUsername"
                class="dialog-input"
                :placeholder="t('users.inputUsername')"
                autocomplete="off"
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-label">{{ t('users.resetPassword') }}</span>
              <input
                v-model="formModel.password"
                class="dialog-input"
                type="password"
                :placeholder="t('users.resetPasswordPlaceholder')"
                autocomplete="new-password"
              />
            </label>

            <div class="form-tip">{{ t('users.usernameParams') }}</div>

            <footer class="dialog-footer">
              <button type="button" class="dialog-button ghost" @click="$emit('close')">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" class="dialog-button primary">
                {{ t('users.saveEdit') }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDialogA11y } from '@/composables/useDialogA11y'

type EditForm = {
  newUsername: string
  password: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const formModel = defineModel<EditForm>('form', { required: true })

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const { t } = useI18n()
const dialogRef = ref<HTMLElement | null>(null)
const usernameInputRef = ref<HTMLInputElement | null>(null)

// 打开聚焦、Tab 焦点陷阱、Esc 关闭、关闭后焦点归还触发元素。
useDialogA11y({
  isOpen: () => props.modelValue,
  getDialog: () => dialogRef.value,
  getInitialFocus: () => usernameInputRef.value,
  onClose: () => emit('close')
})
</script>

<style scoped lang="scss">
@use './UserDialog.scss';
</style>
