import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/store/config'
import { formatDateTime } from '@/utils/datetime'

export function useDateTimeFormatter() {
  const { locale } = useI18n()
  const configStore = useConfigStore()

  const format = (value: string | number | Date | null | undefined, fallback = '-') =>
    formatDateTime(value, {
      locale: locale.value || undefined,
      timeZone: configStore.siteConfig.timezone || undefined,
      fallback
    })

  return {
    formatDateTime: format
  }
}
