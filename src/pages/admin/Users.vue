<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  DEMO_ACCOUNTS,
  getCurrentUser,
  switchRole,
} from '../../services/authService.js'
import {
  getRolePermissions,
  resetPermissionsToDefault,
  saveRolePermissions,
  togglePermission,
} from '../../services/permissionService.js'

// Active top tab: 'accounts' | 'permissions' | 'simulation'
const activeMainTab = ref('permissions') // Defaults to permissions to directly show the feature!

const activeRoleFilter = ref('all')
const search = ref('')
const modalOpen = ref(false)
const editingUser = ref(null)
const successMessage = ref('')

// Current active logged in identity
const activeUser = ref(getCurrentUser())

// Permissions reactive state
const permissions = ref(getRolePermissions())

// Users list
const users = ref([
  {
    id: 1,
    name: 'Dr. Alexander Vance',
    email: 'admin@school.edu',
    role: 'Super Administrator',
    department: 'Executive Leadership',
    permissions: 'Full System Control (Unrestricted)',
    status: 'Active',
    lastActive: 'Just now',
    tone: 'purple',
  },
  {
    id: 2,
    name: 'Jordan Lee',
    email: 'jordan.lee@school.edu',
    role: 'Administrator',
    department: 'Academic Operations',
    permissions: 'Enrollment & Reports',
    status: 'Active',
    lastActive: '14m ago',
    tone: 'primary',
  },
  {
    id: 3,
    name: 'Maya Patel',
    email: 'teacher@school.edu',
    role: 'Teacher',
    department: 'Grade 10 Lead & Mathematics',
    permissions: 'Faculty Permissions Matrix',
    status: 'Active',
    lastActive: '1h ago',
    tone: 'blue',
  },
  {
    id: 4,
    name: 'Daniel Kim',
    email: 'daniel.kim@school.edu',
    role: 'Teacher',
    department: 'Science & Physics Dept.',
    permissions: 'Faculty Permissions Matrix',
    status: 'Active',
    lastActive: '3h ago',
    tone: 'blue',
  },
  {
    id: 5,
    name: 'Sarah Jenkins',
    email: 'sarah.j@school.edu',
    role: 'Teacher',
    department: 'English & Literature',
    permissions: 'Faculty Permissions Matrix',
    status: 'Active',
    lastActive: 'Yesterday',
    tone: 'blue',
  },
  {
    id: 6,
    name: 'Olivia Martin',
    email: 'student@school.edu',
    role: 'Student',
    department: 'Grade 10 - Class A',
    permissions: 'Student Permissions Matrix',
    status: 'Active',
    lastActive: 'Today',
    tone: 'emerald',
  },
  {
    id: 7,
    name: 'Elena Rostova',
    email: 'elena.r@school.edu',
    role: 'Registrar Staff',
    department: 'Admissions Office',
    permissions: 'Student Directory Only',
    status: 'Active',
    lastActive: '2 days ago',
    tone: 'emerald',
  },
])

const form = reactive({
  name: '',
  email: '',
  role: 'Teacher',
  department: '',
  permissions: 'Faculty Permissions Matrix',
})

const filteredUsers = computed(() => {
  let list = users.value
  if (activeRoleFilter.value !== 'all') {
    list = list.filter((u) => u.role.toLowerCase().includes(activeRoleFilter.value.toLowerCase()))
  }

  const query = search.value.trim().toLowerCase()
  if (!query) return list

  return list.filter((u) =>
    [u.name, u.email, u.role, u.department, u.permissions]
      .some((val) => val?.toLowerCase().includes(query)),
  )
})

// Counts of active permissions
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

// Toggle a specific permission for Teacher or Student
function handlePermissionToggle(role, key) {
  const newState = togglePermission(role, key)
  permissions.value = getRolePermissions()
  const roleName = role === 'teacher' ? 'Teacher' : 'Student'
  const actionText = newState ? 'enabled' : 'disabled'
  showNotification(`${roleName} permission "${permissions.value[role][key].label}" is now ${actionText}.`)
}

// Reset all permissions to standard institutional defaults
function handleResetPermissions() {
  if (!window.confirm('Reset Teacher and Student permissions back to institutional factory defaults?')) return
  permissions.value = resetPermissionsToDefault()
  showNotification('Permissions have been reset to system defaults.')
}

