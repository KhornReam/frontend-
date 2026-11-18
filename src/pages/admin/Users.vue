<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createUserAccount,
  deleteUserAccount,
  getAllUsers,
  getCurrentUser,
  impersonateUser,
  switchRole,
  syncUsersWithDirectories,
  toggleUserAccountStatus,
  updateUserAccount,
} from '../../services/authService.js'
import {
  clearResolvedSecurityAlerts,
  dismissSecurityAlert,
  formatRelativeTime,
  getBlockedEmails,
  getSecurityAlerts,
  markAllSecurityAlertsRead,
  MAX_LOGIN_ATTEMPTS,
  unblockAllEmails,
  unblockEmail,
} from '../../services/loginSecurityService.js'
import {
  createStudent,
  deleteStudent,
  getStudents,
  updateStudent,
} from '../../services/studentService.js'
import {
  createTeacher,
  deleteTeacher,
  getTeachers,
  updateTeacher,
} from '../../services/teacherService.js'
import {
  getRolePermissions,
  resetPermissionsToDefault,
  saveRolePermissions,
  setPermission,
  togglePermission,
} from '../../services/permissionService.js'

const route = useRoute()
const router = useRouter()

// Default to 'accounts' (or 'security' if opened from Admin Security Alert banner/bell)
const activeMainTab = ref(route.query.tab === 'security' ? 'security' : 'accounts') // 'accounts' | 'permissions' | 'security'
const activeRoleFilter = ref('all') // 'all' | 'student' | 'teacher' | 'admin'
const search = ref('')
const successMessage = ref('')

// Login Security Shield State
const blockedEmails = ref(getBlockedEmails())
const securityAlerts = ref(getSecurityAlerts())

function refreshSecurityData() {
  blockedEmails.value = getBlockedEmails()
  securityAlerts.value = getSecurityAlerts()
}

const unreadAlertsCount = computed(() =>
  securityAlerts.value.filter((a) => a.unread && !a.resolved).length,
)

function isUserEmailBlocked(email) {
  const clean = (email || '').trim().toLowerCase()
  return blockedEmails.value.some((b) => b.email === clean)
}

function handleUnblockEmail(email) {
  unblockEmail(email, activeUser.value?.name || 'Administrator')
  refreshSecurityData()
  showNotification(`Unblocked "${email}". Login attempts have been reset to 0/${MAX_LOGIN_ATTEMPTS}.`)
}

function handleUnblockAll() {
  const count = unblockAllEmails(activeUser.value?.name || 'Administrator')
  refreshSecurityData()
  if (count > 0) {
    showNotification(`Unblocked all ${count} locked email address${count === 1 ? '' : 'es'}.`)
  }
}

function handleMarkAllAlertsRead() {
  markAllSecurityAlertsRead()
  refreshSecurityData()
  showNotification('All login security alerts marked as read.')
}

function handleClearResolvedAlerts() {
  clearResolvedSecurityAlerts()
  refreshSecurityData()
  showNotification('Cleared resolved security alerts.')
}

function handleDismissAlert(id) {
  dismissSecurityAlert(id)
  refreshSecurityData()
}

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'security') {
      activeMainTab.value = 'security'
      refreshSecurityData()
    }
  },
)

// Password visibility controls
const showAllPasswords = ref(false)
const revealedIds = ref({})

// Modals
const modalOpen = ref(false)
const viewModalOpen = ref(false)
const editingUser = ref(null)
const viewingUser = ref(null)
const formShowPassword = ref(false)
const viewShowPassword = ref(true)

const activeUser = ref(getCurrentUser())
const permissions = ref(getRolePermissions())
const users = ref([])

const classPresets = [
  'Grade 7 - A',
  'Grade 8 - A',
  'Grade 8 - B',
  'Grade 9 - A',
  'Grade 9 - C',
  'Grade 10 - A',
  'Grade 10 - B',
  'Grade 11 - A',
  'Grade 12 - A',
]

const departmentPresets = [
  'Executive Leadership',
  'Academic Operations',
  'Grade 10 - A (Mathematics)',
  'Grade 11 - A (Science & Physics)',
  'Grade 9 - C (English Literature)',
  'Computer Science Dept.',
  'World History Dept.',
]

const form = reactive({
  name: '',
  email: '',
  password: '',
  roleLabel: 'Student',
  department: 'Grade 10 - A',
  permissions: 'Student Permissions Matrix',
  status: 'Active',
})

async function loadUsers() {
  users.value = getAllUsers()
  try {
    const [stuRes, tchRes] = await Promise.allSettled([getStudents(), getTeachers()])
    const liveStudents = stuRes.status === 'fulfilled' ? stuRes.value.data || [] : []
    const liveTeachers = tchRes.status === 'fulfilled' ? tchRes.value.data || [] : []
    if (liveStudents.length || liveTeachers.length) {
      users.value = syncUsersWithDirectories({
        students: liveStudents,
        teachers: liveTeachers,
      })
    }
  } catch {
    // keep local accounts if backend is offline
  }
}

// Live role counts
const adminCount = computed(() => users.value.filter((u) => u.role === 'admin').length)
const teacherCount = computed(() => users.value.filter((u) => u.role === 'teacher').length)
const studentCount = computed(() => users.value.filter((u) => u.role === 'student').length)

const filteredUsers = computed(() => {
  let list = users.value
  if (activeRoleFilter.value !== 'all') {
    list = list.filter((u) => u.role === activeRoleFilter.value)
  }

  const query = search.value.trim().toLowerCase()
  if (!query) return list

  return list.filter((u) =>
    [u.name, u.email, u.roleLabel, u.department, u.permissions]
      .some((val) => val?.toLowerCase().includes(query)),
  )
})

const teacherEnabledCount = computed(() => {
  if (!permissions.value.teacher) return 0
  return Object.values(permissions.value.teacher).filter((p) => p.enabled).length
})

const teacherTotalCount = computed(() => {
  if (!permissions.value.teacher) return 0
  return Object.keys(permissions.value.teacher).length
})

const studentEnabledCount = computed(() => {
  if (!permissions.value.student) return 0
  return Object.values(permissions.value.student).filter((p) => p.enabled).length
})

const studentTotalCount = computed(() => {
  if (!permissions.value.student) return 0
  return Object.keys(permissions.value.student).length
})

function showNotification(msg) {
  successMessage.value = msg
  setTimeout(() => {
    if (successMessage.value === msg) {
      successMessage.value = ''
    }
  }, 3500)
}

// Password Helpers
function isPasswordVisible(userId) {
  return showAllPasswords.value || Boolean(revealedIds.value[userId])
}

