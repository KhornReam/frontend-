/**
 * authService.js
 * Centralized Authentication, User Accounts Directory, & Role Identity Management.
 * Supports Admin, Teacher, and Student accounts with live CRUD & password auth.
 */

import { hasPermission } from './permissionService.js'
import {
  clearFailedAttempts,
  isEmailBlocked,
  MAX_LOGIN_ATTEMPTS,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
} from './loginSecurityService.js'

const AUTH_KEY = 'dashboard-authenticated'
const USER_KEY = 'sms_current_user'
const ACCOUNTS_STORAGE_KEY = 'sms_user_accounts_v2'

export const DEFAULT_USER_ACCOUNTS = [
  {
    id: 1,
    name: 'Dr. Alexander Vance',
    email: 'admin@school.edu',
    password: 'admin123',
    role: 'admin',
    roleLabel: 'Super Administrator',
    department: 'Executive Leadership',
    permissions: 'Full System Control (Unrestricted)',
    status: 'Active',
    lastActive: 'Just now',
    avatar: 'AD',
    tone: 'purple',
  },
  {
    id: 2,
    name: 'Jordan Lee',
    email: 'jordan.lee@school.edu',
    password: 'admin2026',
    role: 'admin',
    roleLabel: 'Administrator',
    department: 'Academic Operations',
    permissions: 'Enrollment & Reports',
    status: 'Active',
    lastActive: '14m ago',
    avatar: 'JL',
    tone: 'primary',
  },
  {
    id: 3,
    name: 'Maya Patel',
    email: 'teacher@school.edu',
    password: 'teacher123',
    role: 'teacher',
    roleLabel: 'Teacher',
    department: 'Grade 10 - A (Mathematics)',
    permissions: 'Faculty Permissions Matrix',
    status: 'Active',
    lastActive: '1h ago',
    avatar: 'MP',
    tone: 'blue',
  },
  {
    id: 4,
    name: 'Daniel Kim',
    email: 'daniel.kim@school.edu',
    password: 'daniel123',
    role: 'teacher',
    roleLabel: 'Teacher',
    department: 'Grade 11 - A (Science & Physics)',
    permissions: 'Faculty Permissions Matrix',
    status: 'Active',
    lastActive: '3h ago',
    avatar: 'DK',
    tone: 'blue',
  },
  {
    id: 5,
    name: 'Sarah Jenkins',
    email: 'sarah.j@school.edu',
    password: 'sarah123',
    role: 'teacher',
    roleLabel: 'Teacher',
    department: 'Grade 9 - C (English Literature)',
    permissions: 'Faculty Permissions Matrix',
    status: 'Active',
    lastActive: 'Yesterday',
    avatar: 'SJ',
    tone: 'blue',
  },
  {
    id: 6,
    name: 'Olivia Martin',
    email: 'student@school.edu',
    password: 'student123',
    role: 'student',
    roleLabel: 'Student',
    department: 'Grade 10 - A',
    permissions: 'Student Permissions Matrix',
    status: 'Active',
    lastActive: 'Today',
    avatar: 'OM',
    tone: 'emerald',
  },
  {
    id: 7,
    name: 'Ethan Wilson',
    email: 'ethan.wilson@school.edu',
    password: 'ethan123',
    role: 'student',
    roleLabel: 'Student',
    department: 'Grade 8 - B',
    permissions: 'Student Permissions Matrix',
    status: 'Active',
    lastActive: 'Today',
    avatar: 'EW',
    tone: 'emerald',
  },
  {
    id: 8,
    name: 'Sophia Chen',
    email: 'sophia.chen@school.edu',
    password: 'sophia123',
    role: 'student',
    roleLabel: 'Student',
    department: 'Grade 11 - A',
    permissions: 'Student Permissions Matrix',
    status: 'Active',
    lastActive: '2h ago',
    avatar: 'SC',
    tone: 'emerald',
  },
  {
    id: 9,
    name: 'Noah Williams',
    email: 'noah.williams@school.edu',
    password: 'noah123',
    role: 'student',
    roleLabel: 'Student',
    department: 'Grade 9 - C',
    permissions: 'Student Permissions Matrix',
    status: 'Active',
    lastActive: 'Yesterday',
    avatar: 'NW',
    tone: 'emerald',
  },
]