function handleSaveAllPermissions() {
  saveRolePermissions(permissions.value)
  showNotification('Institutional Role Permission Matrix successfully applied across all modules!')
}

// Switch active simulator role
function handleRoleSimulation(roleKey) {
  const newAccount = switchRole(roleKey)
  activeUser.value = newAccount
  showNotification(`Active system identity switched to ${newAccount.name} (${newAccount.roleLabel}). Check the sidebar and dashboard!`)
}

function openInviteModal() {
  editingUser.value = null
  Object.assign(form, {
    name: '',
    email: '',
    role: 'Teacher',
    department: '',
    permissions: 'Faculty Permissions Matrix',
  })
  modalOpen.value = true
}

function openEditModal(user) {
  editingUser.value = user
  Object.assign(form, {
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    permissions: user.permissions,
  })
  modalOpen.value = true
}

function saveUser() {
  if (editingUser.value) {
    Object.assign(editingUser.value, {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      department: form.department.trim() || 'General Staff',
      permissions: form.permissions,
    })
    showNotification(`User account for ${form.name} updated.`)
  } else {
    const newId = Math.max(...users.value.map((u) => u.id)) + 1
    users.value.push({
      id: newId,
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      department: form.department.trim() || 'General Staff',
      permissions: form.permissions,
      status: 'Active',
      lastActive: 'Invited',
      tone: form.role.includes('Admin') ? 'primary' : form.role.includes('Student') ? 'emerald' : 'blue',
    })
    showNotification(`Account invite created for ${form.email}.`)
  }
  modalOpen.value = false
}

function toggleStatus(user) {
  user.status = user.status === 'Active' ? 'Suspended' : 'Active'
  showNotification(`Status for ${user.name} changed to ${user.status}.`)
}

onMounted(() => {
  permissions.value = getRolePermissions()
  activeUser.value = getCurrentUser()
})
</script>

