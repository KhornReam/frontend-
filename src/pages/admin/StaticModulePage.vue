<script setup>
import { computed } from 'vue'
import DataTable from '../../components/admin/DataTable.vue'
import StatCard from '../../components/admin/StatCard.vue'

const props = defineProps({ moduleKey: { type: String, required: true } })

const modules = {
  classes: {
    eyebrow: 'ACADEMIC STRUCTURE', title: 'Classes', description: 'Browse class groups, homeroom teachers, and student counts.',
    stats: [{ label: 'Active classes', value: '38', change: 'Across 6 grades', icon: '▤', tone: 'green' }, { label: 'Students assigned', value: '1,284', change: 'Current school year', icon: '♙', tone: 'blue' }, { label: 'Average class size', value: '34', change: 'Students per class', icon: '◷', tone: 'amber' }],
    columns: [{ key: 'name', label: 'CLASS' }, { key: 'grade', label: 'GRADE' }, { key: 'teacher', label: 'HOMEROOM TEACHER' }, { key: 'students', label: 'STUDENTS' }, { key: 'room', label: 'ROOM' }],
    rows: [{ name: 'Grade 10 - A', grade: 'Grade 10', teacher: 'Maya Patel', students: '36', room: 'Room 204' }, { name: 'Grade 10 - B', grade: 'Grade 10', teacher: 'Daniel Kim', students: '33', room: 'Room 205' }, { name: 'Grade 9 - A', grade: 'Grade 9', teacher: 'Ava Thompson', students: '35', room: 'Room 108' }],
  },
  subjects: {
    eyebrow: 'CURRICULUM', title: 'Subjects', description: 'View the subjects offered across the school.',
    stats: [{ label: 'Subjects offered', value: '24', change: 'Across 6 grades', icon: '◇', tone: 'green' }, { label: 'Teaching staff', value: '64', change: 'Assigned this year', icon: '♧', tone: 'blue' }, { label: 'Classes covered', value: '38', change: 'Active class groups', icon: '▤', tone: 'purple' }],
    columns: [{ key: 'name', label: 'SUBJECT' }, { key: 'code', label: 'CODE' }, { key: 'grade', label: 'GRADE LEVEL' }, { key: 'teacher', label: 'LEAD TEACHER' }],
    rows: [{ name: 'Mathematics', code: 'MAT-10', grade: 'Grades 7–12', teacher: 'Maya Patel' }, { name: 'English Language', code: 'ENG-01', grade: 'Grades 7–12', teacher: 'Daniel Kim' }, { name: 'Biology', code: 'BIO-11', grade: 'Grades 9–12', teacher: 'Ava Thompson' }],
  },
  attendance: {
    eyebrow: 'DAILY TRACKING', title: 'Attendance', description: 'A sample overview of student attendance for this week.',
    stats: [{ label: 'Present today', value: '1,214', change: '94.6% of students', icon: '✓', tone: 'green' }, { label: 'Absent today', value: '52', change: '4.1% of students', icon: '—', tone: 'amber' }, { label: 'Late arrivals', value: '18', change: '1.3% of students', icon: '◷', tone: 'blue' }],
    columns: [{ key: 'student', label: 'STUDENT' }, { key: 'class', label: 'CLASS' }, { key: 'date', label: 'DATE' }, { key: 'time', label: 'CHECK-IN' }, { key: 'status', label: 'STATUS' }],
    rows: [{ student: 'Olivia Martin', class: 'Grade 10 - A', date: 'Oct 26, 2026', time: '8:02 AM', status: 'Present' }, { student: 'Ethan Wilson', class: 'Grade 8 - B', date: 'Oct 26, 2026', time: '8:17 AM', status: 'Late' }, { student: 'Sophia Chen', class: 'Grade 11 - A', date: 'Oct 26, 2026', time: '—', status: 'Absent' }],
  },
  exams: {
    eyebrow: 'ACADEMIC PERFORMANCE', title: 'Exams & Scores', description: 'Review sample assessments and class results.',
    stats: [{ label: 'Assessments', value: '12', change: 'This term', icon: '◷', tone: 'green' }, { label: 'Average score', value: '86.4%', change: '+3.1% from last term', icon: '↗', tone: 'blue' }, { label: 'Upcoming exams', value: '3', change: 'Next 14 days', icon: '▣', tone: 'amber' }],
    columns: [{ key: 'assessment', label: 'ASSESSMENT' }, { key: 'subject', label: 'SUBJECT' }, { key: 'class', label: 'CLASS' }, { key: 'date', label: 'DATE' }, { key: 'average', label: 'CLASS AVERAGE' }],
    rows: [{ assessment: 'Midterm Examination', subject: 'Mathematics', class: 'Grade 10 - A', date: 'Oct 30, 2026', average: '88.2%' }, { assessment: 'Unit 4 Quiz', subject: 'Biology', class: 'Grade 9 - A', date: 'Nov 2, 2026', average: '84.7%' }, { assessment: 'Reading Assignment', subject: 'English', class: 'Grade 8 - B', date: 'Nov 5, 2026', average: '86.3%' }],
  },
  users: {
    eyebrow: 'ACCESS MANAGEMENT', title: 'Users & Roles', description: 'Preview of staff accounts and their workspace access.',
    stats: [{ label: 'User accounts', value: '68', change: 'School workspace', icon: '♙', tone: 'green' }, { label: 'Administrator', value: '4', change: 'Full access', icon: '⚙', tone: 'purple' }, { label: 'Teacher accounts', value: '64', change: 'Staff access', icon: '♧', tone: 'blue' }],
    columns: [{ key: 'name', label: 'USER' }, { key: 'email', label: 'EMAIL' }, { key: 'role', label: 'ROLE' }, { key: 'status', label: 'STATUS' }],
    rows: [{ name: 'Jordan Lee', email: 'jordan.lee@school.edu', role: 'Administrator', status: 'Active' }, { name: 'Maya Patel', email: 'maya.patel@school.edu', role: 'Teacher', status: 'Active' }, { name: 'Daniel Kim', email: 'daniel.kim@school.edu', role: 'Teacher', status: 'Active' }],
  },
  reports: {
    eyebrow: 'SCHOOL INSIGHTS', title: 'Reports', description: 'Sample reports for reviewing school activity and outcomes.',
    stats: [{ label: 'Available reports', value: '8', change: 'Ready to view', icon: '▥', tone: 'green' }, { label: 'Scheduled reports', value: '3', change: 'Updated weekly', icon: '◷', tone: 'blue' }, { label: 'Latest update', value: 'Today', change: '8:30 AM', icon: '✓', tone: 'amber' }],
    columns: [{ key: 'report', label: 'REPORT' }, { key: 'category', label: 'CATEGORY' }, { key: 'period', label: 'REPORTING PERIOD' }, { key: 'updated', label: 'LAST UPDATED' }],
    rows: [{ report: 'Student Enrollment Summary', category: 'Students', period: '2026–2027', updated: 'Today, 8:30 AM' }, { report: 'Weekly Attendance', category: 'Attendance', period: 'Oct 19–25, 2026', updated: 'Yesterday' }, { report: 'Term Performance Overview', category: 'Academic', period: 'Term 2', updated: 'Oct 23, 2026' }],
  },
  settings: {
    eyebrow: 'WORKSPACE PREFERENCES', title: 'Settings', description: 'Sample school profile and workspace settings.',
    settings: [{ title: 'School profile', description: 'Manage the school name, contact details, and location.', detail: 'Greenwood Academy' }, { title: 'Academic year', description: 'Current academic year and term dates.', detail: '2026–2027 · Term 2' }, { title: 'Notifications', description: 'Choose which school updates appear in your workspace.', detail: 'Email and in-app alerts' }, { title: 'Account preferences', description: 'Review your profile and sign-in preferences.', detail: 'Administrator account' }],
  },
}

