<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { clearAuditLogs, getAuditLogs, recordAuditLog } from '../../services/auditLogService.js'
import { exportToExcel } from '../../utils/exportUtils.js'

const activeTab = ref('profile')
const saving = ref(false)
const successMessage = ref('')
const backupLoading = ref(false)
const lastBackupTime = ref('2026-11-06 04:00 AM (UTC)')

// Administrative Controls
const maintenanceMode = ref(false)
const academicTermLock = ref(false)
const ipRestrictionEnabled = ref(false)
const ipWhitelist = ref('192.168.1.0/24, 10.0.4.15')

// Audit Logs State
const auditLogs = ref([])
const auditSearch = ref('')
const selectedCategory = ref('All')
const auditCategories = ['All', 'Academic', 'Attendance', 'Security', 'Export', 'Automation']

const profileForm = reactive({
  schoolName: 'Greenwood Academy of Excellence',
  campusCode: 'GW-8821',
  principal: 'Dr. Alexander Vance',
  contactEmail: 'admin@greenwood.edu',
  phone: '+1 (555) 234-5678',
  address: '742 Evergreen Terrace, Springfield',
  accreditation: 'National Secondary Academic Board (Accredited A+)',
})

const academicForm = reactive({
  academicYear: '2026–2027',
  activeTerm: 'Term 2',
  gradingSystem: 'GPA 4.0 Scale with Letter Grades (A-F)',
  passPercentage: '60%',
  attendanceThreshold: '85%',
  maxClassCapacity: '35 Students per Section',
})

const securityForm = reactive({
  twoFactorAuth: true,
  sessionTimeout: '30 minutes of inactivity',
  enforceStrongPassword: true,
  ipRestriction: false,
})

const notificationForm = reactive({
  emailAlerts: true,
  smsGateway: true,
  dailyAdminDigest: true,
  attendanceAlertParents: true,
})

// Filtered Audit Logs
const filteredAuditLogs = computed(() => {
  const query = auditSearch.value.trim().toLowerCase()
  return auditLogs.value.filter((log) => {
    const matchesCat = selectedCategory.value === 'All' || log.category === selectedCategory.value
    const matchesQuery =
      !query ||
      log.user_name.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.resource.toLowerCase().includes(query) ||
      log.ip_address.toLowerCase().includes(query)
    return matchesCat && matchesQuery
  })
})

function showToast(msg) {
  successMessage.value = msg
  setTimeout(() => {
    if (successMessage.value === msg) {
      successMessage.value = ''
    }
  }, 3500)
}

function saveSettings() {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    recordAuditLog({
      user_name: 'Dr. Alexander Vance',
      user_email: 'admin@school.edu',
      role: 'Super Administrator',
      action: 'Updated Institutional System Configurations & Policy Settings',
      category: 'Security',
      resource: 'Institutional Settings',
      status: 'Success',
    })
    loadLogs()
    showToast('System preferences and configurations saved successfully!')
  }, 500)
}

async function loadLogs() {
  try {
    const res = await getAuditLogs()
    auditLogs.value = res.data || []
  } catch {
    // handled gracefully
  }
}

async function triggerCloudBackup() {
  backupLoading.value = true
  setTimeout(async () => {
    backupLoading.value = false
    lastBackupTime.value = new Date().toLocaleString()
    await recordAuditLog({
      user_name: 'Dr. Alexander Vance',
      user_email: 'admin@school.edu',
      role: 'Super Administrator',
      action: 'Triggered Institutional Cloud Database Snapshot Backup (Full Encryption)',
      category: 'Automation',
      resource: 'Encrypted Cloud Storage S3 (Greenwood-Backup-Prod)',
      status: 'Success',
    })
    loadLogs()
    showToast('Cloud database snapshot generated and securely archived to S3 bucket!')
  }, 1200)
}

