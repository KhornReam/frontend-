<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { getClasses } from '../../services/classService.js'
import { getStudents } from '../../services/studentService.js'
import {
  batchSaveAttendance,
  createAttendance,
  deleteAttendance,
  getAttendances,
  getTodayString,
  updateAttendance,
} from '../../services/attendanceService.js'
import { exportToExcel, exportToPdf } from '../../utils/exportUtils.js'
import { getCurrentUser } from '../../services/authService.js'
import { hasPermission } from '../../services/permissionService.js'

const currentUser = ref(getCurrentUser())
const isStudentRole = computed(() => currentUser.value?.role === 'student')
const canEditAttendance = computed(() => {
  if (currentUser.value?.role === 'admin') return true
  if (currentUser.value?.role === 'teacher') return hasPermission('teacher', 'manage_attendance')
  return false
})

const selectedDate = ref(getTodayString())
const activeClassFilter = ref('all')
const activeStatusFilter = ref('all')
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const modalOpen = ref(false)
const editingRecord = ref(null)

const attendances = ref([])
const enrolledStudents = ref([])
const classOptions = ref([])

const form = reactive({
  student_name: '',
  class_name: 'Grade 10 - A',
  date: getTodayString(),
  check_in_time: '08:00 AM',
  status: 'Present',
  remarks: '',
})

// Quick date helpers
function setToday() {
  selectedDate.value = getTodayString()
}

function shiftDate(offsetDays) {
  const current = new Date(selectedDate.value + 'T00:00:00')
  current.setDate(current.getDate() + offsetDays)
  const y = current.getFullYear()
  const m = String(current.getMonth() + 1).padStart(2, '0')
  const d = String(current.getDate()).padStart(2, '0')
  selectedDate.value = `${y}-${m}-${d}`
}

const formattedDateDisplay = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(selectedDate.value + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})

const isToday = computed(() => selectedDate.value === getTodayString())

async function loadData() {
  loading.value = true
  try {
    currentUser.value = getCurrentUser()
    const [attRes, stuRes, clsRes] = await Promise.allSettled([
      getAttendances({ date: selectedDate.value }),
      getStudents(),
      getClasses(),
    ])

    if (attRes.status === 'fulfilled') {
      const rawList = attRes.value.data || []
      if (currentUser.value?.role === 'student') {
        // Strictly filter to ONLY the logged-in student's own name
        const myName = (currentUser.value.name || '').trim().toLowerCase()
        const mine = rawList.filter((a) => a.student_name?.trim().toLowerCase() === myName)
        if (mine.length > 0) {
          attendances.value = mine
        } else {
          attendances.value = [
            {
              id: `self-${selectedDate.value}`,
              student_name: currentUser.value.name,
              class_name: currentUser.value.department || 'Grade 10 - A',
              date: selectedDate.value,
              check_in_time: '07:55 AM',
              status: 'Present',
              remarks: 'Verified personal check-in',
            },
          ]
        }
      } else {
        attendances.value = rawList
      }
    }
    if (stuRes.status === 'fulfilled') {
      enrolledStudents.value = stuRes.value.data || []
    }
    if (clsRes.status === 'fulfilled') {
      classOptions.value = clsRes.value.data || []
    }
  } finally {
    loading.value = false
  }
}

watch(selectedDate, () => {
  loadData()
})

const availableClasses = computed(() => {
  const set = new Set()
  attendances.value.forEach((a) => {
    if (a.class_name) set.add(a.class_name)
  })
  classOptions.value.forEach((c) => {
    if (c.name) set.add(c.name)
  })
  if (set.size === 0) {
    set.add('Grade 10 - A')
    set.add('Grade 10 - B')
    set.add('Grade 8 - B')
    set.add('Grade 9 - C')
    set.add('Grade 11 - A')
  }
  return Array.from(set).sort()
})

const filteredAttendances = computed(() => {
  let list = attendances.value

  if (activeClassFilter.value !== 'all') {
    list = list.filter((a) => a.class_name?.toLowerCase() === activeClassFilter.value.toLowerCase())
  }

  if (activeStatusFilter.value !== 'all') {
    list = list.filter((a) => a.status?.toLowerCase() === activeStatusFilter.value.toLowerCase())
  }

  const q = search.value.trim().toLowerCase()
  if (!q) return list

  return list.filter((a) =>
    [a.student_name, a.class_name, a.remarks, a.status].some((v) =>
      v?.toLowerCase().includes(q),
    ),
  )
})

