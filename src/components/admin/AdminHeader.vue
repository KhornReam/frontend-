<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentUser, logout, switchRole } from '../../services/authService.js'
import {
  formatRelativeTime,
  getBlockedEmails,
  getSecurityAlerts,
  markAllSecurityAlertsRead,
  markSecurityAlertRead,
  unblockEmail,
} from '../../services/loginSecurityService.js'

const props = defineProps({
  sidebarCollapsed: { type: Boolean, default: false },
  mobileSidebarOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-sidebar'])

const route = useRoute()
const router = useRouter()
const currentUser = ref(getCurrentUser())

function updateAuth() {
  currentUser.value = getCurrentUser()
}

const title = computed(() => route.meta.title || 'Dashboard')
const today = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())

// Academic Term
const currentTerm = ref('Term 2 (2026–2027)')
const termDropdownOpen = ref(false)
const terms = ['Term 1 (2026–2027)', 'Term 2 (2026–2027)', 'Term 3 (2026–2027)', 'Summer Session 2026']

// Notifications & Real-Time Admin Security Alerts
const notificationsOpen = ref(false)
const securityAlerts = ref(getSecurityAlerts())
const blockedEmails = ref(getBlockedEmails())

function refreshSecurityAlerts() {
  securityAlerts.value = getSecurityAlerts()
  blockedEmails.value = getBlockedEmails()
}

const baseNotifications = ref([
  {
    id: 'sys-1',
    title: 'New Student Enrolled',
    message: 'Olivia Martin was enrolled in Grade 10 - A.',
    time: '12m ago',
    unread: true,
    tone: 'emerald',
    icon: 'user',
    isSecurity: false,
  },
  {
    id: 'sys-2',
    title: 'Daily Attendance Report',
    message: '94.6% school attendance recorded for today.',
    time: '45m ago',
    unread: true,
    tone: 'primary',
    icon: 'check',
    isSecurity: false,
  },
  {
    id: 'sys-3',
    title: 'Cloud Backup Succeeded',
    message: 'Encrypted database snapshot saved to cloud.',
    time: '3h ago',
    unread: false,
    tone: 'sky',
    icon: 'database',
    isSecurity: false,
  },
])

const notifications = computed(() => {
  const adminAlerts =
    currentUser.value?.role === 'admin'
      ? securityAlerts.value.slice(0, 12).map((alert) => {
          const currentlyBlocked = blockedEmails.value.some((b) => b.email === alert.email)
          return {
            id: alert.id,
            title: alert.title,
            message: alert.message,
            email: alert.email,
            accountName: alert.accountName,
            reason: alert.reason,
            severity: alert.severity,
            time: formatRelativeTime(alert.timestamp),
            unread: alert.unread && !alert.resolved,
            resolved: alert.resolved,
            isSecurity: true,
            isCurrentlyBlocked: currentlyBlocked,
          }
        })
      : []

  return [...adminAlerts, ...baseNotifications.value]
})

const unreadCount = computed(() => notifications.value.filter((n) => n.unread).length)
const hasCriticalSecurityUnread = computed(
  () =>
    currentUser.value?.role === 'admin' &&
    securityAlerts.value.some((a) => a.unread && !a.resolved),
)

// Quick Create Dropdown
const quickCreateOpen = ref(false)

// Admin Profile Popover
const profileMenuOpen = ref(false)

// Global Command Search Modal (Ctrl + K)
const commandPaletteOpen = ref(false)
const commandSearch = ref('')

const searchItems = [
  { name: 'Dashboard Overview', category: 'Navigation', route: '/' },
  { name: 'Students Directory', category: 'Records', route: '/students' },
  { name: 'Add New Student', category: 'Action', route: '/students' },
  { name: 'Teachers & Faculty', category: 'Records', route: '/teachers' },
  { name: 'Add New Teacher', category: 'Action', route: '/teachers' },
  { name: 'Class Sections', category: 'Academic', route: '/classes' },
  { name: 'Subjects & Curriculum', category: 'Academic', route: '/subjects' },
  { name: 'Attendance Roll Call', category: 'Tracking', route: '/attendance' },
  { name: 'School Automations', category: 'System', route: '/automations' },
  { name: 'Exams & Gradebook', category: 'Academic', route: '/exams-scores' },
  { name: 'Users & Roles Management', category: 'Access', route: '/users-roles' },
  { name: 'User Login & Security Monitor', category: 'Security', route: '/user-login' },
  { name: 'System Settings', category: 'System', route: '/settings' },
]

const filteredSearchItems = computed(() => {
  const q = commandSearch.value.trim().toLowerCase()
  if (!q) return searchItems.slice(0, 8)
  return searchItems.filter((item) =>
    item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
  )
})

function navigateTo(path) {
  commandPaletteOpen.value = false
  quickCreateOpen.value = false
  notificationsOpen.value = false
  profileMenuOpen.value = false
  router.push(path)
}

function markAllNotificationsRead() {
  baseNotifications.value.forEach((n) => (n.unread = false))
  if (currentUser.value?.role === 'admin') {
    markAllSecurityAlertsRead()
    refreshSecurityAlerts()
  }
}

function handleQuickUnblock(email) {
  unblockEmail(email, currentUser.value?.name || 'Administrator')
  refreshSecurityAlerts()
}

function openSecurityTab(alertId) {
  if (alertId) markSecurityAlertRead(alertId)
  notificationsOpen.value = false
  router.push('/user-login')
}

function handleKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    commandPaletteOpen.value = !commandPaletteOpen.value
    commandSearch.value = ''
  } else if (e.key === 'Escape') {
    commandPaletteOpen.value = false
    notificationsOpen.value = false
    quickCreateOpen.value = false
    profileMenuOpen.value = false
    termDropdownOpen.value = false
  }
}

