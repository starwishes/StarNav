<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { useMainStore } from '@/store'
import PageHeader from '@/components/index/PageHeader.vue'
import Background from '@/components/index/Background.vue'
import Search from '@/components/index/Search.vue'
import Anchor from '@/components/index/Anchor.vue'
import Site from '@/components/index/Site.vue'
import Sidebar from '@/components/index/Sidebar.vue'
import Footer from '@/components/index/Footer.vue'
import LeftDrawer from '@/components/index/LeftDrawer.vue'

const siteRef = ref<InstanceType<typeof Site> | null>(null)
const store = useMainStore()
const isReady = ref(false)
const siteLoaded = ref(false)
const settingsLoaded = ref(false)

const checkReady = () => {
  if (siteLoaded.value && settingsLoaded.value) {
    // 确保 DOM 更新且浏览器完成重绘（包括毛玻璃效果渲染）
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 额外添加延时，确保复杂 CSS 效果（尤其是毛玻璃）完全稳定
          setTimeout(() => {
            isReady.value = true
          }, 200)
        })
      })
    })
  }
}

const onSiteLoaded = () => {
  siteLoaded.value = true
  checkReady()
}

onMounted(async () => {
  await store.fetchSettings()
  settingsLoaded.value = true
  checkReady()
})

</script>

<template>
  <div class="home">
    <!-- 背景 -->
    <Background></Background>
    <!-- 主要内容 -->
    <section class="content" :class="{ 'is-ready': isReady }">
      <PageHeader></PageHeader>
      <main ref="homeContent" class="home-content">
        <Search></Search>
        <Anchor></Anchor>
        <Site ref="siteRef" @loaded="onSiteLoaded"></Site>
        <Footer></Footer>
        <!-- 空内容展示 -->
      </main>
      <Sidebar @add="() => siteRef?.handleAddItem()"></Sidebar>
      <LeftDrawer></LeftDrawer>
    </section>
  </div>
</template>
<style lang="scss" scoped>
.home {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none; // 全局禁用，根治毛玻璃选区变色
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  .content {
    width: 100%;
    height: 100%;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
    
    &.is-ready {
      opacity: 1;
    }

    .home-content {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      overflow-y: auto;
      .empty-panel {
        width: 100%;
        height: 100%;
        padding: 10px;
        background-color: #111827;
        box-sizing: border-box;
      }
    }
  }
}
</style>
