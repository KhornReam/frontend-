<script setup>
import DataTable from '../../components/admin/DataTable.vue'
import StatCard from '../../components/admin/StatCard.vue'

const statistics = [
  { label: 'Total students', value: '1,284', change: '+8.2% this term', icon: '♙', tone: 'green' },
  { label: 'Teachers', value: '64', change: '+3 new this term', icon: '♧', tone: 'blue' },
  { label: 'Classes', value: '38', change: 'Across 6 grades', icon: '▤', tone: 'amber' },
  { label: 'Attendance today', value: '94.6%', change: '+2.4% from last week', icon: '✓', tone: 'purple' },
]

const attendanceByDay = [
  { day: 'Mon', value: 88 },
  { day: 'Tue', value: 96 },
  { day: 'Wed', value: 91 },
  { day: 'Thu', value: 98 },
  { day: 'Fri', value: 94 },
  { day: 'Sat', value: 42 },
  { day: 'Sun', value: 18 },
]

const studentColumns = [
  { key: 'name', label: 'STUDENT' },
  { key: 'class', label: 'CLASS' },
  { key: 'enrolled', label: 'ENROLLED' },
  { key: 'status', label: 'STATUS' },
]

const recentStudents = [
  { id: 1, name: 'Olivia Martin', initials: 'OM', email: 'olivia.martin@school.edu', class: 'Grade 10 - A', enrolled: 'Oct 24, 2026', status: 'Active' },
  { id: 2, name: 'Ethan Wilson', initials: 'EW', email: 'ethan.wilson@school.edu', class: 'Grade 8 - B', enrolled: 'Oct 23, 2026', status: 'Active' },
  { id: 3, name: 'Sophia Chen', initials: 'SC', email: 'sophia.chen@school.edu', class: 'Grade 11 - A', enrolled: 'Oct 22, 2026', status: 'Pending' },
  { id: 4, name: 'Noah Williams', initials: 'NW', email: 'noah.williams@school.edu', class: 'Grade 9 - C', enrolled: 'Oct 21, 2026', status: 'Active' },
]
</script>

<template>
  <section class="admin-dashboard">
    <header class="dashboard-heading">
      <div><p class="dashboard-eyebrow">MONDAY, OCTOBER 26, 2026</p><h1>Good morning, Admin <span aria-hidden="true">✦</span></h1><p>Here’s what’s happening at your school today.</p></div>
      <RouterLink class="dashboard-action" to="/students">View student directory <span aria-hidden="true">→</span></RouterLink>
    </header>

    <div class="statistics-grid"><StatCard v-for="stat in statistics" :key="stat.label" v-bind="stat" /></div>

    <div class="dashboard-content-grid">
      <section class="dashboard-panel attendance-panel">
        <header class="panel-heading"><div><h2>Attendance overview</h2><p>School attendance throughout this week</p></div><span class="panel-period">This week⌄</span></header>
        <div class="chart-legend"><span></span> Attendance rate</div>
        <div class="attendance-chart" role="img" aria-label="Attendance rates: Monday 88 percent, Tuesday 96 percent, Wednesday 91 percent, Thursday 98 percent, Friday 94 percent, Saturday 42 percent, Sunday 18 percent.">
          <div class="chart-axis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
          <div class="chart-columns"><div v-for="item in attendanceByDay" :key="item.day" class="chart-column"><div class="bar-track"><div class="bar-fill" :style="{ height: `${item.value}%` }"></div></div><span class="chart-day">{{ item.day }}</span></div></div>
        </div>
      </section>

      <section class="dashboard-panel summary-panel">
        <header class="panel-heading"><div><h2>School summary</h2><p>Current academic year</p></div><span class="summary-mark">✦</span></header>
        <div class="summary-row"><span class="summary-symbol students-symbol">♙</span><span>Enrolled students</span><strong>1,284</strong></div>
        <div class="summary-row"><span class="summary-symbol teachers-symbol">♧</span><span>Teaching staff</span><strong>64</strong></div>
        <div class="summary-row"><span class="summary-symbol classes-symbol">▤</span><span>Active classes</span><strong>38</strong></div>
        <div class="summary-row"><span class="summary-symbol subjects-symbol">◇</span><span>Subjects offered</span><strong>24</strong></div>
        <div class="term-progress"><div><span>Academic year progress</span><strong>68%</strong></div><div class="progress-track"><span></span></div><small>Term 2 · 14 weeks remaining</small></div>
      </section>
    </div>

    <section class="dashboard-panel recent-panel">
      <header class="panel-heading recent-heading"><div><h2>Recently enrolled students</h2><p>Latest additions to your school directory</p></div><RouterLink to="/students" class="table-link">View all students <span aria-hidden="true">→</span></RouterLink></header>
      <DataTable :columns="studentColumns" :rows="recentStudents">
        <template #cell-name="{ row }"><div class="recent-person"><span class="recent-avatar">{{ row.initials }}</span><div><strong>{{ row.name }}</strong><small>{{ row.email }}</small></div></div></template>
        <template #cell-status="{ value }"><span class="status-pill" :class="value === 'Active' ? 'status-active' : 'status-pending'"><span></span>{{ value }}</span></template>
      </DataTable>
    </section>
  </section>
</template>