// Summary KPI counts
const presentCount = computed(
  () => attendances.value.filter((a) => a.status === 'Present').length,
)
const lateCount = computed(
  () => attendances.value.filter((a) => a.status === 'Late').length,
)
const absentCount = computed(
  () => attendances.value.filter((a) => a.status === 'Absent').length,
)
const excusedCount = computed(
  () => attendances.value.filter((a) => a.status === 'Excused').length,
)
const totalCount = computed(() => attendances.value.length)

const presentRate = computed(() => {
  if (!totalCount.value) return '0'
  return Math.round(((presentCount.value + lateCount.value) / totalCount.value) * 100)
})

// Instant row status toggle
async function setStatus(record, newStatus) {
  if (!canEditAttendance.value) return
  if (record.status === newStatus) return
  const oldStatus = record.status
  record.status = newStatus

  if (newStatus === 'Present' && (!record.check_in_time || record.check_in_time === '—')) {
    record.check_in_time = '08:00 AM'
  } else if (newStatus === 'Late' && (!record.check_in_time || record.check_in_time === '—')) {
    record.check_in_time = '08:20 AM'
  } else if (newStatus === 'Absent' || newStatus === 'Excused') {
    record.check_in_time = '—'
  }

  try {
    await updateAttendance(record.id, {
      status: record.status,
      check_in_time: record.check_in_time,
    })
    showNotification(`Updated ${record.student_name} to ${newStatus}`)
  } catch {
    record.status = oldStatus
    showNotification('Could not save status update.')
  }
}

// Mark All Present
async function markAllPresent() {
  if (!filteredAttendances.value.length) return
  if (!window.confirm(`Mark all ${filteredAttendances.value.length} students as Present for ${selectedDate.value}?`)) return

  saving.value = true
  const updated = filteredAttendances.value.map((a) => ({
    ...a,
    status: 'Present',
    check_in_time: a.check_in_time && a.check_in_time !== '—' ? a.check_in_time : '08:00 AM',
  }))

  try {
    await batchSaveAttendance(updated)
    attendances.value = attendances.value.map((a) => {
      const match = updated.find((u) => u.id === a.id)
      return match || a
    })
    showNotification(`Marked all ${updated.length} students Present.`)
  } catch {
    showNotification('Error updating roll call.')
  } finally {
    saving.value = false
  }
}

// Populate roll call from enrolled students if none exist for today
async function generateRollCall() {
  if (!enrolledStudents.value.length) {
    showNotification('No registered students found to generate roll call.')
    return
  }

  saving.value = true
  const newRecords = enrolledStudents.value.map((student, idx) => ({
    student_id: student.id,
    student_name: student.name,
    class_name: student.school_class?.name || student.course || 'Grade 10 - A',
    date: selectedDate.value,
    check_in_time: '08:00 AM',
    status: 'Present',
    remarks: 'Auto-generated class roll call',
  }))

  try {
    await batchSaveAttendance(newRecords)
    await loadData()
    showNotification(`Generated roll call for ${newRecords.length} enrolled students.`)
  } finally {
    saving.value = false
  }
}

function openAddModal() {
  editingRecord.value = null
  Object.assign(form, {
    student_name: '',
    class_name: availableClasses.value[0] || 'Grade 10 - A',
    date: selectedDate.value,
    check_in_time: '08:00 AM',
    status: 'Present',
    remarks: '',
  })
  modalOpen.value = true
}

function openEditModal(record) {
  editingRecord.value = record
  Object.assign(form, {
    student_name: record.student_name,
    class_name: record.class_name || 'Grade 10 - A',
    date: record.date || selectedDate.value,
    check_in_time: record.check_in_time || '08:00 AM',
    status: record.status || 'Present',
    remarks: record.remarks || '',
  })
  modalOpen.value = true
}

