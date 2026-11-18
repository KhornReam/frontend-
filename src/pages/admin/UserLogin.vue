<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getCurrentUser } from '../../services/authService.js'
import {
  clearLoginHistory,
  clearResolvedSecurityAlerts,
  dismissSecurityAlert,
  formatRelativeTime,
  getBlockedEmails,
  getLoginHistory,
  getSecurityAlerts,
  markAllSecurityAlertsRead,
  MAX_LOGIN_ATTEMPTS,
  unblockAllEmails,
  unblockEmail,
} from '../../services/loginSecurityService.js'

const currentUser = ref(getCurrentUser())
const loginHistory = ref([])
const blockedEmails = ref([])
const securityAlerts = ref([])

const activeFilter = ref('all') // 'all' | 'success' | 'failed' | 'blocked'
const roleFilter = ref('all') // 'all' | 'admin' | 'teacher' | 'student' | 'unknown'
const searchQuery = ref('')
const toastMessage = ref('')

function showToast(msg) {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = ''
  }, 3500)
}

function refreshData() {
  currentUser.value = getCurrentUser()
  loginHistory.value = getLoginHistory()
  blockedEmails.value = getBlockedEmails()
  securityAlerts.value = getSecurityAlerts()
}

// KPI Computeds
const successfulLoginsCount = computed(
  () => loginHistory.value.filter((item) => item.status === 'Success').length,
)

const failedLoginsCount = computed(
  () => loginHistory.value.filter((item) => item.status === 'Failed' || item.status === 'Blocked').length,
)

const unreadAlertsCount = computed(
  () => securityAlerts.value.filter((a) => a.unread && !a.resolved).length,
)

function isEmailCurrentlyBlocked(email) {
  const clean = (email || '').trim().toLowerCase()
  return blockedEmails.value.some((b) => b.email === clean)
}

const filteredHistory = computed(() => {
  let list = loginHistory.value

  if (activeFilter.value === 'success') {
    list = list.filter((i) => i.status === 'Success')
  } else if (activeFilter.value === 'failed') {
    list = list.filter((i) => i.status === 'Failed')
  } else if (activeFilter.value === 'blocked') {
    list = list.filter((i) => i.status === 'Blocked')
  }

  if (roleFilter.value !== 'all') {
    list = list.filter((i) => (i.role || 'unknown') === roleFilter.value)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((i) =>
      [i.name, i.email, i.roleLabel, i.reason, i.deviceLabel, i.status]
        .some((val) => val?.toLowerCase().includes(q)),
    )
  }

  return list
})

