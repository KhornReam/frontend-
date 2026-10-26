<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title || 'Dashboard')
const today = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
</script>

<template>
  <header class="topbar admin-header">
    <div class="breadcrumb">Student Management <span>/</span> <strong>{{ title }}</strong></div>
    <div class="header-tools"><span class="header-date">{{ today }}</span><span class="topbar-divider"></span><span class="topbar-initial" aria-label="Administrator profile">A</span></div>
  </header>
</template>