function toggleRowPassword(userId) {
  revealedIds.value = {
    ...revealedIds.value,
    [userId]: !revealedIds.value[userId],
  }
}

function generateStrongPassword() {
  const prefix = form.roleLabel.toLowerCase().includes('student')
    ? 'Stu'
    : form.roleLabel.toLowerCase().includes('teacher')
      ? 'Tch'
      : 'Adm'
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const suffix = chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)]
  form.password = `${prefix}@${randomNum}${suffix}`
  formShowPassword.value = true
}

async function copyCredentials(user) {
  const text = `Name: ${user.name}\nRole: ${user.roleLabel}\nEmail: ${user.email}\nPassword: ${user.password}`
  try {
    await navigator.clipboard.writeText(text)
    showNotification(`Copied login credentials for ${user.name} to clipboard!`)
  } catch {
    showNotification(`Credentials — Email: ${user.email} | Password: ${user.password}`)
  }
}

function handleRoleChangeInForm() {
  const lower = form.roleLabel.toLowerCase()
  if (lower.includes('student')) {
    form.permissions = 'Student Permissions Matrix'
    if (!form.department || !form.department.startsWith('Grade')) {
      form.department = 'Grade 10 - A'
    }
  } else if (lower.includes('teacher')) {
    form.permissions = 'Faculty Permissions Matrix'
    if (!form.department || form.department === 'Grade 10 - A') {
      form.department = 'Grade 10 - A (Mathematics)'
    }
  } else {
    form.permissions = 'Full System Control (Unrestricted)'
    form.department = 'Executive Leadership'
  }
}

// CRUD Handlers
function openCreateModal(presetRole = 'Student') {
  editingUser.value = null
  formShowPassword.value = true
  const isStudent = presetRole === 'Student'
  const isTeacher = presetRole === 'Teacher'
  Object.assign(form, {
    name: '',
    email: '',
    password: isStudent ? 'student123' : isTeacher ? 'teacher123' : 'admin123',
    roleLabel: presetRole,
    department: isStudent ? 'Grade 10 - A' : isTeacher ? 'Grade 10 - A (Mathematics)' : 'Executive Leadership',
    permissions: isStudent
      ? 'Student Permissions Matrix'
      : isTeacher
        ? 'Faculty Permissions Matrix'
        : 'Full System Control (Unrestricted)',
    status: 'Active',
  })
  modalOpen.value = true
}

function openEditModal(user) {
  editingUser.value = user
  formShowPassword.value = false
  Object.assign(form, {
    name: user.name,
    email: user.email,
    password: user.password || '',
    roleLabel: user.roleLabel || 'Student',
    department: user.department || '',
    permissions: user.permissions || 'Student Permissions Matrix',
    status: user.status || 'Active',
  })
  modalOpen.value = true
}

function openViewModal(user) {
  viewingUser.value = user
  viewShowPassword.value = true
  viewModalOpen.value = true
}

async function saveUser() {
  if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
    showNotification('Name, email, and password are required.')
    return
  }

  const isStudent = form.roleLabel.toLowerCase().includes('student')
  const isTeacher = form.roleLabel.toLowerCase().includes('teacher')

  if (editingUser.value) {
    let linkedStudentId = editingUser.value.linkedStudentId ?? null
    let linkedTeacherId = editingUser.value.linkedTeacherId ?? null

    // Sync updates back to Students / Teachers directory API
    try {
      if (isStudent && linkedStudentId) {
        await updateStudent(linkedStudentId, {
          name: form.name.trim(),
          email: form.email.trim(),
          course: form.department.trim() || null,
        })
      } else if (isTeacher && linkedTeacherId) {
        await updateTeacher(linkedTeacherId, {
          name: form.name.trim(),
          email: form.email.trim(),
          specialization: form.department.trim() || null,
        })
      }
    } catch {
      // continue updating auth credentials even if backend rejects duplicate
    }

    updateUserAccount(editingUser.value.id, {
      name: form.name,
      email: form.email,
      password: form.password,
      roleLabel: form.roleLabel,
      department: form.department,
      permissions: form.permissions,
      status: form.status,
      linkedStudentId,
      linkedTeacherId,
    })
    users.value = getAllUsers()
    showNotification(`Account & credentials updated for ${form.name} (synced across directories).`)
  } else {
    let linkedStudentId = null
    let linkedTeacherId = null

    // Mirror newly assigned Student or Teacher to their respective directory API
    try {
      if (isStudent) {
        const res = await createStudent({
          name: form.name.trim(),
          email: form.email.trim(),
          course: form.department.trim() || 'General',
        })
        linkedStudentId = res.data?.data?.id ?? res.data?.id ?? null
      } else if (isTeacher) {
        const res = await createTeacher({
          name: form.name.trim(),
          email: form.email.trim(),
          specialization: form.department.trim() || 'General Faculty',
        })
        linkedTeacherId = res.data?.data?.id ?? res.data?.id ?? null
      }
    } catch {
      // still create login account even if student/teacher email already exists
    }

    createUserAccount({
      name: form.name,
      email: form.email,
      password: form.password,
      roleLabel: form.roleLabel,
      department: form.department,
      permissions: form.permissions,
      status: form.status,
      linkedStudentId,
      linkedTeacherId,
    })
    users.value = getAllUsers()
    showNotification(`Created ${form.roleLabel} account for ${form.name} and synced with directory.`)
  }
  modalOpen.value = false
}

async function handleDeleteUser(user) {
  if (user.id === activeUser.value?.id) {
    showNotification('You cannot delete the currently signed-in administrator account.')
    return
  }
  if (!window.confirm(`Permanently delete user account "${user.name}" (${user.email})?`)) return

  // Also remove linked Student or Teacher record so directories stay synchronized
  try {
    if (user.linkedStudentId) {
      await deleteStudent(user.linkedStudentId)
    } else if (user.linkedTeacherId) {
      await deleteTeacher(user.linkedTeacherId)
    }
  } catch {
    // ignore if already removed in backend
  }

  deleteUserAccount(user.id)
  users.value = getAllUsers()
  if (viewingUser.value?.id === user.id) {
    viewModalOpen.value = false
  }
  showNotification(`Deleted user account for ${user.name}.`)
}

function handleToggleStatus(user) {
  const updated = toggleUserAccountStatus(user.id)
  if (updated) {
    loadUsers()
    if (viewingUser.value?.id === user.id) {
      viewingUser.value = updated
    }
    showNotification(`Account status for ${user.name} changed to ${updated.status}.`)
  }
}

function handlePreviewAsUser(user) {
  impersonateUser(user)
  activeUser.value = getCurrentUser()
  viewModalOpen.value = false
  showNotification(`Now previewing system as ${user.name} (${user.roleLabel}).`)
  router.push('/')
}

