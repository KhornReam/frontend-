<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getCurrentUser,
  logout,
  switchRole,
} from '../../services/authService.js'
import { getRolePermissions } from '../../services/permissionService.js'

const router = useRouter()
const currentUser = ref(getCurrentUser())
const permissions = ref(getRolePermissions())
const roleMenuOpen = ref(false)

function refreshAuthState() {
  currentUser.value = getCurrentUser()
  permissions.value = getRolePermissions()
}

onMounted(() => {
  window.addEventListener('sms-auth-changed', refreshAuthState)
  window.addEventListener('sms-permissions-updated', refreshAuthState)
})

onUnmounted(() => {
  window.removeEventListener('sms-auth-changed', refreshAuthState)
  window.removeEventListener('sms-permissions-updated', refreshAuthState)
})

// Navigation computed by Role & Feature Permissions
const mainNavigation = computed(() => {
  const role = currentUser.value?.role || 'admin'
  const p = permissions.value

  if (role === 'student') {
    const list = [{ label: 'My Overview', to: '/', icon: 'dashboard' }]
    if (p.student?.view_curriculum?.enabled) {
      list.push({ label: 'My Subjects', to: '/subjects', icon: 'subjects', badge: '6 Enrolled' })
    }
    return list
  }

  if (role === 'teacher') {
    const list = [{ label: 'Faculty Dashboard', to: '/', icon: 'dashboard' }]
    if (p.teacher?.view_classes?.enabled) {
      list.push({ label: 'Class Sections', to: '/classes', icon: 'classes', badge: '3 Assigned' })
    }
    if (p.teacher?.view_students?.enabled) {
      list.push({ label: 'Students Roster', to: '/students', icon: 'students', badge: '36' })
    }
    list.push({ label: 'Curriculum Subjects', to: '/subjects', icon: 'subjects' })
    return list
  }

  // Admin
  return [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'Students', to: '/students', icon: 'students', badge: '1,284' },
    { label: 'Teachers', to: '/teachers', icon: 'teachers', badge: '64' },
    { label: 'Classes', to: '/classes', icon: 'classes', badge: '38' },
    { label: 'Subjects', to: '/subjects', icon: 'subjects', badge: '9' },
  ]
})

const academicNavigation = computed(() => {
  const role = currentUser.value?.role || 'admin'
  const p = permissions.value

  if (role === 'student') {
    const list = []
    if (p.student?.view_grades?.enabled) {
      list.push({ label: 'My Grades & Transcripts', to: '/reports', icon: 'reports', badge: 'GPA 3.95' })
    }
    if (p.student?.view_attendance?.enabled) {
      list.push({ label: 'My Attendance Record', to: '/attendance', icon: 'attendance', badge: '98.4%' })
    }
    return list
  }

  if (role === 'teacher') {
    const list = []
    if (p.teacher?.manage_attendance?.enabled) {
      list.push({ label: 'Daily Attendance', to: '/attendance', icon: 'attendance' })
    }
    if (p.teacher?.manage_scores?.enabled) {
      list.push({ label: 'Exams & Scores', to: '/exams-scores', icon: 'exams' })
    }
    if (p.teacher?.export_reports?.enabled) {
      list.push({ label: 'Academic Reports', to: '/reports', icon: 'reports' })
    }
    return list
  }

  // Admin
  return [
    { label: 'Attendance', to: '/attendance', icon: 'attendance' },
    { label: 'Exams & Scores', to: '/exams-scores', icon: 'exams' },
    { label: 'Reports', to: '/reports', icon: 'reports' },
  ]
})

const managementNavigation = computed(() => {
  const role = currentUser.value?.role || 'admin'
  if (role !== 'admin') return []

  return [
    { label: 'Users & Roles', to: '/users-roles', icon: 'users', badge: 'Admin' },
    { label: 'Automations', to: '/automations', icon: 'automations' },
    { label: 'Settings', to: '/settings', icon: 'settings' },
  ]
})

function handleRoleSwitch(roleKey) {
  switchRole(roleKey)
  roleMenuOpen.value = false
  refreshAuthState()
  router.push('/')
}

function signOut() {
  logout()
  router.push('/login')
}
</script>

