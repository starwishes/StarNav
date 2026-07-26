<template>
  <footer class="footer">
    <div class="footer-content">
      <div v-if="safeFooterHtml" class="custom-footer" v-html="safeFooterHtml"></div>
      <div v-else class="copyright">
        &copy; {{ currentYear }}
        <a href="https://github.com/starwishes/Nav" target="_blank">{{
          configStore.displaySiteName
        }}</a
        >. All Rights Reserved.
      </div>
      <div v-if="ICP_NUMBER" class="icp">
        <a href="https://beian.miit.gov.cn/" target="_blank">{{ ICP_NUMBER }}</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ICP_NUMBER } from '@/config'
import { useConfigStore } from '@/store/config'
import { sanitizeFooterHtml } from '../../../shared/security/footerHtml.js'

const configStore = useConfigStore()
const currentYear = computed(() => new Date().getFullYear())
const safeFooterHtml = computed(() => sanitizeFooterHtml(configStore.siteConfig.footerHtml))
</script>

<style scoped lang="scss">
@use './Footer.scss';
</style>

