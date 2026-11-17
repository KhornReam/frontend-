/**
 * authService.js
 * Centralized Authentication & User Identity Management.
 * Supports Admin, Teacher, and Student profiles with instant role switching.
 */

import { hasPermission } from './permissionService.js'

const AUTH_KEY = 'dashboard-authenticated'
const USER_KEY = 'sms_current_user'

export const DEMO_ACCOUNTS = {
  admin: {
    id: 1,
    name: 'Dr. Alexander Vance',
    email: 'admin@school.edu',
    role: 'admin',
    roleLabel: 'Super Administrator',
    department: 'Executive Leadership',
    avatar: 'AD',
    badgeTone: 'purple',
    password: 'admin123',
    campusCode: 'GW-8821',
  },
  teacher: {
    id: 3,
    name: 'Maya Patel',
    email: 'teacher@school.edu',
    role: 'teacher',
    roleLabel: 'Teacher (Grade 10 Lead)',
    department: 'Mathematics & Science Dept.',
    avatar: 'MP',
    badgeTone: 'blue',
    password: 'teacher123',
    assignedClass: 'Grade 10 - A',
    campusCode: 'GW-8821',
  },
  student: {
    id: 101,
    name: 'Olivia Martin',
    email: 'student@school.edu',
    role: 'student',
    roleLabel: 'Student (Honor Roll)',
    department: 'Grade 10 - Class A',
    avatar: 'OM',
    badgeTone: 'emerald',
    password: 'student123',
    studentId: 'STU-2026-1284',
    campusCode: 'GW-8821',
  },
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

  // Match demo accounts
  for (const account of Object.values(DEMO_ACCOUNTS)) {
    if (
      (account.email.toLowerCase() === email || (email === 'admin@gmail.com' && account.role === 'admin')) &&
      (account.password === password || password === 'admin123')
    ) {
      setCurrentUser(account)
      return { success: true, user: account }
    }
  }

  return {
    success: false,
    message: 'Invalid credentials. Please use demo credentials: admin@school.edu, teacher@school.edu, or student@school.edu',
  }
}

export function switchRole(roleKey) {
  const account = DEMO_ACCOUNTS[roleKey]
  if (account) {
    setCurrentUser(account)
    return account
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
