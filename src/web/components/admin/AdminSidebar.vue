<template>
  <aside class="admin-sidebar" :class="{ 'mobile-visible': sidebarVisible }">
    <div class="sidebar-header">
      <div class="logo-group" @click="$router.push('/')">
        <img
          v-if="configStore.siteConfig.logoUrl"
          :src="configStore.siteConfig.logoUrl"
          class="logo-img"
        />
        <div v-else class="logo-icon gradient-bg">N</div>
        <div class="logo-copy">
          <p class="logo-kicker">{{ t('admin.dashboard') }}</p>
          <h1 class="gradient-text">
            {{ configStore.displaySiteName }}
          </h1>
        </div>
      </div>
      <button v-if="isMobile" type="button" class="icon-button" @click="$emit('close-sidebar')">
        <AppIcon name="icon-md-close" class="button-icon" />
      </button>
    </div>

    <nav class="sidebar-menu">
      <div
        v-for="item in menuItems"
        :key="item.id"
        class="menu-item hover-scale"
        :class="{ active: currentView === item.id }"
        @click="$emit('menu-click', item.id)"
      >
        <AppIcon :name="item.icon" class="menu-icon" />
        <span class="menu-label">{{ t('menu.' + getMenuKey(item.id)) }}</span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="user-block">
        <img
          v-if="adminStore.user?.avatar_url"
          :src="adminStore.user?.avatar_url"
          class="user-avatar"
          alt="User avatar"
        />
        <div v-else class="user-avatar fallback">
          {{ adminStore.user?.login?.charAt(0).toUpperCase() }}
        </div>
        <div class="user-info">
          <span class="username">{{ adminStore.user?.login }}</span>
          <span
            class="sn-badge level-badge"
            :class="getLevelBadgeClass(adminStore.user?.level || 0)"
            >{{ getLevelName(adminStore.user?.level || 0) }}</span
          >
        </div>
      </div>

      <button type="button" class="logout-btn" @click="$emit('logout')">
        <AppIcon name="icon-exit-line" class="button-icon" /> {{ t('nav.logout') }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { useAdminStore } from '@/store/admin'
import { useConfigStore } from '@/store/config'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface AdminSidebarMenuItem {
  id: string
  icon: string
}

defineProps<{
  sidebarVisible: boolean
  isMobile: boolean
  menuItems: AdminSidebarMenuItem[]
  currentView: string
}>()

defineEmits(['close-sidebar', 'menu-click', 'logout'])

const adminStore = useAdminStore()
const configStore = useConfigStore()

const getLevelName = (level: number) => {
  const keys = ['guest', 'user', 'vip', 'admin']
  return t(`userLevel.${keys[level] || 'unknown'}`)
}

const getLevelBadgeClass = (level: number) => {
  const classes = ['is-info', 'is-success', 'is-warning', 'is-danger']
  return classes[level] || 'is-info'
}

const getMenuKey = (id: string) => {
  if (id === 'data') return 'dataManage'
  return id
}
</script>

<style scoped lang="scss">
@import './AdminSidebar.scss';
</style>

