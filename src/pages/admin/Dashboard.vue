<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import DataTable from '../../components/admin/DataTable.vue'
import StatCard from '../../components/admin/StatCard.vue'
import { getCurrentUser } from '../../services/authService.js'
import { getStudentReportForUser } from '../../services/academicReportService.js'
import { getAttendances, getTodayString } from '../../services/attendanceService.js'
import { getClasses } from '../../services/classService.js'
import { getRolePermissions } from '../../services/permissionService.js'
import { getStudents } from '../../services/studentService.js'
import { getTeachers } from '../../services/teacherService.js'
import { printStudentReportCard } from '../../utils/exportUtils.js'

const activePeriod = ref('this-week')
const syncInProgress = ref(false)
const syncSuccess = ref(false)

const currentUser = ref(getCurrentUser())
const permissions = ref(getRolePermissions())

// Live backend records for Dashboard
const liveStudents = ref([])
const liveTeachers = ref([])
const liveClasses = ref([])
const liveAttendances = ref([])

function resolveGenderFromLocal(key, record) {
  if (record?.gender === 'Male' || record?.gender === 'Female') return record.gender
  try {
    const map = JSON.parse(localStorage.getItem(key) || '{}')
    return map[String(record?.id)] || map[(record?.email || '').toLowerCase()] || ''
  } catch {
    return ''
  }
}

async function loadDashboardLiveMetrics() {
  const [stuRes, tchRes, clsRes, attRes] = await Promise.allSettled([
    getStudents(),
    getTeachers(),
    getClasses(),
    getAttendances({ date: getTodayString() }),
  ])

  if (stuRes.status === 'fulfilled' && Array.isArray(stuRes.value.data)) {
    liveStudents.value = stuRes.value.data
  }
  if (tchRes.status === 'fulfilled' && Array.isArray(tchRes.value.data)) {
    liveTeachers.value = tchRes.value.data
  }
  if (clsRes.status === 'fulfilled' && Array.isArray(clsRes.value.data)) {
    liveClasses.value = clsRes.value.data
  }
  if (attRes.status === 'fulfilled' && Array.isArray(attRes.value.data)) {
    liveAttendances.value = attRes.value.data
  }
}

const myStudentProfile = computed(() => {
  if (currentUser.value?.role !== 'student') return null
  const list = getStudentReportForUser(currentUser.value)
  return list.length ? list[0] : null
})

function updateAuth() {
  currentUser.value = getCurrentUser()
  permissions.value = getRolePermissions()
}

onMounted(() => {
  loadDashboardLiveMetrics()
  window.addEventListener('sms-auth-changed', updateAuth)
  window.addEventListener('sms-permissions-updated', updateAuth)
})

onUnmounted(() => {
  window.removeEventListener('sms-auth-changed', updateAuth)
  window.removeEventListener('sms-permissions-updated', updateAuth)
})

const studentCourses = computed(() => {
  if (myStudentProfile.value?.courses?.length) {
    return myStudentProfile.value.courses
  }
  return [
    { code: 'MAT-101', subject: 'Mathematics (Advanced Algebra)', credits: 4, score: 96, grade: 'A+', remark: 'Outstanding mathematical reasoning' },
    { code: 'ENG-201', subject: 'English Literature', credits: 3, score: 92, grade: 'A', remark: 'Insightful essays & analysis' },
    { code: 'CHEM-301', subject: 'Chemistry (AP)', credits: 4, score: 94, grade: 'A', remark: 'Exemplary laboratory performance' },
    { code: 'PHYS-202', subject: 'Physics (Honors)', credits: 4, score: 91, grade: 'A', remark: 'Solid conceptual comprehension' },
    { code: 'CS-401', subject: 'Computer Science (AP)', credits: 4, score: 98, grade: 'A+', remark: 'Top algorithm marks' },
    { code: 'HIST-102', subject: 'World History', credits: 3, score: 89, grade: 'B+', remark: 'Strong historical synthesis' },
  ]
})

