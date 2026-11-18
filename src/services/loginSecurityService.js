/**
 * loginSecurityService.js
 * Tracks failed login attempts per email, enforces a 3-attempt lockout policy,
 * blocks offending emails, and broadcasts real-time security alerts to Admins.
 */

import { recordAuditLog } from './auditLogService.js'

export const MAX_LOGIN_ATTEMPTS = 3
const SUPER_ADMIN_RECOVERY_EMAIL = 'admin@school.edu'
const SUPER_ADMIN_COOLDOWN_MS = 60 * 1000 // 60 seconds recovery safeguard for primary super admin only

const ATTEMPTS_KEY = 'sms_login_attempts_v1'
const BLOCKED_KEY = 'sms_blocked_emails_v1'
const ALERTS_KEY = 'sms_security_alerts_v1'
const LOGIN_HISTORY_KEY = 'sms_login_history_v1'

function normalizeEmail(email) {
  const clean = (email || '').trim().toLowerCase()
  if (clean === 'admin@gmail.com') return 'admin@school.edu'
  return clean
}

function detectDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Unknown Device'
  const ua = navigator.userAgent || ''
  let browser = 'Browser'
  if (ua.includes('Edg/')) browser = 'Microsoft Edge'
  else if (ua.includes('Chrome/')) browser = 'Google Chrome'
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari'

  let os = 'Unknown OS'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'

  return `${browser} on ${os}`
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore corrupted storage
  }
  return fallback
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function notifySecurityUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sms-security-alerts-updated'))
  }
}

export function getAttemptsMap() {
  const map = readJson(ATTEMPTS_KEY, {})
  return map && typeof map === 'object' ? map : {}
}

export function getBlockedEmails() {
  const list = readJson(BLOCKED_KEY, [])
  if (!Array.isArray(list)) return []

  const now = Date.now()
  let changed = false
  const filtered = list.filter((entry) => {
    if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= now) {
      changed = true
      return false
    }
    return true
  })

  if (changed) {
    writeJson(BLOCKED_KEY, filtered)
    // Also clean expired attempts for super admin recovery
    const map = getAttemptsMap()
    if (map[SUPER_ADMIN_RECOVERY_EMAIL]) {
      delete map[SUPER_ADMIN_RECOVERY_EMAIL]
      writeJson(ATTEMPTS_KEY, map)
    }
    notifySecurityUpdate()
  }

  return filtered
}

export function isEmailBlocked(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  const blocked = getBlockedEmails()
  return blocked.find((item) => item.email === normalized) || null
}

export function getLoginAttemptStatus(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return {
      email: '',
      isBlocked: false,
      failedCount: 0,
      remainingAttempts: MAX_LOGIN_ATTEMPTS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      blockRecord: null,
      cooldownSeconds: 0,
    }
  }

  const blockRecord = isEmailBlocked(normalized)
  if (blockRecord) {
    const cooldownSeconds = blockRecord.expiresAt
      ? Math.max(0, Math.ceil((new Date(blockRecord.expiresAt).getTime() - Date.now()) / 1000))
      : 0
    return {
      email: normalized,
      isBlocked: true,
      failedCount: MAX_LOGIN_ATTEMPTS,
      remainingAttempts: 0,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      blockRecord,
      cooldownSeconds,
    }
  }

  const map = getAttemptsMap()
  const entry = map[normalized]
  const failedCount = entry ? Number(entry.count) || 0 : 0
  return {
    email: normalized,
    isBlocked: false,
    failedCount,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - failedCount),
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    blockRecord: null,
    cooldownSeconds: 0,
  }
}

export function getSecurityAlerts() {
  const list = readJson(ALERTS_KEY, [])
  return Array.isArray(list) ? list : []
}

export function getLoginHistory() {
  const list = readJson(LOGIN_HISTORY_KEY, [])
  return Array.isArray(list) ? list : []
}

function appendLoginHistory(entry) {
  const list = getLoginHistory()
  const record = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    deviceLabel: detectDeviceLabel(),
    ...entry,
  }
  list.unshift(record)
  writeJson(LOGIN_HISTORY_KEY, list.slice(0, 200))
  notifySecurityUpdate()
  return record
}

export function recordSuccessfulLogin(user) {
  if (!user) return null
  return appendLoginHistory({
    name: user.name || 'User',
    email: normalizeEmail(user.email),
    role: user.role || 'student',
    roleLabel: user.roleLabel || 'User',
    avatar: user.avatar || 'US',
    status: 'Success',
    reason: 'Authenticated',
    attempts: 1,
    maxAttempts: MAX_LOGIN_ATTEMPTS,
  })
}

export function clearLoginHistory() {
  writeJson(LOGIN_HISTORY_KEY, [])
  notifySecurityUpdate()
}

export function getUnreadSecurityAlertsCount() {
  return getSecurityAlerts().filter((a) => a.unread && !a.resolved).length
}

