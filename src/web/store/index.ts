import { defineStore } from 'pinia'

export const useMainStore = defineStore('mainStore', {
  state: () => {
    return {
      isShowDrawer: false,
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
  actions: {},

  persist: false
})
