<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { clearAuditLogs, getAuditLogs, recordAuditLog } from '../../services/auditLogService.js'
import { exportToExcel } from '../../utils/exportUtils.js'

const SETTINGS_STORAGE_KEY = 'sms_institutional_settings_v2'

const activeTab = ref('profile')
const saving = ref(false)
const successMessage = ref('')
const backupLoading = ref(false)
const lastBackupTime = ref('2026-11-18 04:00 AM (UTC)')
const lastSavedAt = ref('Synced just now')

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

const DEFAULT_PROFILE = {
  schoolName: 'Greenwood Academy of Excellence',
  campusCode: 'GW-8821',
  principal: 'Dr. Alexander Vance',
  contactEmail: 'admin@greenwood.edu',
  phone: '+1 (555) 234-5678',
  website: 'https://portal.greenwood.edu',
  timezone: 'UTC+07:00 (Asia/Phnom Penh)',
  address: '742 Evergreen Terrace, Springfield',
  accreditation: 'National Secondary Academic Board (Accredited A+)',
  motto: 'Empowering Scholars Through Integrity & Innovation',
  crestStyle: 'indigo', // 'indigo' | 'emerald' | 'slate'
}

const DEFAULT_ACADEMIC = {
  academicYear: '2026–2027',
  activeTerm: 'Term 2',
  gradingSystem: 'GPA 4.0 Scale with Letter Grades (A-F)',
  passPercentage: '60%',
  attendanceThreshold: '85%',
  honorRollGpa: '3.50',
  maxClassCapacity: '35 Students per Section',
  weightMidterm: 30,
  weightFinal: 40,
  weightAssignments: 20,
  weightAttendance: 10,
}

const DEFAULT_SECURITY = {
  twoFactorAuth: true,
  sessionTimeout: '30 minutes of inactivity',
  enforceStrongPassword: true,
  auditTrailRetention: '365 Days (FERPA Standard)',
  autoLockFailedLogins: true,
}

const DEFAULT_NOTIFICATIONS = {
  emailAlerts: true,
  smsGateway: true,
  dailyAdminDigest: true,
  attendanceAlertParents: true,
  gradePublishedAlert: true,
}

const profileForm = reactive({ ...DEFAULT_PROFILE })
const academicForm = reactive({ ...DEFAULT_ACADEMIC })
const securityForm = reactive({ ...DEFAULT_SECURITY })
const notificationForm = reactive({ ...DEFAULT_NOTIFICATIONS })

// Computed Security Posture Score
const securityScore = computed(() => {
  let score = 20 // Base TLS encryption
  if (securityForm.twoFactorAuth) score += 25
  if (securityForm.enforceStrongPassword) score += 20
  if (securityForm.autoLockFailedLogins) score += 20
  if (ipRestrictionEnabled.value) score += 15
  return Math.min(100, score)
})

const securityTier = computed(() => {
  if (securityScore.value >= 90) return { label: 'Enterprise Grade', tone: 'emerald' }
  if (securityScore.value >= 70) return { label: 'Strong Protection', tone: 'indigo' }
  return { label: 'Needs Review', tone: 'amber' }
})

const totalWeightPct = computed(
  () =>
    (Number(academicForm.weightMidterm) || 0) +
    (Number(academicForm.weightFinal) || 0) +
    (Number(academicForm.weightAssignments) || 0) +
    (Number(academicForm.weightAttendance) || 0),
)

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

function loadPersistedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved.profile) Object.assign(profileForm, saved.profile)
    if (saved.academic) Object.assign(academicForm, saved.academic)
    if (saved.security) Object.assign(securityForm, saved.security)
    if (saved.notifications) Object.assign(notificationForm, saved.notifications)
    if (saved.adminOps) {
      maintenanceMode.value = Boolean(saved.adminOps.maintenanceMode)
      academicTermLock.value = Boolean(saved.adminOps.academicTermLock)
      ipRestrictionEnabled.value = Boolean(saved.adminOps.ipRestrictionEnabled)
      if (saved.adminOps.ipWhitelist) ipWhitelist.value = saved.adminOps.ipWhitelist
      if (saved.adminOps.lastBackupTime) lastBackupTime.value = saved.adminOps.lastBackupTime
    }
    if (saved.lastSavedAt) lastSavedAt.value = saved.lastSavedAt
  } catch {
    // ignore malformed local storage
  }
}

function persistSettingsSnapshot() {
  const nowLabel = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  lastSavedAt.value = `Saved at ${nowLabel}`
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      profile: { ...profileForm },
      academic: { ...academicForm },
      security: { ...securityForm },
      notifications: { ...notificationForm },
      adminOps: {
        maintenanceMode: maintenanceMode.value,
        academicTermLock: academicTermLock.value,
        ipRestrictionEnabled: ipRestrictionEnabled.value,
        ipWhitelist: ipWhitelist.value,
        lastBackupTime: lastBackupTime.value,
      },
      lastSavedAt: lastSavedAt.value,
    }),
  )
}

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
    persistSettingsSnapshot()
    saving.value = false
    recordAuditLog({
      user_name: 'Dr. Alexander Vance',
      user_email: 'admin@school.edu',
      role: 'Super Administrator',
      action: `Saved Institutional Settings (${activeTab.value.toUpperCase()} configuration)`,
      category: 'Security',
      resource: 'Institutional Settings',
      status: 'Success',
    })
    loadLogs()
    showToast('Institutional settings saved and applied across the platform!')
  }, 400)
}