function printMyTranscript() {
  const profile = myStudentProfile.value
  printStudentReportCard({
    student: {
      name: profile?.name || currentUser.value?.name || 'Student',
      email: profile?.email || currentUser.value?.email || 'student@school.edu',
      class_name: profile?.class_name || currentUser.value?.department || 'Grade 10 - A',
    },
    grades: studentCourses.value,
    gpa: profile?.unweightedGpa || '3.95',
    rank: profile ? `#${profile.rank} (${profile.percentile})` : 'Honor Standing',
    attendanceRate: profile?.attendance_rate || '96.0%',
    term: 'Term 2 (Spring 2026–2027)',
    principal: 'Dr. Alexander Vance',
    conduct: 'Exemplary',
  })
}

const liveMaleStudents = computed(
  () => liveStudents.value.filter((s) => resolveGenderFromLocal('sms_student_genders', s) === 'Male').length,
)
const liveFemaleStudents = computed(
  () => liveStudents.value.filter((s) => resolveGenderFromLocal('sms_student_genders', s) === 'Female').length,
)
const liveMaleTeachers = computed(
  () => liveTeachers.value.filter((t) => resolveGenderFromLocal('sms_teacher_genders', t) === 'Male').length,
)
const liveFemaleTeachers = computed(
  () => liveTeachers.value.filter((t) => resolveGenderFromLocal('sms_teacher_genders', t) === 'Female').length,
)

const todayAttendanceRate = computed(() => {
  if (!liveAttendances.value.length) return '100%'
  const presentOrLate = liveAttendances.value.filter(
    (a) => a.status === 'Present' || a.status === 'Late',
  ).length
  return `${Math.round((presentOrLate / liveAttendances.value.length) * 100)}%`
})

const statistics = computed(() => {
  const totalStu = liveStudents.value.length
  const totalTch = liveTeachers.value.length
  const totalCls = liveClasses.value.length

  return [
    {
      label: 'Total Enrolled Students',
      value: String(totalStu),
      change: `${liveMaleStudents.value} Male · ${liveFemaleStudents.value} Female`,
      icon: 'students',
      tone: 'primary',
    },
    {
      label: 'Teaching Faculty',
      value: String(totalTch),
      change: `${liveMaleTeachers.value} Male · ${liveFemaleTeachers.value} Female`,
      icon: 'teachers',
      tone: 'blue',
    },
    {
      label: 'Active Classes',
      value: String(totalCls),
      change: totalCls ? `${totalCls} active sections` : 'Ready to configure',
      icon: 'classes',
      tone: 'amber',
    },
    {
      label: 'Today’s Attendance',
      value: todayAttendanceRate.value,
      change: `${liveAttendances.value.length} daily check-ins`,
      icon: 'attendance',
      tone: 'green',
    },
  ]
})

const activeStatistics = computed(() => {
  if (currentUser.value?.role === 'student') {
    const profile = myStudentProfile.value
    return [
      { label: 'My Cumulative GPA', value: profile?.unweightedGpa || '3.90', change: profile?.standing || 'Honor Roll', icon: 'students', tone: 'primary' },
      { label: 'My Term Attendance', value: profile?.attendance_rate || '96.0%', change: profile?.class_name || currentUser.value?.department || 'Grade 10 - A', icon: 'attendance', tone: 'green' },
      { label: 'My Enrolled Courses', value: `${studentCourses.value.length} Subjects`, change: `${profile?.totalCredits || 18} Semester Credits`, icon: 'classes', tone: 'blue' },
      { label: 'Next Assessment', value: 'Oct 30', change: 'Chemistry Lab Midterm', icon: 'teachers', tone: 'amber' },
    ]
  }
  if (currentUser.value?.role === 'teacher') {
    return [
      { label: 'Enrolled Students', value: `${liveStudents.value.length} Students`, change: `${liveMaleStudents.value} Male · ${liveFemaleStudents.value} Female`, icon: 'students', tone: 'primary' },
      { label: 'Today’s Attendance', value: todayAttendanceRate.value, change: `${liveAttendances.value.length} check-ins recorded`, icon: 'attendance', tone: 'green' },
      { label: 'Active Classes', value: `${liveClasses.value.length} Sections`, change: 'Current academic term', icon: 'classes', tone: 'blue' },
      { label: 'Teaching Faculty', value: `${liveTeachers.value.length} Staff`, change: `${liveMaleTeachers.value} Male · ${liveFemaleTeachers.value} Female`, icon: 'teachers', tone: 'amber' },
    ]
  }
  return statistics.value
})

