<script setup>
import AdminHeader from '../components/admin/AdminHeader.vue'
import AdminSidebar from '../components/admin/AdminSidebar.vue'
</script>

<template>
  <div class="app-shell admin-layout">
    <AdminSidebar />
    <main class="main-panel">
      <AdminHeader />
      <div class="page-content"><RouterView /></div>
    </main>
  </div>
</template>
