<template>
  <div class="monitoring-dashboard">
    <section class="monitor-section">
      <SystemHealth />
    </section>

    <section class="monitor-section">
      <StatsDashboard />
    </section>

    <section class="monitor-section">
      <SessionManager />
    </section>

    <section class="monitor-section">
      <AuditLog />
    </section>
  </div>
</template>

<script setup lang="ts">
import AuditLog from '@/components/admin/AuditLog.vue'
import SessionManager from '@/components/admin/SessionManager.vue'
import StatsDashboard from '@/components/admin/StatsDashboard.vue'
import SystemHealth from '@/components/admin/SystemHealth.vue'
</script>

<style scoped lang="scss">
@import './MonitoringDashboard.scss';
</style>