<template>
  <section class="management-page">
    <!-- Header -->
    <header class="management-heading">
      <div>
        <p class="eyebrow">ACCESS GOVERNANCE & AUTHENTICATION</p>
        <h1>Users & Role Permissions</h1>
        <p class="page-description">
          Centrally govern system-wide authentication, user privileges, and configure granular feature permissions for Teachers and Students.
        </p>
      </div>

      <div class="header-action-group">
        <button
          v-if="activeMainTab === 'permissions'"
          type="button"
          class="secondary-button"
          title="Reset to standard school policy"
          @click="handleResetPermissions"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          <span>Reset Defaults</span>
        </button>

        <button
          v-if="activeMainTab === 'permissions'"
          type="button"
          class="primary-button"
          title="Apply permission changes to entire system"
          @click="handleSaveAllPermissions"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Save Permissions</span>
        </button>

        <button
          v-else
          class="primary-button"
          type="button"
          @click="openInviteModal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Invite User</span>
        </button>
      </div>
    </header>

    <!-- Toast Notification -->
    <div v-if="successMessage" class="toast-notification" role="status">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <!-- Active Identity Simulator Banner -->
    <div class="active-identity-bar">
      <div class="identity-info-group">
        <span class="identity-tag">Current Simulated Identity:</span>
        <div class="identity-chip" :class="'chip-' + activeUser.role">
          <span class="identity-avatar">{{ activeUser.avatar }}</span>
          <strong>{{ activeUser.name }}</strong>
          <span class="identity-role">({{ activeUser.roleLabel }})</span>
        </div>
      </div>

      <div class="quick-sim-buttons">
        <span class="sim-label">Switch View As:</span>
        <button
          type="button"
          class="sim-btn"
          :class="{ active: activeUser.role === 'admin' }"
          @click="handleRoleSimulation('admin')"
        >
          🛡️ Administrator
        </button>
        <button
          type="button"
          class="sim-btn"
          :class="{ active: activeUser.role === 'teacher' }"
          @click="handleRoleSimulation('teacher')"
        >
          👩‍🏫 Teacher (Maya Patel)
        </button>
        <button
          type="button"
          class="sim-btn"
          :class="{ active: activeUser.role === 'student' }"
          @click="handleRoleSimulation('student')"
        >
          🎓 Student (Olivia Martin)
        </button>
      </div>
    </div>

    <!-- Top Main Tabs -->
    <div class="main-tabs-row">
      <button
        type="button"
        class="main-tab-btn"
        :class="{ active: activeMainTab === 'permissions' }"
        @click="activeMainTab = 'permissions'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>Teacher & Student Feature Permissions Control</span>
        <span class="tab-chip">{{ teacherEnabledCount + studentEnabledCount }} Active</span>
      </button>

      <button
        type="button"
        class="main-tab-btn"
        :class="{ active: activeMainTab === 'accounts' }"
        @click="activeMainTab = 'accounts'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Staff & User Accounts Directory ({{ users.length }})</span>
      </button>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 1: TEACHER & STUDENT FEATURE PERMISSIONS CONTROL        -->
    <!-- ============================================================ -->
    <div v-if="activeMainTab === 'permissions'" class="permissions-tab-area">
      <!-- Info Callout -->
      <div class="permission-intro-card">
        <div class="intro-icon tone-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="intro-text">
          <h3>Administrator Granular Permission Control</h3>
          <p>
            Toggle individual capabilities for <strong>Teachers</strong> and <strong>Students</strong> below.
            Changes take effect immediately across all modules, navigation bars, and data entry forms.
          </p>
        </div>
      </div>

      <div class="permissions-panels-grid">
        <!-- 1. TEACHER PERMISSIONS PANEL -->
        <section class="permission-role-panel">
          <header class="panel-header">
            <div class="role-title-group">
              <div class="role-icon-box tone-blue">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <div>
                <h2>Teacher & Faculty Permissions</h2>
                <p>Governs teacher capabilities across class management, attendance, and grading.</p>
              </div>
            </div>
            <span class="perm-counter-pill tone-blue-pill">
              {{ teacherEnabledCount }} of {{ teacherTotalCount }} Active
            </span>
          </header>

          <div class="permission-items-list">
            <div
              v-for="(item, key) in permissions.teacher"
              :key="key"
              class="permission-item-card"
              :class="{ 'item-enabled': item.enabled }"
            >
              <div class="item-info">
                <div class="item-title-row">
                  <span class="category-chip">{{ item.category }}</span>
                  <strong class="item-label">{{ item.label }}</strong>
                </div>
                <p class="item-desc">{{ item.description }}</p>
              </div>

              <div class="item-switch">
                <label class="switch-toggle" :title="item.enabled ? 'Click to disable' : 'Click to enable'">
                  <input
                    type="checkbox"
                    :checked="item.enabled"
                    @change="handlePermissionToggle('teacher', key)"
                  />
                  <span class="switch-slider"></span>
                </label>
                <span class="switch-status-text" :class="item.enabled ? 'text-enabled' : 'text-disabled'">
                  {{ item.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. STUDENT PERMISSIONS PANEL -->
        <section class="permission-role-panel">
          <header class="panel-header">
            <div class="role-title-group">
              <div class="role-icon-box tone-green">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div>
                <h2>Student Portal Permissions</h2>
                <p>Governs what student accounts can view, print, or interact with in their portal.</p>
              </div>
            </div>
            <span class="perm-counter-pill tone-green-pill">
              {{ studentEnabledCount }} of {{ studentTotalCount }} Active
            </span>
          </header>

          <div class="permission-items-list">
            <div
              v-for="(item, key) in permissions.student"
              :key="key"
              class="permission-item-card"
              :class="{ 'item-enabled': item.enabled }"
            >
              <div class="item-info">
                <div class="item-title-row">
                  <span class="category-chip">{{ item.category }}</span>
                  <strong class="item-label">{{ item.label }}</strong>
                </div>
                <p class="item-desc">{{ item.description }}</p>
              </div>

              <div class="item-switch">
                <label class="switch-toggle" :title="item.enabled ? 'Click to disable' : 'Click to enable'">
                  <input
                    type="checkbox"
                    :checked="item.enabled"
                    @change="handlePermissionToggle('student', key)"
                  />
                  <span class="switch-slider"></span>
                </label>
                <span class="switch-status-text" :class="item.enabled ? 'text-enabled' : 'text-disabled'">
                  {{ item.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 2: STAFF & USER ACCOUNTS DIRECTORY                      -->
    <!-- ============================================================ -->
    <div v-else class="accounts-tab-area">
      <!-- KPI Row -->
      <div class="users-kpi-grid">
        <article class="summary-card">
          <div class="summary-icon tone-purple">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="summary-details">
            <span class="summary-label">Super Administrators</span>
            <strong>2 Accounts</strong>
          </div>
          <span class="summary-caption">Root privileges</span>
        </article>

        <article class="summary-card">
          <div class="summary-icon tone-blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div class="summary-details">
            <span class="summary-label">Faculty Accounts</span>
            <strong>64 Staff</strong>
          </div>
          <span class="summary-caption">Teacher portal access</span>
        </article>

        <article class="summary-card">
          <div class="summary-icon tone-green">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div class="summary-details">
            <span class="summary-label">Active 2FA Status</span>
            <strong>100% Verified</strong>
          </div>
          <span class="summary-caption">Security policy compliant</span>
        </article>
      </div>

      <!-- Users Table Card -->
      <div class="records-card">
        <div class="records-toolbar">
          <!-- Role Tabs -->
          <div class="role-filter-pills">
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeRoleFilter === 'all' }"
              @click="activeRoleFilter = 'all'"
            >
              All Accounts ({{ users.length }})
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeRoleFilter === 'admin' }"
              @click="activeRoleFilter = 'admin'"
            >
              Administrators
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeRoleFilter === 'teacher' }"
              @click="activeRoleFilter = 'teacher'"
            >
              Teachers
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeRoleFilter === 'student' }"
              @click="activeRoleFilter = 'student'"
            >
              Students
            </button>
          </div>

          <!-- Search -->
          <div class="toolbar-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              v-model="search"
              type="text"
              placeholder="Search by name, email, role, or department..."
            />
          </div>
        </div>

        <div class="table-scroll">
          <table class="records-table">
            <thead>
              <tr>
                <th>USER ACCOUNT</th>
                <th>ASSIGNED ROLE</th>
                <th>DEPARTMENT</th>
                <th>ACCESS PERMISSIONS</th>
                <th>STATUS</th>
                <th style="text-align: right;">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id" class="table-row-hover">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar" :class="'tone-' + (user.tone || 'primary')">
                      {{ user.name.split(' ').map((n) => n[0]).join('').slice(0, 2) }}
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
                      'role-super': user.role === 'Super Administrator',
                      'role-admin': user.role === 'Administrator',
                      'role-teacher': user.role === 'Teacher',
                      'role-student': user.role === 'Student',
                      'role-staff': user.role.includes('Staff'),
                    }"
                  >
                    {{ user.role }}
                  </span>
                </td>
                <td>
                  <span class="cell-department">{{ user.department }}</span>
                </td>
                <td>
                  <span class="cell-permissions">{{ user.permissions }}</span>
                </td>
                <td>
                  <span
                    class="status-pill"
                    :class="user.status === 'Active' ? 'status-active' : 'status-suspended'"
                  >
                    {{ user.status }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div class="row-actions">
                    <button class="action-btn-link" type="button" @click="openEditModal(user)">Edit</button>
                    <button
                      class="action-btn-link action-danger"
                      type="button"
                      @click="toggleStatus(user)"
                    >
                      {{ user.status === 'Active' ? 'Suspend' : 'Activate' }}
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

    <!-- Invite / Edit User Modal -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <div class="modal-card">
        <header class="modal-header">
          <div>
            <h2>{{ editingUser ? 'Edit User Account' : 'Invite New User' }}</h2>
            <p>{{ editingUser ? 'Update account details and role permissions.' : 'Send an email invite with initial access privileges.' }}</p>
          </div>
          <button class="close-btn" type="button" @click="modalOpen = false">✕</button>
        </header>

        <form class="modal-form" @submit.prevent="saveUser">
          <label>
            Full Name
            <input v-model="form.name" required placeholder="e.g. Dr. Arthur Pendelton" />
          </label>

          <label>
            Institutional Email Address
            <input v-model="form.email" type="email" required placeholder="arthur.p@school.edu" />
          </label>

          <div class="form-grid-2">
            <label>
              Assigned Role
              <select v-model="form.role">
                <option value="Super Administrator">Super Administrator</option>
                <option value="Administrator">Administrator</option>
                <option value="Teacher">Teacher / Faculty</option>
                <option value="Student">Student</option>
                <option value="Registrar Staff">Registrar Staff</option>
              </select>
            </label>

            <label>
              Department / Section
              <input v-model="form.department" placeholder="e.g. Grade 10 Lead" />
            </label>
          </div>

          <label>
            Permission Tier
            <select v-model="form.permissions">
              <option value="Full System Control (Unrestricted)">Full System Control (Unrestricted)</option>
              <option value="Faculty Permissions Matrix">Faculty Permissions Matrix</option>
              <option value="Student Permissions Matrix">Student Permissions Matrix</option>
              <option value="Enrollment & Reports">Enrollment & Reports</option>
              <option value="Student Directory Only">Student Directory Only</option>
            </select>
          </label>

          <footer class="modal-actions">
            <button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button>
            <button class="primary-button" type="submit">{{ editingUser ? 'Save Changes' : 'Send Invite' }}</button>
          </footer>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Active Identity Simulator Bar */
.active-identity-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 18px;
  margin-bottom: 20px;
}