function signOut() {
  logout()
  router.push('/login')
}

function handleQuickRoleSwitch(roleKey) {
  switchRole(roleKey)
  updateAuth()
  profileMenuOpen.value = false
  router.push('/')
}

onMounted(() => {
  refreshSecurityAlerts()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('sms-auth-changed', updateAuth)
  window.addEventListener('sms-security-alerts-updated', refreshSecurityAlerts)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('sms-auth-changed', updateAuth)
  window.removeEventListener('sms-security-alerts-updated', refreshSecurityAlerts)
})
</script>

<template>
  <header class="topbar admin-header">
    <!-- Left: Sidebar Toggle, Breadcrumb & Title -->
    <div class="topbar-left">
      <button
        type="button"
        class="sidebar-toggle-btn"
        :class="{ 'is-collapsed': props.sidebarCollapsed }"
        :title="props.sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'"
        :aria-label="props.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="emit('toggle-sidebar')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <path v-if="props.sidebarCollapsed" d="m14 9 3 3-3 3"/>
          <path v-else d="m16 15-3-3 3-3"/>
        </svg>
      </button>

      <div class="breadcrumb">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="breadcrumb-icon">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
        <span>StudentHub</span>
        <span class="breadcrumb-separator">/</span>
        <strong>{{ title }}</strong>
      </div>

      <!-- Academic Term Selector -->
      <div class="term-selector-wrap">
        <button type="button" class="term-picker-btn" @click="termDropdownOpen = !termDropdownOpen">
          <span class="term-dot"></span>
          <span>{{ currentTerm }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <div v-if="termDropdownOpen" class="term-dropdown-menu">
          <div class="dropdown-header">Active Academic Session</div>
          <button
            v-for="term in terms"
            :key="term"
            type="button"
            class="dropdown-item"
            :class="{ active: currentTerm === term }"
            @click="currentTerm = term; termDropdownOpen = false"
          >
            <span>{{ term }}</span>
            <svg v-if="currentTerm === term" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Center/Right: Command Search, Quick Actions & Profile -->
    <div class="header-tools">
      <!-- Quick Search Bar (Command Palette Trigger) -->
      <div class="command-search-bar" @click="commandPaletteOpen = true" title="Press Ctrl+K to search">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-lens">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span class="search-placeholder">Quick search anything...</span>
        <kbd class="search-kbd">Ctrl K</kbd>
      </div>

      <!-- Quick Create Dropdown (Admin & Teacher only) -->
      <div v-if="currentUser.role !== 'student'" class="header-menu-container">
        <button
          type="button"
          class="quick-add-btn"
          @click="quickCreateOpen = !quickCreateOpen"
          title="Create New Record"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>New</span>
        </button>

        <div v-if="quickCreateOpen" class="quick-create-menu">
          <div class="dropdown-header">Quick Creation</div>
          <button type="button" class="menu-action-item" @click="navigateTo('/students')">
            <div class="menu-icon-box tone-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <strong>New Student</strong>
              <small>Register student profile</small>
            </div>
          </button>

          <button type="button" class="menu-action-item" @click="navigateTo('/teachers')">
            <div class="menu-icon-box tone-blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div>
              <strong>New Teacher</strong>
              <small>Add faculty member</small>
            </div>
          </button>

          <button type="button" class="menu-action-item" @click="navigateTo('/subjects')">
            <div class="menu-icon-box tone-emerald">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <strong>New Subject</strong>
              <small>Create curriculum subject</small>
            </div>
          </button>

          <button type="button" class="menu-action-item" @click="navigateTo('/classes')">
            <div class="menu-icon-box tone-amber">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <div>
              <strong>New Class</strong>
              <small>Add grade & section</small>
            </div>
          </button>
        </div>
      </div>

      <!-- Notifications Bell -->
      <div class="header-menu-container">
        <button
          type="button"
          class="icon-button notification-btn"
          :class="{ active: notificationsOpen, 'has-security-alert': hasCriticalSecurityUnread }"
          @click="notificationsOpen = !notificationsOpen"
          aria-label="View notifications"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span v-if="unreadCount" class="notification-badge-count">{{ unreadCount }}</span>
        </button>

        <div v-if="notificationsOpen" class="notifications-dropdown">
          <div class="notifications-header">
            <div>
              <strong>Notifications & Alerts</strong>
              <small>{{ unreadCount }} unread</small>
            </div>
            <button type="button" class="mark-read-btn" @click="markAllNotificationsRead">
              Mark all read
            </button>
          </div>

          <div class="notifications-body">
            <div
              v-for="notif in notifications"
              :key="notif.id"
              class="notification-item"
              :class="{
                unread: notif.unread,
                'is-security-critical': notif.isSecurity && notif.severity === 'critical',
                'is-security-warning': notif.isSecurity && notif.severity === 'warning',
              }"
            >
              <div class="notif-dot-wrap">
                <span
                  v-if="notif.unread"
                  class="notif-unread-dot"
                  :class="{ 'dot-danger': notif.isSecurity }"
                ></span>
              </div>
              <div class="notif-content">
                <div class="notif-title-line">
                  <strong>{{ notif.title }}</strong>
                  <span v-if="notif.isSecurity" class="notif-sec-badge" :class="notif.severity">
                    {{ notif.severity === 'critical' ? 'Blocked' : 'Alert' }}
                  </span>
                </div>
                <p>{{ notif.message }}</p>
                <div class="notif-meta-row">
                  <small>{{ notif.time }}</small>
                  <div v-if="notif.isSecurity" class="notif-sec-actions">
                    <button
                      v-if="notif.isCurrentlyBlocked"
                      type="button"
                      class="notif-unblock-btn"
                      @click.stop="handleQuickUnblock(notif.email)"
                    >
                      Unblock
                    </button>
                    <button
                      type="button"
                      class="notif-inspect-link"
                      @click.stop="openSecurityTab(notif.id)"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="notifications-footer">
            <button
              v-if="currentUser.role === 'admin'"
              type="button"
              class="view-all-link"
              @click="openSecurityTab()"
            >
              Open Security Alerts & Blocked Emails →
            </button>
            <button v-else type="button" class="view-all-link" @click="navigateTo('/automations')">
              View system activity log →
            </button>
          </div>
        </div>
      </div>

      <span class="topbar-divider"></span>

      <!-- System Online Pill -->
      <div class="status-badge" title="Campus servers and database online">
        <span class="status-dot"></span>
        <span>Online</span>
      </div>

      <!-- User Profile Quick Dropdown -->
      <div class="header-menu-container">
        <button
          type="button"
          class="admin-profile-btn"
          @click="profileMenuOpen = !profileMenuOpen"
          aria-label="Account menu"
        >
          <div class="profile-avatar-pill" :class="'avatar-' + currentUser.role">{{ currentUser.avatar }}</div>
          <div class="admin-profile-meta">
            <strong class="admin-name">{{ currentUser.name.split(' ')[0] }}</strong>
            <span class="admin-role">{{ currentUser.roleLabel.split(' ')[0] }}</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chevron">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <div v-if="profileMenuOpen" class="profile-dropdown-menu">
          <div class="profile-menu-header">
            <div class="profile-avatar-large" :class="'avatar-' + currentUser.role">{{ currentUser.avatar }}</div>
            <div>
              <strong>{{ currentUser.name }}</strong>
              <small>{{ currentUser.email }}</small>
              <span class="super-admin-pill">{{ currentUser.roleLabel }}</span>
            </div>
          </div>

          <!-- Switch Role Simulation -->
          <div class="sim-role-section">
            <span class="sim-role-header">Quick Role Preview:</span>
            <div class="sim-buttons-col">
              <button
                type="button"
                class="role-switch-btn"
                :class="{ active: currentUser.role === 'admin' }"
                @click="handleQuickRoleSwitch('admin')"
              >
                <span class="role-mini-dot dot-admin"></span>
                <span>Super Administrator</span>
              </button>
              <button
                type="button"
                class="role-switch-btn"
                :class="{ active: currentUser.role === 'teacher' }"
                @click="handleQuickRoleSwitch('teacher')"
              >
                <span class="role-mini-dot dot-teacher"></span>
                <span>Teacher (Maya Patel)</span>
              </button>
              <button
                type="button"
                class="role-switch-btn"
                :class="{ active: currentUser.role === 'student' }"
                @click="handleQuickRoleSwitch('student')"
              >
                <span class="role-mini-dot dot-student"></span>
                <span>Student (Olivia Martin)</span>
              </button>
            </div>
          </div>

          <div v-if="currentUser.role === 'admin'" class="profile-menu-links">
            <button type="button" class="dropdown-item" @click="navigateTo('/users-roles')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>User & Role Permissions</span>
            </button>

            <button type="button" class="dropdown-item" @click="navigateTo('/settings')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>System Settings</span>
            </button>
          </div>

          <div class="dropdown-footer">
            <button type="button" class="dropdown-item sign-out-item" @click="signOut">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Spotlight Command Palette Modal -->
    <div v-if="commandPaletteOpen" class="command-backdrop" @click.self="commandPaletteOpen = false">
      <div class="command-modal" role="dialog" aria-modal="true">
        <div class="command-input-row">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="commandSearch"
            type="text"
            autofocus
            placeholder="Type a command, page, or search query..."
          />
          <kbd class="esc-kbd" @click="commandPaletteOpen = false">ESC</kbd>
        </div>

        <div class="command-results-list">
          <div v-if="!filteredSearchItems.length" class="no-command-results">
            No matching items found for "{{ commandSearch }}"
          </div>
          <button
            v-for="item in filteredSearchItems"
            :key="item.name"
            type="button"
            class="command-item"
            @click="navigateTo(item.route)"
          >
            <div class="command-item-left">
              <span class="command-category-tag">{{ item.category }}</span>
              <strong>{{ item.name }}</strong>
            </div>
            <span class="jump-arrow">Jump to →</span>
          </button>
        </div>

        <div class="command-footer">
          <span>Navigation Shortcuts: <strong>↑</strong> <strong>↓</strong> to navigate, <strong>↵</strong> to select</span>
          <span class="quick-brand">StudentHub Command Engine</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: 68px;
  background-color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.breadcrumb-icon {
  color: var(--color-text-subtle);
}