<template>
  <aside class="sidebar admin-sidebar">
    <!-- Brand -->
    <RouterLink class="brand" to="/" aria-label="StudentHub home">
      <div class="brand-mark">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      </div>
      <div>
        <span class="brand-name">StudentHub</span>
      </div>
      <span
        class="brand-badge"
        :class="{
          'badge-admin': currentUser.role === 'admin',
          'badge-teacher': currentUser.role === 'teacher',
          'badge-student': currentUser.role === 'student',
        }"
      >
        {{ currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'teacher' ? 'Faculty' : 'Student' }}
      </span>
    </RouterLink>

    <!-- Navigation Scroll Area -->
    <nav class="sidebar-nav" aria-label="Admin navigation">
      <!-- Section 1 -->
      <p class="nav-label">
        {{ currentUser.role === 'student' ? 'STUDENT PORTAL' : currentUser.role === 'teacher' ? 'TEACHER WORKSPACE' : 'MAIN WORKSPACE' }}
      </p>
      <RouterLink
        v-for="item in mainNavigation"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ href, navigate, isActive, isExactActive }"
      >
        <a
          :href="href"
          :class="['nav-link', (item.to === '/' ? isExactActive : isActive) && 'router-link-active']"
          @click="navigate"
        >
          <!-- Dashboard SVG -->
          <svg v-if="item.icon === 'dashboard'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
          </svg>
          <!-- Students SVG -->
          <svg v-else-if="item.icon === 'students'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <!-- Teachers SVG -->
          <svg v-else-if="item.icon === 'teachers'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            <path d="M12 6v6"/>
            <path d="M9 9h6"/>
          </svg>
          <!-- Classes SVG -->
          <svg v-else-if="item.icon === 'classes'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <!-- Subjects SVG -->
          <svg v-else-if="item.icon === 'subjects'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span class="nav-text">{{ item.label }}</span>
          <span v-if="item.badge" class="nav-badge-count">{{ item.badge }}</span>
        </a>
      </RouterLink>

      <!-- Section 2: Academics & Tracking (if permitted) -->
      <template v-if="academicNavigation.length">
        <p class="nav-label">
          {{ currentUser.role === 'student' ? 'ACADEMIC RECORDS' : 'ACADEMICS & TRACKING' }}
        </p>
        <RouterLink
          v-for="item in academicNavigation"
          :key="item.to"
          :to="item.to"
          custom
          v-slot="{ href, navigate, isActive }"
        >
          <a :href="href" :class="['nav-link', isActive && 'router-link-active']" @click="navigate">
            <!-- Attendance SVG -->
            <svg v-if="item.icon === 'attendance'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="m9 16 2 2 4-4"/>
            </svg>
            <!-- Exams SVG -->
            <svg v-else-if="item.icon === 'exams'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="6"/>
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
            <!-- Reports SVG -->
            <svg v-else-if="item.icon === 'reports'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span class="nav-text">{{ item.label }}</span>
            <span v-if="item.badge" class="nav-badge-count">{{ item.badge }}</span>
          </a>
        </RouterLink>
      </template>

      <!-- Section 3: System & Config (Admin only) -->
      <template v-if="managementNavigation.length">
        <p class="nav-label">SYSTEM & CONFIG</p>
        <RouterLink
          v-for="item in managementNavigation"
          :key="item.to"
          :to="item.to"
          custom
          v-slot="{ href, navigate, isActive }"
        >
          <a :href="href" :class="['nav-link', isActive && 'router-link-active']" @click="navigate">
            <!-- Users SVG -->
            <svg v-if="item.icon === 'users'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <!-- Automations SVG -->
            <svg v-else-if="item.icon === 'automations'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <!-- Settings SVG -->
            <svg v-else-if="item.icon === 'settings'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span class="nav-text">{{ item.label }}</span>
            <span v-if="item.badge" class="nav-badge-count">{{ item.badge }}</span>
          </a>
        </RouterLink>
      </template>
    </nav>

    <!-- Role Switcher Popover (when open) -->
    <div v-if="roleMenuOpen" class="role-popover">
      <div class="popover-header">
        <span>Simulate Role Access</span>
        <button class="popover-close" @click="roleMenuOpen = false">✕</button>
      </div>
      <button
        type="button"
        class="popover-item"
        :class="{ active: currentUser.role === 'admin' }"
        @click="handleRoleSwitch('admin')"
      >
        <span class="role-dot dot-admin"></span>
        <div>
          <strong>Super Administrator</strong>
          <small>Dr. Alexander Vance (Full Control)</small>
        </div>
      </button>
      <button
        type="button"
        class="popover-item"
        :class="{ active: currentUser.role === 'teacher' }"
        @click="handleRoleSwitch('teacher')"
      >
        <span class="role-dot dot-teacher"></span>
        <div>
          <strong>Teacher (Faculty)</strong>
          <small>Maya Patel (Role Permissions Matrix)</small>
        </div>
      </button>
      <button
        type="button"
        class="popover-item"
        :class="{ active: currentUser.role === 'student' }"
        @click="handleRoleSwitch('student')"
      >
        <span class="role-dot dot-student"></span>
        <div>
          <strong>Student Account</strong>
          <small>Olivia Martin (Student Portal)</small>
        </div>
      </button>
    </div>

    <!-- Bottom User Profile Card -->
    <div class="sidebar-bottom animated-bottom" @click="roleMenuOpen = !roleMenuOpen">
      <div class="profile-avatar-wrapper">
        <div
          class="profile-avatar animated-avatar"
          :class="'avatar-' + currentUser.role"
          :title="`${currentUser.name} (${currentUser.roleLabel})`"
        >
          {{ currentUser.avatar }}
        </div>
        <span class="online-indicator" title="Status: Online"></span>
      </div>

      <div class="profile-copy">
        <div class="profile-name-row">
          <strong>{{ currentUser.name.split(' ')[0] }} {{ currentUser.name.split(' ')[1] || '' }}</strong>
          <span class="admin-verified-badge" :title="currentUser.roleLabel">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-2 16l-4-4 1.41-1.41L10 15.17l6.59-6.59L18 10l-8 8z"/>
            </svg>
          </span>
        </div>
        <small class="role-caption">{{ currentUser.roleLabel }}</small>
      </div>

      <button
        class="sign-out animated-signout"
        type="button"
        aria-label="Sign out"
        title="Sign out of session"
        @click.stop="signOut"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.nav-text {
  flex: 1;
}