// Permission Matrix Handlers
function handlePermissionToggle(role, key) {
  const newState = togglePermission(role, key)
  permissions.value = getRolePermissions()
  const roleName = role === 'teacher' ? 'Teacher' : 'Student'
  showNotification(`${roleName} permission "${permissions.value[role][key].label}" ${newState ? 'enabled' : 'disabled'}.`)
}

function setAllRolePermissions(role, state) {
  const group = permissions.value[role]
  if (!group) return
  Object.keys(group).forEach((key) => {
    setPermission(role, key, state)
  })
  permissions.value = getRolePermissions()
  const roleName = role === 'teacher' ? 'Teacher' : 'Student'
  showNotification(`All ${roleName} permissions have been ${state ? 'enabled' : 'disabled'}.`)
}

function handleResetPermissions() {
  if (!window.confirm('Reset Teacher and Student permissions back to institutional defaults?')) return
  permissions.value = resetPermissionsToDefault()
  showNotification('Role permissions reset to institutional defaults.')
}

function handleSaveAllPermissions() {
  saveRolePermissions(permissions.value)
  showNotification('Permission policy saved and enforced across the entire system.')
}

function handleRoleSimulation(roleKey) {
  const newAccount = switchRole(roleKey)
  activeUser.value = newAccount
  showNotification(`Previewing portal as ${newAccount.name} (${newAccount.roleLabel}).`)
}

onMounted(() => {
  loadUsers()
  refreshSecurityData()
  permissions.value = getRolePermissions()
  activeUser.value = getCurrentUser()
  window.addEventListener('sms-security-alerts-updated', refreshSecurityData)
})

onUnmounted(() => {
  window.removeEventListener('sms-security-alerts-updated', refreshSecurityData)
})
</script>

