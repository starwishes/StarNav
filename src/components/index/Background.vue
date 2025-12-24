<template>
  <div class="home-wallpaper">
    <section class="bg" :style="bgStyle"></section>
    <div class="bg-shadow"></div>
    <div class="bg-fiiter"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const backgroundUrl = ref('');
const defaultBg = '/src/assets/img/wallpaper/khadmv.webp';

// 获取公开设置
const fetchSettings = async () => {
  try {
    const res = await fetch('/api/public-settings');
    const data = await res.json();
    if (data.backgroundUrl) {
      backgroundUrl.value = data.backgroundUrl;
    }
  } catch (err) {
    console.error('获取背景设置失败', err);
  }
};

onMounted(fetchSettings);

const bgStyle = computed(() => ({
  backgroundImage: `url(${backgroundUrl.value || defaultBg})`
}));
</script>

<style lang="scss" scoped>
.home-wallpaper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  .bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-position: center center;
    background-size: cover;
    transition: filter 0.5s ease, background-image 0.5s ease;
  }

  .bg-shadow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: background-color 0.5s ease;
  }
  .bg-fiiter {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }
}

:root[theme-mode='dark'] {
  .bg {
    filter: brightness(0.6) contrast(1.1);
  }
  .bg-shadow {
    background-color: rgba(0, 0, 0, 0.4);
  }
}
.fullscreen {
  width: 100% !important;
  height: 100% !important;
}
</style>