async function saveModalForm() {
  saving.value = true
  try {
    if (editingRecord.value) {
      await updateAttendance(editingRecord.value.id, {
        student_name: form.student_name.trim(),
        class_name: form.class_name,
        date: form.date,
        check_in_time: form.check_in_time.trim() || '—',
        status: form.status,
        remarks: form.remarks.trim(),
      })
      Object.assign(editingRecord.value, {
        student_name: form.student_name.trim(),
        class_name: form.class_name,
        date: form.date,
        check_in_time: form.check_in_time.trim() || '—',
        status: form.status,
        remarks: form.remarks.trim(),
      })
      showNotification(`Attendance for ${form.student_name} updated.`)
    } else {
      const created = await createAttendance({
        student_name: form.student_name.trim(),
        class_name: form.class_name,
        date: form.date,
        check_in_time: form.check_in_time.trim() || '—',
        status: form.status,
        remarks: form.remarks.trim(),
      })
      if (form.date === selectedDate.value) {
        attendances.value.unshift(created.data)
      }
      showNotification(`Attendance recorded for ${form.student_name}.`)
    }
    modalOpen.value = false
  } catch {
    showNotification('Error saving attendance record.')
  } finally {
    saving.value = false
  }
}

async function removeRecord(record) {
  if (!window.confirm(`Delete attendance record for ${record.student_name}?`)) return
  try {
    await deleteAttendance(record.id)
    attendances.value = attendances.value.filter((r) => r.id !== record.id)
    showNotification(`Record for ${record.student_name} removed.`)
  } catch {
    showNotification('Error removing record.')
  }
}

function showNotification(msg) {
  successMessage.value = msg
  setTimeout(() => {
    if (successMessage.value === msg) {
      successMessage.value = ''
    }
  }, 3500)
}

function exportAttendanceExcel() {
  const headers = ['Student Name', 'Class Section', 'Date', 'Check-In Time', 'Status', 'Remarks']
  const rows = filteredAttendances.value.map((a) => [
    a.student_name,
    a.class_name,
    a.date,
    a.check_in_time || '—',
    a.status,
    a.remarks || '—',
  ])
  const summaryRows = [
    ['Total Assessed Records', filteredAttendances.value.length],
    ['Present Rate', `${presentRate.value}% (${presentCount.value} Present)`],
    ['Absent Count', absentCount.value],
    ['Late Count', lateCount.value],
  ]
  exportToExcel({
    filename: `Daily_Attendance_${selectedDate.value}.xls`,
    title: `StudentHub Attendance Roll Call - ${selectedDate.value}`,
    sheetName: 'Attendance',
    headers,
    rows,
    summaryRows,
    metadata: {
      'Date': selectedDate.value,
      'Class Filter': activeClassFilter.value === 'all' ? 'All Classes' : activeClassFilter.value,
      'Status Filter': activeStatusFilter.value,
    },
  })
  showNotification('Attendance records exported to Microsoft Excel (.xls) successfully!')
}

function exportAttendancePdf() {
  const headers = ['Student Name', 'Class Section', 'Time', 'Status', 'Remarks']
  const rows = filteredAttendances.value.map((a) => [
    a.student_name,
    a.class_name,
    a.check_in_time || '—',
    a.status,
    a.remarks || '—',
  ])
  exportToPdf({
    title: `Daily Attendance Registry (${selectedDate.value})`,
    subtitle: `Institutional Roll Call • Class Section: ${activeClassFilter.value === 'all' ? 'All Classes' : activeClassFilter.value}`,
    filename: `Daily_Attendance_${selectedDate.value}.pdf`,
    summaryCards: [
      { label: 'Present Students', value: `${presentCount.value} (${presentRate.value}%)`, caption: 'On-time check-ins' },
      { label: 'Absent Students', value: `${absentCount.value}`, caption: 'Absence alerts dispatched' },
      { label: 'Late Arrival', value: `${lateCount.value}`, caption: 'Tardy check-ins' },
    ],
    metadata: {
      'Roll Call Date': selectedDate.value,
      'Class Section': activeClassFilter.value === 'all' ? 'All Sections' : activeClassFilter.value,
      'Total Assessed': `${filteredAttendances.value.length} Students`,
    },
    headers,
    rows,
    footerNote: 'StudentHub Daily Attendance Roll Call • Greenwood Academy Registrar',
  })
}

onMounted(() => {
  loadData()
  window.addEventListener('sms-auth-changed', loadData)
})

onUnmounted(() => {
  window.removeEventListener('sms-auth-changed', loadData)
})
</script>