<template>
  <section class="management-page governance-page">
    <!-- Executive Header Card -->
    <header class="management-heading governance-hero">
      <div class="hero-copy">
        <div class="hero-eyebrow-row">
          <span class="eyebrow">ACCESS GOVERNANCE & AUTHENTICATION</span>
          <span class="rbac-live-pill">
            <span class="live-dot"></span>
            RBAC Enforced
          </span>
        </div>
        <h1>Users & Role Permissions</h1>
        <p class="page-description">
          Assign, edit, view, or delete Student, Teacher, and Admin login credentials and configure role-based feature access.
        </p>
      </div>

      <div class="header-action-group">
        <template v-if="activeMainTab === 'permissions'">
          <button
            type="button"
            class="secondary-button"
            title="Restore default institutional access matrix"
            @click="handleResetPermissions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            class="primary-button"
            title="Apply and enforce permission matrix"
            @click="handleSaveAllPermissions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span>Save Permissions</span>
          </button>
        </template>

        <template v-else-if="activeMainTab === 'security'">
          <button
            type="button"
            class="secondary-button"
            :disabled="!unreadAlertsCount"
            @click="handleMarkAllAlertsRead"
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
        </template>

        <template v-else>
          <button
            class="secondary-button"
            type="button"
            @click="openCreateModal('Teacher')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <span>Assign Teacher</span>
          </button>

          <button
            class="primary-button"
            type="button"
            @click="openCreateModal('Student')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Add / Assign User</span>
          </button>
        </template>
      </div>
    </header>

    <!-- Toast Notification -->
    <Transition name="fade-slide">
      <div v-if="successMessage" class="toast-notification" role="status">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>

    <!-- Sleek Live Role Preview Control Bar -->
    <div class="role-preview-bar">
      <div class="preview-left">
        <span class="preview-caption">Active Session Preview</span>
        <div class="active-identity-pill" :class="'pill-' + activeUser.role">
          <span class="identity-avatar-dot" :class="'dot-bg-' + activeUser.role">{{ activeUser.avatar }}</span>
          <strong class="identity-name">{{ activeUser.name }}</strong>
          <span class="identity-divider">•</span>
          <span class="identity-role-label">{{ activeUser.roleLabel }}</span>
        </div>
      </div>

      <div class="preview-right">
        <span class="preview-caption">Switch View</span>
        <div class="segmented-role-control" role="group" aria-label="Switch active role preview">
          <button
            type="button"
            class="seg-role-btn"
            :class="{ active: activeUser.role === 'admin' }"
            @click="handleRoleSimulation('admin')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Administrator</span>
          </button>

          <button
            type="button"
            class="seg-role-btn"
            :class="{ active: activeUser.role === 'teacher' }"
            @click="handleRoleSimulation('teacher')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Teacher</span>
          </button>

          <button
            type="button"
            class="seg-role-btn"
            :class="{ active: activeUser.role === 'student' }"
            @click="handleRoleSimulation('student')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            <span>Student</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Clean Navigation Switcher -->
    <div class="governance-tabs-wrap">
      <div class="governance-tabs">
        <button
          type="button"
          class="gov-tab-btn"
          :class="{ active: activeMainTab === 'accounts' }"
          @click="activeMainTab = 'accounts'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>User Accounts & Passwords</span>
          <span class="gov-tab-badge">{{ users.length }} Accounts</span>
        </button>

        <button
          type="button"
          class="gov-tab-btn"
          :class="{ active: activeMainTab === 'permissions' }"
          @click="activeMainTab = 'permissions'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Role Permissions Matrix</span>
          <span class="gov-tab-badge neutral-badge">{{ teacherEnabledCount + studentEnabledCount }} Active</span>
        </button>

        <button
          type="button"
          class="gov-tab-btn"
          :class="{ active: activeMainTab === 'security' }"
          @click="activeMainTab = 'security'; refreshSecurityData()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Security Alerts & Blocked Emails</span>
          <span
            class="gov-tab-badge"
            :class="(blockedEmails.length || unreadAlertsCount) ? 'danger-tab-badge' : 'neutral-badge'"
          >
            {{ blockedEmails.length ? `${blockedEmails.length} Blocked` : `${securityAlerts.length} Logs` }}
          </span>
        </button>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 1: USER ACCOUNTS, CREDENTIALS & PASSWORDS DIRECTORY      -->
    <!-- ============================================================ -->
    <div v-if="activeMainTab === 'accounts'" class="accounts-directory-wrap">
      <!-- Live Role KPI Row -->
      <div class="users-kpi-grid">
        <article class="summary-card">
          <div class="summary-icon tone-green">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div class="summary-details">
            <span class="summary-label">Student Accounts</span>
            <strong>{{ studentCount }} Students</strong>
          </div>
          <span class="summary-caption">Portal credentials</span>
        </article>

        <article class="summary-card">
          <div class="summary-icon tone-blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div class="summary-details">
            <span class="summary-label">Teacher Accounts</span>
            <strong>{{ teacherCount }} Faculty</strong>
          </div>
          <span class="summary-caption">Assigned classes</span>
        </article>

        <article class="summary-card">
          <div class="summary-icon tone-purple">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="summary-details">
            <span class="summary-label">Administrators</span>
            <strong>{{ adminCount }} Admins</strong>
          </div>
          <span class="summary-caption">Full governance</span>
        </article>
      </div>

      <!-- Users Directory Table Card -->
      <div class="records-card">
        <div class="records-toolbar">
          <div class="role-filter-pills">
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeRoleFilter === 'all' }"
              @click="activeRoleFilter = 'all'"
            >
              All ({{ users.length }})
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeRoleFilter === 'student' }"
              @click="activeRoleFilter = 'student'"
            >
              Students ({{ studentCount }})
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeRoleFilter === 'teacher' }"
              @click="activeRoleFilter = 'teacher'"
            >
              Teachers ({{ teacherCount }})
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeRoleFilter === 'admin' }"
              @click="activeRoleFilter = 'admin'"
            >
              Admins ({{ adminCount }})
            </button>
          </div>

          <div class="toolbar-right-group">
            <!-- Global Password Reveal Toggle -->
            <button
              type="button"
              class="reveal-all-btn"
              :class="{ active: showAllPasswords }"
              @click="showAllPasswords = !showAllPasswords"
              :title="showAllPasswords ? 'Mask all user passwords' : 'Reveal all user passwords'"
            >
              <svg v-if="!showAllPasswords" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <span>{{ showAllPasswords ? 'Hide Passwords' : 'Show Passwords' }}</span>
            </button>

            <div class="toolbar-search">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                v-model="search"
                type="text"
                placeholder="Search name, email, class, or role..."
              />
            </div>
          </div>
        </div>

        <div class="table-scroll">
          <table class="records-table">
            <thead>
              <tr>
                <th>USER NAME & EMAIL</th>
                <th>ROLE</th>
                <th>ASSIGNED CLASS / DEPT</th>
                <th>SYSTEM PASSWORD</th>
                <th>STATUS</th>
                <th style="text-align: right;">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id" class="table-row-hover">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar" :class="'tone-' + (user.tone || 'primary')">
                      {{ user.avatar }}
                    </div>
                    <div class="user-names">
                      <strong>{{ user.name }}</strong>
                      <small>{{ user.email }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    class="role-pill-badge"
                    :class="{
                      'role-super': user.roleLabel === 'Super Administrator',
                      'role-admin': user.role === 'admin' && user.roleLabel !== 'Super Administrator',
                      'role-teacher': user.role === 'teacher',
                      'role-student': user.role === 'student',
                    }"
                  >
                    {{ user.roleLabel }}
                  </span>
                </td>
                <td>
                  <span class="assignment-pill">{{ user.department }}</span>
                </td>
                <td>
                  <div class="password-cell-box">
                    <code class="password-code" :class="{ 'is-revealed': isPasswordVisible(user.id) }">
                      {{ isPasswordVisible(user.id) ? user.password : '••••••••' }}
                    </code>
                    <button
                      type="button"
                      class="icon-micro-btn"
                      :title="isPasswordVisible(user.id) ? 'Hide password' : 'View password'"
                      @click="toggleRowPassword(user.id)"
                    >
                      <svg v-if="!isPasswordVisible(user.id)" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="icon-micro-btn"
                      title="Copy email & password"
                      @click="copyCredentials(user)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </td>
                <td>
                  <div class="status-cell-stack">
                    <button
                      type="button"
                      class="status-pill status-toggle-pill"
                      :class="user.status === 'Active' ? 'status-active' : 'status-suspended'"
                      title="Click to toggle Active / Suspended"
                      @click="handleToggleStatus(user)"
                    >
                      {{ user.status }}
                    </button>
                    <button
                      v-if="isUserEmailBlocked(user.email)"
                      type="button"
                      class="blocked-row-pill"
                      title="Email blocked after 3 failed login attempts. Click to unblock."
                      @click="handleUnblockEmail(user.email)"
                    >
                      Blocked (3/3) • Unblock
                    </button>
                  </div>
                </td>
                <td style="text-align: right;">
                  <div class="row-actions">
                    <button class="action-button" type="button" title="View full account & credentials" @click="openViewModal(user)">
                      View
                    </button>
                    <button class="action-button" type="button" title="Edit user, assignment & password" @click="openEditModal(user)">
                      Edit
                    </button>
                    <button
                      class="action-button danger-action"
                      type="button"
                      title="Delete user account"
                      @click="handleDeleteUser(user)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredUsers.length">
                <td colspan="6" class="empty-state-cell">
                  <div class="empty-box">
                    <p class="empty-title">No matching accounts found</p>
                    <p class="empty-text">Try adjusting your search query or role filter.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 2: FEATURE PERMISSIONS CONTROL MATRIX                    -->
    <!-- ============================================================ -->
    <div v-else-if="activeMainTab === 'permissions'" class="permissions-matrix-grid">
      <!-- TEACHER PERMISSIONS CARD -->
      <article class="matrix-card teacher-card">
        <div class="matrix-accent-bar accent-teacher"></div>
        <header class="matrix-card-header">
          <div class="matrix-header-left">
            <div class="matrix-role-icon icon-teacher">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div>
              <div class="matrix-title-line">
                <h2>Teacher & Faculty Portal</h2>
                <span class="count-pill pill-blue">{{ teacherEnabledCount }}/{{ teacherTotalCount }}</span>
              </div>
              <p>Control faculty capabilities for attendance roll call, gradebooks, and student rosters.</p>
            </div>
          </div>

          <div class="bulk-toggle-links">
            <button type="button" class="bulk-link" @click="setAllRolePermissions('teacher', true)">Enable all</button>
            <span class="bulk-sep">·</span>
            <button type="button" class="bulk-link muted-link" @click="setAllRolePermissions('teacher', false)">Disable all</button>
          </div>
        </header>

        <div class="matrix-items-body">
          <div
            v-for="(item, key) in permissions.teacher"
            :key="key"
            class="perm-row-card"
            :class="{ 'is-active': item.enabled }"
          >
            <div class="perm-status-icon" :class="item.enabled ? 'icon-on-blue' : 'icon-off'">
              <svg v-if="item.enabled" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <div class="perm-content">
              <div class="perm-heading">
                <strong class="perm-title">{{ item.label }}</strong>
                <span class="perm-cat-tag">{{ item.category }}</span>
              </div>
              <p class="perm-description">{{ item.description }}</p>
            </div>

            <div class="perm-control">
              <label class="pro-switch" :title="item.enabled ? 'Enabled — click to restrict' : 'Disabled — click to grant'">
                <input
                  type="checkbox"
                  :checked="item.enabled"
                  @change="handlePermissionToggle('teacher', key)"
                />
                <span class="pro-slider slider-indigo"></span>
              </label>
            </div>
          </div>
        </div>
      </article>

      <!-- STUDENT PERMISSIONS CARD -->
      <article class="matrix-card student-card">
        <div class="matrix-accent-bar accent-student"></div>
        <header class="matrix-card-header">
          <div class="matrix-header-left">
            <div class="matrix-role-icon icon-student">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div>
              <div class="matrix-title-line">
                <h2>Student Portal Access</h2>
                <span class="count-pill pill-emerald">{{ studentEnabledCount }}/{{ studentTotalCount }}</span>
              </div>
              <p>Control what students can view, download, or request inside their personal workspace.</p>
            </div>
          </div>

          <div class="bulk-toggle-links">
            <button type="button" class="bulk-link link-emerald" @click="setAllRolePermissions('student', true)">Enable all</button>
            <span class="bulk-sep">·</span>
            <button type="button" class="bulk-link muted-link" @click="setAllRolePermissions('student', false)">Disable all</button>
          </div>
        </header>

        <div class="matrix-items-body">
          <div
            v-for="(item, key) in permissions.student"
            :key="key"
            class="perm-row-card"
            :class="{ 'is-active-emerald': item.enabled }"
          >
            <div class="perm-status-icon" :class="item.enabled ? 'icon-on-emerald' : 'icon-off'">
              <svg v-if="item.enabled" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <div class="perm-content">
              <div class="perm-heading">
                <strong class="perm-title">{{ item.label }}</strong>
                <span class="perm-cat-tag">{{ item.category }}</span>
              </div>
              <p class="perm-description">{{ item.description }}</p>
            </div>

            <div class="perm-control">
              <label class="pro-switch" :title="item.enabled ? 'Enabled — click to restrict' : 'Disabled — click to grant'">
                <input
                  type="checkbox"
                  :checked="item.enabled"
                  @change="handlePermissionToggle('student', key)"
                />
                <span class="pro-slider slider-emerald"></span>
              </label>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 3: LOGIN SECURITY ALERTS & BLOCKED EMAILS                -->
    <!-- ============================================================ -->
    <div v-else-if="activeMainTab === 'security'" class="security-center-wrap">
      <!-- Security Summary KPIs -->
      <div class="summary-kpi-grid">
        <article class="summary-card">
          <div class="summary-icon tone-danger-soft">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
          </div>
          <div class="summary-details">
            <span class="summary-label">Blocked Emails</span>
            <strong>{{ blockedEmails.length }} Locked</strong>
          </div>
          <span class="summary-caption">Auto-blocked at 3/3 fails</span>
        </article>

        <article class="summary-card">
          <div class="summary-icon tone-amber">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="summary-details">
            <span class="summary-label">Unread Security Alerts</span>
            <strong>{{ unreadAlertsCount }} Active</strong>
          </div>
          <span class="summary-caption">{{ securityAlerts.length }} total recorded</span>
        </article>

        <article class="summary-card">
          <div class="summary-icon tone-green">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div class="summary-details">
            <span class="summary-label">Lockout Policy</span>
            <strong>{{ MAX_LOGIN_ATTEMPTS }} Max Attempts</strong>
          </div>
          <span class="summary-caption">Real-time brute-force guard</span>
        </article>
      </div>

      <!-- Blocked Emails Directory Panel -->
      <div class="table-panel">
        <div class="panel-header-bar">
          <div>
            <h2>Blocked Email Addresses</h2>
            <p class="panel-sub">Emails automatically locked after 3 failed login attempts. Unblock below to restore sign-in access.</p>
          </div>
          <span class="security-policy-chip">
            <span class="chip-dot"></span>
            Auto-Lock Enforced
          </span>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Blocked Email & Identity</th>
                <th>Account Type</th>
                <th>Reason</th>
                <th>Failed Attempts</th>
                <th>Device / Browser</th>
                <th>Blocked Time</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in blockedEmails" :key="item.email">
                <td>
                  <div class="blocked-email-cell">
                    <strong>{{ item.email }}</strong>
                    <small>{{ item.accountName }}</small>
                  </div>
                </td>
                <td>
                  <span class="dept-chip">{{ item.accountRole }}</span>
                </td>
                <td>
                  <span class="reason-pill">{{ item.reason }}</span>
                </td>
                <td>
                  <strong class="attempts-danger-text">{{ item.attempts }} / {{ MAX_LOGIN_ATTEMPTS }}</strong>
                  <small v-if="item.extraAttemptsAfterBlock" class="extra-retry-note">
                    (+{{ item.extraAttemptsAfterBlock }} blocked retries)
                  </small>
                </td>
                <td>
                  <span class="device-cell-text">{{ item.deviceLabel }}</span>
                </td>
                <td>
                  <span class="time-cell-text">{{ formatRelativeTime(item.blockedAt) }}</span>
                </td>
                <td style="text-align: right;">
                  <button
                    type="button"
                    class="unblock-action-btn"
                    @click="handleUnblockEmail(item.email)"
                  >
                    Unblock Email
                  </button>
                </td>
              </tr>
              <tr v-if="!blockedEmails.length">
                <td colspan="7" class="empty-state-cell">
                  <div class="empty-box">
                    <p class="empty-title">No emails are currently blocked</p>
                    <p class="empty-text">Any email that fails sign-in 3 consecutive times will automatically appear here.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Intrusion & Failed Login Alerts Log -->
      <div class="table-panel">
        <div class="panel-header-bar">
          <div>
            <h2>System Intrusion & Failed Login Alerts</h2>
            <p class="panel-sub">Real-time record of who tried to access the portal with invalid credentials or blocked emails.</p>
          </div>
          <div class="security-log-actions">
            <button
              type="button"
              class="action-button"
              :disabled="!securityAlerts.some((a) => a.resolved)"
              @click="handleClearResolvedAlerts"
            >
              Clear Resolved
            </button>
          </div>
        </div>

        <div class="alerts-feed-list">
          <div
            v-for="alert in securityAlerts"
            :key="alert.id"
            class="security-alert-row"
            :class="{
              'alert-critical': alert.severity === 'critical',
              'alert-warning': alert.severity === 'warning',
              'alert-resolved': alert.resolved,
            }"
          >
            <div class="alert-severity-icon" :class="alert.severity">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div class="alert-row-body">
              <div class="alert-row-top">
                <strong>{{ alert.title }}</strong>
                <span class="alert-pill" :class="alert.resolved ? 'pill-resolved' : alert.severity">
                  {{ alert.resolved ? 'Unblocked / Resolved' : alert.severity === 'critical' ? 'Blocked' : 'Warning' }}
                </span>
                <span v-if="alert.unread && !alert.resolved" class="unread-tag">NEW</span>
              </div>
              <p class="alert-row-msg">{{ alert.message }}</p>
              <div class="alert-row-meta">
                <span>Email: <code>{{ alert.email }}</code></span>
                <span>•</span>
                <span>Account: {{ alert.accountName }}</span>
                <span>•</span>
                <span>Reason: {{ alert.reason }}</span>
                <span>•</span>
                <span>{{ formatRelativeTime(alert.timestamp) }}</span>
              </div>
            </div>
            <div class="alert-row-controls">
              <button
                v-if="isUserEmailBlocked(alert.email)"
                type="button"
                class="unblock-action-btn"
                @click="handleUnblockEmail(alert.email)"
              >
                Unblock
              </button>
              <button
                type="button"
                class="action-button"
                title="Remove alert from log"
                @click="handleDismissAlert(alert.id)"
              >
                Dismiss
              </button>
            </div>
          </div>

          <div v-if="!securityAlerts.length" class="empty-alerts-box">
            <strong>All clear — no unauthorized login attempts recorded</strong>
            <p>Failed sign-in attempts and blocked email notifications will appear here in real time.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- MODAL 1: VIEW USER DETAILS & CREDENTIALS                     -->
    <!-- ============================================================ -->
    <div v-if="viewModalOpen && viewingUser" class="modal-backdrop" @click.self="viewModalOpen = false">
      <div class="modal-card view-credential-modal">
        <header class="modal-header">
          <div class="view-user-header">
            <div class="user-avatar avatar-lg" :class="'tone-' + (viewingUser.tone || 'primary')">
              {{ viewingUser.avatar }}
            </div>
            <div>
              <h2>{{ viewingUser.name }}</h2>
              <p>{{ viewingUser.roleLabel }} • {{ viewingUser.department }}</p>
            </div>
          </div>
          <button class="close-btn" type="button" @click="viewModalOpen = false">✕</button>
        </header>

        <div class="credential-details-body">
          <div class="cred-card-box">
            <span class="cred-section-label">SYSTEM LOGIN CREDENTIALS</span>

            <div class="cred-field-row">
              <div>
                <span class="cred-label">Full Name</span>
                <strong class="cred-val">{{ viewingUser.name }}</strong>
              </div>
              <span
                class="role-pill-badge"
                :class="{
                  'role-super': viewingUser.roleLabel === 'Super Administrator',
                  'role-admin': viewingUser.role === 'admin' && viewingUser.roleLabel !== 'Super Administrator',
                  'role-teacher': viewingUser.role === 'teacher',
                  'role-student': viewingUser.role === 'student',
                }"
              >
                {{ viewingUser.roleLabel }}
              </span>
            </div>

            <div class="cred-field-row">
              <div>
                <span class="cred-label">Login Email Address</span>
                <code class="cred-code">{{ viewingUser.email }}</code>
              </div>
            </div>

            <div class="cred-field-row">
              <div>
                <span class="cred-label">Account Password</span>
                <code class="cred-code password-highlight">
                  {{ viewShowPassword ? viewingUser.password : '••••••••••••' }}
                </code>
              </div>
              <div class="cred-inline-actions">
                <button type="button" class="mini-pill-btn" @click="viewShowPassword = !viewShowPassword">
                  {{ viewShowPassword ? 'Hide' : 'Show' }}
                </button>
                <button type="button" class="mini-pill-btn primary-mini" @click="copyCredentials(viewingUser)">
                  Copy Login
                </button>
              </div>
            </div>
          </div>

          <div class="cred-meta-grid">
            <div class="cred-meta-item">
              <span class="cred-label">Assigned Class / Dept</span>
              <strong>{{ viewingUser.department }}</strong>
            </div>
            <div class="cred-meta-item">
              <span class="cred-label">Permission Tier</span>
              <strong>{{ viewingUser.permissions }}</strong>
            </div>
            <div class="cred-meta-item">
              <span class="cred-label">Account Status</span>
              <strong :class="viewingUser.status === 'Active' ? 'text-success' : 'text-danger'">{{ viewingUser.status }}</strong>
            </div>
            <div class="cred-meta-item">
              <span class="cred-label">Last Activity</span>
              <strong>{{ viewingUser.lastActive || 'Active' }}</strong>
            </div>
          </div>
        </div>

        <footer class="modal-actions view-modal-footer">
          <button
            class="secondary-button"
            type="button"
            @click="viewModalOpen = false; openEditModal(viewingUser)"
          >
            Edit Credentials
          </button>
          <button
            class="primary-button"
            type="button"
            @click="handlePreviewAsUser(viewingUser)"
          >
            Login / Preview as {{ viewingUser.name.split(' ')[0] }}
          </button>
        </footer>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- MODAL 2: ADD / ASSIGN / EDIT USER & PASSWORD                 -->
    <!-- ============================================================ -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <div class="modal-card">
        <header class="modal-header">
          <div class="modal-header-title-row">
            <div class="modal-header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h2>{{ editingUser ? 'Edit User Account & Password' : 'Assign New User Account' }}</h2>
              <p>{{ editingUser ? 'Modify credentials, role assignment, or reset password.' : 'Create a Student, Teacher, or Admin login account immediately.' }}</p>
            </div>
          </div>
          <button class="close-btn" type="button" aria-label="Close modal" @click="modalOpen = false">✕</button>
        </header>

        <form class="modal-form" @submit.prevent="saveUser">
          <div class="form-grid-2">
            <label>
              Full Name
              <input v-model="form.name" required placeholder="e.g. Olivia Martin" />
            </label>

            <label>
              Assigned Role
              <select v-model="form.roleLabel" @change="handleRoleChangeInForm">
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
                <option value="Administrator">Administrator</option>
                <option value="Super Administrator">Super Administrator</option>
              </select>
            </label>
          </div>

          <label>
            Login Email Address
            <input v-model="form.email" type="email" required placeholder="name@school.edu" />
          </label>

          <!-- Password Field with Reveal & Generator -->
          <div class="password-form-group">
            <div class="password-label-row">
              <span>System Password</span>
              <button type="button" class="generate-pass-link" @click="generateStrongPassword">
                ↻ Generate Password
              </button>
            </div>
            <div class="password-input-wrap">
              <input
                v-model="form.password"
                :type="formShowPassword ? 'text' : 'password'"
                required
                placeholder="Assign login password"
              />
              <button
                type="button"
                class="toggle-eye-btn"
                @click="formShowPassword = !formShowPassword"
                :title="formShowPassword ? 'Hide password' : 'Show password'"
              >
                <svg v-if="!formShowPassword" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-grid-2">
            <label>
              {{ form.roleLabel === 'Student' ? 'Assign Class Section' : 'Assign Department / Homeroom' }}
              <input
                v-model="form.department"
                :list="form.roleLabel === 'Student' ? 'class-presets' : 'dept-presets'"
                :placeholder="form.roleLabel === 'Student' ? 'e.g. Grade 10 - A' : 'e.g. Mathematics Dept.'"
                required
              />
              <datalist id="class-presets">
                <option v-for="c in classPresets" :key="c" :value="c" />
              </datalist>
              <datalist id="dept-presets">
                <option v-for="d in departmentPresets" :key="d" :value="d" />
              </datalist>
            </label>

            <label>
              Account Status
              <select v-model="form.status">
                <option value="Active">Active (Can Sign In)</option>
                <option value="Suspended">Suspended (Blocked)</option>
              </select>
            </label>
          </div>

          <label>
            Permission Tier
            <select v-model="form.permissions">
              <option value="Student Permissions Matrix">Student Permissions Matrix</option>
              <option value="Faculty Permissions Matrix">Faculty Permissions Matrix</option>
              <option value="Full System Control (Unrestricted)">Full System Control (Unrestricted)</option>
              <option value="Enrollment & Reports">Enrollment & Reports</option>
            </select>
          </label>

          <footer class="modal-actions">
            <button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button>
            <button class="primary-button" type="submit">
              {{ editingUser ? 'Save Account Changes' : 'Create & Assign Account' }}
            </button>
          </footer>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.governance-page {
  gap: 20px;
}