.breadcrumb-separator {
  color: var(--color-border-strong);
  font-size: 13px;
}

/* Academic Term Picker */
.term-selector-wrap {
  position: relative;
}

.term-picker-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
  cursor: pointer;
}

.term-picker-btn:hover {
  background: #ffffff;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.term-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.term-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 220px;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 6px;
  z-index: 100;
}

/* Command Search Input Bar */
.command-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 240px;
  height: 38px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.command-search-bar:hover {
  background-color: #ffffff;
  border-color: #cbd5e1;
  box-shadow: var(--shadow-xs);
}

.search-lens {
  color: var(--color-text-subtle);
}

.search-placeholder {
  font-size: 12.5px;
  flex: 1;
}

.search-kbd {
  font-size: 10px;
  font-family: var(--font-mono);
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

/* Quick Add Button */
.header-menu-container {
  position: relative;
}

.quick-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
  transition: all 0.15s ease;
}

.quick-add-btn:hover {
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
  transform: translateY(-1px);
}

.quick-create-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 240px;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  padding: 8px;
  z-index: 100;
}

.dropdown-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--color-text-subtle);
  padding: 6px 12px 8px;
}

.menu-action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  text-align: left;
  transition: all 0.15s ease;
}

.menu-action-item:hover {
  background-color: var(--color-surface-hover);
}

