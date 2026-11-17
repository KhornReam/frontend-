<script setup>
import { computed } from 'vue'
import DataTable from '../../components/admin/DataTable.vue'
import StatCard from '../../components/admin/StatCard.vue'

const props = defineProps({
  moduleKey: { type: String, required: true },
})

const modules = {
  classes: {
    eyebrow: 'ACADEMIC STRUCTURE',
    title: 'Classes',
    description: 'Browse class groups, homeroom teachers, and student counts.',
    stats: [
      { label: 'Active classes', value: '38', change: 'Across 6 grades', icon: 'classes', tone: 'green' },
      { label: 'Students assigned', value: '1,284', change: 'Current school year', icon: 'students', tone: 'blue' },
      { label: 'Average class size', value: '34', change: 'Students per class', icon: 'time', tone: 'amber' },
    ],
    columns: [
      { key: 'name', label: 'CLASS' },
      { key: 'grade', label: 'GRADE' },
      { key: 'teacher', label: 'HOMEROOM TEACHER' },
      { key: 'students', label: 'STUDENTS' },
      { key: 'room', label: 'ROOM' },
    ],
    rows: [
      { name: 'Grade 10 - A', grade: 'Grade 10', teacher: 'Maya Patel', students: '36', room: 'Room 204' },
      { name: 'Grade 10 - B', grade: 'Grade 10', teacher: 'Daniel Kim', students: '33', room: 'Room 205' },
      { name: 'Grade 9 - A', grade: 'Grade 9', teacher: 'Ava Thompson', students: '35', room: 'Room 108' },
      { name: 'Grade 9 - B', grade: 'Grade 9', teacher: 'Marcus Vance', students: '32', room: 'Room 110' },
      { name: 'Grade 8 - A', grade: 'Grade 8', teacher: 'Elena Rostova', students: '34', room: 'Room 302' },
    ],
  },
  subjects: {
    eyebrow: 'CURRICULUM',
    title: 'Subjects',
    description: 'View the subjects offered across Grades 10, 11, and 12.',
    stats: [
      { label: 'Subjects offered', value: '9', change: 'Across 3 grade levels', icon: 'classes', tone: 'green' },
      { label: 'Teaching staff', value: '64', change: 'Assigned this year', icon: 'teachers', tone: 'blue' },
      { label: 'Classes covered', value: '38', change: 'Active class groups', icon: 'students', tone: 'purple' },
    ],
    columns: [
      { key: 'name', label: 'SUBJECT' },
      { key: 'code', label: 'CODE' },
      { key: 'grade', label: 'GRADE LEVEL' },
      { key: 'teacher', label: 'LEAD TEACHER' },
    ],
    rows: [
      { name: 'Mathematics', code: 'MAT-101', grade: 'Grades 10-12', teacher: 'Dr. Arthur Pendelton' },
      { name: 'English Literature', code: 'ENG-201', grade: 'Grades 10-12', teacher: 'Sarah Jenkins' },
      { name: 'Chemistry', code: 'CHEM-301', grade: 'Grades 10-12', teacher: 'Michael Chang' },
      { name: 'World History', code: 'HIST-102', grade: 'Grades 10-12', teacher: 'Amanda Brooks' },
      { name: 'Physics', code: 'PHYS-202', grade: 'Grades 10-12', teacher: 'David Miller' },
      { name: 'Biology', code: 'BIO-105', grade: 'Grades 10-12', teacher: 'Rachel Green' },
      { name: 'Civics & Ethics', code: 'CIV-110', grade: 'Grades 10-12', teacher: 'Elena Rostova' },
      { name: 'Computer Science', code: 'CS-401', grade: 'Grades 10-12', teacher: 'Jordan Lee' },
    ],
  },
  attendance: {
    eyebrow: 'DAILY TRACKING',
    title: 'Attendance',
    description: 'A sample overview of student attendance for this week.',
    stats: [
      { label: 'Present today', value: '1,214', change: '94.6% of students', icon: 'attendance', tone: 'green' },
      { label: 'Absent today', value: '52', change: '4.1% of students', icon: 'time', tone: 'amber' },
      { label: 'Late arrivals', value: '18', change: '1.3% of students', icon: 'trend', tone: 'blue' },
    ],
    columns: [
      { key: 'student', label: 'STUDENT' },
      { key: 'class', label: 'CLASS' },
      { key: 'date', label: 'DATE' },
      { key: 'time', label: 'CHECK-IN' },
      { key: 'status', label: 'STATUS' },
    ],
    rows: [
      { student: 'Olivia Martin', class: 'Grade 10 - A', date: 'Oct 26, 2026', time: '8:02 AM', status: 'Present' },
      { student: 'Ethan Wilson', class: 'Grade 8 - B', date: 'Oct 26, 2026', time: '8:17 AM', status: 'Late' },
      { student: 'Sophia Chen', class: 'Grade 11 - A', date: 'Oct 26, 2026', time: '—', status: 'Absent' },
      { student: 'Noah Williams', class: 'Grade 9 - C', date: 'Oct 26, 2026', time: '8:05 AM', status: 'Present' },
      { student: 'Emma Davis', class: 'Grade 10 - B', date: 'Oct 26, 2026', time: '8:00 AM', status: 'Present' },
    ],
  },
  exams: {
    eyebrow: 'ACADEMIC PERFORMANCE',
    title: 'Exams & Scores',
    description: 'Review sample assessments and class results.',
    stats: [
      { label: 'Assessments', value: '12', change: 'This term', icon: 'time', tone: 'green' },
      { label: 'Average score', value: '86.4%', change: '+3.1% from last term', icon: 'trend', tone: 'blue' },
      { label: 'Upcoming exams', value: '3', change: 'Next 14 days', icon: 'classes', tone: 'amber' },
    ],
    columns: [
      { key: 'assessment', label: 'ASSESSMENT' },
      { key: 'subject', label: 'SUBJECT' },
      { key: 'class', label: 'CLASS' },
      { key: 'date', label: 'DATE' },
      { key: 'average', label: 'CLASS AVERAGE' },
    ],
    rows: [
      { assessment: 'Midterm Examination', subject: 'Mathematics', class: 'Grade 10 - A', date: 'Oct 30, 2026', average: '88.2%' },
      { assessment: 'Unit 4 Quiz', subject: 'Biology', class: 'Grade 9 - A', date: 'Nov 2, 2026', average: '84.7%' },
      { assessment: 'Reading Assignment', subject: 'English', class: 'Grade 8 - B', date: 'Nov 5, 2026', average: '86.3%' },
      { assessment: 'Physics Lab Test', subject: 'Physics', class: 'Grade 11 - A', date: 'Nov 9, 2026', average: '89.1%' },
    ],
  },
  users: {
    eyebrow: 'ACCESS MANAGEMENT',
    title: 'Users & Roles',
    description: 'Preview of staff accounts and their workspace access.',
    stats: [
      { label: 'User accounts', value: '68', change: 'School workspace', icon: 'students', tone: 'green' },
      { label: 'Administrator', value: '4', change: 'Full access', icon: 'teachers', tone: 'purple' },
      { label: 'Teacher accounts', value: '64', change: 'Staff access', icon: 'classes', tone: 'blue' },
    ],
    columns: [
      { key: 'name', label: 'USER' },
      { key: 'email', label: 'EMAIL' },
      { key: 'role', label: 'ROLE' },
      { key: 'status', label: 'STATUS' },
    ],
    rows: [
      { name: 'Jordan Lee', email: 'jordan.lee@school.edu', role: 'Administrator', status: 'Active' },
      { name: 'Maya Patel', email: 'maya.patel@school.edu', role: 'Teacher', status: 'Active' },
      { name: 'Daniel Kim', email: 'daniel.kim@school.edu', role: 'Teacher', status: 'Active' },
      { name: 'Sarah Jenkins', email: 'sarah.j@school.edu', role: 'Teacher', status: 'Active' },
    ],
  },
  reports: {
    eyebrow: 'SCHOOL INSIGHTS',
    title: 'Reports',
    description: 'Sample reports for reviewing school activity and outcomes.',
    stats: [
      { label: 'Available reports', value: '8', change: 'Ready to view', icon: 'classes', tone: 'green' },
      { label: 'Scheduled reports', value: '3', change: 'Updated weekly', icon: 'time', tone: 'blue' },
      { label: 'Latest update', value: 'Today', change: '8:30 AM', icon: 'attendance', tone: 'amber' },
    ],
    columns: [
      { key: 'report', label: 'REPORT' },
      { key: 'category', label: 'CATEGORY' },
      { key: 'period', label: 'REPORTING PERIOD' },
      { key: 'updated', label: 'LAST UPDATED' },
    ],
    rows: [
      { report: 'Student Enrollment Summary', category: 'Students', period: '2026–2027', updated: 'Today, 8:30 AM' },
      { report: 'Weekly Attendance', category: 'Attendance', period: 'Oct 19–25, 2026', updated: 'Yesterday' },
      { report: 'Term Performance Overview', category: 'Academic', period: 'Term 2', updated: 'Oct 23, 2026' },
      { report: 'Faculty Workload Distribution', category: 'Staff', period: 'Fall Semester', updated: 'Oct 15, 2026' },
    ],
  },
  settings: {
    eyebrow: 'WORKSPACE PREFERENCES',
    title: 'Settings',
    description: 'School profile, academic term configurations, and workspace settings.',
    settings: [
      { title: 'School Profile', description: 'Manage the official institution name, contact details, and campus address.', detail: 'Greenwood Academy' },
      { title: 'Academic Year', description: 'Current academic calendar, term dates, and grading periods.', detail: '2026–2027 • Term 2 (Active)' },
      { title: 'Notifications', description: 'Configure email digests and urgent student alert notifications.', detail: 'Daily email digest enabled' },
      { title: 'Security & Sign-in', description: 'Review authentication sessions, multi-factor settings, and passwords.', detail: 'Administrator access level' },
    ],
  },
}