.identity-info-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.identity-tag {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.identity-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12.5px;
}

.chip-admin { background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; }
.chip-teacher { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
.chip-student { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }

.identity-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
}

.identity-role {
  font-size: 11px;
  opacity: 0.85;
}

.quick-sim-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sim-label {
  font-size: 11.5px;
  color: #64748b;
  font-weight: 600;
}

.sim-btn {
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sim-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.sim-btn.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}

/* Main Tabs */
.main-tabs-row {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 24px;
}

.main-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border: none;
  background: transparent;
  font-size: 13.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s ease;
}

.main-tab-btn:hover {
  color: #0f172a;
}

.main-tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
  font-weight: 700;
}

.tab-chip {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 12px;
  background: #eef2ff;
  color: #4338ca;
}

/* Permission Intro Card */
.permission-intro-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.intro-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.intro-text h3 {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}

.intro-text p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* Permissions Grid */
.permissions-panels-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .permissions-panels-grid {
    grid-template-columns: 1fr;
  }
}

.permission-role-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.role-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.panel-header h2 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 2px;
}

.panel-header p {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.perm-counter-pill {
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 12px;
  white-space: nowrap;
}

.tone-blue-pill { background: #dbeafe; color: #1e40af; }
.tone-green-pill { background: #d1fae5; color: #065f46; }

.permission-items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.permission-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.15s ease;
}

.permission-item-card:hover {
  background: #ffffff;
  border-color: #cbd5e1;
}

.permission-item-card.item-enabled {
  background: #ffffff;
  border-color: #c7d2fe;
  box-shadow: 0 1px 3px rgba(79, 70, 229, 0.05);
}

.item-info {
  flex: 1;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.category-chip {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  background: #e2e8f0;
  color: #475569;
  padding: 1px 5px;
  border-radius: 4px;
}

.item-label {
  font-size: 13.5px;
  color: #0f172a;
}

.item-desc {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

.item-switch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.switch-status-text {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.text-enabled { color: #4f46e5; }
.text-disabled { color: #94a3b8; }

/* Switch Toggle Styling */
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
  background-color: #4f46e5;
}

input:checked + .switch-slider:before {
  transform: translateX(20px);
}

/* User Directory & Table */
.users-kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.records-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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

.role-filter-pills {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
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
}

.pill-tab.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.toolbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 12px;
  height: 38px;
  min-width: 280px;
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
  gap: 10px;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
}

.user-names strong {
  display: block;
  font-size: 13px;
  color: #0f172a;
}

.user-names small {
  display: block;
  font-size: 11.5px;
  color: #64748b;
}

.role-pill-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
}

.role-super { background: #f3e8ff; color: #7e22ce; }
.role-admin { background: #e0e7ff; color: #4338ca; }
.role-teacher { background: #dbeafe; color: #1d4ed8; }
.role-student { background: #d1fae5; color: #047857; }
.role-staff { background: #f1f5f9; color: #475569; }

.cell-department {
  font-size: 12.5px;
  color: #334155;
}

.cell-permissions {
  font-size: 12px;
  color: #64748b;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.action-btn-link {
  background: transparent;
  border: none;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px;
}

.action-btn-link:hover {
  text-decoration: underline;
}

.action-danger {
  color: #dc2626;
}

/* Modal */
.modal-card {
  max-width: 520px;
  width: 100%;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