function formatExactTime(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function handleUnblock(email) {
  unblockEmail(email, currentUser.value?.name || 'Administrator')
  refreshData()
  showToast(`Unblocked "${email}". Login attempts reset to 0/${MAX_LOGIN_ATTEMPTS}.`)
}

function handleUnblockAll() {
  const count = unblockAllEmails(currentUser.value?.name || 'Administrator')
  refreshData()
  if (count > 0) {
    showToast(`Unblocked all ${count} locked email address${count === 1 ? '' : 'es'}.`)
  }
}

function handleMarkAllRead() {
  markAllSecurityAlertsRead()
  refreshData()
  showToast('All security alerts marked as read.')
}

function handleClearResolved() {
  clearResolvedSecurityAlerts()
  refreshData()
  showToast('Cleared resolved security alerts.')
}

function handleDismissAlert(id) {
  dismissSecurityAlert(id)
  refreshData()
}

function handleClearHistory() {
  if (!window.confirm('Clear all recorded user login history logs? Blocked emails will remain protected.')) return
  clearLoginHistory()
  refreshData()
  showToast('User login history log cleared.')
}

function exportLoginCsv() {
  const rows = [
    ['Name', 'Email', 'Role', 'Status', 'Attempts', 'Reason', 'Device', 'Timestamp'],
    ...loginHistory.value.map((r) => [
      r.name,
      r.email,
      r.roleLabel,
      r.status,
      `${r.attempts}/${r.maxAttempts || MAX_LOGIN_ATTEMPTS}`,
      r.reason,
      r.deviceLabel,
      r.timestamp,
    ]),
  ]
  const csv = rows.map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `StudentHub_User_Login_Log_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  showToast('Exported user login activity log to CSV.')
}

onMounted(() => {
  refreshData()
  window.addEventListener('sms-security-alerts-updated', refreshData)
})

onUnmounted(() => {
  window.removeEventListener('sms-security-alerts-updated', refreshData)
})
</script>

<template>
  <section class="management-page user-login-page">
    <!-- Clean White Executive Header -->
    <header class="management-heading login-monitor-hero">
      <div class="hero-copy">
        <div class="hero-eyebrow-row">
          <span class="eyebrow">ACCESS & AUTHENTICATION MONITOR</span>
          <span class="shield-live-pill">
            <span class="live-dot"></span>
            3-Attempt Lock Active
          </span>
        </div>
        <h1>User Login</h1>
        <p class="page-description">
          Monitor every portal sign-in, track unauthorized email/password attempts, and manage blocked email access in real time.
        </p>
      </div>

      <div class="header-action-group">
        <button
          type="button"
          class="secondary-button"
          :disabled="!loginHistory.length"
          @click="exportLoginCsv"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          class="secondary-button"
          :disabled="!unreadAlertsCount"
          @click="handleMarkAllRead"
        >
          <span>Mark Alerts Read</span>
        </button>

        <button
          type="button"
          class="primary-button"
          :disabled="!blockedEmails.length"
          @click="handleUnblockAll"
        >
          <span>Unblock All ({{ blockedEmails.length }})</span>
        </button>
      </div>
    </header>

    <!-- Toast Feedback -->
    <Transition name="fade-slide">
      <div v-if="toastMessage" class="toast-notification" role="status">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- 4-Column White KPI Cards -->
    <div class="login-kpi-grid">
      <article class="summary-card">
        <div class="summary-icon tone-green">
          <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Successful Logins</span>
          <strong>{{ successfulLoginsCount }}</strong>
        </div>
        <span class="summary-caption">Verified sessions</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-danger-soft">
          <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Blocked Emails</span>
          <strong>{{ blockedEmails.length }} Locked</strong>
        </div>
        <span class="summary-caption">Auto-locked at 3/3</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-amber">
          <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Failed Attempts</span>
          <strong>{{ failedLoginsCount }}</strong>
        </div>
        <span class="summary-caption">{{ unreadAlertsCount }} unread alerts</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Lockout Policy</span>
          <strong>{{ MAX_LOGIN_ATTEMPTS }} Attempts</strong>
        </div>
        <span class="summary-caption">Real-time admin alert</span>
      </article>
    </div>

    <!-- Blocked Emails Management Panel (White Card) -->
    <div class="table-panel blocked-panel">
      <div class="panel-header-bar">
        <div>
          <h2>Blocked Email Addresses</h2>
          <p class="panel-sub">
            Emails automatically blocked after 3 consecutive failed login attempts. Review who attempted access and unblock when verified.
          </p>
        </div>
        <span class="status-chip" :class="blockedEmails.length ? 'chip-danger' : 'chip-safe'">
          <span class="chip-dot"></span>
          {{ blockedEmails.length ? `${blockedEmails.length} Blocked` : 'All Clear' }}
        </span>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Blocked Email & Identity</th>
              <th>Account Role</th>
              <th>Failure Reason</th>
              <th>Attempts</th>
              <th>Device / Browser</th>
              <th>Blocked Time</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in blockedEmails" :key="item.email">
              <td>
                <div class="identity-cell">
                  <div class="mini-avatar avatar-danger">!</div>
                  <div>
                    <strong class="email-blocked-text">{{ item.email }}</strong>
                    <small class="identity-sub">{{ item.accountName }}</small>
                  </div>
                </div>
              </td>
              <td>
                <span class="role-tag role-neutral">{{ item.accountRole }}</span>
              </td>
              <td>
                <span class="reason-pill">{{ item.reason }}</span>
              </td>
              <td>
                <strong class="attempts-danger">{{ item.attempts }} / {{ MAX_LOGIN_ATTEMPTS }}</strong>
                <small v-if="item.extraAttemptsAfterBlock" class="extra-retry-note">
                  +{{ item.extraAttemptsAfterBlock }} retries blocked
                </small>
              </td>
              <td class="muted-cell">{{ item.deviceLabel }}</td>
              <td class="muted-cell">
                <span>{{ formatRelativeTime(item.blockedAt) }}</span>
                <small class="exact-time-sub">{{ formatExactTime(item.blockedAt) }}</small>
              </td>
              <td style="text-align: right;">
                <button
                  type="button"
                  class="unblock-btn"
                  @click="handleUnblock(item.email)"
                >
                  Unblock Email
                </button>
              </td>
            </tr>
            <tr v-if="!blockedEmails.length">
              <td colspan="7" class="empty-state-cell">
                <div class="empty-box">
                  <p class="empty-title">No blocked emails right now</p>
                  <p class="empty-text">When any email fails login 3 times, it is automatically locked and listed here.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- User Login Activity Log (White Card) -->
    <div class="table-panel">
      <div class="panel-header-bar">
        <div>
          <h2>User Login Activity & Audit History</h2>
          <p class="panel-sub">Complete chronological feed of successful logins, failed attempts, and blocked access events.</p>
        </div>
        <button
          v-if="loginHistory.length"
          type="button"
          class="action-button"
          @click="handleClearHistory"
        >
          Clear Log
        </button>
      </div>

      <!-- Filter & Search Bar -->
      <div class="login-filter-toolbar">
        <div class="filter-pills">
          <button
            type="button"
            class="filter-pill"
            :class="{ active: activeFilter === 'all' }"
            @click="activeFilter = 'all'"
          >
            All ({{ loginHistory.length }})
          </button>
          <button
            type="button"
            class="filter-pill"
            :class="{ active: activeFilter === 'success' }"
            @click="activeFilter = 'success'"
          >
            Successful ({{ successfulLoginsCount }})
          </button>
          <button
            type="button"
            class="filter-pill"
            :class="{ active: activeFilter === 'failed' }"
            @click="activeFilter = 'failed'"
          >
            Failed
          </button>
          <button
            type="button"
            class="filter-pill"
            :class="{ active: activeFilter === 'blocked' }"
            @click="activeFilter = 'blocked'"
          >
            Blocked
          </button>
        </div>

        <div class="filter-right">
          <select v-model="roleFilter" class="role-select">
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="unknown">Unknown / Unregistered</option>
          </select>

          <div class="search-input-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search user, email, or device..."
            />
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>User & Email</th>
              <th>Role</th>
              <th>Login Status</th>
              <th>Reason / Details</th>
              <th>Device / Browser</th>
              <th>Time</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in filteredHistory" :key="entry.id">
              <td>
                <div class="identity-cell">
                  <div class="mini-avatar" :class="'avatar-' + (entry.role || 'unknown')">
                    {{ entry.avatar || 'US' }}
                  </div>
                  <div>
                    <strong class="identity-name">{{ entry.name }}</strong>
                    <small class="identity-sub">{{ entry.email }}</small>
                  </div>
                </div>
              </td>
              <td>
                <span class="role-tag" :class="'role-' + (entry.role || 'unknown')">
                  {{ entry.roleLabel }}
                </span>
              </td>
              <td>
                <span
                  class="status-pill"
                  :class="{
                    'pill-success': entry.status === 'Success',
                    'pill-warning': entry.status === 'Failed',
                    'pill-danger': entry.status === 'Blocked',
                  }"
                >
                  {{
                    entry.status === 'Success'
                      ? 'Signed In'
                      : entry.status === 'Blocked'
                        ? `Blocked (${entry.attempts}/${entry.maxAttempts || 3})`
                        : `Failed (${entry.attempts}/${entry.maxAttempts || 3})`
                  }}
                </span>
              </td>
              <td class="muted-cell">{{ entry.reason }}</td>
              <td class="muted-cell">{{ entry.deviceLabel }}</td>
              <td class="muted-cell">
                <span>{{ formatRelativeTime(entry.timestamp) }}</span>
                <small class="exact-time-sub">{{ formatExactTime(entry.timestamp) }}</small>
              </td>
              <td style="text-align: right;">
                <button
                  v-if="isEmailCurrentlyBlocked(entry.email)"
                  type="button"
                  class="unblock-btn small-btn"
                  @click="handleUnblock(entry.email)"
                >
                  Unblock
                </button>
                <span v-else-if="entry.status === 'Success'" class="verified-text">Verified</span>
                <span v-else class="monitored-text">Logged</span>
              </td>
            </tr>
            <tr v-if="!filteredHistory.length">
              <td colspan="7" class="empty-state-cell">
                <div class="empty-box">
                  <p class="empty-title">No login records match your filter</p>
                  <p class="empty-text">Sign-in events and failed attempts will appear here automatically.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Real-Time Security Alerts Panel (White Card) -->
    <div class="table-panel">
      <div class="panel-header-bar">
        <div>
          <h2>Security Intrusion Alerts</h2>
          <p class="panel-sub">Detailed alerts generated whenever an unauthorized or incorrect login attempt occurs.</p>
        </div>
        <button
          type="button"
          class="action-button"
          :disabled="!securityAlerts.some((a) => a.resolved)"
          @click="handleClearResolved"
        >
          Clear Resolved
        </button>
      </div>

      <div class="alerts-feed">
        <div
          v-for="alert in securityAlerts"
          :key="alert.id"
          class="alert-row"
          :class="{
            'is-critical': alert.severity === 'critical' && !alert.resolved,
            'is-warning': alert.severity === 'warning' && !alert.resolved,
            'is-resolved': alert.resolved,
          }"
        >
          <div class="alert-icon" :class="alert.severity">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="alert-body">
            <div class="alert-top">
              <strong>{{ alert.title }}</strong>
              <span class="alert-badge" :class="alert.resolved ? 'badge-resolved' : alert.severity">
                {{ alert.resolved ? 'Resolved' : alert.severity === 'critical' ? 'Blocked' : 'Warning' }}
              </span>
              <span v-if="alert.unread && !alert.resolved" class="new-badge">NEW</span>
            </div>
            <p class="alert-msg">{{ alert.message }}</p>
            <div class="alert-meta">
              <span>Email: <code>{{ alert.email }}</code></span>
              <span>•</span>
              <span>User: {{ alert.accountName }}</span>
              <span>•</span>
              <span>{{ formatRelativeTime(alert.timestamp) }}</span>
            </div>
          </div>
          <div class="alert-actions">
            <button
              v-if="isEmailCurrentlyBlocked(alert.email)"
              type="button"
              class="unblock-btn small-btn"
              @click="handleUnblock(alert.email)"
            >
              Unblock
            </button>
            <button
              type="button"
              class="action-button"
              @click="handleDismissAlert(alert.id)"
            >
              Dismiss
            </button>
          </div>
        </div>

        <div v-if="!securityAlerts.length" class="empty-alerts">
          <strong>No security alerts</strong>
          <p>Failed login attempts and blocked email notifications will appear here automatically.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.user-login-page {
  gap: 20px;
}

.login-monitor-hero {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 26px 30px;
}

.hero-eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.hero-eyebrow-row .eyebrow {
  margin-bottom: 0;
}

.shield-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
  font-size: 11px;
  font-weight: 700;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
}

.header-action-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toast-notification {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 12px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  font-size: 13px;
  font-weight: 600;
}

/* 4-Column White KPI Row */
.login-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1120px) {
  .login-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .login-kpi-grid {
    grid-template-columns: 1fr;
  }
}

.tone-danger-soft {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* Panels */
.panel-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  flex-wrap: wrap;
}

.panel-header-bar h2 {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 3px;
}

.panel-sub {
  margin: 0;
  font-size: 12.5px;
  color: #64748b;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
}

.chip-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.chip-danger .chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #dc2626;
}

.chip-safe {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
}

.chip-safe .chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
}

/* Filter Bar */
.login-filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
  flex-wrap: wrap;
}

.filter-pills {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 4px;
  border-radius: 11px;
}

.filter-pill {
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-pill:hover {
  color: #0f172a;
}

.filter-pill.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.role-select {
  height: 36px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  outline: none;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #94a3b8;
  min-width: 220px;
}

.search-input-wrap input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 12.5px;
  color: #0f172a;
  width: 100%;
}

/* Table Cells */
.identity-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mini-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.avatar-admin { background: #eef2ff; color: #4f46e5; }
.avatar-teacher { background: #eff6ff; color: #2563eb; }
.avatar-student { background: #ecfdf5; color: #059669; }
.avatar-unknown { background: #f1f5f9; color: #64748b; }
.avatar-danger { background: #fee2e2; color: #dc2626; }

.identity-name {
  display: block;
  font-size: 13.5px;
  color: #0f172a;
}

.email-blocked-text {
  display: block;
  font-size: 13.5px;
  color: #991b1b;
}

.identity-sub {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.role-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
}

.role-admin { background: #eef2ff; color: #4338ca; }
.role-teacher { background: #eff6ff; color: #1d4ed8; }
.role-student { background: #ecfdf5; color: #047857; }
.role-unknown, .role-neutral { background: #f1f5f9; color: #475569; }

.status-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
}

.pill-success { background: #ecfdf5; color: #047857; }
.pill-warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
.pill-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

.reason-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
  font-size: 11.5px;
  font-weight: 700;
}

.attempts-danger {
  color: #dc2626;
  font-size: 13px;
}

.extra-retry-note {
  display: block;
  font-size: 11px;
  color: #b91c1c;
}

.muted-cell {
  font-size: 12.5px;
  color: #475569;
}

.exact-time-sub {
  display: block;
  font-size: 11px;
  color: #94a3b8;
}

.unblock-btn {
  padding: 7px 14px;
  border-radius: 9px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.22);
  transition: all 0.15s ease;
}

.unblock-btn.small-btn {
  padding: 5px 11px;
  font-size: 11.5px;
}

.unblock-btn:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}

.verified-text {
  font-size: 12px;
  font-weight: 600;
  color: #059669;
}

.monitored-text {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

/* Alerts Feed */
.alerts-feed {
  background: #ffffff;
}

.alert-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.alert-row:last-child {
  border-bottom: none;
}

.alert-row.is-critical {
  background: rgba(254, 242, 242, 0.55);
}

.alert-row.is-warning {
  background: rgba(255, 251, 235, 0.55);
}

.alert-row.is-resolved {
  opacity: 0.72;
}

.alert-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.alert-icon.critical { background: #fee2e2; color: #dc2626; }
.alert-icon.warning { background: #fef3c7; color: #d97706; }

.alert-body {
  flex: 1;
  min-width: 0;
}

.alert-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 3px;
}

.alert-top strong {
  font-size: 13.5px;
  color: #0f172a;
}

.alert-badge {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
}

.alert-badge.critical { background: #fee2e2; color: #b91c1c; }
.alert-badge.warning { background: #fef3c7; color: #b45309; }
.alert-badge.badge-resolved { background: #ecfdf5; color: #047857; }

.new-badge {
  font-size: 10px;
  font-weight: 800;
  background: #4f46e5;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 5px;
}

.alert-msg {
  margin: 0 0 6px;
  font-size: 12.8px;
  color: #334155;
  line-height: 1.45;
}

.alert-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: #64748b;
}

.alert-meta code {
  background: #f1f5f9;
  color: #0f172a;
  padding: 1px 6px;
  border-radius: 5px;
  font-weight: 600;
}

.alert-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.empty-alerts {
  padding: 36px 24px;
  text-align: center;
}

.empty-alerts strong {
  display: block;
  font-size: 14px;
  color: #0f172a;
  margin-bottom: 4px;
}

.empty-alerts p {
  margin: 0;
  font-size: 12.5px;
  color: #64748b;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