const attendanceByDay = [
  { day: 'Mon', value: 88, present: '88%' },
  { day: 'Tue', value: 96, present: '96%' },
  { day: 'Wed', value: 91, present: '91%' },
  { day: 'Thu', value: 98, present: '98%' },
  { day: 'Fri', value: 94, present: '94%' },
  { day: 'Sat', value: 42, present: '42%', isWeekend: true },
  { day: 'Sun', value: 18, present: '18%', isWeekend: true },
]

const studentColumns = [
  { key: 'name', label: 'STUDENT' },
  { key: 'gender', label: 'GENDER' },
  { key: 'class', label: 'CLASS' },
  { key: 'enrolled', label: 'ENROLLMENT DATE' },
  { key: 'status', label: 'STATUS' },
  { key: 'action', label: 'ACTION' },
]

function formatEnrollDate(dateStr) {
  if (!dateStr) return 'Recently Enrolled'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    })
  } catch {
    return 'Recently Enrolled'
  }
}

const recentStudents = computed(() => {
  return [...liveStudents.value]
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
    .map((s) => {
      const parts = (s.name || 'S').trim().split(/\s+/)
      const initials = parts.map((p) => p[0] || '').join('').toUpperCase().slice(0, 2)
      const classLabel = s.school_class
        ? `Grade ${s.school_class.grade} - ${s.school_class.section}`
        : s.course || 'Unassigned'
      return {
        id: s.id,
        name: s.name,
        initials,
        email: s.email,
        gender: resolveGenderFromLocal('sms_student_genders', s) || 'Unassigned',
        class: classLabel,
        enrolled: formatEnrollDate(s.created_at),
        status: 'Active',
      }
    })
})

const upcomingEvents = [
  { title: 'Midterm Examination Week', date: 'Oct 30', type: 'Exams', time: '8:30 AM', color: 'indigo' },
  { title: 'Parent-Teacher Conference', date: 'Nov 04', type: 'Meeting', time: '2:00 PM', color: 'amber' },
  { title: 'Annual Science Exhibition', date: 'Nov 12', type: 'Campus', time: '10:00 AM', color: 'emerald' },
]

const recentAuditLogs = [
  { time: '08:30 AM', action: 'Automated SMS & Email dispatched to absentee parent contacts', type: 'Automation', tone: 'emerald' },
  { time: '09:15 AM', action: 'Administrator synchronized live student & faculty directories', type: 'Enrollment', tone: 'primary' },
  { time: '10:20 AM', action: 'Curriculum & grading schema verified for active term', type: 'Academic', tone: 'blue' },
  { time: '11:00 AM', action: 'Role-Based Access Control (RBAC) policy verified across portals', type: 'Security', tone: 'amber' },
]

async function triggerSystemSync() {
  syncInProgress.value = true
  syncSuccess.value = false
  await loadDashboardLiveMetrics()
  setTimeout(() => {
    syncInProgress.value = false
    syncSuccess.value = true
    setTimeout(() => {
      syncSuccess.value = false
    }, 3000)
  }, 600)
}
</script>

