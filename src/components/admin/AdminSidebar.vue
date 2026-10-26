<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const navigation = [
  { label: 'Dashboard', to: '/', icon: '▦' },
  { label: 'Students', to: '/students', icon: '♙' },
  { label: 'Teachers', to: '/teachers', icon: '♧' },
  { label: 'Classes', to: '/classes', icon: '▤' },
  { label: 'Subjects', to: '/subjects', icon: '◇' },
  { label: 'Attendance', to: '/attendance', icon: '✓' },
  { label: 'Exams & Scores', to: '/exams-scores', icon: '◷' },
  { label: 'Users & Roles', to: '/users-roles', icon: '♙' },
  { label: 'Reports', to: '/reports', icon: '▥' },
  { label: 'Settings', to: '/settings', icon: '⚙' },
]

function signOut() {
  sessionStorage.removeItem('dashboard-authenticated')
  router.push('/login')
}
</script>

<template>
  <aside class="sidebar admin-sidebar">
    <RouterLink class="brand" to="/" aria-label="Student Management home">
      <span class="brand-mark">S</span>
      <span class="brand-name">Student Management</span>
    </RouterLink>

    <p class="nav-label">ADMIN WORKSPACE</p>
    <nav class="sidebar-nav" aria-label="Admin navigation">
      <RouterLink v-for="item in navigation" :key="item.to" :to="item.to" custom v-slot="{ href, navigate, isActive, isExactActive }">
        <a :href="href" :class="['nav-link', (item.to === '/' ? isExactActive : isActive) && 'router-link-active']" @click="navigate">
          <span aria-hidden="true">{{ item.icon }}</span>{{ item.label }}
        </a>
      </RouterLink>
    </nav>

    <div class="sidebar-bottom">
      <div class="profile-avatar">A</div>
      <div class="profile-copy"><strong>Administrator</strong><small>School admin</small></div>
      <button class="sign-out" type="button" aria-label="Sign out" title="Sign out" @click="signOut">↪</button>
    </div>
  </aside>
</template>