export const DEMO_ACCOUNTS = {
  admin: DEFAULT_USER_ACCOUNTS[0],
  teacher: DEFAULT_USER_ACCOUNTS[2],
  student: DEFAULT_USER_ACCOUNTS[5],
}

function deriveRoleKey(roleLabel) {
  const lower = (roleLabel || '').toLowerCase()
  if (lower.includes('admin')) return 'admin'
  if (lower.includes('teacher') || lower.includes('faculty')) return 'teacher'
  return 'student'
}

function deriveTone(roleLabel) {
  const lower = (roleLabel || '').toLowerCase()
  if (lower.includes('super')) return 'purple'
  if (lower.includes('admin')) return 'primary'
  if (lower.includes('teacher') || lower.includes('faculty')) return 'blue'
  return 'emerald'
}

function deriveInitials(name) {
  const parts = (name || 'U').trim().split(/\s+/)
  return parts
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getAllUsers() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(DEFAULT_USER_ACCOUNTS))
  return JSON.parse(JSON.stringify(DEFAULT_USER_ACCOUNTS))
}

export function saveAllUsers(list) {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent('sms-users-updated', { detail: list }))
}

export function createUserAccount(payload) {
  const list = getAllUsers()
  const nextId = list.length ? Math.max(...list.map((u) => Number(u.id) || 0)) + 1 : 1
  const roleLabel = payload.roleLabel || payload.role || 'Student'
  const roleKey = deriveRoleKey(roleLabel)
  const newUser = {
    id: nextId,
    name: payload.name.trim(),
    email: payload.email.trim(),
    password: payload.password.trim(),
    role: roleKey,
    roleLabel,
    department: payload.department?.trim() || (roleKey === 'student' ? 'Grade 10 - A' : 'General Faculty'),
    permissions:
      payload.permissions ||
      (roleKey === 'admin'
        ? 'Full System Control (Unrestricted)'
        : roleKey === 'teacher'
          ? 'Faculty Permissions Matrix'
          : 'Student Permissions Matrix'),
    status: payload.status || 'Active',
    lastActive: 'Just created',
    avatar: deriveInitials(payload.name),
    tone: deriveTone(roleLabel),
    linkedStudentId: payload.linkedStudentId ?? null,
    linkedTeacherId: payload.linkedTeacherId ?? null,
  }
  list.unshift(newUser)
  saveAllUsers(list)
  return newUser
}

export function updateUserAccount(id, payload) {
  const list = getAllUsers()
  const idx = list.findIndex((u) => u.id === id)
  if (idx === -1) return null
  const roleLabel = payload.roleLabel || payload.role || list[idx].roleLabel
  const roleKey = deriveRoleKey(roleLabel)
  const updated = {
    ...list[idx],
    name: payload.name.trim(),
    email: payload.email.trim(),
    password: payload.password.trim(),
    role: roleKey,
    roleLabel,
    department: payload.department?.trim() || list[idx].department,
    permissions: payload.permissions || list[idx].permissions,
    status: payload.status || list[idx].status,
    avatar: deriveInitials(payload.name),
    tone: deriveTone(roleLabel),
    linkedStudentId: payload.linkedStudentId !== undefined ? payload.linkedStudentId : list[idx].linkedStudentId ?? null,
    linkedTeacherId: payload.linkedTeacherId !== undefined ? payload.linkedTeacherId : list[idx].linkedTeacherId ?? null,
  }
  list[idx] = updated
  saveAllUsers(list)

  // Sync active session if editing currently logged-in user
  const current = getCurrentUser()
  if (current && current.id === id) {
    setCurrentUser(updated)
  }
  return updated
}

