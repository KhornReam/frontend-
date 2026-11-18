<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  calculateCompositeScore,
  calculateStudentGpa,
  getClassComparison,
  getAcademicReports,
  getLetterGrade,
  getStudentReportForUser,
  getSubjectBreakdown,
  updateStudentGrade,
} from '../../services/academicReportService.js'
import {
  exportToCsv,
  exportToExcel,
  exportToPdf,
  printStudentReportCard,
} from '../../utils/exportUtils.js'
import { getCurrentUser } from '../../services/authService.js'
import { hasPermission } from '../../services/permissionService.js'

const currentUser = ref(getCurrentUser())
const isStudentRole = computed(() => currentUser.value?.role === 'student')
const canEditGrades = computed(() => {
  if (currentUser.value?.role === 'admin') return true
  if (currentUser.value?.role === 'teacher') return hasPermission('teacher', 'manage_scores')
  return false
})
const canDownloadTranscript = computed(() => {
  if (currentUser.value?.role === 'admin') return true
  if (currentUser.value?.role === 'teacher') return hasPermission('teacher', 'export_reports')
  if (currentUser.value?.role === 'student') return hasPermission('student', 'download_report_card')
  return false
})

// Active view tabs
const activeTab = ref('rankings') // 'rankings' | 'subjects' | 'classes' | 'calculator'

// Filter states
const search = ref('')
const selectedClass = ref('all')
const selectedStanding = ref('all')
const weightedToggle = ref(true)

// Data states
const students = ref([])
const subjects = ref([])
const classSummaries = ref([])
const loading = ref(false)
const notificationMsg = ref('')

// Report Card Modal State
const reportCardModalOpen = ref(false)
const selectedStudent = ref(null)
const editingCourseCode = ref(null)
const editingScoreVal = ref(0)

// Interactive Grade Calculator State
const calcState = reactive({
  midterm: 88,
  final: 94,
  assignments: 90,
  attendance: 98,
  isHonors: false,
  isAp: false,
  weights: {
    midterm: 0.3,
    final: 0.4,
    assignments: 0.2,
    attendance: 0.1,
  },
})

// Calculated Simulator Results
const simulatedComposite = computed(() => {
  return calculateCompositeScore({
    midterm: Number(calcState.midterm) || 0,
    final: Number(calcState.final) || 0,
    assignments: Number(calcState.assignments) || 0,
    attendance: Number(calcState.attendance) || 0,
    weights: calcState.weights,
  })
})

const simulatedGrade = computed(() => {
  return getLetterGrade(simulatedComposite.value)
})

const simulatedGpaPoints = computed(() => {
  let pts = simulatedGrade.value.points
  if (calcState.isHonors) pts += 0.5
  if (calcState.isAp) pts += 1.0
  return pts.toFixed(2)
})

// KPI Metrics
const institutionalMeanGpa = computed(() => {
  if (!students.value.length) return '0.00'
  const sum = students.value.reduce((acc, s) => acc + Number(s.unweightedGpa), 0)
  return (sum / students.value.length).toFixed(2)
})

const institutionalWeightedGpa = computed(() => {
  if (!students.value.length) return '0.00'
  const sum = students.value.reduce((acc, s) => acc + Number(s.weightedGpa), 0)
  return (sum / students.value.length).toFixed(2)
})

const overallPassRate = computed(() => {
  if (!students.value.length) return '100%'
  const passing = students.value.filter((s) => s.isPassing).length
  return `${Math.round((passing / students.value.length) * 100)}%`
})

const honorRollCount = computed(() => {
  return students.value.filter((s) => s.standing.includes('Honor') || s.standing.includes('Dean')).length
})

// Filtered Students
const filteredStudents = computed(() => {
  const query = search.value.trim().toLowerCase()
  return students.value.filter((s) => {
    const matchesSearch =
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.class_name.toLowerCase().includes(query)
    const matchesClass = selectedClass.value === 'all' || s.class_name === selectedClass.value
    const matchesStanding =
      selectedStanding.value === 'all' ||
      (selectedStanding.value === 'honor' && (s.standing.includes('Honor') || s.standing.includes('Dean'))) ||
      (selectedStanding.value === 'regular' && s.standing.includes('Good'))
    return matchesSearch && matchesClass && matchesStanding
  })
})

// Unique classes for filter dropdown
const classOptions = computed(() => {
  const set = new Set(students.value.map((s) => s.class_name))
  return Array.from(set).sort()
})

// Personal student record when logged in as a student
const myStudentRecord = computed(() =>
  isStudentRole.value && students.value.length ? students.value[0] : null,
)

// Load data
function loadReportData() {
  loading.value = true
  try {
    currentUser.value = getCurrentUser()
    if (currentUser.value?.role === 'student') {
      // Strictly isolate to ONLY the logged-in student's own record by name/email
      students.value = getStudentReportForUser(currentUser.value)
      subjects.value = []
      classSummaries.value = []
      if (activeTab.value === 'subjects' || activeTab.value === 'classes') {
        activeTab.value = 'rankings'
      }
    } else {
      students.value = getAcademicReports()
      subjects.value = getSubjectBreakdown()
      classSummaries.value = getClassComparison()
    }
  } finally {
    loading.value = false
  }
}

function showToast(msg) {
  notificationMsg.value = msg
  setTimeout(() => {
    if (notificationMsg.value === msg) notificationMsg.value = ''
  }, 3500)
}