.menu-icon-box {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.menu-action-item strong {
  display: block;
  font-size: 13px;
  color: var(--color-text);
  font-weight: 600;
}

.menu-action-item small {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* Icon Buttons & Notification Bell */
.icon-button {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  color: var(--color-text-muted);
  background-color: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  transition: all 0.15s ease;
  position: relative;
  cursor: pointer;
}

.icon-button:hover,
.icon-button.active {
  background-color: #ffffff;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.notification-badge-count {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--color-danger);
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  display: grid;
  place-items: center;
  border: 2px solid #ffffff;
}

.notifications-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 340px;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  z-index: 100;
  overflow: hidden;
}

.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border);
}

.notifications-header strong {
  font-size: 14px;
  color: var(--color-text);
}

.notifications-header small {
  margin-left: 6px;
  font-size: 11px;
  color: var(--color-primary);
  font-weight: 700;
}

.mark-read-btn {
  font-size: 11.5px;
  color: var(--color-text-muted);
  font-weight: 600;
}

.mark-read-btn:hover {
  color: var(--color-primary);
}

.notifications-body {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-border-subtle);
  transition: background-color 0.15s ease;
}

.notification-item:hover {
  background-color: var(--color-surface-hover);
}

.notification-item.unread {
  background-color: rgba(238, 242, 255, 0.4);
}