export function deleteUserAccount(id) {
  const list = getAllUsers().filter((u) => u.id !== id)
  saveAllUsers(list)
  return list
}

export function toggleUserAccountStatus(id) {
  const list = getAllUsers()
  const user = list.find((u) => u.id === id)
  if (!user) return null
  user.status = user.status === 'Active' ? 'Suspended' : 'Active'
  saveAllUsers(list)
  return user
}

/**
 * Find an existing user account linked to a Student or Teacher directory record.
 */
export function findLinkedUser({ role, linkedId, email }) {
  const list = getAllUsers()
  const emailLower = (email || '').trim().toLowerCase()
  return (
    list.find((u) => {
      if (role === 'student' && linkedId && u.linkedStudentId === linkedId) return true
      if (role === 'teacher' && linkedId && u.linkedTeacherId === linkedId) return true
      if (emailLower && u.email?.toLowerCase() === emailLower) return true
      return false
    }) || null
  )
}

/**
 * Create or update a user account whenever a Student or Teacher is saved on their page.
 */
export function upsertLinkedUser({ role, linkedId, name, email, password, department, previousEmail }) {
  const cleanEmail = (email || '').trim()
  const cleanName = (name || '').trim()
  if (!cleanName || !cleanEmail) return null

  const list = getAllUsers()
  const emailLower = cleanEmail.toLowerCase()
  const prevLower = (previousEmail || '').trim().toLowerCase()

  const idx = list.findIndex((u) => {
    if (role === 'student' && linkedId && u.linkedStudentId === linkedId) return true
    if (role === 'teacher' && linkedId && u.linkedTeacherId === linkedId) return true
    if (prevLower && u.email?.toLowerCase() === prevLower) return true
    if (u.email?.toLowerCase() === emailLower) return true
    return false
  })

  const roleLabel = role === 'teacher' ? 'Teacher' : 'Student'
  const defaultPass = role === 'teacher' ? 'teacher123' : 'student123'

  if (idx !== -1) {
    const existing = list[idx]
    list[idx] = {
      ...existing,
      name: cleanName,
      email: cleanEmail,
      password: (password && password.trim()) ? password.trim() : existing.password || defaultPass,
      role,
      roleLabel,
      department: (department && department.trim()) ? department.trim() : existing.department,
      avatar: deriveInitials(cleanName),
      tone: deriveTone(roleLabel),
      linkedStudentId: role === 'student' ? (linkedId ?? existing.linkedStudentId ?? null) : existing.linkedStudentId ?? null,
      linkedTeacherId: role === 'teacher' ? (linkedId ?? existing.linkedTeacherId ?? null) : existing.linkedTeacherId ?? null,
    }
    saveAllUsers(list)
    return list[idx]
  }

  const nextId = list.length ? Math.max(...list.map((u) => Number(u.id) || 0)) + 1 : 1
  const created = {
    id: nextId,
    name: cleanName,
    email: cleanEmail,
    password: (password && password.trim()) ? password.trim() : defaultPass,
    role,
    roleLabel,
    department: (department && department.trim()) || (role === 'student' ? 'Grade 10 - A' : 'General Faculty'),
    permissions: role === 'teacher' ? 'Faculty Permissions Matrix' : 'Student Permissions Matrix',
    status: 'Active',
    lastActive: 'Synced from Directory',
    avatar: deriveInitials(cleanName),
    tone: deriveTone(roleLabel),
    linkedStudentId: role === 'student' ? (linkedId ?? null) : null,
    linkedTeacherId: role === 'teacher' ? (linkedId ?? null) : null,
  }
  list.unshift(created)
  saveAllUsers(list)
  return created
}

/**
 * Remove a linked user account when a Student or Teacher is deleted from their directory.
 */
