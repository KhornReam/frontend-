import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
  timeout: 4000,
})

const STORAGE_KEY = 'sms_audit_logs_data'

const DEFAULT_AUDIT_LOGS = [
  {
    id: 1,
    user_name: 'Dr. Alexander Vance',
    user_email: 'admin@school.edu',
    role: 'Super Administrator',
    action: 'Approved Term 2 Gradebook Weighting & GPA Scale',
    category: 'Academic',
    resource: 'Grading Scheme (GPA 4.0)',
    ip_address: '192.168.1.10',
    status: 'Success',
    created_at: '2026-11-06T10:45:00Z',
  },
  {
    id: 2,
    user_name: 'Jordan Lee',
    user_email: 'jordan.lee@school.edu',
    role: 'Administrator',
    action: 'Recorded Daily Attendance Roll Call for Grade 10 - A (36 students)',
    category: 'Attendance',
    resource: 'Grade 10 - A',
    ip_address: '192.168.1.24',
    status: 'Success',
    created_at: '2026-11-06T08:15:00Z',
  },
  {
    id: 3,
    user_name: 'System Daemon',
    user_email: 'system@school.internal',
    role: 'Automated Service',
    action: 'Dispatched 18 Parent SMS & Email Absentee Alerts',
    category: 'Automation',
    resource: 'SMS Gateway #TW-401',
    ip_address: '127.0.0.1',
    status: 'Success',
    created_at: '2026-11-06T08:30:00Z',
  },
  {
    id: 4,
    user_name: 'Dr. Alexander Vance',
    user_email: 'admin@school.edu',
    role: 'Super Administrator',
    action: 'Modified institutional security policy: Enforce 2FA for all faculty',
    category: 'Security',
    resource: 'Security & 2FA Config',
    ip_address: '192.168.1.10',
    status: 'Success',
    created_at: '2026-11-05T14:20:00Z',
  },
  {
    id: 5,
    user_name: 'Maya Patel',
    user_email: 'maya.patel@school.edu',
    role: 'Teacher',
    action: 'Submitted Midterm Examination Marks for Grade 10 - A Mathematics',
    category: 'Academic',
    resource: 'MAT-101 Midterm',
    ip_address: '192.168.1.55',
    status: 'Success',
    created_at: '2026-11-05T11:10:00Z',
  },
  {
    id: 6,
    user_name: 'Jordan Lee',
    user_email: 'jordan.lee@school.edu',
    role: 'Administrator',
    action: 'Exported Institutional Academic Ranking & GPA Report to Excel',
    category: 'Export',
    resource: 'Report: Academic_Rankings_2026.xls',
    ip_address: '192.168.1.24',
    status: 'Success',
    created_at: '2026-11-04T16:05:00Z',
  },
  {
    id: 7,
    user_name: 'Security Guard System',
    user_email: 'auth@school.internal',
    role: 'Security Watchdog',
    action: 'Failed sign-in attempt detected from unrecognized external IP',
    category: 'Security',
    resource: 'Authentication Endpoint',
    ip_address: '203.0.113.88',
    status: 'Warning',
    created_at: '2026-11-04T02:18:00Z',
  },
  {
    id: 8,
    user_name: 'Dr. Alexander Vance',
    user_email: 'admin@school.edu',
    role: 'Super Administrator',
    action: 'Created course subject Advanced Chemistry (CHEM-301) for Grade 11',
    category: 'Academic',
    resource: 'Curriculum Catalog',
    ip_address: '192.168.1.10',
    status: 'Success',
    created_at: '2026-11-03T09:40:00Z',
  },
]

function getLocalLogs() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_AUDIT_LOGS))
  return DEFAULT_AUDIT_LOGS
}

function saveLocalLogs(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
}

export async function getAuditLogs(params = {}) {
  try {
    const response = await api.get('/audit-logs', { params })
    const list = response.data.data ?? response.data
    if (Array.isArray(list) && list.length > 0) {
      saveLocalLogs(list)
      return { data: list, fromApi: true }
    }
    return { data: filterLocal(params), fromApi: false }
  } catch {
    return { data: filterLocal(params), fromApi: false }
  }
}

function filterLocal(params = {}) {
  let list = getLocalLogs()

  if (params.category && params.category !== 'all') {
    list = list.filter((l) => l.category?.toLowerCase() === params.category.toLowerCase())
  }

  if (params.status && params.status !== 'all') {
    list = list.filter((l) => l.status?.toLowerCase() === params.status.toLowerCase())
  }

  if (params.search) {
    const q = params.search.toLowerCase()
    list = list.filter(
      (l) =>
        l.action?.toLowerCase().includes(q) ||
        l.user_name?.toLowerCase().includes(q) ||
        l.resource?.toLowerCase().includes(q) ||
        l.ip_address?.toLowerCase().includes(q),
    )
  }

  return list
}

export async function recordAuditLog(entry) {
  const enriched = {
    user_name: entry.user_name || 'Dr. Alexander Vance',
    user_email: entry.user_email || 'admin@school.edu',
    role: entry.role || 'Super Administrator',
    action: entry.action,
    category: entry.category || 'General',
    resource: entry.resource || null,
    ip_address: entry.ip_address || '192.168.1.10',
    status: entry.status || 'Success',
    created_at: new Date().toISOString(),
  }

  try {
    const response = await api.post('/audit-logs', enriched)
    const newLog = response.data.data ?? response.data
    const local = getLocalLogs()
    local.unshift(newLog)
    saveLocalLogs(local)
    return response
  } catch {
    const local = getLocalLogs()
    const nextId = local.length ? Math.max(...local.map((l) => Number(l.id) || 0)) + 1 : 1
    const newLog = { ...enriched, id: nextId }
    local.unshift(newLog)
    saveLocalLogs(local)
    return { data: newLog }
  }
}

export async function deleteAuditLog(id) {
  try {
    await api.delete(`/audit-logs/${id}`)
  } catch {
    // continue locally
  }
  const local = getLocalLogs()
  saveLocalLogs(local.filter((l) => l.id !== id))
}

export async function clearAuditLogs(days = 0) {
  try {
    await api.post('/audit-logs/clear', { days })
  } catch {
    // continue locally
  }
  let local = getLocalLogs()
  if (days > 0) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    local = local.filter((l) => l.created_at >= cutoff)
  } else {
    local = []
  }
  saveLocalLogs(local)
}