// Student Report Card Modal Handlers
function openReportCard(student) {
  selectedStudent.value = JSON.parse(JSON.stringify(student))
  editingCourseCode.value = null
  reportCardModalOpen.value = true
}

function startEditingCourseScore(course) {
  editingCourseCode.value = course.code
  editingScoreVal.value = course.score
}

function saveCourseScore(course) {
  const newScore = Math.max(0, Math.min(100, Number(editingScoreVal.value) || 0))
  updateStudentGrade(selectedStudent.value.id, course.code, newScore)

  // Reload and refresh
  loadReportData()
  const updated = students.value.find((s) => s.id === selectedStudent.value.id)
  if (updated) {
    selectedStudent.value = JSON.parse(JSON.stringify(updated))
  }
  editingCourseCode.value = null
  showToast(`Updated ${course.subject} score to ${newScore}% for ${selectedStudent.value.name}`)
}

function printTranscript() {
  if (!selectedStudent.value) return
  printStudentReportCard({
    student: selectedStudent.value,
    grades: selectedStudent.value.courses,
    gpa: weightedToggle.value ? selectedStudent.value.weightedGpa : selectedStudent.value.unweightedGpa,
    rank: `${selectedStudent.value.rank} of ${students.value.length}`,
    attendanceRate: selectedStudent.value.attendance_rate,
    term: 'Term 2 (Spring 2026–2027)',
    principal: 'Dr. Alexander Vance',
    conduct: 'Exemplary',
  })
}

// Global Export Actions
function handleExportExcel() {
  const headers = [
    'Academic Rank',
    'Student Name',
    'Email Address',
    'Class Section',
    'Unweighted GPA (4.0)',
    'Weighted GPA (AP/Honors)',
    'Average Score (%)',
    'Attendance Rate',
    'Academic Honors & Standing',
    'Evaluation Status',
  ]

  const rows = filteredStudents.value.map((s) => [
    s.rank,
    s.name,
    s.email,
    s.class_name,
    s.unweightedGpa,
    s.weightedGpa,
    `${s.avgScore}%`,
    s.attendance_rate,
    s.standing,
    s.isPassing ? 'Passing' : 'Academic Notice',
  ])

  const summaryRows = [
    ['Institutional Mean GPA (4.0)', institutionalMeanGpa.value],
    ['Institutional Weighted GPA', institutionalWeightedGpa.value],
    ['Overall Passing Rate', overallPassRate.value],
    ['Total Honor Roll Scholars', `${honorRollCount.value} Students`],
    ['Active Registered Curriculum', `${subjects.value.length} Subjects`],
  ]

  exportToExcel({
    filename: `Academic_Performance_Report_2026_${selectedClass.value.replace(/\s+/g, '_')}.xls`,
    title: 'Greenwood Academy - Institutional Academic Performance & GPA Rankings',
    sheetName: 'Academic Standings',
    headers,
    rows,
    summaryRows,
    metadata: {
      'Academic Term': '2026–2027 Term 2',
      'Report Generation Date': new Date().toLocaleDateString(),
      'Evaluation Standard': '4.0 Scale with AP/Honors Weighted Scale',
    },
  })

  showToast('Academic report exported to Microsoft Excel (.xls) successfully!')
}

function handleExportPdf() {
  const headers = [
    'Rank',
    'Student Name',
    'Class Section',
    'Unweighted GPA',
    'Weighted GPA',
    'Avg Score',
    'Attendance',
    'Academic Standing',
  ]

  const rows = filteredStudents.value.map((s) => [
    `#${s.rank}`,
    s.name,
    s.class_name,
    s.unweightedGpa,
    s.weightedGpa,
    `${s.avgScore}%`,
    s.attendance_rate,
    s.standing,
  ])

  exportToPdf({
    title: 'Institutional Academic Performance & GPA Report',
    subtitle: 'Comprehensive evaluation across curriculum, grade point averages, and honor rolls.',
    filename: 'Academic_Performance_Report.pdf',
    summaryCards: [
      { label: 'Institutional Mean GPA', value: `${institutionalMeanGpa.value} / 4.00`, caption: 'Standard 4.0 Scale' },
      { label: 'Weighted AP/Honors GPA', value: `${institutionalWeightedGpa.value} / 5.00`, caption: 'Advanced Placement' },
      { label: 'Overall Pass Rate', value: overallPassRate.value, caption: `${filteredStudents.value.length} Students Assessed` },
      { label: 'Honor Roll Standing', value: `${honorRollCount.value} Scholars`, caption: 'Summa & Magna Cum Laude' },
    ],
    metadata: {
      'Academic Term': '2026–2027 Term 2',
      'Reporting Date': new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      'Active Sections': `${classSummaries.value.length} Sections Assessed`,
      'Campus ID': 'GW-8821 (Accredited A+)',
    },
    headers,
    rows,
    footerNote: 'Greenwood Academy Academic Governance & Registrars Office',
  })
}

function handleExportCsv() {
  const headers = ['Rank', 'Name', 'Email', 'Class', 'Unweighted_GPA', 'Weighted_GPA', 'Avg_Score', 'Attendance', 'Standing']
  const rows = filteredStudents.value.map((s) => [
    s.rank,
    s.name,
    s.email,
    s.class_name,
    s.unweightedGpa,
    s.weightedGpa,
    s.avgScore,
    s.attendance_rate,
    s.standing,
  ])
  exportToCsv({
    filename: 'Academic_Rankings_Data.csv',
    headers,
    rows,
  })
  showToast('Academic data exported to CSV successfully!')
}