function handleTermLockToggle() {
  const state = academicTermLock.value ? 'Engaged' : 'Released'
  recordAuditLog({
    user_name: 'Dr. Alexander Vance',
    user_email: 'admin@school.edu',
    role: 'Super Administrator',
    action: `Academic Term Gradebook Lock ${state}`,
    category: 'Academic',
    resource: 'Term 2 Gradebook Locks',
    status: 'Success',
  })
  loadLogs()
  showToast(`Academic Term Gradebook Lock is now ${state}.`)
}

function handleMaintenanceToggle() {
  const state = maintenanceMode.value ? 'Enabled' : 'Disabled'
  recordAuditLog({
    user_name: 'Dr. Alexander Vance',
    user_email: 'admin@school.edu',
    role: 'Super Administrator',
    action: `Institutional Maintenance Mode ${state}`,
    category: 'Security',
    resource: 'System Gateway / Maintenance Banner',
    status: maintenanceMode.value ? 'Warning' : 'Success',
  })
  loadLogs()
  showToast(`Institutional Maintenance Mode is now ${state}.`)
}

async function handleClearLogs() {
  if (!window.confirm('Are you sure you want to clear historical audit logs? This action will be archived.')) return
  await clearAuditLogs()
  await recordAuditLog({
    user_name: 'Dr. Alexander Vance',
    user_email: 'admin@school.edu',
    role: 'Super Administrator',
    action: 'Purged historical audit log archives',
    category: 'Security',
    resource: 'Audit Log Storage',
    status: 'Warning',
  })
  loadLogs()
  showToast('Audit log history archived and reset.')
}

function exportAuditLogExcel() {
  const headers = ['Log ID', 'Timestamp', 'User Name', 'Email', 'Role', 'Category', 'Action Performed', 'Resource', 'IP Address', 'Status']
  const rows = filteredAuditLogs.value.map((log) => [
    `#${log.id}`,
    log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent',
    log.user_name,
    log.user_email || '—',
    log.role,
    log.category,
    log.action,
    log.resource,
    log.ip_address,
    log.status,
  ])
  const summaryRows = [
    ['Total Audit Entries Exported', filteredAuditLogs.value.length],
    ['Category Filter', selectedCategory.value],
    ['Export Timestamp', new Date().toLocaleString()],
  ]
  exportToExcel({
    filename: `System_Audit_Log_${new Date().toISOString().slice(0, 10)}.xls`,
    title: 'Greenwood Academy - Security & System Audit Trail',
    sheetName: 'Audit Trail',
    headers,
    rows,
    summaryRows,
    metadata: {
      'Generated By': 'Dr. Alexander Vance (Super Administrator)',
      'Security Compliance': 'ISO/IEC 27001 & FERPA Compliant',
    },
  })
  showToast('Audit trail exported to Microsoft Excel (.xls) successfully!')
}