/* Executive Hero Header */
.governance-hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
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

.rbac-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 9px;
  border-radius: 999px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

/* Toast Notification */
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
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);
}

/* Sleek Role Preview Control Bar */
.role-preview-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 20px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.preview-left,
.preview-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-caption {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #64748b;
}

.active-identity-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 6px;
  border-radius: 999px;
  font-size: 12.5px;
  border: 1px solid transparent;
}

.pill-admin {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #5b21b6;
}

.pill-teacher {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e40af;
}

.pill-student {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #065f46;
}

.identity-avatar-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
  color: #ffffff;
}

.dot-bg-admin { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
.dot-bg-teacher { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.dot-bg-student { background: linear-gradient(135deg, #10b981, #059669); }

.identity-name {
  font-weight: 700;
  color: #0f172a;
}

.identity-divider {
  opacity: 0.4;
}

.identity-role-label {
  font-size: 12px;
  font-weight: 600;
}

/* Segmented Role Switcher */
.segmented-role-control {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.seg-role-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  border-radius: 7px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
}

.seg-role-btn:hover {
  color: #0f172a;
}

.seg-role-btn.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1), 0 1px 2px rgba(15, 23, 42, 0.06);
  font-weight: 700;
}

/* Segmented Navigation Tabs */
.governance-tabs-wrap {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
}

.governance-tabs {
  display: flex;
  gap: 6px;
}

.gov-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 12px 18px;
  border: none;
  background: transparent;
  font-size: 13.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s ease;
}

.gov-tab-btn:hover {
  color: #0f172a;
}

.gov-tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
  font-weight: 700;
}

