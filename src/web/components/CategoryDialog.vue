<template>
  <Teleport to="body">
    <transition name="category-dialog">
      <div v-if="visible" class="category-dialog-backdrop" @click.self="handleClose">
        <div
          ref="dialogPanelRef"
          class="category-dialog-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-dialog-title"
          tabindex="-1"
        >
          <header class="category-dialog-header">
            <div>
              <p class="dialog-kicker">Category</p>
              <h3 id="category-dialog-title" class="dialog-title">
                {{ isEdit ? t('category.editCategory') : t('category.addCategory') }}
              </h3>
            </div>
            <button
              type="button"
              class="dialog-close"
              :aria-label="t('category.closeDialog')"
              @click="handleClose"
            >
              ×
            </button>
          </header>

          <form v-if="localForm" class="dialog-form" @submit.prevent="handleSave">
            <label class="dialog-field">
              <span class="dialog-label">{{ t('category.id') }}</span>
              <input
                v-model.number="localForm.id"
                class="dialog-input"
                type="number"
                min="1"
                :disabled="isEdit"
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-label">{{ t('category.name') }}</span>
              <input
                ref="nameInputRef"
                v-model="localForm.name"
                class="dialog-input"
                :placeholder="t('category.placeholderName')"
                autocomplete="off"
                :aria-invalid="nameInvalid || undefined"
                @input="nameInvalid = false"
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-label">{{ t('category.permission') }}</span>
              <AppSelect
                v-model.number="localForm.level"
                class="dialog-select"
                :label="t('category.permission')"
              >
                <option :value="0">{{ t('userLevel.guest') }} ({{ t('category.public') }})</option>
                <option :value="1">{{ t('userLevel.user') }}</option>
                <option :value="2">{{ t('userLevel.vip') }}</option>
                <option :value="3">{{ t('userLevel.admin') }}</option>
              </AppSelect>
            </label>

            <footer class="dialog-footer">
              <button type="button" class="dialog-button ghost" @click="handleClose">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" class="dialog-button primary">
                {{ t('common.confirm') }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AppSelect from '@/components/AppSelect.vue'
import type { Category } from '@/types'
import { useI18n } from 'vue-i18n'
import { useDialogA11y } from '@/composables/useDialogA11y'
import { ElMessage } from '@/utils/feedback'
import { cloneCategoryDialogForm } from '@/components/categoryDialogHelpers'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  form: Partial<Category>
  isEdit: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:form', value: Partial<Category>): void
  (e: 'save'): void
}>()

const visible = computed(() => props.modelValue)
const localForm = ref<Partial<Category> | null>(null)
const dialogPanelRef = ref<HTMLElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)
// 空分类名校验失败标记：绑定 aria-invalid 供读屏播报。
// aria-describedby 暂不关联——错误以瞬态 toast 呈现，DOM 中无常驻错误文本元素可指向。
const nameInvalid = ref(false)

const syncLocalForm = () => {
  localForm.value = cloneCategoryDialogForm(props.form)
  nameInvalid.value = false
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) {
      localForm.value = null
      return
    }

    syncLocalForm()
  },
  { immediate: true }
)

watch(
  () => props.form,
  () => {
    if (visible.value) {
      syncLocalForm()
    }
  }
)

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSave = () => {
  if (!localForm.value) {
    return
  }

  if (!String(localForm.value.name || '').trim()) {
    nameInvalid.value = true
    ElMessage.warning(t('category.nameRequired'))
    return
  }

  emit('update:form', cloneCategoryDialogForm(localForm.value))
  emit('save')
}

const handleDialogKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && visible.value) {
    handleClose()
  }
}

// 打开聚焦、Tab 焦点陷阱、Esc 关闭、关闭后焦点归还触发元素。
useDialogA11y({
  isOpen: () => props.modelValue,
  getDialog: () => dialogPanelRef.value,
  getInitialFocus: () => nameInputRef.value,
  onClose: handleClose
})

onMounted(() => {
  document.addEventListener('keydown', handleDialogKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleDialogKeydown)
})
</script>

<style scoped lang="scss">
.category-dialog-shell {
  --category-dialog-bg: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98),
    rgba(248, 250, 252, 0.96)
  );
  --category-dialog-border: rgba(255, 255, 255, 0.45);
  --category-dialog-text: #0f172a;
  --category-dialog-muted: rgba(15, 23, 42, 0.8);
  --category-dialog-line: rgba(148, 163, 184, 0.18);
  --category-dialog-close-bg: rgba(148, 163, 184, 0.14);
  --category-dialog-close-text: rgba(15, 23, 42, 0.7);
  --category-dialog-input-bg: rgba(255, 255, 255, 0.92);
  --category-dialog-input-focus-bg: rgba(255, 255, 255, 0.98);
  --category-dialog-input-border: rgba(148, 163, 184, 0.34);
  --category-dialog-placeholder: rgba(100, 116, 139, 0.74);
  --category-dialog-ghost-bg: rgba(148, 163, 184, 0.14);
  --category-dialog-ghost-text: rgba(15, 23, 42, 0.82);
}