function formatLogDate(dateStr) {
  if (!dateStr) return 'Just now'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

onMounted(() => {
  loadLogs()
})
</script>

<template>
  <section class="management-page">
    <header class="management-heading">
      <div>
        <p class="eyebrow">SYSTEM CONFIGURATION & GOVERNANCE</p>
        <h1>Institutional Settings</h1>
        <p class="page-description">Configure school profile, academic calendar, administrative security, and audit trail.</p>
      </div>
      <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        <span>{{ saving ? 'Saving Changes...' : 'Save Settings' }}</span>
      </button>
    </header>

    <!-- Maintenance Mode Alert Banner if active -->
    <div v-if="maintenanceMode" class="maintenance-alert-banner">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div>
        <strong>System Maintenance Mode Active</strong>
        <p>Public portals and student access are temporarily paused for scheduled infrastructure maintenance.</p>
      </div>
    </div>

    <!-- Success Toast -->
    <div v-if="successMessage" class="toast-notification" role="status">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <!-- Tabbed Settings Layout -->
    <div class="settings-wrapper-card">
      <div class="settings-nav-sidebar">
        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'profile' }"
          @click="activeTab = 'profile'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <span>School Profile</span>
        </button>

        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'academic' }"
          @click="activeTab = 'academic'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Academic & Grading</span>
        </button>

        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'security' }"
          @click="activeTab = 'security'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Security & 2FA</span>
        </button>

        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'notifications' }"
          @click="activeTab = 'notifications'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Notification Channels</span>
        </button>

        <!-- 5. Audit Logs & Governance -->
        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'audit' }"
          @click="activeTab = 'audit'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Audit Logs & Security Trail</span>
        </button>
      </div>

      <!-- Settings Content Panels -->
      <div class="settings-content-area">
        <!-- 1. School Profile Tab -->
        <div v-if="activeTab === 'profile'" class="tab-panel">
          <div class="panel-intro">
            <h2>Institutional Profile & Identity</h2>
            <p>Official institution details shown on reports, diplomas, and student records.</p>
          </div>

          <div class="settings-form-grid">
            <label>
              School Name
              <input v-model="profileForm.schoolName" />
            </label>

            <div class="field-row">
              <label>
                Campus ID Code
                <input v-model="profileForm.campusCode" />
              </label>

              <label>
                Principal / Headmaster
                <input v-model="profileForm.principal" />
              </label>
            </div>

            <div class="field-row">
              <label>
                Administrative Contact Email
                <input v-model="profileForm.contactEmail" type="email" />
              </label>

              <label>
                Official Telephone
                <input v-model="profileForm.phone" />
              </label>
            </div>

            <label>
              Campus Street Address
              <input v-model="profileForm.address" />
            </label>

            <label>
              Accreditation Board & Standing
              <input v-model="profileForm.accreditation" placeholder="e.g. National Secondary Academic Board (Accredited A+)" />
            </label>
          </div>

          <div class="form-actions-bar">
            <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>{{ saving ? 'Saving Changes...' : 'Save Changes' }}</span>
            </button>
          </div>
        </div>

        <!-- 2. Academic & Grading Tab -->
        <div v-else-if="activeTab === 'academic'" class="tab-panel">
          <div class="panel-intro">
            <h2>Academic Terms & Grading System</h2>
            <p>Set active school year dates, term calendars, and GPA scale calculations.</p>
          </div>

          <div class="settings-form-grid">
            <div class="field-row">
              <label>
                Current Academic Year
                <input v-model="academicForm.academicYear" />
              </label>

              <label>
                Active School Term
                <select v-model="academicForm.activeTerm">
                  <option value="Term 1">Term 1 (Fall Semester)</option>
                  <option value="Term 2">Term 2 (Spring Semester)</option>
                  <option value="Term 3">Term 3 (Summer Intensive)</option>
                </select>
              </label>
            </div>

            <label>
              Evaluation & Grading Scheme
              <select v-model="academicForm.gradingSystem">
                <option value="GPA 4.0 Scale with Letter Grades (A-F)">GPA 4.0 Scale with Letter Grades (A-F)</option>
                <option value="Percentage Scale (0-100%)">Percentage Scale (0-100%)</option>
                <option value="Standards-Based Grading (1-4)">Standards-Based Grading (1-4)</option>
              </select>
            </label>

            <div class="field-row">
              <label>
                Passing Grade Threshold
                <input v-model="academicForm.passPercentage" />
              </label>

              <label>
                Minimum Attendance Rate
                <input v-model="academicForm.attendanceThreshold" />
              </label>
            </div>

            <label>
              Classroom Capacity Target
              <input v-model="academicForm.maxClassCapacity" />
            </label>
          </div>

          <div class="form-actions-bar">
            <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>{{ saving ? 'Saving Changes...' : 'Save Changes' }}</span>
            </button>
          </div>
        </div>

        <!-- 3. Security Tab -->
        <div v-else-if="activeTab === 'security'" class="tab-panel">
          <div class="panel-intro">
            <h2>Security & Administrative Access</h2>
            <p>Authentication safeguards, session persistence, and role policies.</p>
          </div>

          <div class="toggle-list">
            <div class="toggle-item">
              <div>
                <strong>Two-Factor Authentication (2FA)</strong>
                <p>Require authentication codes for all administrator logins.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="securityForm.twoFactorAuth" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-item">
              <div>
                <strong>Enforce Complex Passwords</strong>
                <p>Require 10+ characters with mixed case, numerals, and special characters.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="securityForm.enforceStrongPassword" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-item">
              <div>
                <strong>Session Auto-Logout</strong>
                <p>Automatically lock sessions after 30 minutes of inactivity.</p>
              </div>
              <span class="status-pill status-active">Enabled</span>
            </div>

            <div class="toggle-item">
              <div>
                <strong>IP Whitelist Access Restriction</strong>
                <p>Restrict administrative logins strictly to authorized campus IP blocks.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="ipRestrictionEnabled" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div v-if="ipRestrictionEnabled" class="ip-whitelist-box">
            <label>
              Authorized IP Addresses / CIDR Subnets
              <input v-model="ipWhitelist" placeholder="e.g. 192.168.1.0/24, 10.0.4.15" />
            </label>
          </div>

          <div class="form-actions-bar">
            <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>{{ saving ? 'Saving Changes...' : 'Save Changes' }}</span>
            </button>
          </div>
        </div>

        <!-- 4. Notification Channels Tab -->
        <div v-else-if="activeTab === 'notifications'" class="tab-panel">
          <div class="panel-intro">
            <h2>Automated Communication Channels</h2>
            <p>Configure automated dispatch channels for attendance, scores, and alerts.</p>
          </div>

          <div class="toggle-list">
            <div class="toggle-item">
              <div>
                <strong>Parent Absentee SMS & Email Alerts</strong>
                <p>Send instant notifications when a student is recorded Absent or Late.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="notificationForm.attendanceAlertParents" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-item">
              <div>
                <strong>Daily Principal & Admin Morning Digest</strong>
                <p>Receive scheduled morning summary email at 7:30 AM.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="notificationForm.dailyAdminDigest" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-item">
              <div>
                <strong>System Health & Cloud Backup Confirmation</strong>
                <p>Email alerts on database backup completion or error events.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="notificationForm.emailAlerts" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="form-actions-bar">
            <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>{{ saving ? 'Saving Changes...' : 'Save Changes' }}</span>
            </button>
          </div>
        </div>

        <!-- 5. Audit Logs & Administrative Operations Tab -->
        <div v-else-if="activeTab === 'audit'" class="tab-panel">
          <div class="panel-intro">
            <h2>Administrative Operations & Audit Security Trail</h2>
            <p>Immutable governance logs, system snapshots, cloud backups, and compliance monitoring.</p>
          </div>

          <!-- Administrative Quick Controls Grid -->
          <div class="admin-ops-grid">
            <!-- Backup Card -->
            <div class="admin-op-card">
              <div class="op-head">
                <div class="op-icon-wrap tone-blue">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                  </svg>
                </div>
                <div>
                  <h4 class="op-title">Cloud Database Backup</h4>
                  <span class="op-sub">Last: {{ lastBackupTime }}</span>
                </div>
              </div>
              <p class="op-desc">Generate an encrypted database snapshot and synchronize to secure cloud storage.</p>
              <button
                type="button"
                class="op-action-btn primary-btn-sm"
                :disabled="backupLoading"
                @click="triggerCloudBackup"
              >
                <svg v-if="!backupLoading" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>{{ backupLoading ? 'Archiving Database...' : 'Trigger Backup Now' }}</span>
              </button>
            </div>

            <!-- Term Lock Card -->
            <div class="admin-op-card">
              <div class="op-head">
                <div class="op-icon-wrap tone-amber">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div>
                  <h4 class="op-title">Academic Term Lock</h4>
                  <span class="op-sub">{{ academicTermLock ? 'Term 2 Locked' : 'Term 2 Open' }}</span>
                </div>
              </div>
              <p class="op-desc">Lock historic exam scores and teacher gradebooks to prevent unauthorized revisions.</p>
              <label class="switch-toggle" style="margin-top: auto;">
                <input v-model="academicTermLock" type="checkbox" @change="handleTermLockToggle" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <!-- Maintenance Mode Card -->
            <div class="admin-op-card">
              <div class="op-head">
                <div class="op-icon-wrap tone-purple">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                </div>
                <div>
                  <h4 class="op-title">Maintenance Mode</h4>
                  <span class="op-sub">{{ maintenanceMode ? 'Active / Maintenance' : 'Live / Operational' }}</span>
                </div>
              </div>
              <p class="op-desc">Pause portal access for students and parents while preserving admin operations.</p>
              <label class="switch-toggle" style="margin-top: auto;">
                <input v-model="maintenanceMode" type="checkbox" @change="handleMaintenanceToggle" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <!-- Audit Log Filter Bar -->
          <div class="audit-toolbar">
            <div class="search-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                v-model="auditSearch"
                type="text"
                placeholder="Search audit trail by user, action, resource, or IP..."
              />
            </div>

            <!-- Category Filter Tabs -->
            <div class="cat-filter-tabs">
              <button
                v-for="cat in auditCategories"
                :key="cat"
                type="button"
                class="cat-chip"
                :class="{ active: selectedCategory === cat }"
                @click="selectedCategory = cat"
              >
                {{ cat }}
              </button>
            </div>

            <div class="audit-actions-group">
              <button
                type="button"
                class="secondary-button"
                title="Export complete audit trail to Microsoft Excel (.xls)"
                @click="exportAuditLogExcel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Export Log (Excel)</span>
              </button>

              <button
                type="button"
                class="action-button danger-action"
                title="Archive and clear current log history"
                @click="handleClearLogs"
              >
                Clear Log History
              </button>
            </div>
          </div>

          <!-- Audit Log Table -->
          <div class="management-card table-card">
            <div class="table-scroll">
              <table class="records-table">
                <thead>
                  <tr>
                    <th style="width: 130px;">Timestamp</th>
                    <th>User & Role</th>
                    <th>Action Performed</th>
                    <th>Category</th>
                    <th>Resource Target</th>
                    <th>IP Address</th>
                    <th style="text-align: right;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in filteredAuditLogs" :key="log.id" class="table-row-hover">
                    <td>
                      <span class="log-time">{{ formatLogDate(log.created_at) }}</span>
                    </td>
                    <td>
                      <div class="log-user-group">
                        <strong class="log-user-name">{{ log.user_name }}</strong>
                        <span class="log-role-badge">{{ log.role }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="log-action-text">{{ log.action }}</span>
                    </td>
                    <td>
                      <span
                        class="log-cat-badge"
                        :class="{
                          'cat-academic': log.category === 'Academic',
                          'cat-attendance': log.category === 'Attendance',
                          'cat-security': log.category === 'Security',
                          'cat-export': log.category === 'Export',
                          'cat-auto': log.category === 'Automation',
                        }"
                      >
                        {{ log.category }}
                      </span>
                    </td>
                    <td>
                      <code class="resource-code">{{ log.resource || 'System' }}</code>
                    </td>
                    <td>
                      <span class="ip-badge">{{ log.ip_address || '127.0.0.1' }}</span>
                    </td>
                    <td style="text-align: right;">
                      <span
                        class="status-pill"
                        :class="{
                          'status-active': log.status === 'Success',
                          'status-warning': log.status === 'Warning',
                          'status-danger': log.status === 'Failed',
                        }"
                      >
                        {{ log.status }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!filteredAuditLogs.length">
                    <td colspan="7" class="empty-state-cell">
                      <div class="empty-box">
                        <p class="empty-title">No audit records match your criteria</p>
                        <p class="empty-text">Adjust your search query or select another category filter.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.toast-notification {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background-color: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  color: var(--color-success-text);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 20px;
}

.maintenance-alert-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background-color: #fffbeb;
  border: 1px solid #fef3c7;
  color: #92400e;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.maintenance-alert-banner strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
}

