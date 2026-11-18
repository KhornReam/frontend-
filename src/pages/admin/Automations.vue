<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { recordAuditLog } from '../../services/auditLogService.js'

const STORAGE_KEY = 'sms_school_automations_v2'

const search = ref('')
const activeFilter = ref('All') // 'All' | 'Running' | 'Paused' | 'Attendance' | 'Academic' | 'Reporting' | 'Security'
const runningId = ref(null)
const runningAll = ref(false)
const successMessage = ref('')
const modalOpen = ref(false)
const editingId = ref(null)
const manualRunsToday = ref(0)

const DEFAULT_AUTOMATIONS = [
  {
    id: 1,
    name: 'Absentee & Tardy Parent Notification',
    description: 'Automatically dispatches an SMS and email notification to parents whenever a student is marked Absent or Late in morning roll call.',
    trigger: 'Daily Attendance Submission',
    schedule: 'Mon–Fri at 8:30 AM',
    recipient: 'Parents & Guardians',
    category: 'Attendance',
    active: true,
    lastRun: 'Today, 8:30 AM',
    runsCount: 52,
    tone: 'green',
    icon: 'bell',
  },
  {
    id: 2,
    name: 'Morning Administrator Digest',
    description: 'Compiles previous day attendance rates, teacher coverage notes, and upcoming school calendar events into an executive summary.',
    trigger: 'Scheduled Cron Job',
    schedule: 'Daily at 7:30 AM',
    recipient: 'Principal & Head of Staff',
    category: 'Reporting',
    active: true,
    lastRun: 'Today, 7:30 AM',
    runsCount: 184,
    tone: 'primary',
    icon: 'mail',
  },
  {
    id: 3,
    name: 'Weekly Gradebook GPA & Rank Calculation',
    description: 'Recalculates class averages, weighted GPA points, and honor roll standings across all grades following teacher score submissions.',
    trigger: 'Weekly Score Consolidation',
    schedule: 'Every Friday at 4:00 PM',
    recipient: 'Internal Academic Engine',
    category: 'Academic',
    active: true,
    lastRun: 'Last Friday, 4:00 PM',
    runsCount: 28,
    tone: 'purple',
    icon: 'calc',
  },
  {
    id: 4,
    name: 'Nightly Student Records Cloud Backup',
    description: 'Performs an AES-256 encrypted database snapshot and synchronizes all student profiles, grades, and rosters to cloud storage.',
    trigger: 'Scheduled System Service',
    schedule: 'Every night at 12:00 AM',
    recipient: 'Cloud Infrastructure (S3)',
    category: 'Security',
    active: true,
    lastRun: 'Today, 12:00 AM',
    runsCount: 365,
    tone: 'blue',
    icon: 'database',
  },
  {
    id: 5,
    name: 'Upcoming Exam & Midterm Reminders',
    description: 'Sends automated student portal reminders for midterms, labs, and assessments scheduled within the next 48 hours.',
    trigger: 'Assessment Schedule Watch',
    schedule: 'Daily at 3:00 PM',
    recipient: 'Enrolled Students',
    category: 'Academic',
    active: false,
    lastRun: 'Paused',
    runsCount: 14,
    tone: 'amber',
    icon: 'clock',
  },
]

const automations = ref([])

const executionHistory = ref([
  { id: 101, time: 'Today, 8:30 AM', workflow: 'Absentee & Tardy Parent Notification', category: 'Attendance', trigger: 'Scheduled', duration: '412ms', status: 'Succeeded' },
  { id: 102, time: 'Today, 7:30 AM', workflow: 'Morning Administrator Digest', category: 'Reporting', trigger: 'Scheduled', duration: '285ms', status: 'Succeeded' },
  { id: 103, time: 'Today, 12:00 AM', workflow: 'Nightly Student Records Cloud Backup', category: 'Security', trigger: 'Cron Job', duration: '1.84s', status: 'Succeeded' },
  { id: 104, time: 'Yesterday, 4:00 PM', workflow: 'Weekly Gradebook GPA & Rank Calculation', category: 'Academic', trigger: 'Scheduled', duration: '620ms', status: 'Succeeded' },
])

const filterPills = ['All', 'Running', 'Paused', 'Attendance', 'Academic', 'Reporting', 'Security']

const form = reactive({
  name: '',
  description: '',
  trigger: 'Scheduled Cron Job',
  schedule: 'Daily at 8:00 AM',
  recipient: 'Students & Parents',
  category: 'Attendance',
})

