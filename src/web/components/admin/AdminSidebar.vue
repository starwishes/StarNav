<template>
  <aside id="admin-sidebar" class="admin-sidebar" :class="{ 'mobile-visible': sidebarVisible }">
    <div class="sidebar-header">
      <div
        class="logo-group"
        role="button"
        tabindex="0"
        :aria-label="t('nav.home')"
        @click="$router.push('/')"
        @keydown.enter.prevent="$router.push('/')"
        @keydown.space.prevent="$router.push('/')"
      >
        <img
          v-if="configStore.siteConfig.logoUrl"
          :src="configStore.siteConfig.logoUrl"
          class="logo-img"
          alt=""
        />
        <div v-else class="logo-icon gradient-bg">N</div>
        <div class="logo-copy">
          <p class="logo-kicker">{{ t('admin.dashboard') }}</p>
          <h1 class="gradient-text">
            {{ configStore.displaySiteName }}
          </h1>
        </div>
      </div>
      <button
        v-if="isMobile"
        type="button"
        class="icon-button"
        :aria-label="t('admin.closeSidebar')"
        aria-controls="admin-sidebar"
        @click="$emit('close-sidebar')"
      >
        <AppIcon name="icon-md-close" class="button-icon" />
      </button>
    </div>

    <nav class="sidebar-menu">
      <button
        v-for="item in menuItems"
        :key="item.id"
        type="button"
        class="menu-item hover-scale"
        :class="{ active: currentView === item.id }"
        :aria-current="currentView === item.id ? 'page' : undefined"
        @click="$emit('menu-click', item.id)"
      >
        <AppIcon :name="item.icon" class="menu-icon" />
        <span class="menu-label">{{ t('menu.' + getMenuKey(item.id)) }}</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="user-block">
        <img
          v-if="adminStore.user?.avatar_url"
          :src="adminStore.user?.avatar_url"
          class="user-avatar"
          alt=""
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
.admin-sidebar {
  --admin-sidebar-bg: color-mix(
    in srgb,
    var(--ui-panel-bg, rgba(255, 255, 255, 0.82)) 88%,
    rgba(var(--ui-theme-rgb), 0.14) 12%
  );
  --admin-sidebar-border: color-mix(
    in srgb,
    var(--ui-panel-border, rgba(29, 29, 31, 0.08)) 80%,
    rgba(var(--ui-theme-rgb), 0.24) 20%
  );
  --admin-sidebar-shadow: 20px 0 42px rgba(var(--ui-theme-rgb), 0.12);
  --admin-sidebar-text: var(--ui-text-primary, #1d1d1f);
  --admin-sidebar-muted: color-mix(
    in srgb,
    var(--ui-text-muted, rgba(29, 29, 31, 0.68)) 88%,
    transparent
  );
  --admin-sidebar-soft-bg: rgba(var(--ui-theme-rgb), 0.08);
  --admin-sidebar-hover-bg: rgba(var(--ui-theme-rgb), 0.12);
  --admin-sidebar-active-bg: rgba(var(--ui-theme-rgb), 0.16);
  --admin-sidebar-active-ring: rgba(var(--ui-theme-rgb), 0.26);
  --admin-sidebar-button-border: rgba(var(--ui-theme-rgb), 0.14);
  --admin-sidebar-dropdown-bg: color-mix(
    in srgb,
    var(--ui-panel-surface, rgba(255, 255, 255, 0.96)) 92%,
    rgba(var(--ui-theme-rgb), 0.08) 8%
  );
  --admin-sidebar-danger-bg: rgba(255, 69, 58, 0.1);
  --admin-sidebar-danger-border: rgba(255, 69, 58, 0.16);
  --admin-sidebar-danger-text: #d94841;
  width: 280px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-self: flex-start;
  padding: 24px 20px;
  box-sizing: border-box;
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--admin-sidebar-bg);
  border-right: 1px solid var(--admin-sidebar-border);
  box-shadow: var(--admin-sidebar-shadow);
  color: var(--admin-sidebar-text);
}

