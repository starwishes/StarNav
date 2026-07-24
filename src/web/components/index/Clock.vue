<template>
  <div class="hs-clock">
    <div class="time">
      <span ref="hour" class="hour">{{ hours }}</span>
      <div class="text">{{ separator1 }}</div>
      <span ref="minute" class="minute">{{ minutes }}</span>
      <div class="text">{{ separator2 }}</div>
      <span ref="second" class="second">{{ seconds }}</span>
      <template v-if="isZh">
        <div class="text">秒</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/store/config'

const { locale } = useI18n()
const configStore = useConfigStore()

const hours = ref('00')
const minutes = ref('00')
const seconds = ref('00')
const isZh = computed(() => locale.value === 'zh-CN')
const timezone = computed(() => configStore.siteConfig.timezone)

const separator1 = computed(() => (isZh.value ? '时' : ':'))
const separator2 = computed(() => (isZh.value ? '分' : ':'))

let timerId: number | null = null

const clock = () => {
  const baseOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }

  const now = new Date()
  const timeStr = (() => {
    try {
      return now.toLocaleString('en-GB', {
        ...baseOptions,
        ...(timezone.value ? { timeZone: timezone.value } : {})
      })
    } catch {
      return now.toLocaleString('en-GB', baseOptions)
    }
  })()

  const parts = timeStr.split(':')

  if (parts.length === 3) {
    hours.value = parts[0]
    minutes.value = parts[1]
    seconds.value = parts[2]
  }
}

onMounted(() => {
  clock()
  timerId = window.setInterval(clock, 1000)
})

onUnmounted(() => {
  if (timerId !== null) {
    window.clearInterval(timerId)
  }
})
</script>

<style scoped lang="scss">
@import './Clock.scss';
</style>