function loadAutomations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        automations.value = parsed
        return
      }
    }
  } catch {
    // fallback
  }
  automations.value = JSON.parse(JSON.stringify(DEFAULT_AUTOMATIONS))
}

function persistAutomations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(automations.value))
}

const filteredAutomations = computed(() => {
  let list = automations.value

  if (activeFilter.value === 'Running') {
    list = list.filter((a) => a.active)
  } else if (activeFilter.value === 'Paused') {
    list = list.filter((a) => !a.active)
  } else if (activeFilter.value !== 'All') {
    list = list.filter((a) => a.category === activeFilter.value)
  }

  const query = search.value.trim().toLowerCase()
  if (!query) return list

  return list.filter((item) =>
    [item.name, item.description, item.trigger, item.recipient, item.category, item.schedule]
      .some((val) => val?.toLowerCase().includes(query)),
  )
})

const activeCount = computed(() => automations.value.filter((a) => a.active).length)
const totalRunsToday = computed(() => activeCount.value * 18 + 70 + manualRunsToday.value)

function toneForCategory(cat) {
  if (cat === 'Attendance') return 'green'
  if (cat === 'Reporting') return 'primary'
  if (cat === 'Academic') return 'purple'
  if (cat === 'Security') return 'blue'
  return 'amber'
}

function iconForCategory(cat) {
  if (cat === 'Attendance') return 'bell'
  if (cat === 'Reporting') return 'mail'
  if (cat === 'Academic') return 'calc'
  if (cat === 'Security') return 'database'
  return 'clock'
}

function showNotification(msg) {
  successMessage.value = msg
  setTimeout(() => {
    if (successMessage.value === msg) successMessage.value = ''
  }, 3500)
}

function toggleAutomation(automation) {
  automation.active = !automation.active
  if (!automation.active) {
    automation.lastRun = 'Paused'
  }
  persistAutomations()
  showNotification(`"${automation.name}" is now ${automation.active ? 'Running' : 'Paused'}.`)
}

function triggerRun(automation) {
  if (runningId.value) return
  runningId.value = automation.id
  setTimeout(() => {
    runningId.value = null
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    automation.lastRun = `Today, ${nowTime} (Manual)`
    automation.runsCount += 1
    manualRunsToday.value += 1
    persistAutomations()

    executionHistory.value.unshift({
      id: Date.now(),
      time: `Today, ${nowTime}`,
      workflow: automation.name,
      category: automation.category,
      trigger: 'Manual Run',
      duration: `${Math.floor(210 + Math.random() * 480)}ms`,
      status: 'Succeeded',
    })

    recordAuditLog({
      user_name: 'Dr. Alexander Vance',
      user_email: 'admin@school.edu',
      role: 'Super Administrator',
      action: `Manually executed automation workflow: ${automation.name}`,
      category: 'Automation',
      resource: automation.recipient,
      status: 'Success',
    })

    showNotification(`Automation "${automation.name}" executed successfully!`)
  }, 850)
}

function runAllActive() {
  const activeList = automations.value.filter((a) => a.active)
  if (!activeList.length) {
    showNotification('No active automations to run. Enable at least one workflow first.')
    return
  }
  runningAll.value = true
  setTimeout(() => {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    activeList.forEach((a) => {
      a.lastRun = `Today, ${nowTime} (Batch)`
      a.runsCount += 1
    })
    manualRunsToday.value += activeList.length
    persistAutomations()
    executionHistory.value.unshift({
      id: Date.now(),
      time: `Today, ${nowTime}`,
      workflow: `Batch Run (${activeList.length} Active Workflows)`,
      category: 'Automation',
      trigger: 'Manual Batch',
      duration: '1.12s',
      status: 'Succeeded',
    })
    runningAll.value = false
    showNotification(`Executed all ${activeList.length} active automations successfully!`)
  }, 1000)
}

function openCreateModal() {
  editingId.value = null
  Object.assign(form, {
    name: '',
    description: '',
    trigger: 'Scheduled Cron Job',
    schedule: 'Mon–Fri at 8:00 AM',
    recipient: 'Parents & Guardians',
    category: 'Attendance',
  })
  modalOpen.value = true
}

function openEditModal(item) {
  editingId.value = item.id
  Object.assign(form, {
    name: item.name,
    description: item.description,
    trigger: item.trigger || 'Scheduled Cron Job',
    schedule: item.schedule,
    recipient: item.recipient,
    category: item.category,
  })
  modalOpen.value = true
}