export function removeLinkedUser({ role, linkedId, email }) {
  const emailLower = (email || '').trim().toLowerCase()
  const list = getAllUsers().filter((u) => {
    if (role === 'student' && linkedId && u.linkedStudentId === linkedId) return false
    if (role === 'teacher' && linkedId && u.linkedTeacherId === linkedId) return false
    if (emailLower && u.email?.toLowerCase() === emailLower && u.role === role) return false
    return true
  })
  saveAllUsers(list)
  return list
}

/**
 * Pulls live Students & Teachers from Laravel API and ensures every one of them
 * has a synchronized login account inside Users & Roles (preserving existing passwords).
 */
export function syncUsersWithDirectories({ students = [], teachers = [] }) {
  const list = getAllUsers()
  let nextId = list.length ? Math.max(...list.map((u) => Number(u.id) || 0)) + 1 : 1
  let changed = false

  students.forEach((stu) => {
    if (!stu?.name || !stu?.email) return
    const emailLower = stu.email.trim().toLowerCase()
    const dept = stu.school_class?.name || stu.course || 'Unassigned Class'
    const existing = list.find(
      (u) => (stu.id && u.linkedStudentId === stu.id) || u.email?.toLowerCase() === emailLower,
    )
    if (existing) {
      if (
        existing.name !== stu.name ||
        existing.email !== stu.email ||
        existing.department !== dept ||
        existing.linkedStudentId !== stu.id
      ) {
        existing.name = stu.name
        existing.email = stu.email
        existing.department = dept
        existing.avatar = deriveInitials(stu.name)
        existing.linkedStudentId = stu.id
        changed = true
      }
    } else {
      list.unshift({
        id: nextId++,
        name: stu.name,
        email: stu.email,
        password: 'student123',
        role: 'student',
        roleLabel: 'Student',
        department: dept,
        permissions: 'Student Permissions Matrix',
        status: 'Active',
        lastActive: 'Synced from Students',
        avatar: deriveInitials(stu.name),
        tone: 'emerald',
        linkedStudentId: stu.id,
        linkedTeacherId: null,
      })
      changed = true
    }
  })

  teachers.forEach((tch) => {
    if (!tch?.name) return
    const tchEmail = (tch.email || `${tch.name.toLowerCase().replace(/\s+/g, '.')}@school.edu`).trim()
    const emailLower = tchEmail.toLowerCase()
    const dept = tch.specialization || 'General Faculty'
    const existing = list.find(
      (u) => (tch.id && u.linkedTeacherId === tch.id) || u.email?.toLowerCase() === emailLower,
    )
    if (existing) {
      if (
        existing.name !== tch.name ||
        existing.email !== tchEmail ||
        existing.department !== dept ||
        existing.linkedTeacherId !== tch.id
      ) {
        existing.name = tch.name
        existing.email = tchEmail
        existing.department = dept
        existing.avatar = deriveInitials(tch.name)
        existing.linkedTeacherId = tch.id
        changed = true
      }
    } else {
      list.unshift({
        id: nextId++,
        name: tch.name,
        email: tchEmail,
        password: 'teacher123',
        role: 'teacher',
        roleLabel: 'Teacher',
        department: dept,
        permissions: 'Faculty Permissions Matrix',
        status: 'Active',
        lastActive: 'Synced from Teachers',
        avatar: deriveInitials(tch.name),
        tone: 'blue',
        linkedStudentId: null,
        linkedTeacherId: tch.id,
      })
      changed = true
    }
  })

  if (changed) {
    saveAllUsers(list)
  }
  return list
}

export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }
  return DEMO_ACCOUNTS.admin
}

export function setCurrentUser(user) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  sessionStorage.setItem(AUTH_KEY, 'true')
  window.dispatchEvent(new CustomEvent('sms-auth-changed', { detail: user }))
}