const page = computed(() => modules[props.moduleKey] || modules.classes)
</script>

<template>
  <section class="static-module">
    <header class="module-heading">
      <div>
        <p class="module-eyebrow">{{ page.eyebrow }}</p>
        <h1>{{ page.title }}</h1>
        <p class="module-desc">{{ page.description }}</p>
      </div>
      <span class="preview-badge">
        <span class="preview-dot"></span>
        Interactive Module
      </span>
    </header>

    <div v-if="page.stats" class="module-stats">
      <StatCard v-for="stat in page.stats" :key="stat.label" v-bind="stat" />
    </div>

    <!-- Table Panel -->
    <section v-if="page.rows" class="module-panel">
      <header class="module-panel-heading">
        <div>
          <h2>{{ page.title }} Overview</h2>
          <p>Active records and details</p>
        </div>
        <span class="sample-tag">SYSTEM DATA</span>
      </header>
      <DataTable :columns="page.columns" :rows="page.rows">
        <template #cell-status="{ value }">
          <span class="status-pill" :class="`status-${value.toLowerCase()}`">
            <span></span>{{ value }}
          </span>
        </template>
      </DataTable>
      <footer class="module-footer">
        Showing {{ page.rows.length }} records
      </footer>
    </section>

    <!-- Settings Grid -->
    <div v-else class="settings-grid">
      <article v-for="item in page.settings" :key="item.title" class="setting-card">
        <div class="setting-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div class="setting-content">
          <h2>{{ item.title }}</h2>
          <p>{{ item.description }}</p>
          <strong>{{ item.detail }}</strong>
        </div>
        <span class="setting-arrow" aria-hidden="true">→</span>
      </article>
    </div>
  </section>
</template>

<style scoped>
.static-module {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.module-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  background-color: #ffffff;
  padding: 24px 28px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.module-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: var(--color-primary);
  margin-bottom: 6px;
}

.module-heading h1 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: var(--color-text);
  margin: 0;
}

.module-desc {
  margin: 6px 0 0 0;
  color: var(--color-text-muted);
  font-size: 13.5px;
}

.preview-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface-hover);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.preview-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--color-success);
}

.module-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.sample-tag {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.setting-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: #ffffff;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
  cursor: pointer;
}

.setting-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.setting-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.setting-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-content h2 {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.setting-content p {
  font-size: 12.5px;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.4;
}

.setting-content strong {
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 600;
  margin-top: 4px;
}

.setting-arrow {
  color: var(--color-text-subtle);
  font-size: 18px;
  font-weight: 600;
  transition: transform 0.15s ease;
}

.setting-card:hover .setting-arrow {
  transform: translateX(3px);
  color: var(--color-primary);
}

@media (max-width: 900px) {
  .module-stats {
    grid-template-columns: 1fr;
  }
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