function saveAutomation() {
  if (!form.name.trim()) return
  const tone = toneForCategory(form.category)
  const icon = iconForCategory(form.category)

  if (editingId.value) {
    const existing = automations.value.find((a) => a.id === editingId.value)
    if (existing) {
      Object.assign(existing, {
        name: form.name.trim(),
        description: form.description.trim() || 'Automated institutional background task.',
        trigger: form.trigger.trim() || 'Scheduled Cron Job',
        schedule: form.schedule.trim() || 'Daily at 8:00 AM',
        recipient: form.recipient.trim() || 'System Administrators',
        category: form.category,
        tone,
        icon,
      })
    }
    showNotification(`Updated workflow "${form.name.trim()}".`)
  } else {
    const nextId = automations.value.length ? Math.max(...automations.value.map((a) => a.id)) + 1 : 1
    automations.value.unshift({
      id: nextId,
      name: form.name.trim(),
      description: form.description.trim() || 'Automated institutional background task.',
      trigger: form.trigger.trim() || 'Scheduled Cron Job',
      schedule: form.schedule.trim() || 'Daily at 8:00 AM',
      recipient: form.recipient.trim() || 'System Administrators',
      category: form.category,
      active: true,
      lastRun: 'Scheduled (New)',
      runsCount: 0,
      tone,
      icon,
    })
    showNotification(`Created new automation "${form.name.trim()}".`)
  }

  persistAutomations()
  modalOpen.value = false
}

function deleteAutomation(item) {
  if (!window.confirm(`Delete automation workflow "${item.name}"?`)) return
  automations.value = automations.value.filter((a) => a.id !== item.id)
  persistAutomations()
  showNotification(`Deleted workflow "${item.name}".`)
}

onMounted(() => {
  loadAutomations()
})
</script>

