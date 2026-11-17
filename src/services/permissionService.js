/**
 * permissionService.js
 * Role-Based Access Control (RBAC) & Feature Permission Engine.
 * Allows administrators to dynamically control feature access for Teachers and Students.
 */

const STORAGE_KEY = 'sms_role_permissions'

export const DEFAULT_PERMISSIONS = {
  teacher: {
    manage_attendance: {
      key: 'manage_attendance',
      label: 'Take & Edit Daily Attendance Roll Call',
      description: 'Allows teachers to mark present, absent, late, and update daily student check-ins.',
      enabled: true,
      category: 'Tracking',
    },
    manage_scores: {
      key: 'manage_scores',
      label: 'Enter & Modify Exam Marks & Gradebook',
      description: 'Allows teachers to submit exam grades, adjust quiz scores, and add academic remarks.',
      enabled: true,
      category: 'Academics',
    },
    export_reports: {
      key: 'export_reports',
      label: 'Generate & Export Academic Reports (Excel/PDF)',
      description: 'Permits teachers to export section performance spreadsheets and printable grade summaries.',
      enabled: true,
      category: 'Academics',
    },
    view_students: {
      key: 'view_students',
      label: 'View Student Body Directory',
      description: 'Allows teachers to search and view student rosters and guardian contact numbers.',
      enabled: true,
      category: 'Records',
    },
    edit_students: {
      key: 'edit_students',
      label: 'Edit Student Profiles & Enrollment',
      description: 'Allows teachers to modify student information and class assignments.',
      enabled: false,
      category: 'Records',
    },
    view_classes: {
      key: 'view_classes',
      label: 'Access Class Sections & Timetables',
      description: 'Allows teachers to view room assignments, capacity, and section calendars.',
      enabled: true,
      category: 'Academic',
    },
  },
  student: {
    view_grades: {
      key: 'view_grades',
      label: 'View Real-time Grades & Assessment Scores',
      description: 'Permits students to view their course marks, letter grades, and GPA calculations.',
      enabled: true,
      category: 'Academics',
    },
    download_report_card: {
      key: 'download_report_card',
      label: 'Download & Print Official Report Cards',
      description: 'Allows students to generate and print authenticated PDF transcripts and report cards.',
      enabled: true,
      category: 'Academics',
    },
    view_attendance: {
      key: 'view_attendance',
      label: 'View Personal Attendance History',
      description: 'Allows students to review their check-in record, tardy counts, and attendance rate.',
      enabled: true,
      category: 'Tracking',
    },
    view_curriculum: {
      key: 'view_curriculum',
      label: 'Access Course Syllabus & Materials',
      description: 'Permits students to explore enrolled subject outlines, credits, and teacher notes.',
      enabled: true,
      category: 'Academic',
    },
    request_review: {
      key: 'request_review',
      label: 'Submit Grade Review & Inquiry Requests',
      description: 'Allows students to formally request exam grade recalculations from their teacher.',
      enabled: false,
      category: 'Academics',
    },
  },
}

export function getRolePermissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        teacher: { ...DEFAULT_PERMISSIONS.teacher, ...(parsed.teacher || {}) },
        student: { ...DEFAULT_PERMISSIONS.student, ...(parsed.student || {}) },
      }
    }
  } catch {
    // fallback
  }
  return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
}

export function saveRolePermissions(permissions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions))
  window.dispatchEvent(new CustomEvent('sms-permissions-updated', { detail: permissions }))
}

export function togglePermission(role, permissionKey) {
  const current = getRolePermissions()
  if (current[role] && current[role][permissionKey]) {
    current[role][permissionKey].enabled = !current[role][permissionKey].enabled
    saveRolePermissions(current)
    return current[role][permissionKey].enabled
  }
  return false
}

export function setPermission(role, permissionKey, isEnabled) {
  const current = getRolePermissions()
  if (current[role] && current[role][permissionKey]) {
    current[role][permissionKey].enabled = Boolean(isEnabled)
    saveRolePermissions(current)
  }
}

export function hasPermission(role, permissionKey) {
  if (role === 'admin' || role === 'super_admin') return true
  const permissions = getRolePermissions()
  const roleGroup = permissions[role]
  if (!roleGroup) return false
  const perm = roleGroup[permissionKey]
  return perm ? Boolean(perm.enabled) : false
}

export function resetPermissionsToDefault() {
  saveRolePermissions(DEFAULT_PERMISSIONS)
  return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
}