.maintenance-alert-banner p {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: #b45309;
}

.settings-wrapper-card {
  display: grid;
  grid-template-columns: 260px 1fr;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  min-height: 520px;
}

.settings-nav-sidebar {
  background-color: var(--color-surface-subtle);
  border-right: 1px solid var(--color-border);
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-tab-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-align: left;
  transition: all 0.15s ease;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  width: 100%;
}

.settings-tab-btn svg {
  color: var(--color-text-muted);
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.settings-tab-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.settings-tab-btn:hover svg {
  color: var(--color-text);
}

.settings-tab-btn.active {
  background-color: #ffffff;
  color: var(--color-primary);
  border-color: var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  font-weight: 700;
}

.settings-tab-btn.active svg {
  color: var(--color-primary);
}

.settings-content-area {
  padding: 36px 44px;
}

.panel-intro {
  margin-bottom: 28px;
}

.panel-intro h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 6px;
}

.panel-intro p {
  font-size: 13.5px;
  color: var(--color-text-muted);
  margin: 0;
}

.settings-form-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 640px;
}

.settings-form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.settings-form-grid input,
.settings-form-grid select {
  height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background-color: #ffffff;
  font-size: 13.5px;
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s ease;
}

.settings-form-grid input:focus,
.settings-form-grid select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-actions-bar {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-subtle);
  display: flex;
  justify-content: flex-start;
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 640px;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--color-surface-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
}