<template>
  <section class="management-page automations-page">
    <!-- Executive Header -->
    <header class="management-heading automations-hero">
      <div>
        <div class="hero-eyebrow-row">
          <span class="eyebrow">SYSTEM WORKFLOWS & SCHEDULER</span>
          <span class="engine-live-pill">
            <span class="engine-dot"></span>
            Scheduler Active
          </span>
        </div>
        <h1>School Automations</h1>
        <p class="page-description">
          Automate parent attendance notifications, daily executive digests, GPA calculations, and encrypted cloud backups.
        </p>
      </div>

      <div class="header-action-group">
        <button
          type="button"
          class="secondary-button"
          :disabled="runningAll || !activeCount"
          @click="runAllActive"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>{{ runningAll ? 'Running All...' : 'Run All Active' }}</span>
        </button>

        <button class="primary-button" type="button" @click="openCreateModal">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>New Automation</span>
        </button>
      </div>
    </header>

    <!-- Success Toast -->
    <Transition name="fade-slide">
      <div v-if="successMessage" class="toast-notification" role="status">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>

    <!-- Crisp 3-Column KPI Grid -->
    <div class="summary-kpi-grid">
      <article class="summary-card">
        <div class="summary-icon tone-green">
          <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Active Automations</span>
          <strong>{{ activeCount }} / {{ automations.length }}</strong>
        </div>
        <span class="summary-caption">Background jobs</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Executions Today</span>
          <strong>{{ totalRunsToday }}</strong>
        </div>
        <span class="summary-caption">Automated runs</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Delivery Reliability</span>
          <strong>99.8%</strong>
        </div>
        <span class="summary-caption">Zero failures</span>
      </article>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="workflows-toolbar-card">
      <div class="filter-pills-row" role="group" aria-label="Filter automations">
        <button
          v-for="pill in filterPills"
          :key="pill"
          type="button"
          class="wf-filter-pill"
          :class="{ active: activeFilter === pill }"
          @click="activeFilter = pill"
        >
          {{ pill }}
        </button>
      </div>

      <div class="search-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input v-model="search" type="search" placeholder="Search workflows, schedules, targets..." />
      </div>
    </div>

    <!-- 2-Column Executive Workflow Cards Grid -->
    <div v-if="filteredAutomations.length" class="workflows-grid">
      <article
        v-for="item in filteredAutomations"
        :key="item.id"
        class="workflow-card"
        :class="{ 'is-paused': !item.active }"
      >
        <div class="wf-top-accent" :class="item.active ? `accent-${item.tone}` : 'accent-paused'"></div>

        <div class="wf-card-body">
          <!-- Card Header -->
          <div class="wf-card-head">
            <div class="wf-icon-box" :class="`tone-${item.tone}`">
              <!-- Bell -->
              <svg v-if="item.icon === 'bell'" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <!-- Mail -->
              <svg v-else-if="item.icon === 'mail'" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <!-- Calc -->
              <svg v-else-if="item.icon === 'calc'" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <line x1="8" y1="6" x2="16" y2="6"/>
                <line x1="8" y1="14" x2="16" y2="14"/>
                <line x1="8" y1="18" x2="12" y2="18"/>
              </svg>
              <!-- Database -->
              <svg v-else-if="item.icon === 'database'" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              <!-- Clock -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>

            <div class="wf-title-block">
              <div class="wf-badges-row">
                <span class="wf-cat-tag">{{ item.category }}</span>
                <span class="wf-status-pill" :class="item.active ? 'pill-running' : 'pill-paused'">
                  <span class="wf-dot"></span>
                  {{ item.active ? 'Running' : 'Paused' }}
                </span>
              </div>
              <h3>{{ item.name }}</h3>
            </div>

            <label class="pro-switch" :title="item.active ? 'Pause workflow' : 'Enable workflow'">
              <input type="checkbox" :checked="item.active" @change="toggleAutomation(item)" />
              <span class="pro-slider"></span>
            </label>
          </div>

          <p class="wf-description">{{ item.description }}</p>

          <!-- Clean Trigger -> Target Metadata Grid -->
          <div class="wf-meta-grid">
            <div class="wf-meta-cell">
              <span class="meta-k">Schedule</span>
              <strong class="meta-v">{{ item.schedule }}</strong>
            </div>
            <div class="wf-meta-cell">
              <span class="meta-k">Target Audience</span>
              <strong class="meta-v">{{ item.recipient }}</strong>
            </div>
            <div class="wf-meta-cell">
              <span class="meta-k">Last Execution</span>
              <strong class="meta-v">{{ item.lastRun }}</strong>
            </div>
            <div class="wf-meta-cell">
              <span class="meta-k">Total Runs</span>
              <strong class="meta-v">{{ item.runsCount }} runs</strong>
            </div>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <footer class="wf-card-footer">
          <button
            type="button"
            class="run-now-btn"
            :disabled="runningId === item.id"
            @click="triggerRun(item)"
          >
            <span v-if="runningId === item.id" class="mini-spinner"></span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>{{ runningId === item.id ? 'Executing...' : 'Run Now' }}</span>
          </button>

          <div class="wf-footer-right">
            <button type="button" class="action-button" @click="openEditModal(item)">Edit</button>
            <button type="button" class="action-button danger-action" @click="deleteAutomation(item)">Delete</button>
          </div>
        </footer>
      </article>
    </div>

    <!-- Empty State -->
    <div v-else class="records-card empty-state" style="padding: 48px 24px;">
      <strong>No automations match your filter</strong>
      <p>Try selecting another category or create a new school automation workflow.</p>
      <button type="button" class="secondary-button" style="margin-top: 10px;" @click="activeFilter = 'All'; search = ''">
        Clear Filters
      </button>
    </div>

    <!-- Live Execution History Card -->
    <div class="records-card">
      <div class="records-toolbar">
        <div>
          <h2>Recent Execution Log</h2>
          <p>Live history of scheduled and manual background automation runs</p>
        </div>
        <span class="summary-caption">{{ executionHistory.length }} Recent Runs</span>
      </div>

      <div class="table-scroll">
        <table class="records-table">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>WORKFLOW</th>
              <th>CATEGORY</th>
              <th>TRIGGER</th>
              <th>DURATION</th>
              <th style="text-align: right;">STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in executionHistory" :key="entry.id">
              <td><span class="history-time">{{ entry.time }}</span></td>
              <td><strong>{{ entry.workflow }}</strong></td>
              <td><span class="wf-cat-tag">{{ entry.category }}</span></td>
              <td><span class="history-trigger">{{ entry.trigger }}</span></td>
              <td><code class="duration-code">{{ entry.duration }}</code></td>
              <td style="text-align: right;">
                <span class="status-pill status-active">{{ entry.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create / Edit Automation Modal -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <div class="modal-card">
        <header class="modal-header">
          <div>
            <h2>{{ editingId ? 'Edit Automation Workflow' : 'Create New Automation' }}</h2>
            <p>Configure trigger schedule, target audience, and background action.</p>
          </div>
          <button class="close-btn" type="button" aria-label="Close modal" @click="modalOpen = false">✕</button>
        </header>

        <form class="modal-form" @submit.prevent="saveAutomation">
          <label>
            Workflow Name
            <input v-model="form.name" required placeholder="e.g. Weekly Honor Roll Email" />
          </label>

          <label>
            Description
            <textarea v-model="form.description" placeholder="Describe what this workflow automates..."></textarea>
          </label>

          <div class="modal-grid-2">
            <label>
              Category
              <select v-model="form.category">
                <option value="Attendance">Attendance</option>
                <option value="Academic">Academic</option>
                <option value="Reporting">Reporting</option>
                <option value="Security">Security</option>
              </select>
            </label>

            <label>
              Schedule / Frequency
              <input v-model="form.schedule" required placeholder="e.g. Mon–Fri at 8:30 AM" />
            </label>
          </div>

          <div class="modal-grid-2">
            <label>
              Trigger Event
              <input v-model="form.trigger" placeholder="e.g. Scheduled Cron Job" />
            </label>

            <label>
              Target Audience / System
              <input v-model="form.recipient" required placeholder="e.g. Parents & Guardians" />
            </label>
          </div>

          <footer class="modal-actions">
            <button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button>
            <button class="primary-button" type="submit">
              {{ editingId ? 'Save Workflow' : 'Create Automation' }}
            </button>
          </footer>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.automations-page {
  gap: 20px;
}

.automations-hero {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.hero-eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.hero-eyebrow-row .eyebrow {
  margin-bottom: 0;
}

.engine-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
  font-size: 10.5px;
  font-weight: 700;
}

.engine-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.toast-notification {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
}

/* Filter & Search Bar */
.workflows-toolbar-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.filter-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 9px;
}

.wf-filter-pill {
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.wf-filter-pill:hover {
  color: #0f172a;
}

.wf-filter-pill.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  font-weight: 700;
}

/* 2-Column Executive Workflows Grid */
.workflows-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 1024px) {
  .workflows-grid {
    grid-template-columns: 1fr;
  }
}