export function login(emailInput, passwordInput) {
  const email = (emailInput || '').trim().toLowerCase()
  const password = (passwordInput || '').trim()
  const accounts = getAllUsers()

  // Find account matching the email (regardless of password) so security alerts identify who was targeted
  const matchedByEmail = accounts.find((acc) => {
    return (
      acc.email.toLowerCase() === email ||
      (email === 'admin@gmail.com' && acc.email.toLowerCase() === 'admin@school.edu')
    )
  })

  // 1. Check if this email is already blocked
  const existingBlock = isEmailBlocked(email)
  if (existingBlock) {
    const status = recordFailedLoginAttempt({
      email,
      matchedAccount: matchedByEmail || null,
      reason: 'Blocked Email Retry',
    })
    return {
      success: false,
      blocked: true,
      attempts: MAX_LOGIN_ATTEMPTS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      remainingAttempts: 0,
      blockRecord: status.blockRecord,
      cooldownSeconds: status.cooldownSeconds,
      message:
        status.cooldownSeconds > 0
          ? `This email is temporarily locked due to 3 failed attempts. Try again in ${status.cooldownSeconds}s.`
          : 'This email address has been blocked after 3 failed login attempts. An alert has been sent to the System Administrator.',
    }
  }

  // 2. Check credentials
  if (matchedByEmail && matchedByEmail.password === password) {
    if (matchedByEmail.status === 'Suspended') {
      return {
        success: false,
        suspended: true,
        message: 'This account has been suspended by the Administrator. Please contact IT support.',
      }
    }
    clearFailedAttempts(email)
    recordSuccessfulLogin(matchedByEmail)
    setCurrentUser(matchedByEmail)
    return { success: true, user: matchedByEmail }
  }

  // 3. Failed login: increment counter, alert admin, and block on 3rd failure
  const failureReason = matchedByEmail ? 'Wrong Password' : 'Unregistered Email'
  const status = recordFailedLoginAttempt({
    email,
    matchedAccount: matchedByEmail || null,
    reason: failureReason,
  })

  if (status.isBlocked) {
    return {
      success: false,
      blocked: true,
      attempts: status.failedCount,
      maxAttempts: status.maxAttempts,
      remainingAttempts: 0,
      blockRecord: status.blockRecord,
      cooldownSeconds: status.cooldownSeconds,
      message:
        status.cooldownSeconds > 0
          ? `Maximum 3 login attempts reached. This Super Admin email is locked for ${status.cooldownSeconds}s and a security alert was logged.`
          : `Too many failed login attempts (3/3). "${email}" has been blocked and the System Administrator has been alerted.`,
    }
  }

  const left = status.remainingAttempts
  return {
    success: false,
    blocked: false,
    attempts: status.failedCount,
    maxAttempts: status.maxAttempts,
    remainingAttempts: left,
    message: `Invalid email or password. ${left} attempt${left === 1 ? '' : 's'} remaining before this email is blocked.`,
  }
}

export function switchRole(roleKey) {
  const accounts = getAllUsers()
  const found = accounts.find((u) => u.role === roleKey && u.status === 'Active')
  const account = found || DEMO_ACCOUNTS[roleKey]
  if (account) {
    setCurrentUser(account)
    return account
  }
  return getCurrentUser()
}

export function impersonateUser(user) {
  if (user) {
    setCurrentUser(user)
    return user
  }
  return getCurrentUser()
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY)
  sessionStorage.removeItem(USER_KEY)
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new CustomEvent('sms-auth-changed', { detail: null }))
}

export function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === 'true'
}

export function isAdmin() {
  const u = getCurrentUser()
  return u && u.role === 'admin'
}

export function isTeacher() {
  const u = getCurrentUser()
  return u && u.role === 'teacher'
}

export function isStudent() {
  const u = getCurrentUser()
  return u && u.role === 'student'
}

export function userCan(permissionKey) {
  const u = getCurrentUser()
  if (!u) return false
  return hasPermission(u.role, permissionKey)
}