.nav-badge-count {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background-color: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.badge-admin { background: rgba(139, 92, 246, 0.25); color: #c4b5fd; }
.badge-teacher { background: rgba(59, 130, 246, 0.25); color: #93c5fd; }
.badge-student { background: rgba(16, 185, 129, 0.25); color: #6ee7b7; }

.profile-avatar-wrapper {
  position: relative;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: #10b981;
  border: 2px solid #0f172a;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-caption {
  font-size: 10.5px;
  color: #94a3b8;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.avatar-admin { background: #8b5cf6 !important; color: white !important; }
.avatar-teacher { background: #3b82f6 !important; color: white !important; }
.avatar-student { background: #10b981 !important; color: white !important; }

.admin-verified-badge {
  color: #38bdf8;
  display: flex;
  align-items: center;
}

.sidebar-bottom {
  cursor: pointer;
}

.role-popover {
  position: absolute;
  bottom: 74px;
  left: 12px;
  right: 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px 6px;
  border-bottom: 1px solid #334155;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}

.popover-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #f1f5f9;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.popover-item:hover {
  background: #334155;
}

.popover-item.active {
  background: rgba(99, 102, 241, 0.25);
  border: 1px solid #6366f1;
}

.popover-item strong {
  display: block;
  font-size: 12.5px;
}

.popover-item small {
  display: block;
  font-size: 10.5px;
  color: #94a3b8;
}

.role-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-admin { background: #8b5cf6; }
.dot-teacher { background: #3b82f6; }
.dot-student { background: #10b981; }

.animated-bottom {
  transition: background-color 0.25s ease;
}

.animated-bottom:hover {
  background-color: rgba(30, 41, 59, 0.8);
}

.animated-avatar {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.animated-bottom:hover .animated-avatar {
  transform: scale(1.08);
  box-shadow: 0 0 14px rgba(99, 102, 241, 0.6);
}

.animated-signout {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.animated-signout:hover {
  transform: translateX(2px) scale(1.08);
  background-color: rgba(239, 68, 68, 0.25);
  color: #f87171;
}
</style>