.workflow-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.workflow-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -10px rgba(15, 23, 42, 0.12);
  border-color: #cbd5e1;
}

.workflow-card.is-paused {
  opacity: 0.84;
  background: #fcfcfd;
}

.wf-top-accent {
  height: 3.5px;
  width: 100%;
}

.accent-green { background: linear-gradient(90deg, #10b981, #34d399); }
.accent-primary { background: linear-gradient(90deg, #4f46e5, #818cf8); }
.accent-purple { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.accent-blue { background: linear-gradient(90deg, #0284c7, #38bdf8); }
.accent-amber { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.accent-paused { background: #cbd5e1; }

.wf-card-body {
  padding: 20px 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

.wf-card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.wf-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.wf-title-block {
  flex: 1;
  min-width: 0;
}

.wf-badges-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.wf-cat-tag {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
}

.wf-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.pill-running {
  background: #ecfdf5;
  color: #047857;
}

.pill-paused {
  background: #f1f5f9;
  color: #64748b;
}

.wf-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.wf-title-block h3 {
  font-size: 15.5px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  line-height: 1.3;
  letter-spacing: -0.25px;
}

.wf-description {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.wf-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: auto;
}

.wf-meta-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.meta-k {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #94a3b8;
}

.meta-v {
  font-size: 12.5px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Card Footer */
.wf-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.run-now-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #1e293b;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.run-now-btn:hover {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #eef2ff;
}

.run-now-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.mini-spinner {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  border-top-color: #4f46e5;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.wf-footer-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Modern Switch */
.pro-switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 23px;
  cursor: pointer;
  flex-shrink: 0;
}

.pro-switch input { opacity: 0; width: 0; height: 0; }

.pro-slider {
  position: absolute;
  inset: 0;
  background-color: #cbd5e1;
  border-radius: 999px;
  transition: background-color 0.2s ease;
}

.pro-slider::before {
  content: "";
  position: absolute;
  height: 17px;
  width: 17px;
  left: 3px;
  bottom: 3px;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

input:checked + .pro-slider { background-color: #4f46e5; }
input:checked + .pro-slider::before { transform: translateX(19px); }

/* Execution History */
.history-time { font-size: 12.5px; color: #64748b; white-space: nowrap; }
.history-trigger { font-size: 12.5px; color: #475569; }
.duration-code { font-size: 11.5px; background: #f1f5f9; padding: 2px 7px; border-radius: 5px; color: #334155; }

.modal-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 600px) {
  .modal-grid-2,
  .wf-meta-grid {
    grid-template-columns: 1fr;
  }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