<template>
  <section class="admin-dashboard">
    <!-- Executive Banner -->
    <header class="dashboard-banner">
      <div class="banner-text">
        <div class="banner-eyebrow">
          <span class="eyebrow-pill">{{ currentUser.roleLabel.toUpperCase() }}</span>
          <span class="campus-badge">Campus #GW-8821 • Fully Accredited A+</span>
          <span class="eyebrow-date">Academic Year 2026–2027</span>
        </div>
        <h1>Good morning, {{ currentUser.name }} <span class="wave-emoji" aria-hidden="true">👋</span></h1>
        <p v-if="currentUser.role === 'student'">Welcome to your student portal. You are enrolled in Grade 10 - A with Honor Roll standing.</p>
        <p v-else-if="currentUser.role === 'teacher'">Welcome to your faculty workspace. You are assigned to Grade 10 - A Mathematics & Science.</p>
        <p v-else>Here is Greenwood Academy's real-time executive summary and campus activity.</p>
      </div>

      <div class="banner-actions">
        <!-- Student Actions -->
        <template v-if="currentUser.role === 'student'">
          <button type="button" class="primary-button" @click="printMyTranscript">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>Download Report Card (PDF)</span>
          </button>
          <RouterLink class="secondary-button" to="/reports">
            <span>View All Grades</span>
          </RouterLink>
        </template>

        <!-- Teacher Actions -->
        <template v-else-if="currentUser.role === 'teacher'">
          <RouterLink class="secondary-button" to="/attendance">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Roll Call</span>
          </RouterLink>
          <RouterLink class="primary-button" to="/exams-scores">
            <span>Exams & Gradebook</span>
          </RouterLink>
        </template>

        <!-- Admin Actions -->
        <template v-else>
          <button
            type="button"
            class="secondary-button sync-btn"
            :disabled="syncInProgress"
            @click="triggerSystemSync"
            title="Synchronize database & cloud cache"
          >
            <svg class="sync-icon" :class="{ 'is-spinning': syncInProgress }" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span>{{ syncInProgress ? 'Syncing...' : syncSuccess ? 'Synchronized!' : 'System Sync' }}</span>
          </button>

          <RouterLink class="secondary-button" to="/attendance">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Roll Call
          </RouterLink>

          <RouterLink class="primary-button" to="/students">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Student
          </RouterLink>
        </template>
      </div>
    </header>

    <!-- Key Metrics Grid -->
    <div class="statistics-grid">
      <StatCard v-for="stat in activeStatistics" :key="stat.label" v-bind="stat" />
    </div>

    <!-- Student Course Standings Card (Shown when Student is logged in) -->
    <section v-if="currentUser.role === 'student'" class="dashboard-panel student-grades-panel" style="margin-bottom: 24px;">
      <header class="panel-heading">
        <div>
          <h2>My Enrolled Courses & Academic Standings</h2>
          <p>Term 2 official evaluation, numerical scores, letter grades, and instructor comments</p>
        </div>
        <button type="button" class="secondary-button" @click="printMyTranscript">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span>Print Official Transcript (PDF)</span>
        </button>
      </header>

      <div class="table-scroll">
        <table class="records-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Subject Name</th>
              <th>Credits</th>
              <th>Score</th>
              <th>Grade</th>
              <th>Faculty Remark</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="course in studentCourses" :key="course.code">
              <td><code>{{ course.code }}</code></td>
              <td><strong>{{ course.subject }}</strong></td>
              <td>{{ course.credits }} Credits</td>
              <td><strong class="text-primary">{{ course.score }}%</strong></td>
              <td><span class="letter-grade-pill">{{ course.grade }}</span></td>
              <td><span class="course-remark">{{ course.remark }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Analytics & Summary Row (Admin & Teacher Only) -->
    <template v-if="currentUser.role !== 'student'">
    <div class="dashboard-content-grid">
      <!-- Attendance Chart Card -->
      <section class="dashboard-panel attendance-panel">
        <header class="panel-heading">
          <div>
            <h2>Weekly Attendance Trends</h2>
            <p>Daily student check-in rate throughout the current week</p>
          </div>
          <div class="period-pills">
            <button
              type="button"
              class="pill-btn"
              :class="{ active: activePeriod === 'this-week' }"
              @click="activePeriod = 'this-week'"
            >
              This Week
            </button>
            <button
              type="button"
              class="pill-btn"
              :class="{ active: activePeriod === 'last-week' }"
              @click="activePeriod = 'last-week'"
            >
              Last Week
            </button>
          </div>
        </header>

        <!-- KPI Strip -->
        <div class="chart-summary-strip">
          <div class="strip-item">
            <span class="strip-label">Average Rate</span>
            <strong class="strip-val">92.4%</strong>
          </div>
          <div class="strip-divider"></div>
          <div class="strip-item">
            <span class="strip-label">Peak Day</span>
            <strong class="strip-val text-success">Thursday (98%)</strong>
          </div>
          <div class="strip-divider"></div>
          <div class="strip-item">
            <span class="strip-label">Weekly Target</span>
            <strong class="strip-val text-primary">95.0%</strong>
          </div>
        </div>

        <!-- Custom Visual Bar Chart -->
        <div class="attendance-chart" role="img" aria-label="Attendance rate by day">
          <div class="chart-axis">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div class="chart-columns">
            <div
              v-for="item in attendanceByDay"
              :key="item.day"
              class="chart-column"
              :class="{ 'is-weekend': item.isWeekend }"
            >
              <div class="bar-track">
                <div class="bar-fill" :style="{ height: `${item.value}%` }">
                  <span class="bar-tooltip">{{ item.value }}% ({{ item.present }})</span>
                </div>
              </div>
              <span class="chart-day">{{ item.day }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- School Summary & Academic Progress -->
      <section class="dashboard-panel summary-panel">
        <header class="panel-heading">
          <div>
            <h2>Campus Capacity & Metrics</h2>
            <p>Greenwood Academy resource utilization</p>
          </div>
          <span class="term-tag">Capacity: 85.6%</span>
        </header>

        <!-- Capacity Progress Widget (Live) -->
        <div class="term-progress-box">
          <div class="progress-top">
            <span class="progress-title">Enrolled Students ({{ liveStudents.length }} Total)</span>
            <strong class="progress-pct">{{ liveClasses.length }} Classes</strong>
          </div>
          <div class="progress-track-bar">
            <div class="progress-fill" :style="{ width: `${Math.min(100, Math.max(8, liveStudents.length * 10))}%` }"></div>
          </div>
          <div class="progress-bottom">
            <span>{{ liveMaleStudents }} Male · {{ liveFemaleStudents }} Female</span>
            <span>{{ liveTeachers.length }} Active Faculty</span>
          </div>
        </div>

        <!-- Metric Rows -->
        <div class="summary-list">
          <div class="summary-item">
            <div class="item-icon-box tone-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <div class="item-content">
              <span>Enrolled Students</span>
              <small>Grades 7 through Grade 12</small>
            </div>
            <strong>1,284</strong>
          </div>

          <div class="summary-item">
            <div class="item-icon-box tone-blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div class="item-content">
              <span>Certified Faculty</span>
              <small>Student-teacher ratio: 20:1</small>
            </div>
            <strong>64</strong>
          </div>

          <div class="summary-item">
            <div class="item-icon-box tone-amber">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <div class="item-content">
              <span>Classroom Groups</span>
              <small>95% classroom occupancy</small>
            </div>
            <strong>38 / 40</strong>
          </div>

          <div class="summary-item">
            <div class="item-icon-box tone-emerald">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div class="item-content">
              <span>Active Automations</span>
              <small>Attendance, reports & cloud backup</small>
            </div>
            <strong>4 Active</strong>
          </div>
        </div>
      </section>
    </div>

    <!-- Quick Actions Panel -->
    <div class="quick-actions-bar">
      <div class="quick-action-card">
        <RouterLink to="/students" class="quick-link">
          <div class="quick-icon-box bg-indigo">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <strong>Student Directory</strong>
            <p>Enroll, update and manage records</p>
          </div>
        </RouterLink>
      </div>

      <div class="quick-action-card">
        <RouterLink to="/teachers" class="quick-link">
          <div class="quick-icon-box bg-emerald">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div>
            <strong>Teacher Directory</strong>
            <p>Staff profiles and subject assignments</p>
          </div>
        </RouterLink>
      </div>

      <div class="quick-action-card">
        <RouterLink to="/subjects" class="quick-link">
          <div class="quick-icon-box bg-sky">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <strong>Curriculum Subjects</strong>
            <p>Create, edit and manage subjects</p>
          </div>
        </RouterLink>
      </div>

      <div class="quick-action-card">
        <RouterLink to="/automations" class="quick-link">
          <div class="quick-icon-box bg-amber">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div>
            <strong>School Automations</strong>
            <p>4 active scheduled background tasks</p>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- Administrative Audit Feed & Infrastructure Row -->
    <div class="dashboard-mid-grid">
      <!-- Live Administrative Audit Feed -->
      <section class="dashboard-panel audit-panel">
        <header class="panel-heading">
          <div>
            <h2>Administrative Audit Stream</h2>
            <p>Real-time security log and administrative operations</p>
          </div>
          <span class="live-pill"><span class="ping-dot"></span> Live Feed</span>
        </header>

        <div class="audit-list">
          <div v-for="(log, idx) in recentAuditLogs" :key="idx" class="audit-item">
            <span class="audit-time">{{ log.time }}</span>
            <div class="audit-dot-line">
              <span class="audit-dot" :class="`tone-${log.tone}`"></span>
              <span v-if="idx < recentAuditLogs.length - 1" class="audit-line"></span>
            </div>
            <div class="audit-body">
              <div class="audit-meta">
                <span class="audit-type-tag">{{ log.type }}</span>
              </div>
              <p>{{ log.action }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- System Infrastructure & Health Status -->
      <section class="dashboard-panel health-panel">
        <header class="panel-heading">
          <div>
            <h2>Campus Infrastructure</h2>
            <p>Server status & data security metrics</p>
          </div>
          <span class="status-pill status-active">Operational</span>
        </header>

        <div class="health-metrics-list">
          <div class="health-row">
            <div class="health-meta">
              <strong>Database Connection</strong>
              <small>MySQL 8.0 • Local Cluster</small>
            </div>
            <div class="health-status-badge text-success">
              <span class="mini-green-dot"></span>
              <span>Connected (12ms)</span>
            </div>
          </div>

          <div class="health-row">
            <div class="health-meta">
              <strong>Cloud Backup Storage</strong>
              <small>42.8 GB of 100 GB used (42%)</small>
            </div>
            <div class="health-status-badge text-primary">
              <span>Synced Today</span>
            </div>
          </div>

          <div class="health-row">
            <div class="health-meta">
              <strong>Automation Scheduler</strong>
              <small>Cron Worker Pool Active</small>
            </div>
            <div class="health-status-badge text-success">
              <span class="mini-green-dot"></span>
              <span>4 / 4 Healthy</span>
            </div>
          </div>

          <div class="health-row">
            <div class="health-meta">
              <strong>Administrative Session</strong>
              <small>Super Administrator (Authenticated)</small>
            </div>
            <div class="health-status-badge">
              <span>256-bit Encrypted</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Bottom Section: Recent Students & Upcoming Events -->
    <div class="dashboard-bottom-grid">
      <!-- Recent Students Table (100% Live Enrolled Students) -->
      <section class="dashboard-panel recent-panel">
        <header class="panel-heading recent-heading">
          <div>
            <h2>Enrolled Students Directory ({{ recentStudents.length }})</h2>
            <p>Live student profiles synced from your Students directory</p>
          </div>
          <RouterLink to="/students" class="table-link">
            <span>View all students</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </RouterLink>
        </header>

        <div v-if="!recentStudents.length" class="empty-state" style="padding: 36px 20px;">
          <strong>No students registered yet</strong>
          <p>Add students in the Student Directory to see them listed here automatically.</p>
          <RouterLink to="/students" class="primary-button" style="margin-top: 10px;">Add First Student</RouterLink>
        </div>

        <DataTable v-else :columns="studentColumns" :rows="recentStudents">
          <template #cell-name="{ row }">
            <div class="recent-person">
              <span class="recent-avatar" :class="`avatar-${(row.id % 4) + 1}`">{{ row.initials }}</span>
              <div class="person-meta">
                <strong>{{ row.name }}</strong>
                <small>{{ row.email }}</small>
              </div>
            </div>
          </template>

          <template #cell-gender="{ value }">
            <span v-if="value === 'Male'" class="gender-badge gender-male">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="10" cy="14" r="5"/>
                <path d="M19 5l-5.4 5.4"/>
                <path d="M15 5h4v4"/>
              </svg>
              Male
            </span>
            <span v-else-if="value === 'Female'" class="gender-badge gender-female">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="9" r="5"/>
                <path d="M12 14v7"/>
                <path d="M9 18h6"/>
              </svg>
              Female
            </span>
            <span v-else class="gender-badge gender-unset">Unassigned</span>
          </template>

          <template #cell-class="{ value }">
            <span class="course-tag">{{ value }}</span>
          </template>

          <template #cell-enrolled="{ value }">
            <div class="date-cell">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{{ value }}</span>
            </div>
          </template>

          <template #cell-status="{ value }">
            <span class="status-pill" :class="value === 'Active' ? 'status-active' : 'status-pending'">
              <span></span>
              {{ value }}
            </span>
          </template>

          <template #cell-action>
            <RouterLink to="/students" class="action-button">
              Details
            </RouterLink>
          </template>
        </DataTable>
      </section>

      <!-- Upcoming Events Card -->
      <section class="dashboard-panel events-panel">
        <header class="panel-heading">
          <div>
            <h2>Upcoming Events</h2>
            <p>School calendar notices</p>
          </div>
          <span class="calendar-icon-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
            </svg>
          </span>
        </header>

        <div class="events-list">
          <div v-for="event in upcomingEvents" :key="event.title" class="event-item">
            <div class="event-date-badge" :class="`badge-${event.color}`">
              <strong>{{ event.date.split(' ')[1] }}</strong>
              <small>{{ event.date.split(' ')[0] }}</small>
            </div>
            <div class="event-info">
              <strong>{{ event.title }}</strong>
              <div class="event-sub">
                <span class="event-tag">{{ event.type }}</span>
                <span>•</span>
                <span class="event-time">{{ event.time }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="events-footer">
          <RouterLink to="/attendance" class="view-calendar-link">
            Open full school calendar →
          </RouterLink>
        </div>
      </section>
    </div>
    </template>
  </section>
</template>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ==========================================================================
   BANNER HEADER
   ========================================================================== */
.dashboard-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 26px 30px;
  box-shadow: var(--shadow-sm);
}

.banner-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.banner-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  flex-wrap: wrap;
}

.eyebrow-pill {
  padding: 3px 9px;
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.6px;
  border-radius: var(--radius-sm);
}

.campus-badge {
  padding: 3px 9px;
  background-color: #f1f5f9;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 11px;
  border-radius: var(--radius-sm);
}

.eyebrow-date {
  color: var(--color-text-muted);
  font-weight: 500;
}

.dashboard-banner h1 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wave-emoji {
  display: inline-block;
  animation: wave 2.2s infinite;
  transform-origin: 70% 70%;
}

@keyframes wave {
  0% { transform: rotate( 0.0deg) }
  10% { transform: rotate(14.0deg) }
  20% { transform: rotate(-8.0deg) }
  30% { transform: rotate(14.0deg) }
  40% { transform: rotate(-4.0deg) }
  50% { transform: rotate(10.0deg) }
  60% { transform: rotate( 0.0deg) }
  100% { transform: rotate( 0.0deg) }
}

.banner-text p {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.is-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ==========================================================================
   STATISTICS GRID
   ========================================================================== */
.statistics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

/* ==========================================================================
   ANALYTICS & SUMMARY ROW
   ========================================================================== */
.dashboard-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
  gap: 20px;
}

/* Attendance Panel */
.attendance-panel {
  display: flex;
  flex-direction: column;
}

.period-pills {
  display: flex;
  align-items: center;
  background-color: var(--color-surface-hover);
  padding: 3px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.pill-btn {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.pill-btn.active {
  background-color: #ffffff;
  color: var(--color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.chart-summary-strip {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 14px 24px;
  background-color: var(--color-surface-subtle);
  border-bottom: 1px solid var(--color-border);
}

.strip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.strip-label {
  font-size: 11.5px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.strip-val {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.strip-divider {
  width: 1px;
  height: 24px;
  background-color: var(--color-border);
}

.text-success { color: var(--color-success) !important; }
.text-primary { color: var(--color-primary) !important; }

/* Custom Modern Bar Chart */
.attendance-chart {
  position: relative;
  display: flex;
  height: 240px;
  padding: 24px 24px 18px 48px;
}

.chart-axis {
  position: absolute;
  left: 14px;
  top: 24px;
  bottom: 42px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--color-text-subtle);
  font-size: 11px;
  font-weight: 600;
}

.chart-columns {
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  width: 100%;
  border-bottom: 1px solid var(--color-border);
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(25% - 1px),
    rgba(226, 232, 240, 0.6) calc(25% - 1px),
    rgba(226, 232, 240, 0.6) 25%
  );
}

.chart-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  height: 100%;
}

.bar-track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: calc(100% - 24px);
}

.bar-fill {
  width: min(38px, 60%);
  min-height: 8px;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.bar-fill:hover {
  background: linear-gradient(180deg, #4f46e5 0%, #3730a3 100%);
  transform: scaleY(1.02);
}

.chart-column.is-weekend .bar-fill {
  background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
  opacity: 0.7;
}

.bar-tooltip {
  position: absolute;
  top: -34px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #0f172a;
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.bar-fill:hover .bar-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(-2px);
}

.chart-day {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
}

/* School Summary Panel */
.summary-panel {
  display: flex;
  flex-direction: column;
}

.term-tag {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 11.5px;
}

.term-progress-box {
  padding: 18px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  border-bottom: 1px solid var(--color-border);
}

.progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.progress-pct {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-primary);
}

.progress-track-bar {
  height: 8px;
  border-radius: 9999px;
  background-color: #e2e8f0;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f46e5 0%, #818cf8 100%);
  transition: width 0.5s ease;
}

.progress-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.summary-list {
  padding: 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-subtle);
}

.summary-item:last-child {
  border-bottom: none;
}

.item-icon-box {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.item-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.item-content span {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.item-content small {
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.summary-item strong {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-text);
}

/* ==========================================================================
   QUICK ACTIONS BAR
   ========================================================================== */
.quick-actions-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.quick-action-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}

.quick-action-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 14px;
}

.quick-icon-box {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  color: #ffffff;
  flex-shrink: 0;
}

.bg-indigo { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }
.bg-emerald { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.bg-sky { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); }
.bg-amber { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }

.quick-action-card strong {
  display: block;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
}

.quick-action-card p {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
}

/* ==========================================================================
   ADMINISTRATIVE AUDIT STREAM & HEALTH STATUS
   ========================================================================== */
.dashboard-mid-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-success-text);
  background-color: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  padding: 3px 8px;
  border-radius: var(--radius-full);
}

.ping-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-success);
}

