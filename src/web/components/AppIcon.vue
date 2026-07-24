<template>
  <i class="iconfont sn-icon" :class="name" aria-hidden="true"></i>
</template>

<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>