onMounted(() => {
  loadReportData()
  window.addEventListener('sms-auth-changed', loadReportData)
})

onUnmounted(() => {
  window.removeEventListener('sms-auth-changed', loadReportData)
})
</script>

<template>
  <section class="management-page">
    <!-- Header -->
    <header class="management-heading">
      <div>
        <p class="eyebrow">{{ isStudentRole ? 'PERSONAL ACADEMIC TRANSCRIPT' : 'ACADEMIC PERFORMANCE & EVALUATION' }}</p>
        <h1>{{ isStudentRole ? `My Grades & Transcript — ${currentUser.name}` : 'Academic Reports & Grade Calculation' }}</h1>
        <p class="page-description">
          <template v-if="isStudentRole">
            Private academic record strictly for <strong>{{ currentUser.name }}</strong> ({{ myStudentRecord?.class_name || currentUser.department }}).
          </template>
          <template v-else>
            Institutional GPA distribution, standard grade calculation engine, section comparisons, and official student report cards.
          </template>
        </p>
      </div>

      <div class="header-action-group">
        <template v-if="isStudentRole">
          <button
            v-if="canDownloadTranscript && myStudentRecord"
            type="button"
            class="primary-button"
            @click="openReportCard(myStudentRecord)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>View / Print My Transcript</span>
          </button>
        </template>

        <template v-else>
          <!-- Export to CSV -->
          <button
            type="button"
            class="secondary-button"
            title="Export CSV data"
            @click="handleExportCsv"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>CSV</span>
          </button>

          <!-- Export to Excel (.xls) -->
          <button
            type="button"
            class="secondary-button"
            title="Export Microsoft Excel Spreadsheet (.xls)"
            @click="handleExportExcel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export Excel (.xls)</span>
          </button>

          <!-- Export to PDF -->
          <button
            type="button"
            class="primary-button"
            title="Generate Printable PDF Report"
            @click="handleExportPdf"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>Export PDF Report</span>
          </button>
        </template>
      </div>
    </header>

    <!-- Success Toast -->
    <div v-if="notificationMsg" class="toast-notification" role="status">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>{{ notificationMsg }}</span>
    </div>

    <!-- Personal Student KPI Summary Cards (Strictly for Logged-In Student) -->
    <div v-if="isStudentRole && myStudentRecord" class="reports-kpi-grid is-student-kpi">
      <article class="report-kpi-card accent-indigo">
        <div class="kpi-top-row">
          <div class="summary-icon tone-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <span class="kpi-meta-pill">Weighted: {{ myStudentRecord.weightedGpa }}</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-title">My GPA (4.0 Scale)</span>
          <strong class="kpi-number">{{ myStudentRecord.unweightedGpa }} <small class="gpa-max">/ 4.00</small></strong>
        </div>
      </article>

      <article class="report-kpi-card accent-emerald">
        <div class="kpi-top-row">
          <div class="summary-icon tone-green">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span class="kpi-meta-pill">{{ myStudentRecord.class_name }}</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-title">My Attendance</span>
          <strong class="kpi-number">{{ myStudentRecord.attendance_rate }}</strong>
        </div>
      </article>

      <article class="report-kpi-card accent-amber">
        <div class="kpi-top-row">
          <div class="summary-icon tone-amber">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="7"/>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
          </div>
          <span class="kpi-meta-pill">{{ myStudentRecord.courses.length }} Courses</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-title">Enrolled Credits</span>
          <strong class="kpi-number">{{ myStudentRecord.totalCredits }} Credits</strong>
        </div>
      </article>
    </div>

    <!-- Admin / Teacher 4-Column Executive KPI Summary Cards -->
    <div v-else class="reports-kpi-grid">
      <article class="report-kpi-card accent-indigo">
        <div class="kpi-top-row">
          <div class="summary-icon tone-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <span class="kpi-meta-pill pill-indigo">Weighted AP: {{ institutionalWeightedGpa }}</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-title">Mean Institutional GPA</span>
          <strong class="kpi-number">{{ institutionalMeanGpa }} <small class="gpa-max">/ 4.00</small></strong>
        </div>
      </article>

      <article class="report-kpi-card accent-emerald">
        <div class="kpi-top-row">
          <div class="summary-icon tone-green">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span class="kpi-meta-pill pill-emerald">Threshold ≥ 60%</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-title">Curriculum Pass Rate</span>
          <strong class="kpi-number">{{ overallPassRate }}</strong>
        </div>
      </article>

      <article class="report-kpi-card accent-amber">
        <div class="kpi-top-row">
          <div class="summary-icon tone-amber">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="7"/>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
          </div>
          <span class="kpi-meta-pill pill-amber">Cum Laude & Dean's</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-title">Honor Roll Scholars</span>
          <strong class="kpi-number">{{ honorRollCount }} Students</strong>
        </div>
      </article>

      <article class="report-kpi-card accent-blue">
        <div class="kpi-top-row">
          <div class="summary-icon tone-blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <span class="kpi-meta-pill pill-blue">Standardized Grading</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-title">Active Curriculum</span>
          <strong class="kpi-number">{{ subjects.length }} Core Subjects</strong>
        </div>
      </article>
    </div>

    <!-- View Switcher Tabs -->
    <div class="reports-tabs-bar">
      <button
        type="button"
        class="report-nav-tab"
        :class="{ active: activeTab === 'rankings' }"
        @click="activeTab = 'rankings'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
        </svg>
        <span>{{ isStudentRole ? `My Academic Record (${currentUser.name})` : `Student GPA Rankings (${filteredStudents.length})` }}</span>
      </button>

      <button
        v-if="!isStudentRole"
        type="button"
        class="report-nav-tab"
        :class="{ active: activeTab === 'subjects' }"
        @click="activeTab = 'subjects'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
        <span>Subject Mastery Breakdown ({{ subjects.length }})</span>
      </button>

      <button
        v-if="!isStudentRole"
        type="button"
        class="report-nav-tab"
        :class="{ active: activeTab === 'classes' }"
        @click="activeTab = 'classes'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Class Section Comparison</span>
      </button>

      <button
        type="button"
        class="report-nav-tab"
        :class="{ active: activeTab === 'calculator' }"
        @click="activeTab = 'calculator'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="16" y1="14" x2="16" y2="18"/>
          <path d="M16 10h.01"/>
          <path d="M12 10h.01"/>
          <path d="M8 10h.01"/>
          <path d="M12 14h.01"/>
          <path d="M8 14h.01"/>
          <path d="M12 18h.01"/>
          <path d="M8 18h.01"/>
        </svg>
        <span>Grade Calculator & Scale Engine</span>
      </button>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 1: STUDENT GPA RANKINGS & REPORT CARDS                   -->
    <!-- ============================================================ -->
    <div v-if="activeTab === 'rankings'" class="reports-tab-content">
      <!-- Toolbar Filter (Admin & Teacher only — Students strictly see only themselves) -->
      <div v-if="!isStudentRole" class="reports-toolbar">
        <div class="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Search student by name, email, or section..."
          />
        </div>

        <div class="toolbar-dropdowns">
          <select v-model="selectedClass" class="filter-select" aria-label="Filter by class">
            <option value="all">All Class Sections</option>
            <option v-for="cls in classOptions" :key="cls" :value="cls">{{ cls }}</option>
          </select>

          <select v-model="selectedStanding" class="filter-select" aria-label="Filter by standing">
            <option value="all">All Academic Standings</option>
            <option value="honor">Honor Roll & Dean's List</option>
            <option value="regular">Good Academic Standing</option>
          </select>

          <label class="toggle-weighted-label" title="Toggle AP & Honors GPA bonus weight (+0.5/+1.0)">
            <input v-model="weightedToggle" type="checkbox" />
            <span>Honors/AP Weighted Scale</span>
          </label>
        </div>
      </div>

      <!-- Rankings Table Card -->
      <div class="management-card table-card">
        <div class="table-scroll">
          <table class="records-table">
            <thead>
              <tr>
                <th style="width: 70px;">Rank</th>
                <th>Student Scholar</th>
                <th>Class Section</th>
                <th>Course Credits</th>
                <th>Unweighted GPA</th>
                <th>Weighted GPA</th>
                <th>Attendance</th>
                <th>Academic Standing</th>
                <th style="text-align: right;">Official Record</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filteredStudents" :key="s.id" class="table-row-hover">
                <td>
                  <span
                    class="rank-badge"
                    :class="{
                      'rank-gold': s.rank === 1,
                      'rank-silver': s.rank === 2,
                      'rank-bronze': s.rank === 3,
                    }"
                  >
                    #{{ s.rank }}
                  </span>
                </td>
                <td>
                  <div class="student-profile-cell">
                    <div class="student-avatar-circle">
                      {{ s.name.split(' ').map((n) => n[0]).join('').slice(0, 2) }}
                    </div>
                    <div>
                      <strong class="student-name">{{ s.name }}</strong>
                      <span class="student-email">{{ s.email }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="class-pill">{{ s.class_name }}</span>
                </td>
                <td>
                  <span class="credit-badge">{{ s.totalCredits }} Credits</span>
                </td>
                <td>
                  <span class="gpa-score font-bold">{{ s.unweightedGpa }}</span>
                  <span class="gpa-sub">4.0 scale</span>
                </td>
                <td>
                  <span class="gpa-score weighted-pill">{{ s.weightedGpa }}</span>
                </td>
                <td>
                  <span
                    class="attendance-pill"
                    :class="{
                      'att-high': parseFloat(s.attendance_rate) >= 95,
                      'att-mid': parseFloat(s.attendance_rate) >= 90 && parseFloat(s.attendance_rate) < 95,
                      'att-low': parseFloat(s.attendance_rate) < 90,
                    }"
                  >
                    {{ s.attendance_rate }}
                  </span>
                </td>
                <td>
                  <span
                    class="standing-badge"
                    :class="{
                      'standing-summa': s.standing.includes('Summa'),
                      'standing-cumlaude': s.standing.includes('Cum Laude') && !s.standing.includes('Summa'),
                      'standing-dean': s.standing.includes('Dean'),
                      'standing-good': s.standing.includes('Good'),
                    }"
                  >
                    {{ s.standing }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <button
                    type="button"
                    class="view-report-btn"
                    title="View and print official student report card"
                    @click="openReportCard(s)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <span>Report Card</span>
                  </button>
                </td>
              </tr>
              <tr v-if="!filteredStudents.length">
                <td colspan="9" class="empty-state-cell">
                  <div class="empty-box">
                    <p class="empty-title">No student records found</p>
                    <p class="empty-text">Try adjusting your search query or class filter.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detailed Course Breakdown strictly for the Logged-In Student -->
      <div v-if="isStudentRole && myStudentRecord" class="management-card table-card" style="margin-top: 20px;">
        <div class="records-toolbar">
          <div>
            <h2>{{ myStudentRecord.name }} — Enrolled Courses & Marks</h2>
            <p>Individual subject scores, credits, letter grades, and instructor remarks</p>
          </div>
          <button
            v-if="canDownloadTranscript"
            type="button"
            class="secondary-button"
            @click="openReportCard(myStudentRecord)"
          >
            Print Official Transcript (PDF)
          </button>
        </div>
        <div class="table-scroll">
          <table class="records-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Subject</th>
                <th>Credits</th>
                <th>Score</th>
                <th>Letter Grade</th>
                <th>Grade Points</th>
                <th>Faculty Remark</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="course in myStudentRecord.courses" :key="course.code">
                <td><code>{{ course.code }}</code></td>
                <td>
                  <strong>{{ course.subject }}</strong>
                  <span v-if="course.isAp" class="mini-tag tag-ap">AP</span>
                  <span v-if="course.isHonors" class="mini-tag tag-honors">Honors</span>
                </td>
                <td>{{ course.credits }} Credits</td>
                <td><strong>{{ course.score }}%</strong></td>
                <td><span class="letter-grade-pill">{{ course.grade }}</span></td>
                <td>{{ course.points }}</td>
                <td><span class="course-remark">{{ course.remark || 'Satisfactory progress' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 2: SUBJECT MASTERY BREAKDOWN                             -->
    <!-- ============================================================ -->
    <div v-else-if="activeTab === 'subjects'" class="reports-tab-content">
      <div class="section-intro">
        <h2>Curriculum & Subject Performance Breakdown</h2>
        <p>Evaluation of mean scores, highest/lowest bounds, and passing rates across subjects.</p>
      </div>

      <div class="subject-grid">
        <div v-for="sub in subjects" :key="sub.code" class="subject-card">
          <div class="subject-card-head">
            <div>
              <span class="subject-code-tag">{{ sub.code }}</span>
              <h3 class="subject-name">{{ sub.subject }}</h3>
            </div>
            <div class="subject-score-badge">
              <span class="score-number">{{ sub.averageScore }}%</span>
              <span class="score-label">Class Average</span>
            </div>
          </div>

          <div class="subject-metrics">
            <div class="metric-item">
              <span class="m-label">Pass Rate</span>
              <strong class="m-value" :class="sub.passRate >= 90 ? 'text-success' : 'text-warning'">{{ sub.passRate }}%</strong>
            </div>
            <div class="metric-item">
              <span class="m-label">Highest Score</span>
              <strong class="m-value">{{ sub.highestScore }}%</strong>
            </div>
            <div class="metric-item">
              <span class="m-label">Lowest Score</span>
              <strong class="m-value">{{ sub.lowestScore }}%</strong>
            </div>
            <div class="metric-item">
              <span class="m-label">Enrolled</span>
              <strong class="m-value">{{ sub.studentsCount }}</strong>
            </div>
          </div>

          <!-- Grade Distribution Mini Bars -->
          <div class="distribution-section">
            <div class="dist-header">
              <span>Grade Distribution</span>
              <span class="dist-total">{{ sub.studentsCount }} students</span>
            </div>
            <div class="dist-pills">
              <span v-for="(cnt, gr) in sub.grades" :key="gr" class="dist-chip" :class="{ 'chip-active': cnt > 0 }">
                <span class="chip-letter">{{ gr }}:</span>
                <span class="chip-count">{{ cnt }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 3: CLASS SECTION COMPARISON                              -->
    <!-- ============================================================ -->
    <div v-else-if="activeTab === 'classes'" class="reports-tab-content">
      <div class="section-intro">
        <h2>Institutional Class Section Comparison</h2>
        <p>Cross-sectional performance comparison, average GPAs, and honor roll distributions.</p>
      </div>

      <div class="management-card table-card">
        <div class="table-scroll">
          <table class="records-table">
            <thead>
              <tr>
                <th>Class Section</th>
                <th>Assigned Students</th>
                <th>Average Class Score</th>
                <th>Mean GPA (4.0)</th>
                <th>Pass Rate</th>
                <th>Honor Roll Scholars</th>
                <th>Academic Standing</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cls in classSummaries" :key="cls.className">
                <td>
                  <strong>{{ cls.className }}</strong>
                </td>
                <td>{{ cls.studentsCount }} Enrolled</td>
                <td>
                  <span class="score-pill">{{ cls.avgScore }}%</span>
                </td>
                <td>
                  <span class="gpa-score">{{ cls.meanGpa }}</span>
                </td>
                <td>
                  <span class="status-pill status-active">{{ cls.passRate }}%</span>
                </td>
                <td>
                  <span class="honor-count-pill">{{ cls.honorRollCount }} Scholars</span>
                </td>
                <td>
                  <span class="standing-badge standing-dean">Tier 1 Performance</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 4: GRADE CALCULATOR & SCALE ENGINE                       -->
    <!-- ============================================================ -->
    <div v-else-if="activeTab === 'calculator'" class="reports-tab-content">
      <div class="section-intro">
        <h2>Interactive Grade Calculation & Scale Engine</h2>
        <p>Simulate composite course marks, letter grade allocations, and AP/Honors GPA points.</p>
      </div>

      <div class="calc-layout-grid">
        <!-- Interactive Simulator Card -->
        <div class="calc-panel-card">
          <h3 class="calc-panel-title">Composite Gradebook Simulator</h3>
          <p class="calc-panel-desc">Adjust score components to simulate the composite grade and 4.0 GPA points.</p>

          <div class="calc-inputs-grid">
            <div class="calc-input-group">
              <label>
                Midterm Exam (30% Weight)
                <div class="input-with-pct">
                  <input v-model.number="calcState.midterm" type="number" min="0" max="100" />
                  <span>%</span>
                </div>
              </label>
            </div>

            <div class="calc-input-group">
              <label>
                Final Examination (40% Weight)
                <div class="input-with-pct">
                  <input v-model.number="calcState.final" type="number" min="0" max="100" />
                  <span>%</span>
                </div>
              </label>
            </div>

            <div class="calc-input-group">
              <label>
                Coursework & Homework (20% Weight)
                <div class="input-with-pct">
                  <input v-model.number="calcState.assignments" type="number" min="0" max="100" />
                  <span>%</span>
                </div>
              </label>
            </div>

            <div class="calc-input-group">
              <label>
                Attendance & Participation (10% Weight)
                <div class="input-with-pct">
                  <input v-model.number="calcState.attendance" type="number" min="0" max="100" />
                  <span>%</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Academic Weight Bonus Toggles -->
          <div class="weight-toggles-row">
            <label class="toggle-checkbox-wrap">
              <input v-model="calcState.isHonors" type="checkbox" :disabled="calcState.isAp" />
              <span>Honors Course (+0.5 GPA Points)</span>
            </label>

            <label class="toggle-checkbox-wrap">
              <input v-model="calcState.isAp" type="checkbox" :disabled="calcState.isHonors" />
              <span>Advanced Placement / AP (+1.0 GPA Points)</span>
            </label>
          </div>

          <!-- Simulation Result Box -->
          <div class="calc-result-box">
            <div class="res-item">
              <span class="res-label">Composite Mark</span>
              <strong class="res-val">{{ simulatedComposite }}%</strong>
            </div>
            <div class="res-item">
              <span class="res-label">Assigned Letter Grade</span>
              <strong class="res-val text-primary">{{ simulatedGrade.grade }}</strong>
            </div>
            <div class="res-item">
              <span class="res-label">Grade Points</span>
              <strong class="res-val text-success">{{ simulatedGpaPoints }}</strong>
            </div>
            <div class="res-item">
              <span class="res-label">Mastery Description</span>
              <strong class="res-desc">{{ simulatedGrade.description }}</strong>
            </div>
          </div>
        </div>

        <!-- Official Institutional Scale Reference -->
        <div class="calc-panel-card">
          <h3 class="calc-panel-title">Institutional 4.0 Grading Scheme Standard</h3>
          <p class="calc-panel-desc">Official grade points and score ranges established by the Academic Board.</p>

          <div class="scale-table-wrap">
            <table class="scale-table">
              <thead>
                <tr>
                  <th>Letter</th>
                  <th>Score Range</th>
                  <th>Standard GPA</th>
                  <th>Honors (+0.5)</th>
                  <th>AP (+1.0)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong class="text-primary">A+</strong></td><td>93% – 100%</td><td>4.00</td><td>4.50</td><td>5.00</td></tr>
                <tr><td><strong>A</strong></td><td>90% – 92%</td><td>4.00</td><td>4.50</td><td>5.00</td></tr>
                <tr><td><strong>B+</strong></td><td>87% – 89%</td><td>3.30</td><td>3.80</td><td>4.30</td></tr>
                <tr><td><strong>B</strong></td><td>83% – 86%</td><td>3.00</td><td>3.50</td><td>4.00</td></tr>
                <tr><td><strong>B-</strong></td><td>80% – 82%</td><td>2.70</td><td>3.20</td><td>3.70</td></tr>
                <tr><td><strong>C+</strong></td><td>77% – 79%</td><td>2.30</td><td>2.80</td><td>3.30</td></tr>
                <tr><td><strong>C</strong></td><td>73% – 76%</td><td>2.00</td><td>2.50</td><td>3.00</td></tr>
                <tr><td><strong>C-</strong></td><td>70% – 72%</td><td>1.70</td><td>2.20</td><td>2.70</td></tr>
                <tr><td><strong>D</strong></td><td>60% – 69%</td><td>1.00</td><td>1.50</td><td>2.00</td></tr>
                <tr><td><strong class="text-danger">F</strong></td><td>&lt; 60%</td><td>0.00</td><td>0.00</td><td>0.00</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- STUDENT OFFICIAL REPORT CARD MODAL                           -->
    <!-- ============================================================ -->
    <div v-if="reportCardModalOpen && selectedStudent" class="modal-backdrop" @click.self="reportCardModalOpen = false">
      <div class="modal-dialog report-card-modal">
        <header class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-eyebrow">OFFICIAL STUDENT TRANSCRIPT</span>
            <h2>{{ selectedStudent.name }}</h2>
            <p class="modal-subtitle">{{ selectedStudent.email }} • {{ selectedStudent.class_name }}</p>
          </div>
          <button type="button" class="close-icon-btn" @click="reportCardModalOpen = false">✕</button>
        </header>

        <div class="modal-body">
          <!-- Student Stats Overview -->
          <div class="modal-stats-row">
            <div class="m-stat-box">
              <span class="m-stat-label">Unweighted GPA</span>
              <strong class="m-stat-val">{{ selectedStudent.unweightedGpa }}</strong>
              <span class="m-stat-sub">4.0 Scale</span>
            </div>
            <div class="m-stat-box">
              <span class="m-stat-label">Weighted GPA</span>
              <strong class="m-stat-val text-primary">{{ selectedStudent.weightedGpa }}</strong>
              <span class="m-stat-sub">AP / Honors Bonus</span>
            </div>
            <div class="m-stat-box">
              <span class="m-stat-label">Attendance Rate</span>
              <strong class="m-stat-val text-success">{{ selectedStudent.attendance_rate }}</strong>
              <span class="m-stat-sub">Term 2 Roll Call</span>
            </div>
            <div class="m-stat-box">
              <span class="m-stat-label">Class Rank</span>
              <strong class="m-stat-val">#{{ selectedStudent.rank }}</strong>
              <span class="m-stat-sub">{{ selectedStudent.percentile }}</span>
            </div>
          </div>

          <!-- Courses Gradebook Table -->
          <div class="modal-courses-section">
            <h4 class="modal-section-title">Enrolled Courses & Academic Standings</h4>
            <table class="modal-courses-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Course Subject</th>
                  <th>Credits</th>
                  <th>Score (%)</th>
                  <th>Letter</th>
                  <th>Points</th>
                  <th>Faculty Assessment Remark</th>
                  <th v-if="canEditGrades" style="width: 70px;">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="course in selectedStudent.courses" :key="course.code">
                  <td><code>{{ course.code }}</code></td>
                  <td>
                    <strong>{{ course.subject }}</strong>
                    <span v-if="course.isAp" class="mini-tag tag-ap">AP</span>
                    <span v-if="course.isHonors" class="mini-tag tag-honors">Honors</span>
                  </td>
                  <td>{{ course.credits }}</td>
                  <td>
                    <div v-if="canEditGrades && editingCourseCode === course.code" class="edit-score-inline">
                      <input
                        v-model.number="editingScoreVal"
                        type="number"
                        min="0"
                        max="100"
                        class="inline-score-input"
                      />
                      <button class="save-score-btn" @click="saveCourseScore(course)">✓</button>
                    </div>
                    <span v-else class="score-display font-bold">{{ course.score }}%</span>
                  </td>
                  <td>
                    <span class="letter-grade-pill">{{ course.grade }}</span>
                  </td>
                  <td>{{ course.points }}</td>
                  <td>
                    <span class="course-remark">{{ course.remark || 'Satisfactory progress' }}</span>
                  </td>
                  <td v-if="canEditGrades">
                    <button
                      v-if="editingCourseCode !== course.code"
                      type="button"
                      class="edit-grade-btn"
                      title="Adjust student marks"
                      @click="startEditingCourseScore(course)"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="secondary-button" @click="reportCardModalOpen = false">
            Close
          </button>
          <button v-if="canDownloadTranscript" type="button" class="primary-button" @click="printTranscript">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>Print Official Transcript (PDF)</span>
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 4-Column Executive KPI Grid (Zero Truncation, Balanced Row) */
.reports-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.reports-kpi-grid.is-student-kpi {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 1180px) {
  .reports-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .reports-kpi-grid,
  .reports-kpi-grid.is-student-kpi {
    grid-template-columns: 1fr;
  }
}

.report-kpi-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  overflow: hidden;
}

.report-kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #e2e8f0;
}

.report-kpi-card.accent-indigo::before { background: linear-gradient(90deg, #4f46e5, #818cf8); }
.report-kpi-card.accent-emerald::before { background: linear-gradient(90deg, #10b981, #34d399); }
.report-kpi-card.accent-amber::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.report-kpi-card.accent-blue::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }

.report-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -8px rgba(15, 23, 42, 0.08);
  border-color: #cbd5e1;
}

.kpi-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.kpi-top-row .summary-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  flex-shrink: 0;
}

.kpi-meta-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
}

.kpi-meta-pill.pill-indigo { background: #eef2ff; color: #4338ca; border-color: #e0e7ff; }
.kpi-meta-pill.pill-emerald { background: #ecfdf5; color: #047857; border-color: #d1fae5; }
.kpi-meta-pill.pill-amber { background: #fffbeb; color: #b45309; border-color: #fef3c7; }
.kpi-meta-pill.pill-blue { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }

.kpi-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.45px;
  color: #64748b;
}

.kpi-number {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
  line-height: 1.2;
  white-space: nowrap;
}

/* Modern Pill-Bar Tabs Navigation */
.reports-tabs-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 6px;
  margin-bottom: 18px;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.report-nav-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.report-nav-tab:hover {
  color: #0f172a;
  background: #f8fafc;
}

.report-nav-tab.active {
  color: #4f46e5;
  background: #eef2ff;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px #c7d2fe;
}

/* Clean White Filter Toolbar Card */
.reports-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 14px;
  height: 40px;
  flex: 1;
  min-width: 240px;
  max-width: 380px;
  color: #94a3b8;
  transition: all 0.15s ease;
}

.search-box:focus-within {
  background: #ffffff;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.search-box input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13.5px;
  color: #0f172a;
  width: 100%;
}

.toolbar-dropdowns {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-select {
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  outline: none;
  cursor: pointer;
}

.filter-select:focus {
  border-color: #4f46e5;
}

.toggle-weighted-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 0 14px;
  height: 40px;
  border-radius: 10px;
  transition: all 0.15s ease;
}

.toggle-weighted-label:hover {
  border-color: #c7d2fe;
  background: #eef2ff;
  color: #4338ca;
}

.toggle-weighted-label input {
  accent-color: #4f46e5;
}

/* Rank Badges */
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  background: #f1f5f9;
  color: #475569;
}

.rank-gold {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fcd34d;
}

.rank-silver {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.rank-bronze {
  background: #ffedd5;
  color: #c2410c;
  border: 1px solid #fdba74;
}

/* Student Profile Cell */
.student-profile-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.student-avatar-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  font-weight: 700;
  font-size: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.student-name {
  display: block;
  font-size: 13.5px;
  color: #0f172a;
}

.student-email {
  display: block;
  font-size: 11.5px;
  color: #64748b;
}

.class-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.credit-badge {
  font-size: 12px;
  color: #475569;
  font-weight: 600;
}

.gpa-score {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.gpa-sub {
  display: block;
  font-size: 10px;
  color: #94a3b8;
}

.weighted-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 700;
}

.gpa-max {
  font-size: 14px;
  font-weight: 500;
  color: #94a3b8;
}

.attendance-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}

.att-high {
  background: #ecfdf5;
  color: #059669;
}

.att-mid {
  background: #fffbeb;
  color: #d97706;
}

.att-low {
  background: #fef2f2;
  color: #dc2626;
}

.standing-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.standing-summa {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.standing-cumlaude {
  background: #ede9fe;
  color: #6b21a8;
  border: 1px solid #ddd6fe;
}

.standing-dean {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.standing-good {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.view-report-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  background: #eef2ff;
  color: #4f46e5;
  border: 1px solid #c7d2fe;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-report-btn:hover {
  background: #4f46e5;
  color: #ffffff;
}

/* Subject Grid */
.subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.subject-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.subject-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.subject-code-tag {
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
  background: #eef2ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.subject-name {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 4px 0 0;
}

.subject-score-badge {
  text-align: right;
}

.score-number {
  display: block;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.score-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
}

.subject-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: #f8fafc;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 14px;
}

.metric-item {
  display: flex;
  flex-direction: column;
}

.m-label {
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
}

.m-value {
  font-size: 13px;
  color: #0f172a;
  font-weight: 700;
}

.distribution-section {
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.dist-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}

.dist-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.dist-chip {
  font-size: 10.5px;
  padding: 2px 5px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #64748b;
}

.chip-active {
  background: #e0e7ff;
  color: #3730a3;
  font-weight: 600;
}

/* Calculator Grid */
.calc-layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .calc-layout-grid {
    grid-template-columns: 1fr;
  }
}

.calc-panel-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 22px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.calc-panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}

.calc-panel-desc {
  font-size: 12.5px;
  color: #64748b;
  margin: 0 0 16px;
}

.calc-inputs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.calc-input-group label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-with-pct {
  display: flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
}

.input-with-pct input {
  flex: 1;
  border: none;
  outline: none;
  padding: 8px 10px;
  font-size: 13.5px;
  font-weight: 600;
}

.input-with-pct span {
  padding: 0 10px;
  color: #94a3b8;
  font-weight: 700;
  background: #f8fafc;
}

.weight-toggles-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
}