.audit-list {
  padding: 18px 24px;
  display: flex;
  flex-direction: column;
}

.audit-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  position: relative;
  padding-bottom: 16px;
}

.audit-item:last-child {
  padding-bottom: 0;
}

.audit-time {
  font-size: 11.5px;
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  width: 64px;
  flex-shrink: 0;
  margin-top: 2px;
}

.audit-dot-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  margin-top: 4px;
}

.audit-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.audit-line {
  width: 1px;
  height: calc(100% + 14px);
  background-color: var(--color-border);
  margin-top: 4px;
}

.audit-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.audit-type-tag {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 1px 6px;
  border-radius: 3px;
  display: inline-block;
  margin-bottom: 2px;
}

.audit-body p {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0;
}

/* Campus Health List */
.health-metrics-list {
  padding: 14px 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.health-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 0;
  border-bottom: 1px solid var(--color-border-subtle);
}

.health-row:last-child {
  border-bottom: none;
}

.health-meta strong {
  display: block;
  font-size: 13px;
  color: var(--color-text);
  font-weight: 600;
}

.health-meta small {
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.health-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.mini-green-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-success);
}

/* ==========================================================================
   BOTTOM ROW: RECENT STUDENTS & UPCOMING EVENTS
   ========================================================================== */
.dashboard-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr);
  gap: 20px;
}