:global(:root[data-theme-preset='cinema'] .admin-sidebar) {
  --admin-sidebar-bg: rgba(8, 8, 10, 0.92);
  --admin-sidebar-border: rgba(255, 255, 255, 0.08);
  --admin-sidebar-shadow: 20px 0 42px rgba(0, 0, 0, 0.26);
  --admin-sidebar-text: #f5f5f7;
  --admin-sidebar-muted: rgba(255, 255, 255, 0.58);
  --admin-sidebar-soft-bg: rgba(255, 255, 255, 0.06);
  --admin-sidebar-hover-bg: rgba(255, 255, 255, 0.08);
  --admin-sidebar-active-bg: rgba(255, 255, 255, 0.12);
  --admin-sidebar-active-ring: rgba(var(--ui-theme-rgb), 0.24);
  --admin-sidebar-button-border: rgba(255, 255, 255, 0.12);
  --admin-sidebar-dropdown-bg: rgba(20, 20, 22, 0.98);
  --admin-sidebar-danger-bg: rgba(255, 69, 58, 0.12);
  --admin-sidebar-danger-border: rgba(255, 69, 58, 0.2);
  --admin-sidebar-danger-text: #ffb0a8;
}

:global(:root[theme-mode='dark'] .admin-sidebar) {
  --admin-sidebar-bg: rgba(2, 5, 10, 0.92);
  --admin-sidebar-border: rgba(255, 255, 255, 0.08);
  --admin-sidebar-shadow: 20px 0 42px rgba(0, 0, 0, 0.3);
  --admin-sidebar-text: #f8fafc;
  --admin-sidebar-muted: rgba(226, 232, 240, 0.62);
  --admin-sidebar-soft-bg: rgba(255, 255, 255, 0.06);
  --admin-sidebar-hover-bg: rgba(255, 255, 255, 0.08);
  --admin-sidebar-active-bg: rgba(var(--ui-theme-rgb), 0.16);
  --admin-sidebar-active-ring: rgba(var(--ui-theme-rgb), 0.24);
  --admin-sidebar-button-border: rgba(255, 255, 255, 0.12);
  --admin-sidebar-dropdown-bg: rgba(10, 14, 22, 0.98);
  --admin-sidebar-danger-bg: rgba(255, 69, 58, 0.12);
  --admin-sidebar-danger-border: rgba(255, 69, 58, 0.2);
  --admin-sidebar-danger-text: #ffb0a8;
}

.sidebar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 30px;
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-icon,
.logo-img {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  object-fit: contain;
  background: linear-gradient(135deg, var(--ui-theme), rgba(var(--ui-theme-rgb), 0.72));
}

.logo-copy {
  min-width: 0;
}

.logo-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--admin-sidebar-muted);
}

.logo-copy h1 {
  margin: 0;
  font-family: var(--ui-font-display);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: var(--admin-sidebar-text);
}

.icon-button {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--admin-sidebar-button-border);
  border-radius: 50%;
  background: var(--admin-sidebar-soft-bg);
  color: var(--admin-sidebar-text);
  cursor: pointer;
}

.sidebar-menu {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--admin-sidebar-muted);
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    background: var(--admin-sidebar-hover-bg);
    color: var(--admin-sidebar-text);
    transform: translateX(2px);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--ui-theme-rgb), 0.35);
    outline-offset: -2px;
  }

  &.active {
    background: var(--admin-sidebar-active-bg);
    color: var(--admin-sidebar-text);
    box-shadow: inset 0 0 0 1px var(--admin-sidebar-active-ring);
  }
}

.menu-icon {
  width: 18px;
  height: 18px;
}

.menu-label {
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
}

.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 20px;
  border-top: 1px solid var(--admin-sidebar-border);
}

.user-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 24px;
  background: var(--admin-sidebar-soft-bg);
}

.user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--admin-sidebar-hover-bg);
}

.user-avatar.fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--admin-sidebar-text);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.username {
  font-size: 14px;
  font-weight: 600;
  color: var(--admin-sidebar-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level-badge {
  align-self: flex-start;
}

.logout-btn {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--admin-sidebar-danger-border);
  border-radius: 999px;
  background: var(--admin-sidebar-danger-bg);
  color: var(--admin-sidebar-danger-text);
  cursor: pointer;
}

.admin-sidebar.mobile-visible {
  position: fixed;
  left: 0;
}

@media screen and (max-width: 900px) {
  .admin-sidebar {
    position: fixed;
    left: -320px;
    top: 0;
    bottom: 0;
    height: 100vh;
    transition: left 0.25s ease;
  }

  .admin-sidebar.mobile-visible {
    left: 0;
  }
}
</style>