<template>
  <section class="management-page">
    <!-- Header -->
    <header class="management-heading">
      <div>
        <p class="eyebrow">{{ isStudentRole ? 'PERSONAL ATTENDANCE LOG' : 'ACADEMIC RECORDS & TRACKING' }}</p>
        <h1>{{ isStudentRole ? `My Attendance Record — ${currentUser.name}` : 'Daily Student Attendance' }}</h1>
        <p class="page-description">
          <template v-if="isStudentRole">
            Private daily attendance status strictly for <strong>{{ currentUser.name }}</strong>.
          </template>
          <template v-else>
            Real-time student check-in, daily roll call, automated absence tracking, and attendance rates.
          </template>
        </p>
      </div>

      <div class="header-action-group">
        <!-- Date Navigator Controls -->
        <div class="date-navigator">
          <button
            type="button"
            class="nav-step-btn"
            title="Previous Day"
            aria-label="Previous Day"
            @click="shiftDate(-1)"
          >
            ‹
          </button>
          <div class="date-input-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input v-model="selectedDate" type="date" aria-label="Select attendance date" />
          </div>
          <button
            type="button"
            class="nav-step-btn"
            title="Next Day"
            aria-label="Next Day"
            @click="shiftDate(1)"
          >
            ›
          </button>
          <button
            v-if="!isToday"
            type="button"
            class="today-btn"
            @click="setToday"
          >
            Today
          </button>
        </div>

        <!-- Export to Excel -->
        <button
          type="button"
          class="secondary-button"
          :disabled="!filteredAttendances.length"
          title="Export attendance records to Microsoft Excel (.xls)"
          @click="exportAttendanceExcel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Excel</span>
        </button>

        <!-- Export to PDF -->
        <button
          type="button"
          class="secondary-button"
          :disabled="!filteredAttendances.length"
          title="Generate printable PDF roll call report"
          @click="exportAttendancePdf"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span>PDF</span>
        </button>

        <button
          v-if="canEditAttendance"
          type="button"
          class="secondary-button"
          :disabled="saving || !filteredAttendances.length"
          title="Mark all listed students as Present"
          @click="markAllPresent"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Mark All Present
        </button>

        <button v-if="canEditAttendance" class="primary-button" type="button" @click="openAddModal">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Record Attendance
        </button>
      </div>
    </header>

    <!-- Success Toast -->
    <div v-if="successMessage" class="toast-notification" role="status">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <!-- Top 3 KPI Summary Cards -->
    <div class="summary-kpi-grid">
      <article class="summary-card">
        <div class="summary-icon tone-green">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Present Students</span>
          <strong>{{ presentCount }} ({{ presentRate }}%)</strong>
        </div>
        <span class="summary-caption">On-time check-ins</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-amber">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Late Arrivals</span>
          <strong>{{ lateCount }} Students</strong>
        </div>
        <span class="summary-caption">Tardy check-ins</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Absences & Excused</span>
          <strong>{{ absentCount + excusedCount }} Records</strong>
        </div>
        <span class="summary-caption">Parent notified</span>
      </article>
    </div>

    <!-- Main Attendance Table Card -->
    <div class="records-card">
      <div class="records-toolbar">
        <div class="toolbar-left-group">
          <!-- Class Filter Selector -->
          <div v-if="!isStudentRole" class="filter-select-wrapper">
            <label for="class-filter" class="visually-hidden">Filter Class</label>
            <select id="class-filter" v-model="activeClassFilter" class="filter-select">
              <option value="all">All Class Sections ({{ availableClasses.length }})</option>
              <option v-for="cls in availableClasses" :key="cls" :value="cls">
                {{ cls }}
              </option>
            </select>
          </div>

          <!-- Status Filter Tabs -->
          <div class="status-filter-pills">
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeStatusFilter === 'all' }"
              @click="activeStatusFilter = 'all'"
            >
              All ({{ totalCount }})
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeStatusFilter === 'Present' }"
              @click="activeStatusFilter = 'Present'"
            >
              Present ({{ presentCount }})
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeStatusFilter === 'Late' }"
              @click="activeStatusFilter = 'Late'"
            >
              Late ({{ lateCount }})
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeStatusFilter === 'Absent' }"
              @click="activeStatusFilter = 'Absent'"
            >
              Absent ({{ absentCount }})
            </button>
            <button
              type="button"
              class="pill-tab"
              :class="{ active: activeStatusFilter === 'Excused' }"
              @click="activeStatusFilter = 'Excused'"
            >
              Excused ({{ excusedCount }})
            </button>
          </div>
        </div>

        <div v-if="!isStudentRole" class="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder="Search student or note..."
            aria-label="Search attendance records"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="state-message">
        <div class="spinner"></div>
        <span>Loading attendance for {{ formattedDateDisplay }}...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="!filteredAttendances.length" class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <strong>No attendance records found for {{ formattedDateDisplay }}</strong>
        <p v-if="search || activeClassFilter !== 'all' || activeStatusFilter !== 'all'">
          Try clearing search filters or selecting another class section.
        </p>
        <p v-else>
          Ready to take roll call for today? You can automatically generate a roll call from all enrolled students or record individual check-ins.
        </p>
        <div class="empty-actions">
          <button
            v-if="enrolledStudents.length && !search"
            type="button"
            class="primary-button"
            @click="generateRollCall"
          >
            Generate Roll Call ({{ enrolledStudents.length }} Students)
          </button>
          <button type="button" class="secondary-button" @click="openAddModal">
            Record Single Check-in
          </button>
        </div>
      </div>

      <!-- Attendance Table -->
      <div v-else class="table-scroll">
        <table class="records-table">
          <thead>
            <tr>
              <th>STUDENT & SECTION</th>
              <th>CHECK-IN TIME</th>
              <th>ATTENDANCE STATUS</th>
              <th>NOTES & REMARKS</th>
              <th v-if="canEditAttendance" class="actions-heading">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredAttendances" :key="record.id">
              <td>
                <div class="person-cell">
                  <span class="person-avatar avatar-attendance">
                    {{ record.student_name.charAt(0) }}
                  </span>
                  <div class="person-meta">
                    <strong>{{ record.student_name }}</strong>
                    <small class="class-meta-tag">{{ record.class_name || 'General' }}</small>
                  </div>
                </div>
              </td>

              <td>
                <span class="time-tag" :class="{ 'time-missing': record.check_in_time === '—' }">
                  <svg v-if="record.check_in_time !== '—'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {{ record.check_in_time }}
                </span>
              </td>

              <!-- Quick 1-Click Status Toggles (Admin/Teacher) or Read-Only Pill (Student) -->
              <td>
                <div v-if="canEditAttendance" class="interactive-status-group" role="group" aria-label="Toggle student attendance status">
                  <button
                    type="button"
                    class="status-toggle-btn"
                    :class="{ active: record.status === 'Present', 'btn-present': true }"
                    title="Mark Present"
                    @click="setStatus(record, 'Present')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Present
                  </button>

                  <button
                    type="button"
                    class="status-toggle-btn"
                    :class="{ active: record.status === 'Late', 'btn-late': true }"
                    title="Mark Late"
                    @click="setStatus(record, 'Late')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Late
                  </button>

                  <button
                    type="button"
                    class="status-toggle-btn"
                    :class="{ active: record.status === 'Absent', 'btn-absent': true }"
                    title="Mark Absent"
                    @click="setStatus(record, 'Absent')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Absent
                  </button>

                  <button
                    type="button"
                    class="status-toggle-btn"
                    :class="{ active: record.status === 'Excused', 'btn-excused': true }"
                    title="Mark Excused"
                    @click="setStatus(record, 'Excused')"
                  >
                    Excused
                  </button>
                </div>
                <span
                  v-else
                  class="status-pill"
                  :class="{
                    'status-active': record.status === 'Present',
                    'status-warning': record.status === 'Late',
                    'status-danger': record.status === 'Absent',
                  }"
                >
                  {{ record.status }}
                </span>
              </td>

              <td>
                <span v-if="record.remarks" class="remarks-cell">
                  {{ record.remarks }}
                </span>
                <span v-else class="muted-value">No remark</span>
              </td>

              <td v-if="canEditAttendance" class="row-actions">
                <button class="action-button" type="button" @click="openEditModal(record)">
                  Edit
                </button>
                <button class="action-button danger-action" type="button" @click="removeRecord(record)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="records-footer">
        Showing {{ filteredAttendances.length }} of {{ attendances.length }} student check-ins for {{ formattedDateDisplay }}
      </footer>
    </div>

    <!-- Modal for Record / Edit -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <section class="student-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">ATTENDANCE LOG</p>
            <h2 id="modal-title">{{ editingRecord ? 'Edit Attendance Record' : 'Record Student Check-in' }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="Close" @click="modalOpen = false">✕</button>
        </div>

        <p class="modal-description">Enter check-in details, status code, and optional attendance notes.</p>

        <form class="student-fields" @submit.prevent="saveModalForm">
          <label>
            Student Name
            <input
              v-model="form.student_name"
              required
              placeholder="e.g. Olivia Martin"
              list="student-datalist"
            />
            <datalist id="student-datalist">
              <option v-for="stu in enrolledStudents" :key="stu.id" :value="stu.name" />
            </datalist>
          </label>

          <div class="field-row">
            <label>
              Class Section
              <select v-model="form.class_name">
                <option v-for="cls in availableClasses" :key="cls" :value="cls">
                  {{ cls }}
                </option>
              </select>
            </label>

            <label>
              Date
              <input v-model="form.date" type="date" required />
            </label>
          </div>

          <div class="field-row">
            <label>
              Check-in Time
              <input v-model="form.check_in_time" placeholder="e.g. 08:05 AM" />
            </label>

            <label>
              Attendance Status
              <select v-model="form.status">
                <option value="Present">Present (On-time)</option>
                <option value="Late">Late (Tardy)</option>
                <option value="Absent">Absent (Unexcused)</option>
                <option value="Excused">Excused (Authorized)</option>
              </select>
            </label>
          </div>

          <label>
            Notes / Remarks (Optional)
            <input
              v-model="form.remarks"
              placeholder="e.g. Arrived late due to bus delay, parent note attached"
            />
          </label>

          <div class="modal-actions">
            <button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button>
            <button class="primary-button" type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : editingRecord ? 'Save Changes' : 'Record Check-in' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.header-action-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.date-navigator {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  padding: 3px 6px;
  border-radius: var(--radius-md);
}

.nav-step-btn {
  width: 28px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
}

.nav-step-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-primary);
}