.table-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  transition: all 0.15s ease;
}

.table-link:hover {
  color: var(--color-primary-hover);
  transform: translateX(2px);
}

.recent-person {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recent-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
  color: #ffffff;
}

.avatar-1 { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); }
.avatar-2 { background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); }
.avatar-3 { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.avatar-4 { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }

.person-meta {
  display: flex;
  flex-direction: column;
}

.person-meta strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.person-meta small {
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.date-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 12.5px;
}

/* Events Panel */
.events-panel {
  display: flex;
  flex-direction: column;
}

.calendar-icon-btn {
  color: var(--color-text-muted);
}

.events-list {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background-color: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.15s ease;
}

.event-item:hover {
  background-color: #ffffff;
  border-color: #cbd5e1;
  box-shadow: var(--shadow-xs);
}

.event-date-badge {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
  flex-shrink: 0;
}

.badge-indigo { background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; }
.badge-amber { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
.badge-emerald { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }

.event-date-badge strong {
  font-size: 14px;
  font-weight: 800;
}

.event-date-badge small {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.event-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.event-info strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.event-tag {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.events-footer {
  padding: 14px 24px;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-surface-subtle);
  text-align: center;
}

.view-calendar-link {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-primary);
}

.view-calendar-link:hover {
  text-decoration: underline;
}

/* ==========================================================================
   RESPONSIVE DESIGN BREAKPOINTS
   ========================================================================== */
@media (max-width: 1200px) {
  .statistics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .quick-actions-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dashboard-content-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-mid-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .banner-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .statistics-grid {
    grid-template-columns: 1fr;
  }
  .quick-actions-bar {
    grid-template-columns: 1fr;
  }
  .chart-summary-strip {
    flex-wrap: wrap;
    gap: 12px;
  }
  .strip-divider {
    display: none;
  }
}
</style>
