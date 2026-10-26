<script setup>
import Sidebar from './components/Sidebar.vue'
</script>

<template>
  <div class="app">
    <Sidebar />
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>