:global(:root[theme-mode='dark'] .category-dialog-shell) {
  --category-dialog-bg: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.92));
  --category-dialog-border: rgba(148, 163, 184, 0.2);
  --category-dialog-text: #f8fafc;
  --category-dialog-muted: rgba(226, 232, 240, 0.84);
  --category-dialog-line: rgba(148, 163, 184, 0.18);
  --category-dialog-close-bg: rgba(51, 65, 85, 0.78);
  --category-dialog-close-text: rgba(226, 232, 240, 0.84);
  --category-dialog-input-bg: rgba(15, 23, 42, 0.88);
  --category-dialog-input-focus-bg: rgba(15, 23, 42, 0.96);
  --category-dialog-input-border: rgba(148, 163, 184, 0.26);
  --category-dialog-placeholder: rgba(203, 213, 225, 0.56);
  --category-dialog-ghost-bg: rgba(51, 65, 85, 0.78);
  --category-dialog-ghost-text: rgba(226, 232, 240, 0.88);
  color-scheme: dark;
}

.category-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 240;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(18px);
}

.category-dialog-shell {
  width: min(100%, 500px);
  /* 移动端软键盘/横屏下限制高度，内容可滚动而不被视口裁剪 */
  max-height: min(86vh, 860px);
  overflow-y: auto;
  border-radius: 24px;
  border: 1px solid var(--category-dialog-border);
  background: var(--category-dialog-bg);
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  color: var(--category-dialog-text);
  outline: none;
}

.category-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 16px;
  border-bottom: 1px solid var(--category-dialog-line);
}

.dialog-kicker {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--ui-theme-rgb), 0.82);
}

.dialog-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.dialog-close,
.dialog-button {
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

.dialog-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--category-dialog-close-bg);
  color: var(--category-dialog-close-text);
  font-size: 22px;
  line-height: 1;

  &:hover {
    background: rgba(var(--ui-theme-rgb), 0.12);
    color: var(--ui-theme);
    transform: rotate(90deg);
  }
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 22px 24px;
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--category-dialog-muted);
}

.dialog-input {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid var(--category-dialog-input-border);
  border-radius: 14px;
  background: var(--category-dialog-input-bg);
  color: var(--category-dialog-text);
  font-size: 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;

  &::placeholder {
    color: var(--category-dialog-placeholder);
  }

  &:focus {
    outline: none;
    border-color: rgba(var(--ui-theme-rgb), 0.62);
    box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.12);
    background: var(--category-dialog-input-focus-bg);
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--category-dialog-text);
    -webkit-box-shadow: 0 0 0 1000px var(--category-dialog-input-focus-bg) inset;
    transition: background-color 9999s ease-in-out 0s;
  }
}

.dialog-select {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--category-dialog-input-border);
  border-radius: 14px;
  background: var(--category-dialog-input-bg);
  color: var(--category-dialog-text);
  font-size: 14px;
  padding: 0 40px 0 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;

  &:focus {
    outline: none;
    border-color: rgba(var(--ui-theme-rgb), 0.62);
    box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.12);
  }
}

.dialog-select option,
.dialog-select optgroup {
  background: var(--category-dialog-input-bg);
  color: var(--category-dialog-text);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
}

.dialog-button {
  min-width: 96px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;

  &.ghost {
    background: var(--category-dialog-ghost-bg);
    color: var(--category-dialog-ghost-text);
  }

  &.primary {
    background: linear-gradient(135deg, var(--ui-theme), rgba(var(--ui-theme-rgb), 0.74));
    box-shadow: 0 12px 24px rgba(var(--ui-theme-rgb), 0.2);
    color: #fff;
  }
}

.category-dialog-enter-active,
.category-dialog-leave-active {
  transition: opacity 0.2s ease;
}

.category-dialog-enter-active .category-dialog-shell,
.category-dialog-leave-active .category-dialog-shell {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.category-dialog-enter-from,
.category-dialog-leave-to {
  opacity: 0;
}

.category-dialog-enter-from .category-dialog-shell,
.category-dialog-leave-to .category-dialog-shell {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media screen and (max-width: 640px) {
  .category-dialog-backdrop {
    padding: 16px;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-button {
    width: 100%;
  }
}
</style>
