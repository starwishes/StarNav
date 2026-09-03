<template>
  <section class="settings-section">
    <div class="section-head">
      <h3 class="section-title">{{ t('settings.accountSettings') }}</h3>
      <p class="section-copy">{{ t('settings.accountSettingsTip') }}</p>
    </div>

    <div class="section-fields">
      <div class="setting-block setting-block--toggle" data-setting-field="registrationEnabled">
        <div class="setting-copy">
          <label class="setting-label">{{ t('settings.registration') }}</label>
          <div class="form-tip">{{ t('settings.registrationTip') }}</div>
        </div>
        <label class="toggle-switch">
          <input v-model="registrationEnabled" class="toggle-input" type="checkbox" />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </label>
      </div>

      <label class="setting-block" data-setting-field="defaultUserLevel">
        <span class="setting-label">{{ t('settings.defaultLevel') }}</span>
        <span class="form-tip">{{ t('settings.defaultLevelTip') }}</span>
        <AppSelect
          v-model.number="defaultUserLevel"
          class="settings-select"
          :label="t('settings.defaultLevel')"
        >
          <option
            v-for="option in defaultLevelOptions"
            :key="String(option.value)"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </AppSelect>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppSelect from '@/components/AppSelect.vue'

const { t } = useI18n()

const props = defineProps<{
  registrationEnabled?: boolean
  defaultUserLevel?: number
  defaultLevelOptions: { label: string; value: number }[]
}>()

const emit = defineEmits<{
  (e: 'update:registrationEnabled', value: boolean): void
  (e: 'update:defaultUserLevel', value: number): void
}>()

const registrationEnabled = computed({
  get: () => props.registrationEnabled,
  set: (value: boolean) => emit('update:registrationEnabled', value)
})

const defaultUserLevel = computed({
  get: () => props.defaultUserLevel,
  set: (value: number) => emit('update:defaultUserLevel', value)
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

.setting-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.settings-select {
  width: 100%;
  border: 1px solid var(--settings-control-border);
  border-radius: 14px;
  background: var(--settings-control-bg);
  color: var(--settings-control-text);
  font-size: 14px;
  font-family: var(--ui-font-body, inherit);
  padding: 0 40px 0 14px;
  min-height: 46px;
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

.settings-select option,
.settings-select optgroup {
  background: var(--settings-control-bg);
  color: var(--settings-control-text);
}

.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  align-self: flex-start;
}

.toggle-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
}

.toggle-track {
  position: relative;
  width: 58px;
  height: 32px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.38);
  transition: background-color 0.18s ease;
}

.toggle-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.16);
  transition: transform 0.18s ease;
}

.toggle-input:checked + .toggle-track {
  background: rgba(var(--ui-theme-rgb), 0.88);
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  transform: translateX(26px);
}
</style>
