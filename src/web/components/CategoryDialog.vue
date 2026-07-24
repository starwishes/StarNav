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
              aria-label="关闭分类弹窗"
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
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-label">{{ t('category.permission') }}</span>
              <AppSelect v-model.number="localForm.level" class="dialog-select">
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import AppSelect from '@/components/AppSelect.vue'
import type { Category } from '@/types'
import { useI18n } from 'vue-i18n'
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

const syncLocalForm = () => {
  localForm.value = cloneCategoryDialogForm(props.form)
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) {
      localForm.value = null
      return
    }

    syncLocalForm()
    nextTick(() => {
      dialogPanelRef.value?.focus()
      nameInputRef.value?.focus()
    })
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

  emit('update:form', cloneCategoryDialogForm(localForm.value))
  emit('save')
}

const handleDialogKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && visible.value) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleDialogKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleDialogKeydown)
})
</script>

<style scoped lang="scss">
@import './CategoryDialog.scss';
</style>