.gov-tab-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
}

.neutral-badge {
  background: #f1f5f9;
  color: #475569;
}

/* Accounts Directory */
.accounts-directory-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.records-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.records-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.toolbar-right-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.reveal-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.reveal-all-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.reveal-all-btn.active {
  background: #eef2ff;
  border-color: #a5b4fc;
  color: #4338ca;
}

.role-filter-pills {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 9px;
}

.pill-tab {
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.pill-tab.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.toolbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  padding: 0 12px;
  height: 38px;
  min-width: 240px;
}

.toolbar-search:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.toolbar-search input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  width: 100%;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.avatar-lg {
  width: 44px;
  height: 44px;
  font-size: 15px;
}

.user-names strong {
  display: block;
  font-size: 13.5px;
  color: #0f172a;
}

.user-names small {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.role-pill-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.role-super { background: #f3e8ff; color: #7e22ce; }
.role-admin { background: #e0e7ff; color: #4338ca; }
.role-teacher { background: #dbeafe; color: #1d4ed8; }
.role-student { background: #d1fae5; color: #047857; }

.assignment-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 7px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
}

/* Password Cell Box */
.password-cell-box {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 4px 8px;
}

.password-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: #64748b;
  letter-spacing: 0.5px;
  min-width: 78px;
}

.password-code.is-revealed {
  color: #0f172a;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.icon-micro-btn {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.14s ease;
}

.icon-micro-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.status-toggle-pill {
  border: none;
  cursor: pointer;
  transition: transform 0.14s ease;
}

.status-toggle-pill:hover {
  transform: scale(1.04);
}

.status-suspended {
  background: #fee2e2;
  color: #b91c1c;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

/* Dual-Column Governance Matrix */
.permissions-matrix-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

@media (max-width: 1080px) {
  .permissions-matrix-grid {
    grid-template-columns: 1fr;
  }
}

.matrix-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
}

.matrix-accent-bar {
  height: 4px;
  width: 100%;
}

.accent-teacher { background: linear-gradient(90deg, #4f46e5 0%, #3b82f6 100%); }
.accent-student { background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%); }

.matrix-card-header {
  padding: 20px 22px 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.matrix-header-left {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.matrix-role-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.icon-teacher { background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; }
.icon-student { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }

.matrix-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}

.matrix-card-header h2 {
  font-size: 16.5px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.3px;
}

.matrix-card-header p {
  font-size: 12.5px;
  color: #64748b;
  margin: 0;
  line-height: 1.45;
}

.count-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.pill-blue { background: #eef2ff; color: #4338ca; }
.pill-emerald { background: #ecfdf5; color: #047857; }

.bulk-toggle-links {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 56px;
}

.bulk-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  cursor: pointer;
}

.bulk-link:hover { text-decoration: underline; }
.link-emerald { color: #059669; }
.muted-link { color: #64748b; }
.bulk-sep { color: #cbd5e1; }

.matrix-items-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.perm-row-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.16s ease;
}

.perm-row-card:hover {
  background: #ffffff;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.04);
}

.perm-row-card.is-active { background: #ffffff; border-color: #c7d2fe; }
.perm-row-card.is-active-emerald { background: #ffffff; border-color: #a7f3d0; }

.perm-status-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.icon-on-blue { background: #eef2ff; color: #4f46e5; }
.icon-on-emerald { background: #ecfdf5; color: #059669; }
.icon-off { background: #f1f5f9; color: #94a3b8; }

.perm-content { flex: 1; min-width: 0; }

.perm-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 3px;
}

.perm-title { font-size: 13.5px; font-weight: 700; color: #0f172a; }

.perm-cat-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #64748b;
}

.perm-description { font-size: 12px; color: #64748b; margin: 0; line-height: 1.45; }
.perm-control { flex-shrink: 0; }

/* Polished Modern Switch */
.pro-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.pro-switch input { opacity: 0; width: 0; height: 0; }

.pro-slider {
  position: absolute;
  inset: 0;
  background-color: #cbd5e1;
  border-radius: 999px;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.pro-slider::before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

input:checked + .slider-indigo {
  background-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.14);
}

input:checked + .slider-emerald {
  background-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.14);
}

input:checked + .pro-slider::before { transform: translateX(20px); }

/* Modals & Password Input Styling (Self-Contained Executive Dialog) */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.modal-card {
  position: relative;
  width: min(100%, 560px);
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.32), 0 0 0 1px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
}

.modal-card::before {
  content: "";
  display: block;
  height: 4px;
  width: 100%;
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #3b82f6 100%);
  flex-shrink: 0;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 26px 18px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 3px;
  letter-spacing: -0.35px;
  line-height: 1.25;
}

.modal-header p {
  font-size: 12.5px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.modal-form {
  padding: 22px 26px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  background: #ffffff;
}

.modal-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
}

.modal-form input,
.modal-form select {
  height: 42px;
  width: 100%;
  padding: 0 13px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  font-size: 13.5px;
  font-weight: 500;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.modal-form input:focus,
.modal-form select:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.14);
}

.modal-form .modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin: 8px -26px -24px;
  padding: 16px 26px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.password-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.password-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.generate-pass-link {
  background: none;
  border: none;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.generate-pass-link:hover {
  text-decoration: underline;
}

.password-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrap input {
  width: 100%;
  padding-right: 40px !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.toggle-eye-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 4px;
}

.toggle-eye-btn:hover {
  color: #0f172a;
}

/* View Credentials Modal */
.view-credential-modal {
  max-width: 520px;
}

.view-user-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.credential-details-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cred-card-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cred-section-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.7px;
  color: #4f46e5;
}

.cred-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
}

.cred-field-row:first-of-type {
  padding-top: 4px;
  border-top: none;
}

.cred-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 2px;
}

.cred-val {
  font-size: 14px;
  color: #0f172a;
}

.cred-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}

.password-highlight {
  background: #eef2ff;
  color: #4338ca;
  padding: 3px 8px;
  border-radius: 6px;
}

.cred-inline-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-pill-btn {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}

.mini-pill-btn:hover {
  background: #f1f5f9;
}

.primary-mini {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #ffffff;
}

.primary-mini:hover {
  background: #4338ca;
}

.cred-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cred-meta-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
}

.cred-meta-item strong {
  font-size: 12.5px;
  color: #0f172a;
}

.text-success { color: #059669 !important; }
.text-danger { color: #dc2626 !important; }

.modal-header-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-header-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  color: #4f46e5;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.view-modal-footer {
  padding: 16px 26px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  margin-top: 0;
}

@media (max-width: 600px) {
  .form-grid-2,
  .cred-meta-grid {
    grid-template-columns: 1fr;
  }
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

/* Login Security Shield & Alerts Tab */
.danger-tab-badge {
  background: #fee2e2 !important;
  color: #dc2626 !important;
  border: 1px solid #fecaca;
}

.status-cell-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.blocked-row-pill {
  padding: 3px 9px;
  border-radius: 999px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.blocked-row-pill:hover {
  background: #dc2626;
  color: #ffffff;
}

.security-center-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tone-danger-soft {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.panel-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
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

.security-policy-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 11.5px;
  font-weight: 700;
}

.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #dc2626;
}

.blocked-email-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.blocked-email-cell strong {
  font-size: 13.5px;
  color: #991b1b;
}

.blocked-email-cell small {
  font-size: 12px;
  color: #64748b;
}

.reason-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
  font-size: 11.5px;
  font-weight: 700;
}

.attempts-danger-text {
  color: #dc2626;
  font-size: 13px;
}

.extra-retry-note {
  display: block;
  font-size: 11px;
  color: #b91c1c;
}

.device-cell-text,
.time-cell-text {
  font-size: 12.5px;
  color: #475569;
}

.unblock-action-btn {
  padding: 7px 14px;
  border-radius: 9px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25);
  transition: all 0.15s ease;
}

.unblock-action-btn:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}

.alerts-feed-list {
  display: flex;
  flex-direction: column;
}

.security-alert-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s ease;
}

.security-alert-row:last-child {
  border-bottom: none;
}

.security-alert-row.alert-critical {
  background: rgba(254, 242, 242, 0.52);
}

.security-alert-row.alert-warning {
  background: rgba(255, 251, 235, 0.5);
}

.security-alert-row.alert-resolved {
  background: #ffffff;
  opacity: 0.78;
}

.alert-severity-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.alert-severity-icon.critical {
  background: #fee2e2;
  color: #dc2626;
}

.alert-severity-icon.warning {
  background: #fef3c7;
  color: #d97706;
}

.alert-row-body {
  flex: 1;
  min-width: 0;
}

.alert-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.alert-row-top strong {
  font-size: 13.5px;
  color: #0f172a;
}

.alert-pill {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
}

.alert-pill.critical {
  background: #fee2e2;
  color: #b91c1c;
}

.alert-pill.warning {
  background: #fef3c7;
  color: #b45309;
}

.alert-pill.pill-resolved {
  background: #ecfdf5;
  color: #047857;
}

.unread-tag {
  font-size: 10px;
  font-weight: 800;
  color: #ffffff;
  background: #4f46e5;
  padding: 2px 6px;
  border-radius: 5px;
}

.alert-row-msg {
  margin: 0 0 6px;
  font-size: 12.8px;
  color: #334155;
  line-height: 1.48;
}

.alert-row-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: #64748b;
}

.alert-row-meta code {
  background: #f1f5f9;
  color: #0f172a;
  padding: 1px 6px;
  border-radius: 5px;
  font-weight: 600;
}

.alert-row-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.empty-alerts-box {
  padding: 40px 24px;
  text-align: center;
}

.empty-alerts-box strong {
  display: block;
  font-size: 14px;
  color: #0f172a;
  margin-bottom: 4px;
}

.empty-alerts-box p {
  margin: 0;
  font-size: 12.5px;
  color: #64748b;
}
</style>
