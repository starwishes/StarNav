<template>
  <div class="home-wallpaper">
    <section
      class="bg"
      :class="{
        'is-default-art': !hasCustomBackground,
        'is-deferred': !hasCustomBackground && !visible
      }"
      :style="bgStyle"
    >
      <div v-if="hasCustomBackground || visible" class="bg-overlay"></div>
      <div v-if="showDefaultArt" class="bg-stars bg-stars-near"></div>
      <div v-if="showDefaultArt" class="bg-stars bg-stars-far"></div>
      <div v-if="showDefaultArt" class="bg-halo"></div>
      <div v-if="showDefaultArt" class="bg-orb"></div>
      <div v-if="showDefaultArt" class="bg-floor"></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/store/config'

const props = withDefaults(
  defineProps<{
    visible?: boolean
  }>(),
  {
    visible: true
  }
)

const configStore = useConfigStore()

const hasCustomBackground = computed(() => Boolean(configStore.siteConfig.backgroundUrl))

const bgStyle = computed(() =>
  hasCustomBackground.value
    ? {
        backgroundImage: `url(${configStore.siteConfig.backgroundUrl})`
      }
    : {}
)

const showDefaultArt = computed(() => !hasCustomBackground.value && props.visible)
</script>

<style scoped lang="scss">
@import './Background.scss';
</style>