.notification-item.is-security-critical {
  background-color: rgba(254, 242, 242, 0.72);
  border-left: 3px solid #dc2626;
}

.notification-item.is-security-warning {
  background-color: rgba(255, 251, 235, 0.72);
  border-left: 3px solid #d97706;
}

.notification-btn.has-security-alert {
  border-color: #fca5a5;
  background-color: #fef2f2;
  color: #dc2626;
}

.notif-dot-wrap {
  width: 8px;
  padding-top: 6px;
}

.notif-unread-dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.notif-unread-dot.dot-danger {
  background-color: #dc2626;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notif-sec-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  flex-shrink: 0;
}

.notif-sec-badge.critical {
  background: #fee2e2;
  color: #b91c1c;
}

.notif-sec-badge.warning {
  background: #fef3c7;
  color: #b45309;
}

.notif-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}

.notif-sec-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.notif-unblock-btn {
  padding: 2px 8px;
  border-radius: 6px;
  background: #059669;
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
}

.notif-unblock-btn:hover {
  background: #047857;
}

.notif-inspect-link {
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.notif-inspect-link:hover {
  text-decoration: underline;
}

.notif-content strong {
  display: block;
  font-size: 13px;
  color: var(--color-text);
  font-weight: 600;
}

.notif-content p {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 2px 0 4px 0;
}

.notif-content small {
  font-size: 11px;
  color: var(--color-text-subtle);
}

.notifications-footer {
  padding: 10px 18px;
  text-align: center;
  background-color: var(--color-surface-subtle);
  border-top: 1px solid var(--color-border);
}

.view-all-link {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
}

/* Admin Profile Button in Header */
.admin-profile-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 4px 4px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.admin-profile-btn:hover {
  background-color: #ffffff;
  border-color: #cbd5e1;
}

.profile-avatar-pill {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
  display: grid;
  place-items: center;
}

.admin-profile-meta {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.admin-name {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
}

.admin-role {
  font-size: 10.5px;
  color: var(--color-text-muted);
}

.chevron {
  color: var(--color-text-subtle);
}

.profile-dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 260px;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  z-index: 100;
  overflow: hidden;
}

.profile-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  border-bottom: 1px solid var(--color-border);
}