function addSecurityAlert(alert) {
  const list = getSecurityAlerts()
  const nextId = Date.now() + Math.floor(Math.random() * 1000)
  const record = {
    id: nextId,
    unread: true,
    resolved: false,
    timestamp: new Date().toISOString(),
    deviceLabel: detectDeviceLabel(),
    ...alert,
  }
  list.unshift(record)
  // Keep latest 100 security alerts
  writeJson(ALERTS_KEY, list.slice(0, 100))
  notifySecurityUpdate()
  return record
}

/**
 * Records a failed login attempt for an email.
 * Blocks the email on the 3rd consecutive failure and alerts the System Administrator.
 */
export function recordFailedLoginAttempt({ email, matchedAccount = null, reason = 'Invalid credentials' }) {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return {
      isBlocked: false,
      failedCount: 0,
      remainingAttempts: MAX_LOGIN_ATTEMPTS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      blockRecord: null,
      cooldownSeconds: 0,
    }
  }

  const deviceLabel = detectDeviceLabel()
  const nowIso = new Date().toISOString()
  const accountName = matchedAccount?.name || 'Unregistered / Unknown User'
  const accountRole = matchedAccount?.roleLabel || 'Unknown Account'

  // If already blocked, log another blocked intrusion probe alert for the admin
  const existingBlock = isEmailBlocked(normalized)
  if (existingBlock) {
    const blockedList = getBlockedEmails().map((b) =>
      b.email === normalized
        ? { ...b, extraAttemptsAfterBlock: (b.extraAttemptsAfterBlock || 0) + 1, lastAttemptAt: nowIso }
        : b,
    )
    writeJson(BLOCKED_KEY, blockedList)

    addSecurityAlert({
      type: 'blocked_access_probe',
      severity: 'critical',
      title: `Blocked Email Attempted Access`,
      message: `Blocked email "${normalized}" (${accountName}) tried to sign in again from ${deviceLabel}. Access was automatically denied.`,
      email: normalized,
      accountName,
      accountRole,
      reason: 'Blocked Email Retry',
      attempts: MAX_LOGIN_ATTEMPTS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      deviceLabel,
    })

    appendLoginHistory({
      name: accountName,
      email: normalized,
      role: matchedAccount?.role || 'unknown',
      roleLabel: accountRole,
      avatar: matchedAccount?.avatar || '??',
      status: 'Blocked',
      reason: 'Blocked Email Retry',
      attempts: MAX_LOGIN_ATTEMPTS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      deviceLabel,
    })

    recordAuditLog({
      user_name: accountName,
      user_email: normalized,
      role: accountRole,
      action: `Blocked email "${normalized}" attempted sign-in again and was denied (${deviceLabel})`,
      category: 'Security',
      resource: 'Login Security Shield',
      ip_address: 'Portal Client',
      status: 'Warning',
    })

    const cooldownSeconds = existingBlock.expiresAt
      ? Math.max(0, Math.ceil((new Date(existingBlock.expiresAt).getTime() - Date.now()) / 1000))
      : 0

    return {
      isBlocked: true,
      failedCount: MAX_LOGIN_ATTEMPTS,
      remainingAttempts: 0,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      blockRecord: existingBlock,
      cooldownSeconds,
    }
  }

  const map = getAttemptsMap()
  const prevCount = Number(map[normalized]?.count) || 0
  const failedCount = prevCount + 1
  const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - failedCount)

  map[normalized] = {
    email: normalized,
    count: failedCount,
    lastAttemptAt: nowIso,
    lastReason: reason,
    accountName,
    accountRole,
    deviceLabel,
  }
  writeJson(ATTEMPTS_KEY, map)

  if (failedCount >= MAX_LOGIN_ATTEMPTS) {
    const isSuperAdminRecovery = normalized === SUPER_ADMIN_RECOVERY_EMAIL
    const blockRecord = {
      email: normalized,
      accountName,
      accountRole,
      reason,
      attempts: failedCount,
      blockedAt: nowIso,
      lastAttemptAt: nowIso,
      deviceLabel,
      extraAttemptsAfterBlock: 0,
      status: 'Blocked',
      // Only primary Super Admin has a 60s recovery cooldown so the admin can never permanently lock out the whole app
      expiresAt: isSuperAdminRecovery ? new Date(Date.now() + SUPER_ADMIN_COOLDOWN_MS).toISOString() : null,
    }

    const blocked = getBlockedEmails().filter((b) => b.email !== normalized)
    blocked.unshift(blockRecord)
    writeJson(BLOCKED_KEY, blocked)

    addSecurityAlert({
      type: 'email_blocked',
      severity: 'critical',
      title: `Email Blocked After 3 Failed Logins`,
      message: `"${normalized}" (${accountName} • ${accountRole}) failed sign-in 3/3 times (${reason}) from ${deviceLabel}. This email is now blocked.`,
      email: normalized,
      accountName,
      accountRole,
      reason,
      attempts: failedCount,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      deviceLabel,
    })

    appendLoginHistory({
      name: accountName,
      email: normalized,
      role: matchedAccount?.role || 'unknown',
      roleLabel: accountRole,
      avatar: matchedAccount?.avatar || '??',
      status: 'Blocked',
      reason,
      attempts: failedCount,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      deviceLabel,
    })

    recordAuditLog({
      user_name: accountName,
      user_email: normalized,
      role: accountRole,
      action: `BLOCKED EMAIL: "${normalized}" locked after 3 failed login attempts (${reason}) on ${deviceLabel}`,
      category: 'Security',
      resource: 'Authentication Guard',
      ip_address: 'Portal Client',
      status: 'Warning',
    })

    return {
      isBlocked: true,
      failedCount,
      remainingAttempts: 0,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      blockRecord,
      cooldownSeconds: isSuperAdminRecovery ? Math.ceil(SUPER_ADMIN_COOLDOWN_MS / 1000) : 0,
    }
  }

  // Record warning alert for attempts 1 and 2 so Admin sees who is trying to access the system
  addSecurityAlert({
    type: 'failed_attempt',
    severity: 'warning',
    title: `Failed Login Attempt (${failedCount}/${MAX_LOGIN_ATTEMPTS})`,
    message: `"${normalized}" (${accountName}) entered ${reason.toLowerCase()} from ${deviceLabel}. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} left before lock.`,
    email: normalized,
    accountName,
    accountRole,
    reason,
    attempts: failedCount,
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    deviceLabel,
  })

  appendLoginHistory({
    name: accountName,
    email: normalized,
    role: matchedAccount?.role || 'unknown',
    roleLabel: accountRole,
    avatar: matchedAccount?.avatar || '??',
    status: 'Failed',
    reason,
    attempts: failedCount,
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    deviceLabel,
  })

  recordAuditLog({
    user_name: accountName,
    user_email: normalized,
    role: accountRole,
    action: `Failed login attempt ${failedCount}/${MAX_LOGIN_ATTEMPTS} for "${normalized}" (${reason}) on ${deviceLabel}`,
    category: 'Security',
    resource: 'Authentication Endpoint',
    ip_address: 'Portal Client',
    status: 'Warning',
  })

  return {
    isBlocked: false,
    failedCount,
    remainingAttempts,
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    blockRecord: null,
    cooldownSeconds: 0,
  }
}

