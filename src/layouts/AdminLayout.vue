<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminHeader from '../components/admin/AdminHeader.vue'
import AdminSidebar from '../components/admin/AdminSidebar.vue'
import { getCurrentUser } from '../services/authService.js'
import {
  formatRelativeTime,
  getBlockedEmails,
  getSecurityAlerts,
  markAllSecurityAlertsRead,
} from '../services/loginSecurityService.js'

const STORAGE_KEY = 'sms_sidebar_collapsed'
const route = useRoute()
const router = useRouter()

const sidebarCollapsed = ref(localStorage.getItem(STORAGE_KEY) === 'true')
const mobileSidebarOpen = ref(false)
const currentUser = ref(getCurrentUser())
const securityAlerts = ref(getSecurityAlerts())
const blockedEmails = ref(getBlockedEmails())

function refreshSecurityState() {
  currentUser.value = getCurrentUser()
  securityAlerts.value = getSecurityAlerts()
  blockedEmails.value = getBlockedEmails()
}

const unreadSecurityAlerts = computed(() =>
  securityAlerts.value.filter((a) => a.unread && !a.resolved),
)

const latestUnreadAlert = computed(() => unreadSecurityAlerts.value[0] || null)

const showAdminSecurityBanner = computed(() => {
  return currentUser.value?.role === 'admin' && unreadSecurityAlerts.value.length > 0
})

function openSecurityCenter() {
  router.push('/user-login')
}

function acknowledgeAlerts() {
  markAllSecurityAlertsRead()
  refreshSecurityState()
}

function toggleSidebar() {
  if (window.innerWidth <= 768) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem(STORAGE_KEY, String(sidebarCollapsed.value))
  }
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}

function handleShortcut(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    toggleSidebar()
  }
}

watch(
  () => route.fullPath,
  () => {
    mobileSidebarOpen.value = false
    refreshSecurityState()
  },
)

onMounted(() => {
  refreshSecurityState()
  window.addEventListener('keydown', handleShortcut)
  window.addEventListener('sms-auth-changed', refreshSecurityState)
  window.addEventListener('sms-security-alerts-updated', refreshSecurityState)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleShortcut)
  window.removeEventListener('sms-auth-changed', refreshSecurityState)
  window.removeEventListener('sms-security-alerts-updated', refreshSecurityState)
})
</script>

<template>
  <div class="app-shell admin-layout" :class="{ 'sidebar-is-collapsed': sidebarCollapsed }">
    <!-- Mobile Backdrop Overlay -->
    <div
      v-if="mobileSidebarOpen"
      class="sidebar-mobile-backdrop"
      @click="closeMobileSidebar"
    ></div>

    <AdminSidebar
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileSidebarOpen"
      @toggle-collapse="toggleSidebar"
      @close-mobile="closeMobileSidebar"
    />

    <main class="main-panel">
      <AdminHeader
        :sidebar-collapsed="sidebarCollapsed"
        :mobile-sidebar-open="mobileSidebarOpen"
        @toggle-sidebar="toggleSidebar"
      />

      <!-- Real-Time Admin Security Intrusion Alert Banner -->
      <div
        v-if="showAdminSecurityBanner && latestUnreadAlert"
        class="admin-security-banner"
        :class="latestUnreadAlert.severity === 'critical' ? 'is-critical' : 'is-warning'"
        role="alert"
      >
        <div class="security-banner-left">
          <div class="security-banner-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="security-banner-copy">
            <div class="security-banner-title-row">
              <strong>{{ latestUnreadAlert.title }}</strong>
              <span class="security-count-pill">
                {{ unreadSecurityAlerts.length }} unread alert{{ unreadSecurityAlerts.length === 1 ? '' : 's' }}
              </span>
              <span v-if="blockedEmails.length" class="security-blocked-pill">
                {{ blockedEmails.length }} blocked email{{ blockedEmails.length === 1 ? '' : 's' }}
              </span>
              <span class="security-time-label">{{ formatRelativeTime(latestUnreadAlert.timestamp) }}</span>
            </div>
            <p>{{ latestUnreadAlert.message }}</p>
          </div>
        </div>

        <div class="security-banner-actions">
          <button type="button" class="security-inspect-btn" @click="openSecurityCenter">
            Inspect & Unblock →
          </button>
          <button type="button" class="security-dismiss-btn" @click="acknowledgeAlerts">
            Mark Read
          </button>
        </div>
      </div>

      <div class="page-content"><RouterView /></div>
    </main>
  </div>
</template>

<style scoped>
.admin-security-banner {
  margin: 16px 32px 0;
  padding: 13px 18px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  border: 1px solid #fecaca;
  background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%);
  box-shadow: 0 6px 18px rgba(220, 38, 38, 0.08);
}

.admin-security-banner.is-warning {
  border-color: #fde68a;
  background: linear-gradient(135deg, #fffbeb 0%, #fefce8 100%);
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.08);
}

.security-banner-left {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  flex: 1;
}

.security-banner-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: #fee2e2;
  color: #dc2626;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.admin-security-banner.is-warning .security-banner-icon {
  background: #fef3c7;
  color: #d97706;
}

.security-banner-copy {
  min-width: 0;
}

.security-banner-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.security-banner-title-row strong {
  font-size: 13.5px;
  font-weight: 800;
  color: #991b1b;
}

.admin-security-banner.is-warning .security-banner-title-row strong {
  color: #92400e;
}

.security-count-pill {
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  background: #dc2626;
  padding: 2px 8px;
  border-radius: 999px;
}

.admin-security-banner.is-warning .security-count-pill {
  background: #d97706;
}

.security-blocked-pill {
  font-size: 11px;
  font-weight: 700;
  color: #991b1b;
  background: #fecaca;
  padding: 2px 8px;
  border-radius: 999px;
}

.security-time-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.security-banner-copy p {
  margin: 0;
  font-size: 12.5px;
  color: #7f1d1d;
  line-height: 1.45;
}

.admin-security-banner.is-warning .security-banner-copy p {
  color: #78350f;
}

.security-banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.security-inspect-btn {
  padding: 8px 14px;
  border-radius: 10px;
  background: #dc2626;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.admin-security-banner.is-warning .security-inspect-btn {
  background: #d97706;
}

.security-inspect-btn:hover {
  filter: brightness(0.92);
  transform: translateY(-1px);
}

.security-dismiss-btn {
  padding: 8px 12px;
  border-radius: 10px;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.security-dismiss-btn:hover {
  background: #f8fafc;
  color: #0f172a;
}

@media (max-width: 768px) {
  .admin-security-banner {
    margin: 12px 16px 0;
  }
}
</style>