<style scoped>
.admin-dashboard{--ink:#26332b;--muted:#828b81;--line:#e8ece6;color:var(--ink)}.dashboard-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px}.dashboard-eyebrow{margin:0 0 8px;color:#798879;font-size:9px;font-weight:750;letter-spacing:1.4px}.dashboard-heading h1{margin:0;color:#27362c;font-size:25px;line-height:1.25;letter-spacing:-.8px;font-weight:650}.dashboard-heading h1 span{color:#c9a761;font-size:17px}.dashboard-heading>div>p:last-child{margin:7px 0 0;color:var(--muted);font-size:11px}.dashboard-action,.table-link{color:#496c4d;font-size:10px;font-weight:650}.dashboard-action{display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid #dfe7dc;border-radius:6px;background:#fff}.dashboard-action:hover,.table-link:hover{color:#254433;background:#f6f8f4}.dashboard-action span,.table-link span{font-size:14px}.statistics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.dashboard-content-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,1fr);gap:14px;margin-top:15px}.dashboard-panel{border:1px solid var(--line);border-radius:9px;background:#fff}.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:17px 18px 0}.panel-heading h2{margin:0;font-size:12px;font-weight:650;color:#333d34}.panel-heading p{margin:5px 0 0;color:#929a90;font-size:9px}.panel-period{padding:6px 9px;border:1px solid #e6eae4;border-radius:5px;color:#6d786d;font-size:9px}.chart-legend{display:flex;align-items:center;gap:7px;margin:17px 20px 0;color:#798478;font-size:9px}.chart-legend span{width:7px;height:7px;border-radius:2px;background:#7fa183}.attendance-chart{position:relative;display:flex;height:177px;margin:12px 20px 16px 14px;padding-left:36px}.chart-axis{position:absolute;inset:0 auto 20px 0;display:flex;flex-direction:column;justify-content:space-between;color:#a1a89f;font-size:8px}.chart-columns{position:relative;display:flex;align-items:stretch;justify-content:space-around;gap:8px;width:100%;background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(25% - 1px),#f0f2ee calc(25% - 1px),#f0f2ee 25%)}.chart-column{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:7px;width:100%;height:100%}.bar-track{display:flex;align-items:flex-end;justify-content:center;width:100%;height:calc(100% - 20px)}.bar-fill{width:min(25px,58%);min-height:7px;border-radius:4px 4px 1px 1px;background:linear-gradient(180deg,#91b094,#62866a)}.chart-column:nth-last-child(-n+2) .bar-fill{background:linear-gradient(180deg,#b2c2a1,#91a681)}.chart-day{color:#899288;font-size:8px}.summary-mark{color:#c5a65d;font-size:14px}.summary-row{display:flex;align-items:center;gap:9px;padding:10px 18px;border-bottom:1px solid #f0f2ee;color:#6f796e;font-size:9px}.summary-row:first-of-type{margin-top:10px}.summary-row strong{margin-left:auto;color:#303b32;font-size:11px;font-weight:650}.summary-symbol{display:grid;place-items:center;width:23px;height:23px;border-radius:6px;font-size:12px}.students-symbol{background:#eff3e8;color:#668055}.teachers-symbol{background:#edf2f7;color:#65819b}.classes-symbol{background:#faf2e6;color:#aa8854}.subjects-symbol{background:#f4eef8;color:#8b72a0}.term-progress{padding:14px 18px 15px}.term-progress>div:first-child{display:flex;justify-content:space-between;color:#687368;font-size:9px}.term-progress strong{color:#3f6546;font-size:10px}.progress-track{height:5px;margin:9px 0 7px;border-radius:10px;background:#eef1ec;overflow:hidden}.progress-track span{display:block;width:68%;height:100%;border-radius:inherit;background:#789778}.term-progress small{color:#9aa197;font-size:8px}.recent-panel{margin-top:15px;padding-bottom:2px}.recent-heading{align-items:center;padding-bottom:14px}.recent-heading .table-link{white-space:nowrap}.recent-person{display:flex;align-items:center;gap:9px}.recent-avatar{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:#edf1e8;color:#536b4f;font-size:8px;font-weight:700}.recent-person>div{display:flex;flex-direction:column;gap:3px}.recent-person strong{color:#384239;font-size:9px;font-weight:650}.recent-person small{color:#9ba299;font-size:8px}.status-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:20px;font-size:8px}.status-pill>span{width:5px;height:5px;border-radius:50%}.status-active{background:#edf5ed;color:#557a57}.status-active>span{background:#6c9a6d}.status-pending{background:#fbf3e6;color:#967846}.status-pending>span{background:#c4a15c}
@media(max-width:1050px){.statistics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dashboard-content-grid{grid-template-columns:1fr}.summary-panel{display:grid;grid-template-columns:1fr 1fr}.summary-panel .panel-heading,.term-progress{grid-column:1/-1}.summary-row{border-bottom:0;padding:9px 18px}.summary-row:first-of-type{margin-top:10px}}
@media(max-width:620px){.dashboard-heading{align-items:flex-start;flex-direction:column}.dashboard-heading h1{font-size:22px}.dashboard-action{align-self:flex-start}.statistics-grid{grid-template-columns:1fr 1fr;gap:9px}.summary-panel{display:block}.summary-row{border-bottom:1px solid #f0f2ee}.recent-heading{align-items:flex-start}.attendance-chart{margin-right:12px}.recent-panel{overflow:hidden}}
</style>