.profile-avatar-large {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 700;
}

.profile-menu-header strong {
  display: block;
  font-size: 14px;
  color: var(--color-text);
}

.profile-menu-header small {
  display: block;
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.super-admin-pill {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 700;
}

.profile-menu-links {
  padding: 6px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
  text-align: left;
  transition: all 0.15s ease;
}

.dropdown-item:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.dropdown-item.active {
  color: var(--color-primary);
  font-weight: 600;
}

.dropdown-footer {
  padding: 6px;
  border-top: 1px solid var(--color-border);
}

.sign-out-item {
  color: var(--color-danger);
}

.sign-out-item:hover {
  background-color: var(--color-danger-bg);
  color: var(--color-danger-text);
}

/* ==========================================================================
   COMMAND PALETTE SPOTLIGHT MODAL
   ========================================================================== */
.command-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background-color: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: grid;
  place-items: start center;
  padding-top: 120px;
}

.command-modal {
  width: min(100%, 600px);
  background: #ffffff;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: scaleDown 0.15s ease-out;
}

@keyframes scaleDown {
  from { transform: scale(0.96) translateY(-10px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.command-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.command-input-row svg {
  color: var(--color-primary);
}

.command-input-row input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--color-text);
}

.esc-kbd {
  font-size: 11px;
  font-family: var(--font-mono);
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  padding: 3px 7px;
  border-radius: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.command-results-list {
  max-height: 340px;
  overflow-y: auto;
  padding: 8px;
}

.no-command-results {
  padding: 32px 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13.5px;
}

.command-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;
  cursor: pointer;
}

.command-item:hover {
  background-color: var(--color-surface-hover);
}

.command-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.command-category-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 2px 7px;
  border-radius: 4px;
}

.command-item strong {
  font-size: 13.5px;
  color: var(--color-text);
  font-weight: 600;
}

.jump-arrow {
  font-size: 12px;
  color: var(--color-text-subtle);
  font-weight: 600;
}

.command-item:hover .jump-arrow {
  color: var(--color-primary);
  transform: translateX(2px);
}

.command-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background-color: var(--color-surface-subtle);
  border-top: 1px solid var(--color-border);
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.quick-brand {
  font-weight: 600;
  color: var(--color-primary);
}

.sim-role-section {
  padding: 10px 14px;
  background-color: var(--color-surface-subtle);
  border-bottom: 1px solid var(--color-border);
}

.sim-role-header {
  display: block;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.sim-buttons-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.role-switch-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.role-switch-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.role-switch-btn.active {
  background-color: #ffffff;
  color: var(--color-primary);
  border-color: var(--color-border);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.role-mini-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-admin { background: #8b5cf6; }
.dot-teacher { background: #3b82f6; }
.dot-student { background: #10b981; }

.avatar-admin { background: #8b5cf6 !important; color: white !important; }
.avatar-teacher { background: #3b82f6 !important; color: white !important; }
.avatar-student { background: #10b981 !important; color: white !important; }

.sidebar-toggle-btn {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  color: #475569;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.16s ease;
}

.sidebar-toggle-btn:hover {
  background-color: #f8fafc;
  border-color: #cbd5e1;
  color: #4f46e5;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.sidebar-toggle-btn.is-collapsed {
  background-color: #eef2ff;
  border-color: #c7d2fe;
  color: #4f46e5;
}

@media (max-width: 900px) {
  .term-selector-wrap,
  .command-search-bar {
    display: none;
  }
}
</style>