const page = computed(() => modules[props.moduleKey] || modules.classes)
</script>

<template>
  <section class="static-module">
    <header class="module-heading"><div><p class="module-eyebrow">{{ page.eyebrow }}</p><h1>{{ page.title }}</h1><p>{{ page.description }}</p></div><span class="preview-badge"><i></i> Static preview</span></header>

    <div v-if="page.stats" class="module-stats"><StatCard v-for="stat in page.stats" :key="stat.label" v-bind="stat" /></div>

    <section v-if="page.rows" class="module-panel"><header class="module-panel-heading"><div><h2>{{ page.title }} overview</h2><p>Example information shown for layout preview</p></div><span class="sample-tag">SAMPLE DATA</span></header><DataTable :columns="page.columns" :rows="page.rows"><template #cell-status="{ value }"><span class="module-status" :class="`module-status-${value.toLowerCase()}`"><i></i>{{ value }}</span></template></DataTable><footer class="module-footer">Showing {{ page.rows.length }} example records</footer></section>

    <div v-else class="settings-grid"><article v-for="item in page.settings" :key="item.title" class="setting-card"><span class="setting-icon" aria-hidden="true">◇</span><div><h2>{{ item.title }}</h2><p>{{ item.description }}</p><strong>{{ item.detail }}</strong></div><span class="setting-arrow" aria-hidden="true">→</span></article></div>
    <p class="preview-note">This page uses sample data for a static frontend preview. It is not connected to the backend.</p>
  </section>
