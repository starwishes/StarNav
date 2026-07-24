<script setup lang="ts">
import { onMounted, ref, nextTick, provide } from 'vue'
import { useConfigStore } from '@/store/config'
import PageHeader from '@/components/index/PageHeader.vue'
import Background from '@/components/index/Background.vue'
import Search from '@/components/index/Search.vue'
import Site from '@/components/index/Site.vue'
import Sidebar from '@/components/index/Sidebar.vue'
import Footer from '@/components/index/Footer.vue'
import CollapsibleSidebar from '@/components/index/CollapsibleSidebar.vue'
import { createScopedLogger } from '../../../shared/logger.js'

const isSidebarCollapsed = ref(false)
const collapsibleSidebarRef = ref<InstanceType<typeof CollapsibleSidebar> | null>(null)

const toggleSidebar = () => {
  collapsibleSidebarRef.value?.toggleSidebar()
}

provide('toggleSidebar', toggleSidebar)

const siteRef = ref<InstanceType<typeof Site> | null>(null)
const configStore = useConfigStore()
const isReady = ref(false)
const siteLoaded = ref(false)
const settingsLoaded = ref(false)
const selectedCategoryId = ref<number | null>(null)
const isSearchOverlayActive = ref(false)
const logger = createScopedLogger('web:home-view')

const checkReady = () => {
  if (siteLoaded.value && settingsLoaded.value) {
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
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

const handleSidebarFilter = (categoryId: number | null) => {
  selectedCategoryId.value = categoryId
}

const handleSearchOverlayChange = (active: boolean) => {
  isSearchOverlayActive.value = active
}

onMounted(async () => {
  try {
    await configStore.ensureLoaded()
  } catch (error) {
    logger.error('Failed to fetch homepage config.', error)
  } finally {
    settingsLoaded.value = true
    checkReady()
  }
})
</script>

<template>
  <div class="home" :class="{ 'is-ready': isReady }">
    <Background :visible="isReady"></Background>
    <CollapsibleSidebar
      ref="collapsibleSidebarRef"
      @filter="handleSidebarFilter"
      @collapse-change="(v) => (isSidebarCollapsed = v)"
    ></CollapsibleSidebar>
    <section
      class="content"
      :class="{
        'is-ready': isReady,
        'sidebar-collapsed': isSidebarCollapsed,
        'search-overlay-active': isSearchOverlayActive
      }"
    >
      <PageHeader></PageHeader>
      <main ref="homeContent" class="home-content">
        <section class="hero-stage">
          <div class="hero-stage__panel glass-panel">
            <Search @overlay-active-change="handleSearchOverlayChange"></Search>
          </div>
        </section>
        <section class="site-stage">
          <Site
            ref="siteRef"
            :selected-category-id="selectedCategoryId"
            @loaded="onSiteLoaded"
          ></Site>
        </section>
        <Footer></Footer>
      </main>
      <Sidebar
        @add="() => siteRef?.handleAddItem()"
        @add-category="() => siteRef?.handleAddCategory()"
      ></Sidebar>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.home {
  position: relative;
  width: 100%;
  min-height: 100%;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.content {
  --sidebar-width: 248px;
  position: relative;
  z-index: 1;
  width: calc(100% - var(--sidebar-width));
  min-height: 100vh;
  margin-left: var(--sidebar-width);
  padding-top: 86px;
  opacity: 0;
  transition:
    opacity 0.35s ease,
    margin-left 0.35s ease,
    width 0.35s ease;

  &.sidebar-collapsed {
    --sidebar-width: 88px;
    margin-left: 88px;
  }

  &.is-ready {
    opacity: 1;
  }

  @media screen and (max-width: 768px) {
    --sidebar-width: 0px;
    width: 100%;
    margin-left: 0 !important;
    padding-top: 78px;

    &.sidebar-collapsed {
      margin-left: 0 !important;
    }
  }
}

.home-content {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 86px);
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 0 24px 48px;
  box-sizing: border-box;

  @media screen and (max-width: 1024px) {
    padding: 0 18px 40px;
  }

  @media screen and (max-width: 640px) {
    gap: 24px;
    padding: 0 14px 32px;
  }
}

.hero-stage {
  position: relative;
  padding-top: 28px;
}

.hero-stage__panel {
  width: min(100%, 1240px);
  margin: 0 auto;
  padding: clamp(24px, 4vw, 42px);
  border-radius: 38px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)),
    rgba(245, 245, 247, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  box-shadow:
    0 32px 70px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.22) !important;
}

.site-stage {
  position: relative;
  flex: 1;
}

.content.search-overlay-active {
  .hero-stage {
    z-index: 1301;
  }

  .site-stage {
    z-index: 1;
  }
}

:global(:root[data-theme-preset='cinema'] .hero-stage__panel) {
  background:
    linear-gradient(180deg, rgba(42, 42, 45, 0.92), rgba(17, 17, 17, 0.82)), rgba(17, 17, 17, 0.84) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow:
    0 32px 70px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
}

:global(:root[theme-mode='dark'] .hero-stage__panel) {
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(2, 6, 23, 0.76)), rgba(15, 23, 42, 0.68) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow:
    0 32px 70px rgba(0, 0, 0, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
}
</style>
