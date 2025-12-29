import { defineStore } from 'pinia'

export const useMainStore = defineStore('mainStore', {
  state: () => {
    return {
      isShowDrawer: false,
      settings: {
        homeUrl: '',
        timezone: '',
        registrationEnabled: true,
        backgroundUrl: '',
        footerHtml: '',
        siteName: ''
      },
      menu: [
        {
          index: 1,
          name: 'home',
          iconClass: 'iconfont icon-md-home'
        }
      ]
    }
  },
  getters: {},
  actions: {
    async fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          this.settings = { ...this.settings, ...data };
        }
      } catch (e) {
        console.error('Failed to fetch settings', e);
      }
    }
  },

  persist: false
})