</template>

<style scoped>
.static-module{--ink:#29362d;--muted:#838d82;--line:#e7ece5;color:var(--ink)}.module-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}.module-eyebrow{margin:0 0 7px;color:#798879;font-size:9px;font-weight:750;letter-spacing:1.3px}.module-heading h1{margin:0;font-size:25px;letter-spacing:-.7px;font-weight:650}.module-heading p:last-child{margin:6px 0 0;color:var(--muted);font-size:11px}.preview-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid #e5eadf;border-radius:20px;background:#f8faf6;color:#75836f;font-size:9px;white-space:nowrap}.preview-badge i,.module-status i{width:6px;height:6px;border-radius:50%;background:#93a877}.module-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.module-panel{margin-top:16px;border:1px solid var(--line);border-radius:9px;background:#fff;overflow:hidden}.module-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 17px 13px}.module-panel-heading h2{margin:0;font-size:12px;font-weight:650}.module-panel-heading p{margin:5px 0 0;color:var(--muted);font-size:9px}.sample-tag{padding:5px 7px;border-radius:4px;background:#f5f6f2;color:#8a9388;font-size:8px;letter-spacing:.5px}.module-footer{padding:11px 15px;border-top:1px solid #f0f2ee;color:#8a9388;font-size:9px}.module-status{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:16px;background:#edf5ed;color:#557a57;font-size:8px}.module-status-absent{background:#fbefed;color:#a05750}.module-status-absent i{background:#bd776e}.module-status-late,.module-status-pending{background:#fbf3e6;color:#927543}.module-status-late i,.module-status-pending i{background:#c4a15c}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.setting-card{display:flex;align-items:flex-start;gap:12px;padding:17px;border:1px solid var(--line);border-radius:9px;background:#fff}.setting-icon{display:grid;place-items:center;flex:0 0 32px;height:32px;border-radius:8px;background:#eef3e8;color:#668055}.setting-card h2{margin:0;font-size:11px;font-weight:650}.setting-card p{margin:5px 0 11px;color:var(--muted);font-size:9px;line-height:1.5}.setting-card strong{color:#52664e;font-size:9px;font-weight:600}.setting-arrow{margin-left:auto;color:#84917e;font-size:14px}.preview-note{margin:16px 0 0;color:#929a90;font-size:9px}@media(max-width:750px){.module-stats{grid-template-columns:1fr 1fr}.settings-grid{grid-template-columns:1fr}}@media(max-width:520px){.module-heading{align-items:flex-start;flex-direction:column}.module-stats{grid-template-columns:1fr}.module-heading h1{font-size:22px}}
</style>