.toggle-item strong {
  display: block;
  font-size: 14px;
  color: var(--color-text);
  margin-bottom: 3px;
}

.toggle-item p {
  font-size: 12.5px;
  color: var(--color-text-muted);
  margin: 0;
}

.ip-whitelist-box {
  margin-top: 14px;
  max-width: 640px;
}

.ip-whitelist-box label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.ip-whitelist-box input {
  height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  font-size: 13.5px;
}

/* Administrative Operations Grid */
.admin-ops-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

@media (max-width: 992px) {
  .admin-ops-grid {
    grid-template-columns: 1fr;
  }
}

.admin-op-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.op-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.op-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.op-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.op-sub {
  font-size: 11px;
  color: #64748b;
  display: block;
}

.op-desc {
  font-size: 12px;
  color: #475569;
  margin: 0;
  line-height: 1.4;
}

.op-action-btn {
  margin-top: auto;
  align-self: flex-start;
}

.primary-btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #4f46e5;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.primary-btn-sm:hover {
  background: #4338ca;
}

.primary-btn-sm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Audit Toolbar */
.audit-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 12px;
  height: 38px;
  flex: 1;
  max-width: 340px;
}

.search-box input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  width: 100%;
}

.cat-filter-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
}

.cat-chip {
  background: transparent;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cat-chip:hover {
  color: #0f172a;
}

.cat-chip.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.audit-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Audit Table Elements */
.log-time {
  font-size: 11.5px;
  color: #64748b;
  white-space: nowrap;
}

.log-user-group {
  display: flex;
  flex-direction: column;
}

.log-user-name {
  font-size: 13px;
  color: #0f172a;
}

.log-role-badge {
  font-size: 10.5px;
  color: #64748b;
}

.log-action-text {
  font-size: 12.5px;
  color: #1e293b;
}

.log-cat-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}

.cat-academic { background: #e0e7ff; color: #3730a3; }
.cat-attendance { background: #ecfdf5; color: #065f46; }
.cat-security { background: #fee2e2; color: #991b1b; }
.cat-export { background: #fef3c7; color: #92400e; }
.cat-auto { background: #ede9fe; color: #5b21b6; }

.resource-code {
  font-size: 11px;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  color: #475569;
}

.ip-badge {
  font-size: 11.5px;
  font-family: monospace;
  color: #64748b;
}

.status-warning {
  background: #fef3c7;
  color: #b45309;
}

.status-danger {
  background: #fee2e2;
  color: #b91c1c;
}

/* Switch Toggle */
.switch-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.switch-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #cbd5e1;
  transition: 0.25s;
  border-radius: 24px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.25s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

input:checked + .switch-slider {
  background-color: var(--color-primary);
}

input:checked + .switch-slider:before {
  transform: translateX(20px);
}

@media (max-width: 800px) {
  .settings-wrapper-card {
    grid-template-columns: 1fr;
  }
  .settings-nav-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    flex-direction: row;
    overflow-x: auto;
  }
  .field-row {
    grid-template-columns: 1fr;
  }
  .settings-content-area {
    padding: 24px 20px;
  }
}
</style>
