<template>
  <div class="home-wallpaper">
    <section
      class="bg"
      :class="{
        'is-custom': hasCustomBackground,
        'is-default-art': !hasCustomBackground,
        'is-deferred': !hasCustomBackground && !visible
      }"
    >
      <!--
        Custom backgrounds are applied once on document.body by the config store
        (fixed cover). This layer only adds the hero dimming overlay so the same
        image is never painted twice with different crops (which creates a seam).
      -->
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

const showDefaultArt = computed(() => !hasCustomBackground.value && props.visible)
</script>

<style scoped lang="scss">
.home-wallpaper {
  position: absolute;
  inset: 0 0 auto 0;
  height: 560px;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg {
  position: absolute;
  inset: 0;
  transition: opacity 0.6s ease;

  /* Transparent over body-level custom wallpaper; default art paints its own base. */
  &.is-custom {
    background: transparent;
  }

  &.is-default-art {
    background: #000;
  }

  &.is-default-art.is-deferred {
    background: transparent;
    opacity: 0;
  }
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.56));
}

/* Custom wallpaper lives on body (full viewport). Fade the hero dimmer out so
   it does not leave a hard brightness edge at the 560px band boundary. */
.bg.is-custom .bg-overlay {
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.28) 42%,
    rgba(0, 0, 0, 0) 100%
  );
}

.bg-stars,
.bg-orb {
  position: absolute;
  inset: 0;
}

.bg-stars {
  opacity: 0.38;
  background-repeat: no-repeat;
  mix-blend-mode: screen;
}

.bg-stars-near {
  background-image:
    radial-gradient(circle at 12% 22%, rgba(255, 255, 255, 0.7) 0 1.6px, transparent 3px),
    radial-gradient(circle at 28% 18%, rgba(255, 255, 255, 0.62) 0 1.2px, transparent 3px),
    radial-gradient(circle at 62% 14%, rgba(255, 255, 255, 0.58) 0 1.4px, transparent 3px),
    radial-gradient(circle at 81% 28%, rgba(255, 255, 255, 0.65) 0 1.5px, transparent 3px),
    radial-gradient(circle at 74% 46%, rgba(255, 255, 255, 0.42) 0 1px, transparent 2px);
}

.bg-stars-far {
  background-image:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.36) 0 0.8px, transparent 1.8px),
    radial-gradient(circle at 43% 24%, rgba(255, 255, 255, 0.3) 0 0.8px, transparent 1.8px),
    radial-gradient(circle at 66% 16%, rgba(255, 255, 255, 0.28) 0 0.8px, transparent 1.8px),
    radial-gradient(circle at 88% 10%, rgba(255, 255, 255, 0.24) 0 0.8px, transparent 1.8px);
}

.bg-halo {
  position: absolute;
  top: 90px;
  left: 50%;
  width: min(62vw, 700px);
  height: 320px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(var(--ui-theme-rgb), 0.34),
    rgba(var(--ui-theme-rgb), 0.08) 42%,
    rgba(0, 0, 0, 0) 72%
  );
  filter: blur(22px);
}

.bg-orb {
  inset: auto;
  top: 136px;
  left: 50%;
  width: 96px;
  height: 96px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 34%,
    rgba(255, 255, 255, 0.9),
    rgba(var(--ui-theme-rgb), 0.72) 42%,
    rgba(0, 0, 0, 0.76) 100%
  );
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 24px 40px rgba(0, 0, 0, 0.38);
  opacity: 0.92;
}

.bg-floor {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 240px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0), var(--gray-0) 86%);
}

@media screen and (max-width: 768px) {
  .home-wallpaper {
    height: 500px;
  }

  .bg-halo {
    width: min(92vw, 520px);
    height: 260px;
    top: 100px;
  }
}
</style>
