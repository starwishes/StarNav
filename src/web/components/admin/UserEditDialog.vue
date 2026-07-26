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
              aria-label="关闭编辑用户弹窗"
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
                v-model="form.newUsername"
                class="dialog-input"
                :placeholder="t('users.inputUsername')"
                autocomplete="off"
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-label">{{ t('users.resetPassword') }}</span>
              <input
                v-model="form.password"
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
import { ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFocusOnOpen } from '@/composables/useFocusOnOpen'

type EditForm = {
  newUsername: string
  password: string
}

const props = defineProps<{
  modelValue: boolean
  form: EditForm
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
