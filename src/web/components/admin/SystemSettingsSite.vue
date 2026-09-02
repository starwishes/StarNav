<template>
  <section class="settings-section">
    <div class="section-head">
      <h3 class="section-title">{{ t('settings.siteInfo') }}</h3>
      <p class="section-copy">{{ t('settings.siteInfoTip') }}</p>
    </div>

    <div class="section-fields">
      <label class="setting-block" data-setting-field="siteName">
        <span class="setting-label">{{ t('settings.siteNameSettings') }}</span>
        <span class="form-tip">{{ t('settings.siteNameTip') }}</span>
        <input
          v-model="siteName"
          class="settings-input"
          :placeholder="t('notification.siteName')"
          autocomplete="off"
        />
      </label>

      <label class="setting-block" data-setting-field="timezone">
        <span class="setting-label">{{ t('settings.timezone') }}</span>
        <span class="form-tip">{{ t('settings.timezoneTip') }}</span>
        <AppSelect v-model="timezone" class="settings-select">
          <option
            v-for="option in timezoneOptions"
            :key="option.value || 'local'"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </AppSelect>
      </label>

      <label class="setting-block" data-setting-field="homeUrl">
        <span class="setting-label">{{ t('settings.homeUrl') }}</span>
        <span class="form-tip">{{ t('settings.homeUrlTip') }}</span>
        <input
          v-model="homeUrl"
          class="settings-input"
          :placeholder="t('settings.homeUrlPlaceholder')"
          autocomplete="off"
          spellcheck="false"
        />
      </label>

      <label class="setting-block" data-setting-field="footerHtml">
        <span class="setting-label">{{ t('settings.footerHtml') }}</span>
        <span class="form-tip">{{ t('settings.footerHtmlTip') }}</span>
        <textarea
          v-model="footerHtml"
          class="settings-textarea"
          :rows="4"
          :placeholder="t('settings.footerPlaceholder')"
        />
        <button
          type="button"
          class="settings-button secondary fill-footer-btn"
          @click="$emit('fillDefaultFooter')"
        >
          {{ t('settings.useDefaultTemplate') }}
        </button>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppSelect from '@/components/AppSelect.vue'
import type { SelectValue } from '@/components/appSelectHelpers'

const { t } = useI18n()

const props = defineProps<{
  siteName?: string
  timezone?: string
  homeUrl?: string
  footerHtml?: string
  timezoneOptions: { label: string; value: string }[]
}>()

const emit = defineEmits<{
  (e: 'update:siteName', value: string): void
  (e: 'update:timezone', value: string): void
  (e: 'update:homeUrl', value: string): void
  (e: 'update:footerHtml', value: string): void
  (e: 'fillDefaultFooter'): void
}>()

const siteName = computed({
  get: () => props.siteName,
  set: (value: string) => emit('update:siteName', value)
})

const timezone = computed({
  get: () => props.timezone,
  set: (value: SelectValue) => emit('update:timezone', typeof value === 'string' ? value : '')
})

const homeUrl = computed({
  get: () => props.homeUrl,
  set: (value: string) => emit('update:homeUrl', value)
})

const footerHtml = computed({
  get: () => props.footerHtml,
  set: (value: string) => emit('update:footerHtml', value)
})
</script>

<style scoped lang="scss">
// 拆分子组件共享 .settings-section 等样式：样式按需复制，改一处需同步另两处（Account/Site/Assets）。
.settings-section {
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--ui-panel-bg, rgba(255, 255, 255, 0.72));
  border: 1px solid var(--ui-panel-border, rgba(148, 163, 184, 0.18));
  box-shadow: var(--ui-panel-shadow, 0 18px 38px rgba(15, 23, 42, 0.08));
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.section-copy {
  margin: 0;
  font-size: 13px;
  color: var(--ui-text-muted, rgba(71, 85, 105, 0.86));
  line-height: 1.45;
}

.section-fields {
  display: flex;
  flex-direction: column;
}

.section-fields > * + * {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--settings-divider);
}

.setting-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text-primary, rgba(15, 23, 42, 0.86));
}

.form-tip {
  margin-top: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ui-text-muted, rgba(71, 85, 105, 0.82));
}

.settings-input,
.settings-textarea {
  width: 100%;
  border: 1px solid var(--settings-control-border);
  border-radius: 14px;
  background: var(--settings-control-bg);
  color: var(--settings-control-text);
  font-size: 14px;
  font-family: var(--ui-font-body, inherit);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;

  &::placeholder {
    color: var(--settings-control-placeholder);
  }

  &:focus {
    outline: none;
    border-color: rgba(var(--ui-theme-rgb), 0.6);
    box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.12);
    background: var(--settings-control-focus-bg);
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--settings-control-text);
    -webkit-box-shadow: 0 0 0 1000px var(--settings-control-focus-bg) inset;
    transition: background-color 9999s ease-in-out 0s;
  }
}

.settings-select {
  width: 100%;
  border: 1px solid var(--settings-control-border);
  border-radius: 14px;
  background: var(--settings-control-bg);
  color: var(--settings-control-text);
  font-size: 14px;
  font-family: var(--ui-font-body, inherit);
  padding: 0 40px 0 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;

  &:focus {
    outline: none;
    border-color: rgba(var(--ui-theme-rgb), 0.6);
    box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.12);
  }
}

.settings-input,
.settings-select {
  min-height: 46px;
}

.settings-input {
  padding: 0 14px;
}

.settings-select option,
.settings-select optgroup {
  background: var(--settings-control-bg);
  color: var(--settings-control-text);
}

.settings-textarea {
  min-height: 112px;
  padding: 12px 14px;
  resize: vertical;
}

.settings-button {
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
    opacity: 0.66;
  }
}

.settings-button {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;

  &.secondary {
    background: var(--settings-secondary-bg);
    color: var(--settings-secondary-text);
  }
}

.fill-footer-btn {
  align-self: flex-start;
}
</style>