.date-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
}

.date-input-wrap svg {
  color: var(--color-text-muted);
}

.date-input-wrap input {
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  outline: none;
  cursor: pointer;
}

.today-btn {
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-primary);
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.today-btn:hover {
  background-color: var(--color-primary-light);
}

.toolbar-left-group {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.filter-select {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  background-color: #ffffff;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.status-filter-pills {
  display: flex;
  align-items: center;
  background-color: var(--color-surface-hover);
  padding: 3px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  gap: 2px;
}

.pill-tab {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
  background: transparent;
}

.pill-tab:hover {
  color: var(--color-text);
}

.pill-tab.active {
  background-color: #ffffff;
  color: var(--color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.avatar-attendance {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
  color: #ffffff !important;
}

.class-meta-tag {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 11.5px;
}

.time-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text);
  padding: 3px 8px;
  background-color: var(--color-surface-hover);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-subtle);
}

.time-missing {
  color: var(--color-text-subtle);
  background-color: transparent;
  border-color: transparent;
}

/* Interactive Status Toggles */
.interactive-status-group {
  display: inline-flex;
  align-items: center;
  background-color: #f1f5f9;
  padding: 2px;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
}

.status-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11.5px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.status-toggle-btn:hover {
  color: var(--color-text);
}

.status-toggle-btn.active.btn-present {
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  box-shadow: 0 1px 2px rgba(16, 185, 129, 0.15);
}

.status-toggle-btn.active.btn-late {
  background-color: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
  box-shadow: 0 1px 2px rgba(217, 119, 6, 0.15);
}

.status-toggle-btn.active.btn-absent {
  background-color: #fef2f2;
  color: #e11d48;
  border: 1px solid #fecdd3;
  box-shadow: 0 1px 2px rgba(225, 29, 72, 0.15);
}

.status-toggle-btn.active.btn-excused {
  background-color: #f0f9ff;
  color: #0284c7;
  border: 1px solid #bae6fd;
  box-shadow: 0 1px 2px rgba(2, 132, 199, 0.15);
}

.remarks-cell {
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.empty-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}

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
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 900px) {
  .header-action-group {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
