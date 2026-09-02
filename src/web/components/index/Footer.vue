<template>
  <footer class="footer">
    <div class="footer-content">
      <div v-if="safeFooterHtml" class="custom-footer" v-html="safeFooterHtml"></div>
      <div v-else class="copyright">
        &copy; {{ currentYear }}
        <a href="https://github.com/starwishes/Nav" target="_blank" rel="noopener noreferrer">{{
          configStore.displaySiteName
        }}</a
        >. All Rights Reserved.
      </div>
      <div v-if="ICP_NUMBER" class="icp">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{{
          ICP_NUMBER
        }}</a>
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
.footer {
  width: 100%;
  padding: 8px 0 0;
}

.footer-content {
  width: min(100%, 1280px);
  margin: 0 auto;
  padding: 32px 0 12px;
  border-top: 1px solid rgba(29, 29, 31, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(29, 29, 31, 0.58);
  font-size: 13px;
  text-align: center;

  a {
    color: rgba(29, 29, 31, 0.72);
    text-decoration: none;
    transition: color 0.18s ease;

    &:hover {
      color: var(--ui-theme);
    }
  }
}

.custom-footer {
  line-height: 1.6;

  :deep(a) {
    color: rgba(29, 29, 31, 0.72);
    margin: 0 4px;
    text-decoration: none;

    &:hover {
      color: var(--ui-theme);
    }
  }
}

:global(:root[data-theme-preset='cinema'] .footer-content) {
  border-top-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.52);
}

:global(:root[data-theme-preset='cinema'] .footer-content a),
:global(:root[data-theme-preset='cinema'] .custom-footer a) {
  color: rgba(255, 255, 255, 0.72);
}

:global(:root[theme-mode='dark'] .footer-content) {
  border-top-color: rgba(255, 255, 255, 0.08);
  color: rgba(226, 232, 240, 0.56);
}

:global(:root[theme-mode='dark'] .footer-content a),
:global(:root[theme-mode='dark'] .custom-footer a) {
  color: rgba(226, 232, 240, 0.74);
}
</style>