export function clearFailedAttempts(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return
  const map = getAttemptsMap()
  if (map[normalized]) {
    delete map[normalized]
    writeJson(ATTEMPTS_KEY, map)
  }
}

export function unblockEmail(email, adminName = 'Administrator') {
  const normalized = normalizeEmail(email)
  if (!normalized) return false

  const blocked = getBlockedEmails().filter((b) => b.email !== normalized)
  writeJson(BLOCKED_KEY, blocked)

  clearFailedAttempts(normalized)

  // Mark matching alerts as resolved
  const alerts = getSecurityAlerts().map((a) =>
    a.email === normalized ? { ...a, unread: false, resolved: true, resolvedAt: new Date().toISOString() } : a,
  )
  writeJson(ALERTS_KEY, alerts)

  recordAuditLog({
    user_name: adminName,
    user_email: 'admin@school.edu',
    role: 'Administrator',
    action: `Unblocked email "${normalized}" and reset failed login counter`,
    category: 'Security',
    resource: 'Login Security Shield',
    ip_address: 'Admin Console',
    status: 'Success',
  })

  notifySecurityUpdate()
  return true
}

export function unblockAllEmails(adminName = 'Administrator') {
  const blocked = getBlockedEmails()
  if (!blocked.length) return 0

  writeJson(BLOCKED_KEY, [])
  writeJson(ATTEMPTS_KEY, {})

  const alerts = getSecurityAlerts().map((a) => ({
    ...a,
    unread: false,
    resolved: true,
    resolvedAt: a.resolvedAt || new Date().toISOString(),
  }))
  writeJson(ALERTS_KEY, alerts)

  recordAuditLog({
    user_name: adminName,
    user_email: 'admin@school.edu',
    role: 'Administrator',
    action: `Unblocked all ${blocked.length} locked email addresses from Login Security Shield`,
    category: 'Security',
    resource: 'Login Security Shield',
    ip_address: 'Admin Console',
    status: 'Success',
  })

  notifySecurityUpdate()
  return blocked.length
}

export function markSecurityAlertRead(id) {
  const alerts = getSecurityAlerts().map((a) => (a.id === id ? { ...a, unread: false } : a))
  writeJson(ALERTS_KEY, alerts)
  notifySecurityUpdate()
}

export function markAllSecurityAlertsRead() {
  const alerts = getSecurityAlerts().map((a) => ({ ...a, unread: false }))
  writeJson(ALERTS_KEY, alerts)
  notifySecurityUpdate()
}

export function dismissSecurityAlert(id) {
  const alerts = getSecurityAlerts().filter((a) => a.id !== id)
  writeJson(ALERTS_KEY, alerts)
  notifySecurityUpdate()
}

export function clearResolvedSecurityAlerts() {
  const alerts = getSecurityAlerts().filter((a) => !a.resolved)
  writeJson(ALERTS_KEY, alerts)
  notifySecurityUpdate()
}

export function formatRelativeTime(isoString) {
  if (!isoString) return 'Just now'
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000))
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}