.toggle-checkbox-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
}

.calc-result-box {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.res-item {
  display: flex;
  flex-direction: column;
}

.res-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.res-val {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.res-desc {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

/* Scale Table */
.scale-table-wrap {
  overflow-x: auto;
}

.scale-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.scale-table th {
  background: #f8fafc;
  padding: 8px 12px;
  text-align: left;
  font-weight: 700;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.scale-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
}

/* Report Card Modal */
.report-card-modal {
  max-width: 820px;
  width: 100%;
}

.modal-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #4f46e5;
  text-transform: uppercase;
}

.modal-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0;
}

.modal-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}

.m-stat-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
}

.m-stat-label {
  display: block;
  font-size: 10.5px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
}

.m-stat-val {
  display: block;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.m-stat-sub {
  display: block;
  font-size: 10px;
  color: #94a3b8;
}

.modal-section-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px;
}

.modal-courses-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.modal-courses-table th {
  background: #f8fafc;
  padding: 8px 10px;
  font-weight: 700;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.modal-courses-table td {
  padding: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.mini-tag {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 4px;
  margin-left: 4px;
}

.tag-ap {
  background: #ede9fe;
  color: #6b21a8;
}

.tag-honors {
  background: #fef3c7;
  color: #b45309;
}

.letter-grade-pill {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 800;
}

.course-remark {
  font-size: 11.5px;
  color: #475569;
  font-style: italic;
}

.edit-grade-btn {
  font-size: 11px;
  color: #4f46e5;
  background: transparent;
  border: 1px solid #c7d2fe;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
}

.edit-score-inline {
  display: flex;
  align-items: center;
  gap: 4px;
}

.inline-score-input {
  width: 50px;
  padding: 2px 4px;
  font-size: 12px;
  border: 1px solid #4f46e5;
  border-radius: 4px;
}

.save-score-btn {
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
}

.honor-count-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: #fef3c7;
  color: #92400e;
  font-weight: 700;
  font-size: 12px;
}

.score-pill {
  font-weight: 700;
  color: #0f172a;
}
</style>