function resetAllSettings() {
  if (!window.confirm('Restore all institutional settings to factory defaults?')) return
  Object.assign(profileForm, DEFAULT_PROFILE)
  Object.assign(academicForm, DEFAULT_ACADEMIC)
  Object.assign(securityForm, DEFAULT_SECURITY)
  Object.assign(notificationForm, DEFAULT_NOTIFICATIONS)
  maintenanceMode.value = false
  academicTermLock.value = false
  ipRestrictionEnabled.value = false
  persistSettingsSnapshot()
  showToast('Settings restored to institutional defaults.')
}

function exportConfigJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: { ...profileForm },
    academic: { ...academicForm },
    security: { ...securityForm },
    notifications: { ...notificationForm },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `StudentHub_Config_${profileForm.campusCode || 'GW'}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  showToast('Configuration snapshot exported as JSON.')
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
    persistSettingsSnapshot()
    await recordAuditLog({
      user_name: 'Dr. Alexander Vance',
      user_email: 'admin@school.edu',
      role: 'Super Administrator',
      action: 'Triggered Institutional Cloud Database Snapshot Backup (AES-256)',
      category: 'Automation',
      resource: 'Encrypted Cloud Storage S3',
      status: 'Success',
    })
    loadLogs()
    showToast('Cloud database snapshot generated and archived successfully!')
  }, 1000)
}

function handleTermLockToggle() {
  const state = academicTermLock.value ? 'Engaged' : 'Released'
  persistSettingsSnapshot()
  recordAuditLog({
    user_name: 'Dr. Alexander Vance',
    user_email: 'admin@school.edu',
    role: 'Super Administrator',
    action: `Academic Term Gradebook Lock ${state}`,
    category: 'Academic',
    resource: `${academicForm.activeTerm} Gradebook Locks`,
    status: 'Success',
  })
  loadLogs()
  showToast(`Academic Term Gradebook Lock is now ${state}.`)
}

function handleMaintenanceToggle() {
  const state = maintenanceMode.value ? 'Enabled' : 'Disabled'
  persistSettingsSnapshot()
  recordAuditLog({
    user_name: 'Dr. Alexander Vance',
    user_email: 'admin@school.edu',
    role: 'Super Administrator',
    action: `Institutional Maintenance Mode ${state}`,
    category: 'Security',
    resource: 'System Gateway',
    status: maintenanceMode.value ? 'Warning' : 'Success',
  })
  loadLogs()
  showToast(`Institutional Maintenance Mode is now ${state}.`)
}

async function handleClearLogs() {
  if (!window.confirm('Archive and reset historical audit logs?')) return
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
  exportToExcel({
    filename: `System_Audit_Log_${new Date().toISOString().slice(0, 10)}.xls`,
    title: `${profileForm.schoolName} - Security & System Audit Trail`,
    sheetName: 'Audit Trail',
    headers,
    rows,
    summaryRows: [
      ['Total Audit Entries Exported', filteredAuditLogs.value.length],
      ['Category Filter', selectedCategory.value],
      ['Export Timestamp', new Date().toLocaleString()],
    ],
    metadata: {
      'Campus ID': profileForm.campusCode,
      'Principal': profileForm.principal,
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
  loadPersistedSettings()
  loadLogs()
})
</script>

<template>
  <section class="management-page settings-page">
    <!-- Executive Header -->
    <header class="management-heading settings-hero">
      <div>
        <div class="hero-eyebrow-line">
          <span class="eyebrow">SYSTEM CONFIGURATION & GOVERNANCE</span>
          <span class="status-live-chip" :class="maintenanceMode ? 'chip-warn' : 'chip-ok'">
            <span class="chip-dot"></span>
            {{ maintenanceMode ? 'Maintenance Mode' : 'Systems Operational' }}
          </span>
          <span class="last-saved-chip">{{ lastSavedAt }}</span>
        </div>
        <h1>Institutional Settings</h1>
        <p class="page-description">
          Manage campus identity, academic grading weights, enterprise security policies, communication channels, and audit governance.
        </p>
      </div>

      <div class="header-action-group">
        <button class="secondary-button" type="button" title="Download settings JSON backup" @click="exportConfigJson">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Export Config</span>
        </button>

        <button class="secondary-button" type="button" title="Restore default values" @click="resetAllSettings">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          <span>Reset</span>
        </button>

        <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>{{ saving ? 'Saving...' : 'Save Settings' }}</span>
        </button>
      </div>
    </header>

    <!-- Maintenance Mode Alert Banner -->
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
    <Transition name="fade-slide">
      <div v-if="successMessage" class="toast-notification" role="status">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>

    <!-- Enterprise Split Settings Container -->
    <div class="settings-shell">
      <!-- Left Categorized Navigation Rail -->
      <aside class="settings-rail">
        <div class="rail-group">
          <span class="rail-group-label">INSTITUTION</span>

          <button
            type="button"
            class="rail-tab-btn"
            :class="{ active: activeTab === 'profile' }"
            @click="activeTab = 'profile'"
          >
            <div class="rail-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <div class="rail-copy">
              <strong>School Profile</strong>
              <small>Identity, crest & contact</small>
            </div>
          </button>

          <button
            type="button"
            class="rail-tab-btn"
            :class="{ active: activeTab === 'academic' }"
            @click="activeTab = 'academic'"
          >
            <div class="rail-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="rail-copy">
              <strong>Academic & Grading</strong>
              <small>Terms, GPA & weights</small>
            </div>
          </button>
        </div>

        <div class="rail-group">
          <span class="rail-group-label">SECURITY & OPERATIONS</span>

          <button
            type="button"
            class="rail-tab-btn"
            :class="{ active: activeTab === 'security' }"
            @click="activeTab = 'security'"
          >
            <div class="rail-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div class="rail-copy">
              <strong>Security & 2FA</strong>
              <small>Score: {{ securityScore }}% Protected</small>
            </div>
          </button>

          <button
            type="button"
            class="rail-tab-btn"
            :class="{ active: activeTab === 'notifications' }"
            @click="activeTab = 'notifications'"
          >
            <div class="rail-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div class="rail-copy">
              <strong>Notifications</strong>
              <small>Email, SMS & digests</small>
            </div>
          </button>

          <button
            type="button"
            class="rail-tab-btn"
            :class="{ active: activeTab === 'audit' }"
            @click="activeTab = 'audit'"
          >
            <div class="rail-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div class="rail-copy">
              <strong>Audit & Governance</strong>
              <small>{{ auditLogs.length }} recorded events</small>
            </div>
          </button>
        </div>

        <!-- Bottom Campus Verification Badge -->
        <div class="rail-footer-card">
          <div class="rail-footer-top">
            <span class="verified-dot"></span>
            <strong>Campus #{{ profileForm.campusCode }}</strong>
          </div>
          <p>AES-256 encrypted institutional registry with automated nightly snapshots.</p>
        </div>
      </aside>

      <!-- Main Right Settings Workspace -->
      <div class="settings-workspace">
        <!-- ============================================================ -->
        <!-- TAB 1: SCHOOL PROFILE & LIVE TRANSCRIPT IDENTITY PREVIEW     -->
        <!-- ============================================================ -->
        <div v-if="activeTab === 'profile'" class="tab-panel">
          <div class="panel-header-bar">
            <div>
              <h2>Institutional Profile & Identity</h2>
              <p>Official campus details automatically rendered on PDF transcripts, diplomas, Excel exports, and student portals.</p>
            </div>
          </div>

          <div class="profile-split-layout">
            <!-- Left Form Sections -->
            <div class="profile-form-column">
              <!-- Card 1: Core Identity -->
              <div class="sub-card">
                <h3 class="sub-card-title">Core Institutional Details</h3>
                <div class="settings-grid">
                  <label>
                    Official Institution Name
                    <input v-model="profileForm.schoolName" placeholder="e.g. Greenwood Academy of Excellence" />
                  </label>

                  <div class="field-row-2">
                    <label>
                      Campus ID Code
                      <input v-model="profileForm.campusCode" placeholder="e.g. GW-8821" />
                    </label>
                    <label>
                      Principal / Headmaster
                      <input v-model="profileForm.principal" placeholder="e.g. Dr. Alexander Vance" />
                    </label>
                  </div>

                  <label>
                    Accreditation Board & Standing
                    <input v-model="profileForm.accreditation" />
                  </label>

                  <label>
                    Institutional Motto
                    <input v-model="profileForm.motto" placeholder="Shown on official report cards" />
                  </label>
                </div>
              </div>

              <!-- Card 2: Contact & Campus Location -->
              <div class="sub-card">
                <h3 class="sub-card-title">Contact Directory & Campus Location</h3>
                <div class="settings-grid">
                  <div class="field-row-2">
                    <label>
                      Administrative Email
                      <input v-model="profileForm.contactEmail" type="email" />
                    </label>
                    <label>
                      Official Telephone
                      <input v-model="profileForm.phone" />
                    </label>
                  </div>

                  <div class="field-row-2">
                    <label>
                      Official Website / Portal URL
                      <input v-model="profileForm.website" />
                    </label>
                    <label>
                      Institutional Timezone
                      <select v-model="profileForm.timezone">
                        <option value="UTC+07:00 (Asia/Phnom Penh)">UTC+07:00 (Asia/Phnom Penh)</option>
                        <option value="UTC+00:00 (GMT / London)">UTC+00:00 (GMT / London)</option>
                        <option value="UTC-05:00 (America/New York)">UTC-05:00 (America/New York)</option>
                        <option value="UTC+08:00 (Asia/Singapore)">UTC+08:00 (Asia/Singapore)</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Campus Street Address
                    <input v-model="profileForm.address" />
                  </label>
                </div>
              </div>
            </div>

            <!-- Right Live Preview Column -->
            <div class="profile-preview-column">
              <div class="live-crest-card" :class="'theme-' + profileForm.crestStyle">
                <div class="preview-pill-row">
                  <span class="preview-tag">LIVE TRANSCRIPT PREVIEW</span>
                  <span class="preview-code">#{{ profileForm.campusCode || 'GW-8821' }}</span>
                </div>

                <div class="crest-emblem-wrap">
                  <div class="crest-emblem">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </svg>
                  </div>
                  <h3>{{ profileForm.schoolName || 'School Name' }}</h3>
                  <p class="crest-motto">“{{ profileForm.motto }}”</p>
                </div>

                <div class="crest-meta-list">
                  <div class="crest-meta-row">
                    <span>Headmaster</span>
                    <strong>{{ profileForm.principal }}</strong>
                  </div>
                  <div class="crest-meta-row">
                    <span>Accreditation</span>
                    <strong>{{ profileForm.accreditation }}</strong>
                  </div>
                  <div class="crest-meta-row">
                    <span>Contact</span>
                    <strong>{{ profileForm.contactEmail }}</strong>
                  </div>
                  <div class="crest-meta-row">
                    <span>Campus</span>
                    <strong>{{ profileForm.address }}</strong>
                  </div>
                </div>

                <!-- Crest Accent Swatch Picker -->
                <div class="crest-theme-bar">
                  <span>Seal Accent:</span>
                  <div class="swatch-group">
                    <button
                      type="button"
                      class="swatch-dot swatch-indigo"
                      :class="{ active: profileForm.crestStyle === 'indigo' }"
                      title="Royal Indigo"
                      @click="profileForm.crestStyle = 'indigo'"
                    ></button>
                    <button
                      type="button"
                      class="swatch-dot swatch-emerald"
                      :class="{ active: profileForm.crestStyle === 'emerald' }"
                      title="Emerald Crest"
                      @click="profileForm.crestStyle = 'emerald'"
                    ></button>
                    <button
                      type="button"
                      class="swatch-dot swatch-slate"
                      :class="{ active: profileForm.crestStyle === 'slate' }"
                      title="Executive Slate"
                      @click="profileForm.crestStyle = 'slate'"
                    ></button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="panel-footer-actions">
            <span class="footer-hint">Changes immediately apply to institutional PDF transcripts and reports.</span>
            <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
              <span>{{ saving ? 'Saving...' : 'Save Profile Changes' }}</span>
            </button>
          </div>
        </div>

        <!-- ============================================================ -->
        <!-- TAB 2: ACADEMIC CALENDAR & GRADING WEIGHTS                   -->
        <!-- ============================================================ -->
        <div v-else-if="activeTab === 'academic'" class="tab-panel">
          <div class="panel-header-bar">
            <div>
              <h2>Academic Terms & Grading Formula</h2>
              <p>Configure active academic sessions, passing benchmarks, and composite exam weighting.</p>
            </div>
          </div>

          <div class="academic-grid">
            <div class="sub-card">
              <h3 class="sub-card-title">Academic Calendar & Standards</h3>
              <div class="settings-grid">
                <div class="field-row-2">
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

                <div class="field-row-3">
                  <label>
                    Passing Grade
                    <input v-model="academicForm.passPercentage" />
                  </label>
                  <label>
                    Min Attendance
                    <input v-model="academicForm.attendanceThreshold" />
                  </label>
                  <label>
                    Honor Roll GPA
                    <input v-model="academicForm.honorRollGpa" />
                  </label>
                </div>

                <label>
                  Classroom Capacity Target
                  <input v-model="academicForm.maxClassCapacity" />
                </label>
              </div>
            </div>

            <div class="sub-card">
              <div class="weight-card-head">
                <h3 class="sub-card-title" style="margin: 0;">Composite Grade Weighting</h3>
                <span class="weight-total-pill" :class="totalWeightPct === 100 ? 'pill-valid' : 'pill-invalid'">
                  Total: {{ totalWeightPct }}%
                </span>
              </div>
              <p class="sub-card-desc">Controls how final course marks are calculated across assessments.</p>

              <!-- Visual Stacked Bar -->
              <div class="weight-bar-visual">
                <div class="w-seg w-mid" :style="{ width: `${academicForm.weightMidterm}%` }" title="Midterm"></div>
                <div class="w-seg w-fin" :style="{ width: `${academicForm.weightFinal}%` }" title="Final Exam"></div>
                <div class="w-seg w-hw" :style="{ width: `${academicForm.weightAssignments}%` }" title="Coursework"></div>
                <div class="w-seg w-att" :style="{ width: `${academicForm.weightAttendance}%` }" title="Attendance"></div>
              </div>

              <div class="settings-grid" style="margin-top: 14px;">
                <div class="field-row-2">
                  <label>
                    Midterm Exam (%)
                    <input v-model.number="academicForm.weightMidterm" type="number" min="0" max="100" />
                  </label>
                  <label>
                    Final Examination (%)
                    <input v-model.number="academicForm.weightFinal" type="number" min="0" max="100" />
                  </label>
                </div>
                <div class="field-row-2">
                  <label>
                    Coursework & Homework (%)
                    <input v-model.number="academicForm.weightAssignments" type="number" min="0" max="100" />
                  </label>
                  <label>
                    Attendance & Participation (%)
                    <input v-model.number="academicForm.weightAttendance" type="number" min="0" max="100" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="panel-footer-actions">
            <span class="footer-hint">Ensure composite weights add up to 100% for accurate GPA reports.</span>
            <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
              <span>{{ saving ? 'Saving...' : 'Save Academic Policy' }}</span>
            </button>
          </div>
        </div>

        <!-- ============================================================ -->
        <!-- TAB 3: SECURITY & 2FA WITH LIVE POSTURE SCORE                -->
        <!-- ============================================================ -->
        <div v-else-if="activeTab === 'security'" class="tab-panel">
          <div class="panel-header-bar">
            <div>
              <h2>Security Posture & Access Safeguards</h2>
              <p>Authentication hardening, session expiration rules, and institutional network access controls.</p>
            </div>
          </div>

          <!-- Security Posture Banner -->
          <div class="security-posture-banner">
            <div class="posture-score-ring">
              <strong>{{ securityScore }}%</strong>
              <span>Score</span>
            </div>
            <div class="posture-info">
              <div class="posture-title-row">
                <h3>Institutional Security Posture</h3>
                <span class="posture-badge" :class="'badge-' + securityTier.tone">{{ securityTier.label }}</span>
              </div>
              <p>Enable 2FA, complex password rules, failed-login lockout, and IP whitelisting to achieve 100% enterprise hardening.</p>
            </div>
          </div>

          <div class="toggle-cards-grid">
            <div class="toggle-card-item">
              <div class="toggle-copy">
                <strong>Two-Factor Authentication (2FA)</strong>
                <p>Require one-time verification codes for all Administrator and Registrar sign-ins.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="securityForm.twoFactorAuth" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-card-item">
              <div class="toggle-copy">
                <strong>Enforce Complex Passwords</strong>
                <p>Require 10+ characters with uppercase, numerals, and symbols for faculty and staff.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="securityForm.enforceStrongPassword" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-card-item">
              <div class="toggle-copy">
                <strong>Brute-Force Login Lockout</strong>
                <p>Temporarily freeze accounts after 5 consecutive failed sign-in attempts and log an alert.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="securityForm.autoLockFailedLogins" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-card-item">
              <div class="toggle-copy">
                <strong>IP Whitelist Access Restriction</strong>
                <p>Restrict administrative dashboard access strictly to approved campus IP subnets.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="ipRestrictionEnabled" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div v-if="ipRestrictionEnabled" class="sub-card" style="margin-top: 16px;">
            <label class="inline-field-label">
              Authorized Campus IP Addresses / CIDR Subnets
              <input v-model="ipWhitelist" placeholder="e.g. 192.168.1.0/24, 10.0.4.15" />
            </label>
          </div>

          <div class="sub-card" style="margin-top: 16px;">
            <div class="field-row-2">
              <label class="inline-field-label">
                Session Auto-Logout Timeout
                <select v-model="securityForm.sessionTimeout">
                  <option value="15 minutes of inactivity">15 minutes of inactivity</option>
                  <option value="30 minutes of inactivity">30 minutes of inactivity</option>
                  <option value="1 hour of inactivity">1 hour of inactivity</option>
                </select>
              </label>
              <label class="inline-field-label">
                Audit Log Retention Period
                <select v-model="securityForm.auditTrailRetention">
                  <option value="90 Days">90 Days</option>
                  <option value="365 Days (FERPA Standard)">365 Days (FERPA Standard)</option>
                  <option value="5 Years (Archive Compliance)">5 Years (Archive Compliance)</option>
                </select>
              </label>
            </div>
          </div>

          <div class="panel-footer-actions">
            <span class="footer-hint">Security policies are logged automatically in the Audit Trail.</span>
            <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
              <span>{{ saving ? 'Saving...' : 'Save Security Policy' }}</span>
            </button>
          </div>
        </div>

        <!-- ============================================================ -->
        <!-- TAB 4: COMMUNICATION & NOTIFICATION CHANNELS                 -->
        <!-- ============================================================ -->
        <div v-else-if="activeTab === 'notifications'" class="tab-panel">
          <div class="panel-header-bar">
            <div>
              <h2>Automated Communication Channels</h2>
              <p>Configure real-time parent SMS alerts, email gateways, and executive morning digests.</p>
            </div>
          </div>

          <!-- Gateway Health Strip -->
          <div class="gateway-strip">
            <div class="gateway-pill">
              <span class="gw-dot"></span>
              <div>
                <strong>SMTP Mail Relay</strong>
                <small>Connected • 99.98% delivery</small>
              </div>
            </div>
            <div class="gateway-pill">
              <span class="gw-dot"></span>
              <div>
                <strong>Parent SMS Gateway</strong>
                <small>Active • Low latency</small>
              </div>
            </div>
            <div class="gateway-pill">
              <span class="gw-dot"></span>
              <div>
                <strong>Digest Scheduler</strong>
                <small>Daily at 07:30 AM</small>
              </div>
            </div>
          </div>

          <div class="toggle-cards-grid">
            <div class="toggle-card-item">
              <div class="toggle-copy">
                <strong>Parent Absentee SMS & Email Alerts</strong>
                <p>Dispatch instant guardian notifications whenever a student is marked Absent or Late.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="notificationForm.attendanceAlertParents" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-card-item">
              <div class="toggle-copy">
                <strong>Daily Principal Morning Digest</strong>
                <p>Deliver an automated executive summary of attendance and enrollments at 7:30 AM.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="notificationForm.dailyAdminDigest" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-card-item">
              <div class="toggle-copy">
                <strong>Gradebook Publication Alerts</strong>
                <p>Notify students and parents when official midterm or final report cards are published.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="notificationForm.gradePublishedAlert" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="toggle-card-item">
              <div class="toggle-copy">
                <strong>System Health & Cloud Backup Alerts</strong>
                <p>Receive confirmation emails when encrypted database snapshots succeed or fail.</p>
              </div>
              <label class="switch-toggle">
                <input v-model="notificationForm.emailAlerts" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="panel-footer-actions">
            <span class="footer-hint">All automated dispatches respect school quiet hours (8:00 PM – 6:30 AM).</span>
            <button class="primary-button" type="button" :disabled="saving" @click="saveSettings">
              <span>{{ saving ? 'Saving...' : 'Save Notification Rules' }}</span>
            </button>
          </div>
        </div>

        <!-- ============================================================ -->
        <!-- TAB 5: AUDIT LOGS & ADMINISTRATIVE OPERATIONS                -->
        <!-- ============================================================ -->
        <div v-else-if="activeTab === 'audit'" class="tab-panel">
          <div class="panel-header-bar">
            <div>
              <h2>Administrative Operations & Audit Security Trail</h2>
              <p>Immutable governance logs, cloud snapshots, term locks, and compliance exports.</p>
            </div>
          </div>

          <!-- Administrative Quick Controls Grid -->
          <div class="admin-ops-grid">
            <div class="admin-op-card">
              <div class="op-head">
                <div class="op-icon-wrap tone-blue">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div>
                  <h4 class="op-title">Cloud Database Backup</h4>
                  <span class="op-sub">Last: {{ lastBackupTime }}</span>
                </div>
              </div>
              <p class="op-desc">Create an AES-256 encrypted snapshot and archive to cloud storage.</p>
              <button
                type="button"
                class="primary-btn-sm"
                :disabled="backupLoading"
                @click="triggerCloudBackup"
              >
                <span>{{ backupLoading ? 'Archiving...' : 'Trigger Backup Now' }}</span>
              </button>
            </div>

            <div class="admin-op-card">
              <div class="op-head">
                <div class="op-icon-wrap tone-amber">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div>
                  <h4 class="op-title">Academic Term Lock</h4>
                  <span class="op-sub">{{ academicTermLock ? 'Term Locked' : 'Term Open' }}</span>
                </div>
              </div>
              <p class="op-desc">Freeze historic exam marks and teacher gradebooks against edits.</p>
              <label class="switch-toggle" style="margin-top: auto;">
                <input v-model="academicTermLock" type="checkbox" @change="handleTermLockToggle" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="admin-op-card">
              <div class="op-head">
                <div class="op-icon-wrap tone-purple">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                </div>
                <div>
                  <h4 class="op-title">Maintenance Mode</h4>
                  <span class="op-sub">{{ maintenanceMode ? 'Active / Paused' : 'Live / Operational' }}</span>
                </div>
              </div>
              <p class="op-desc">Temporarily pause student portal access while keeping admin live.</p>
              <label class="switch-toggle" style="margin-top: auto;">
                <input v-model="maintenanceMode" type="checkbox" @change="handleMaintenanceToggle" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <!-- Audit Log Toolbar -->
          <div class="audit-toolbar">
            <div class="search-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                v-model="auditSearch"
                type="text"
                placeholder="Search user, action, resource, or IP..."
              />
            </div>

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
              <button type="button" class="secondary-button" @click="exportAuditLogExcel">
                <span>Export Excel</span>
              </button>
              <button type="button" class="action-button danger-action" @click="handleClearLogs">
                Clear Logs
              </button>
            </div>
          </div>

          <!-- Audit Log Table -->
          <div class="records-card">
            <div class="table-scroll">
              <table class="records-table">
                <thead>
                  <tr>
                    <th style="width: 130px;">Timestamp</th>
                    <th>User & Role</th>
                    <th>Action Performed</th>
                    <th>Category</th>
                    <th>Resource</th>
                    <th>IP Address</th>
                    <th style="text-align: right;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in filteredAuditLogs" :key="log.id" class="table-row-hover">
                    <td><span class="log-time">{{ formatLogDate(log.created_at) }}</span></td>
                    <td>
                      <div class="log-user-group">
                        <strong class="log-user-name">{{ log.user_name }}</strong>
                        <span class="log-role-badge">{{ log.role }}</span>
                      </div>
                    </td>
                    <td><span class="log-action-text">{{ log.action }}</span></td>
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
                    <td><code class="resource-code">{{ log.resource || 'System' }}</code></td>
                    <td><span class="ip-badge">{{ log.ip_address || '127.0.0.1' }}</span></td>
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
                        <p class="empty-text">Adjust your search query or category filter.</p>
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
.settings-page {
  gap: 20px;
}

.settings-hero {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.hero-eyebrow-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 6px;
}

.hero-eyebrow-line .eyebrow {
  margin-bottom: 0;
}

.status-live-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
}

.chip-ok {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.chip-warn {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.last-saved-chip {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 9px;
  border-radius: 999px;
}

/* Alerts & Toast */
.toast-notification {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
}

.maintenance-alert-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 12px;
}

.maintenance-alert-banner strong { display: block; font-size: 14px; font-weight: 700; }
.maintenance-alert-banner p { margin: 2px 0 0; font-size: 12.5px; color: #b45309; }

/* Enterprise Shell */
.settings-shell {
  display: grid;
  grid-template-columns: 276px minmax(0, 1fr);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  min-height: 580px;
}

/* Left Categorized Rail */
.settings-rail {
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  padding: 22px 14px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.rail-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.rail-group-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.75px;
  color: #94a3b8;
  padding: 0 10px 4px;
}

.rail-tab-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 11px;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  cursor: pointer;
  width: 100%;
  transition: all 0.16s ease;
}

.rail-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: all 0.16s ease;
}

.rail-copy strong {
  display: block;
  font-size: 13.5px;
  font-weight: 700;
  color: #334155;
  line-height: 1.25;
}

.rail-copy small {
  display: block;
  font-size: 11.5px;
  color: #94a3b8;
  margin-top: 1px;
}

.rail-tab-btn:hover {
  background: #f1f5f9;
}

.rail-tab-btn.active {
  background: #ffffff;
  border-color: #c7d2fe;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
}

.rail-tab-btn.active .rail-icon {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  border-color: #4f46e5;
  color: #ffffff;
}

.rail-tab-btn.active .rail-copy strong {
  color: #4f46e5;
}

.rail-tab-btn.active .rail-copy small {
  color: #64748b;
}

.rail-footer-card {
  margin-top: auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
}

.rail-footer-top {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #0f172a;
  margin-bottom: 5px;
}

.verified-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.rail-footer-card p {
  font-size: 11.5px;
  color: #64748b;
  margin: 0;
  line-height: 1.45;
}

/* Right Main Workspace */
.settings-workspace {
  padding: 30px 34px;
  background: #ffffff;
  min-width: 0;
}

.panel-header-bar {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.panel-header-bar h2 {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px;
  letter-spacing: -0.4px;
}

.panel-header-bar p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* Profile 2-Column Split (Form + Live Crest Preview) */
.profile-split-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.95fr);
  gap: 24px;
  align-items: start;
}

.profile-form-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sub-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px 22px;
}

.sub-card-title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 14px;
  letter-spacing: -0.2px;
}

.sub-card-desc {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0 12px;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-grid label,
.inline-field-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
}

.settings-grid input,
.settings-grid select,
.inline-field-label input,
.inline-field-label select {
  height: 40px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
  outline: none;
  transition: all 0.15s ease;
}

.settings-grid input:focus,
.settings-grid select:focus,
.inline-field-label input:focus,
.inline-field-label select:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.field-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field-row-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* Live Transcript Crest Card */
.live-crest-card {
  border-radius: 16px;
  padding: 22px;
  color: #ffffff;
  box-shadow: 0 14px 30px -10px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.theme-indigo {
  background: linear-gradient(145deg, #312e81 0%, #4338ca 55%, #4f46e5 100%);
}

.theme-emerald {
  background: linear-gradient(145deg, #064e3b 0%, #047857 55%, #059669 100%);
}

.theme-slate {
  background: linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #334155 100%);
}

.preview-pill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-tag {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.7px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
}

.preview-code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11.5px;
  font-weight: 700;
  opacity: 0.85;
}

.crest-emblem-wrap {
  text-align: center;
  padding: 6px 0;
}

.crest-emblem {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: inline-grid;
  place-items: center;
  margin-bottom: 12px;
}

.crest-emblem-wrap h3 {
  font-size: 17px;
  font-weight: 800;
  margin: 0 0 6px;
  line-height: 1.25;
}

.crest-motto {
  font-size: 12px;
  font-style: italic;
  opacity: 0.85;
  margin: 0;
}

.crest-meta-list {
  background: rgba(15, 23, 42, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.crest-meta-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.crest-meta-row span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.crest-meta-row strong {
  font-size: 12.5px;
  font-weight: 600;
  word-break: break-word;
}

.crest-theme-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  font-size: 11.5px;
  font-weight: 600;
}

.swatch-group {
  display: flex;
  gap: 8px;
}

.swatch-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.swatch-dot.active {
  border-color: #ffffff;
  transform: scale(1.18);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
}

.swatch-indigo { background: #6366f1; }
.swatch-emerald { background: #10b981; }
.swatch-slate { background: #334155; }

/* Academic Grid & Weight Visual Bar */
.academic-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;
  align-items: start;
}

.weight-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.weight-total-pill {
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
}

.pill-valid { background: #ecfdf5; color: #047857; }
.pill-invalid { background: #fee2e2; color: #b91c1c; }

.weight-bar-visual {
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
  display: flex;
}

.w-seg { height: 100%; transition: width 0.25s ease; }
.w-mid { background: #6366f1; }
.w-fin { background: #3b82f6; }
.w-hw { background: #10b981; }
.w-att { background: #f59e0b; }

/* Security Posture Banner */
.security-posture-banner {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  border: 1px solid #c7d2fe;
  margin-bottom: 20px;
}

.posture-score-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ffffff;
  border: 4px solid #4f46e5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.posture-score-ring strong { font-size: 16px; font-weight: 800; color: #4f46e5; line-height: 1; }
.posture-score-ring span { font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; }

.posture-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.posture-info h3 { font-size: 15.5px; font-weight: 800; color: #0f172a; margin: 0; }
.posture-info p { font-size: 12.5px; color: #475569; margin: 0; }

.posture-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
}

.badge-emerald { background: #ecfdf5; color: #047857; }
.badge-indigo { background: #eef2ff; color: #4338ca; }
.badge-amber { background: #fffbeb; color: #b45309; }

/* Toggle Cards Grid (2-column) */
.toggle-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.toggle-card-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.toggle-copy strong {
  display: block;
  font-size: 13.5px;
  color: #0f172a;
  margin-bottom: 3px;
}

.toggle-copy p {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.45;
}

/* Gateway Strip */
.gateway-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.gateway-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 11px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.gw-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
  flex-shrink: 0;
}

.gateway-pill strong { display: block; font-size: 13px; color: #0f172a; }
.gateway-pill small { display: block; font-size: 11.5px; color: #64748b; }

/* Footer Action Bar */
.panel-footer-actions {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.footer-hint {
  font-size: 12px;
  color: #64748b;
}

/* Admin Ops & Audit */
.admin-ops-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 22px;
}

.admin-op-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.op-head { display: flex; align-items: center; gap: 10px; }
.op-icon-wrap { width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; }
.op-title { font-size: 13.5px; font-weight: 700; color: #0f172a; margin: 0; }
.op-sub { font-size: 11px; color: #64748b; display: block; }
.op-desc { font-size: 12px; color: #475569; margin: 0; line-height: 1.4; }

.primary-btn-sm {
  align-self: flex-start;
  margin-top: auto;
  background: #4f46e5;
  color: #ffffff;
  border: none;
  border-radius: 7px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn-sm:hover { background: #4338ca; }
.primary-btn-sm:disabled { opacity: 0.6; cursor: not-allowed; }

.audit-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.cat-filter-tabs {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
  flex-wrap: wrap;
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
}

.cat-chip.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.audit-actions-group { display: flex; align-items: center; gap: 8px; }
.log-time { font-size: 11.5px; color: #64748b; white-space: nowrap; }
.log-user-group { display: flex; flex-direction: column; }
.log-user-name { font-size: 13px; color: #0f172a; }
.log-role-badge { font-size: 10.5px; color: #64748b; }
.log-action-text { font-size: 12.5px; color: #1e293b; }
.log-cat-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; }
.cat-academic { background: #e0e7ff; color: #3730a3; }
.cat-attendance { background: #ecfdf5; color: #065f46; }
.cat-security { background: #fee2e2; color: #991b1b; }
.cat-export { background: #fef3c7; color: #92400e; }
.cat-auto { background: #ede9fe; color: #5b21b6; }
.resource-code { font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569; }
.ip-badge { font-size: 11.5px; font-family: monospace; color: #64748b; }
.status-warning { background: #fef3c7; color: #b45309; }
.status-danger { background: #fee2e2; color: #b91c1c; }

/* Switch Toggle */
.switch-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
  flex-shrink: 0;
}

.switch-toggle input { opacity: 0; width: 0; height: 0; }

.switch-slider {
  position: absolute;
  inset: 0;
  background-color: #cbd5e1;
  transition: 0.2s ease;
  border-radius: 999px;
}

.switch-slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #ffffff;
  transition: 0.2s ease;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

input:checked + .switch-slider { background-color: #4f46e5; }
input:checked + .switch-slider::before { transform: translateX(20px); }

@media (max-width: 1120px) {
  .profile-split-layout,
  .academic-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .settings-shell { grid-template-columns: 1fr; }
  .settings-rail { border-right: none; border-bottom: 1px solid #e2e8f0; }
  .toggle-cards-grid,
  .gateway-strip,
  .admin-ops-grid,
  .field-row-2,
  .field-row-3 {
    grid-template-columns: 1fr;
  }
  .settings-workspace { padding: 22px 18px; }
}
</style>
