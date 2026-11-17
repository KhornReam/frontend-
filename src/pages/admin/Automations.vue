<script setup>
import { computed, reactive, ref } from 'vue'

const search = ref('')
const runningId = ref(null)
const successMessage = ref('')
const modalOpen = ref(false)

const automations = ref([
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
    tone: 'emerald',
    icon: 'bell',
  },
  {
    id: 2,
    name: 'Morning Administrator Digest',
    description: 'Compiles previous day attendance rates, teacher coverage notes, and upcoming school calendar events into an email summary.',
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
    description: 'Recalculates class averages, GPA points, and top percentiles across Grades 10–12 following teacher score submissions.',
    trigger: 'Weekly Score Consolidation',
    schedule: 'Every Friday at 4:00 PM',
    recipient: 'Internal Academic System',
    category: 'Academic',
    active: true,
    lastRun: 'Oct 23, 4:00 PM',
    runsCount: 28,
    tone: 'purple',
    icon: 'calc',
  },
  {
    id: 4,
    name: 'Nightly Student Records Cloud Backup',
    description: 'Performs an encrypted database snapshot and synchronizes all student files, records, and class rosters to offsite backup storage.',
    trigger: 'Scheduled System Service',
    schedule: 'Every night at 12:00 AM',
    recipient: 'System Infrastructure',
    category: 'Security',
    active: true,
    lastRun: 'Yesterday, 12:00 AM',
    runsCount: 365,
    tone: 'sky',
    icon: 'database',
  },
  {
    id: 5,
    name: 'Overdue Assignment & Assessment Alerts',
    description: 'Sends student portal push alerts for upcoming midterms and quizzes scheduled within the next 48 hours.',
    trigger: 'Assessment Due Date Tracking',
    schedule: 'Daily at 3:00 PM',
    recipient: 'Enrolled Students',
    category: 'Exams',
    active: false,
    lastRun: 'Paused',
    runsCount: 14,
    tone: 'amber',
    icon: 'clock',
  },
])

const form = reactive({
  name: '',
  description: '',
  schedule: 'Daily at 8:00 AM',
  recipient: 'Students & Parents',
  category: 'Attendance',
})

const filteredAutomations = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return automations.value
  return automations.value.filter((item) =>
    [item.name, item.description, item.trigger, item.recipient, item.category]
      .some((val) => val?.toLowerCase().includes(query)),
  )
})

const activeCount = computed(() => automations.value.filter((a) => a.active).length)
const totalRunsToday = computed(() => automations.value.reduce((acc, a) => acc + (a.active ? 1 : 0), 0) * 18 + 70)

function toggleAutomation(automation) {
  automation.active = !automation.active
  const stateStr = automation.active ? 'activated' : 'paused'
  showNotification(`"${automation.name}" has been ${stateStr}.`)
}

async function triggerRun(automation) {
  runningId.value = automation.id
  setTimeout(() => {
    runningId.value = null
    automation.lastRun = 'Just now (Manual run)'
    automation.runsCount += 1
    showNotification(`Automation "${automation.name}" executed successfully!`)
  }, 1200)
}

function openCreateModal() {
  Object.assign(form, {
    name: '',
    description: '',
    schedule: 'Daily at 8:00 AM',
    recipient: 'Students & Parents',
    category: 'Attendance',
  })
  modalOpen.value = true
}

function saveAutomation() {
  if (!form.name.trim()) return

  const newId = Math.max(...automations.value.map((a) => a.id)) + 1
  automations.value.unshift({
    id: newId,
    name: form.name.trim(),
    description: form.description.trim() || 'Custom automated workflow for school operations.',
    trigger: 'Scheduled Trigger',
    schedule: form.schedule,
    recipient: form.recipient,
    category: form.category,
    active: true,
    lastRun: 'Never',
    runsCount: 0,
    tone: 'primary',
    icon: 'zap',
  })

  modalOpen.value = false
  showNotification(`New automation "${form.name}" created and active!`)
}

function showNotification(msg) {
  successMessage.value = msg
  setTimeout(() => {
    if (successMessage.value === msg) {
      successMessage.value = ''
    }
  }, 3500)
}
</script>

<template>
  <section class="automations-page">
    <!-- Header -->
    <header class="management-heading">
      <div>
        <p class="eyebrow">SYSTEM WORKFLOWS</p>
        <h1>School Automations</h1>
        <p class="page-description">Automate student notifications, daily attendance digests, grade calculations, and system tasks.</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Automation
      </button>
    </header>

    <!-- Success Toast -->
    <div v-if="successMessage" class="toast-notification" role="status">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <!-- KPI Summary Row -->
    <div class="automations-kpi-grid">
      <article class="summary-card">
        <div class="summary-icon tone-emerald">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Active Automations</span>
          <strong>{{ activeCount }} / {{ automations.length }}</strong>
        </div>
        <span class="summary-caption">Active background tasks</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Executions Today</span>
          <strong>{{ totalRunsToday }}</strong>
        </div>
        <span class="summary-caption">Automated operations</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Success Rate</span>
          <strong>99.8%</strong>
        </div>
        <span class="summary-caption">Zero failed deliveries</span>
      </article>
    </div>

    <!-- Automations List Card -->
    <div class="records-card">
      <div class="records-toolbar">
        <div>
          <h2>Configured Automation Workflows</h2>
          <p>Review triggers, schedules, and run manual test executions</p>
        </div>
        <div class="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" type="search" placeholder="Search automations..." aria-label="Search automations" />
        </div>
      </div>

      <!-- Automations Grid -->
      <div class="automations-list">
        <article
          v-for="item in filteredAutomations"
          :key="item.id"
          class="automation-row-card"
          :class="{ 'is-paused': !item.active }"
        >
          <div class="automation-left">
            <div class="automation-badge-icon" :class="`tone-${item.tone}`">
              <!-- Bell Icon -->
              <svg v-if="item.icon === 'bell'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <!-- Mail Icon -->
              <svg v-else-if="item.icon === 'mail'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <!-- Calc Icon -->
              <svg v-else-if="item.icon === 'calc'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              <!-- Database Icon -->
              <svg v-else-if="item.icon === 'database'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              <!-- Clock Icon -->
              <svg v-else-if="item.icon === 'clock'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <!-- Default Zap -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>

            <div class="automation-info">
              <div class="automation-headline">
                <strong>{{ item.name }}</strong>
                <span class="category-badge">{{ item.category }}</span>
                <span class="status-indicator-tag" :class="item.active ? 'tag-active' : 'tag-paused'">
                  <span class="status-pulse-dot"></span>
                  {{ item.active ? 'Running' : 'Paused' }}
                </span>
              </div>
              <p class="automation-details">{{ item.description }}</p>

              <div class="automation-meta-chips">
                <span class="meta-chip">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Schedule: <strong>{{ item.schedule }}</strong>
                </span>

                <span class="meta-chip">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                  Recipients: <strong>{{ item.recipient }}</strong>
                </span>

                <span class="meta-chip muted">
                  Last ran: {{ item.lastRun }}
                </span>
              </div>
            </div>
          </div>

          <div class="automation-actions">
            <!-- Manual Run Button -->
            <button
              type="button"
              class="run-now-btn"
              :disabled="runningId === item.id || !item.active"
              @click="triggerRun(item)"
              title="Execute automation immediately"
            >
              <svg v-if="runningId === item.id" class="spin-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>{{ runningId === item.id ? 'Running...' : 'Run Now' }}</span>
            </button>

            <!-- Toggle Switch -->
            <label class="switch-toggle" :title="item.active ? 'Click to Pause' : 'Click to Enable'">
              <input type="checkbox" :checked="item.active" @change="toggleAutomation(item)" />
              <span class="switch-slider"></span>
            </label>
          </div>
        </article>
      </div>

      <footer class="records-footer">
        Showing {{ filteredAutomations.length }} of {{ automations.length }} automation workflows
      </footer>
    </div>

    <!-- Create Automation Modal -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <section class="student-modal" role="dialog" aria-modal="true" aria-labelledby="automation-modal-title">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">WORKFLOW ENGINE</p>
            <h2 id="automation-modal-title">Create Scheduled Automation</h2>
          </div>
          <button class="close-button" type="button" aria-label="Close" @click="modalOpen = false">✕</button>
        </div>

        <p class="modal-description">Define a recurring task, target recipients, and event triggers.</p>

        <form class="student-fields" @submit.prevent="saveAutomation">
          <label>
            Automation Name
            <input v-model="form.name" required placeholder="e.g. End of Term Honor Roll Digest" />
          </label>

          <div class="field-row">
            <label>
              Category
              <select v-model="form.category">
                <option value="Attendance">Attendance</option>
                <option value="Reporting">Reporting</option>
                <option value="Academic">Academic</option>
                <option value="Security">Security</option>
                <option value="Exams">Exams & Scores</option>
              </select>
            </label>

            <label>
              Schedule
              <input v-model="form.schedule" required placeholder="e.g. Every Monday at 9:00 AM" />
            </label>
          </div>

          <label>
            Target Audience / Recipients
            <input v-model="form.recipient" required placeholder="e.g. Teachers, Students, Parents" />
          </label>

          <label>
            Workflow Description
            <textarea
              v-model="form.description"
              rows="3"
              class="modal-textarea"
              placeholder="What actions does this automation execute?"
            ></textarea>
          </label>

          <div class="modal-actions">
            <button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button>
            <button class="primary-button" type="submit">Activate Automation</button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.automations-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.management-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background-color: #ffffff;
  padding: 24px 28px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: var(--color-primary);
  margin-bottom: 6px;
}

.management-heading h1 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: var(--color-text);
  margin: 0;
}

.page-description {
  margin: 6px 0 0 0;
  color: var(--color-text-muted);
  font-size: 13.5px;
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
  box-shadow: var(--shadow-sm);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 280px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  color: var(--color-text-subtle);
  transition: all 0.15s ease;
}

.search-box:focus-within {
  border-color: var(--color-primary);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
  color: var(--color-primary);
}

.search-box input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
}

/* Automations List */
.automations-list {
  display: flex;
  flex-direction: column;
  padding: 12px 20px;
  gap: 12px;
}

.automation-row-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 22px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: #ffffff;
  transition: all 0.2s ease;
}

.automation-row-card:hover {
  border-color: #cbd5e1;
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.automation-row-card.is-paused {
  background-color: var(--color-surface-subtle);
  opacity: 0.75;
}

.automation-left {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  flex: 1;
}

.automation-badge-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.automation-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.automation-headline {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.automation-headline strong {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.category-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: 600;
}

.status-indicator-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.tag-active {
  background-color: var(--color-success-bg);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
}

.tag-active .status-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-success);
  position: relative;
}

.tag-active .status-pulse-dot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background-color: var(--color-success);
  opacity: 0.4;
  animation: pulse-ring 2s infinite ease-out;
}

.tag-paused {
  background-color: var(--color-surface-hover);
  color: var(--color-text-subtle);
  border: 1px solid var(--color-border);
}

.tag-paused .status-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-text-subtle);
}

.automation-details {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

.automation-meta-chips {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: 12px;
}

.meta-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
}

.meta-chip svg {
  color: var(--color-text-subtle);
}

.meta-chip strong {
  color: var(--color-text);
  font-weight: 600;
}

.meta-chip.muted {
  color: var(--color-text-subtle);
}

.automation-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.run-now-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background-color: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 12.5px;
  font-weight: 600;
  transition: all 0.15s ease;
  cursor: pointer;
}

.run-now-btn:hover:not(:disabled) {
  background-color: #ffffff;
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: var(--shadow-xs);
}

.run-now-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Switch Toggle */
.switch-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.switch-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #cbd5e1;
  transition: 0.25s;
  border-radius: 24px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.25s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

input:checked + .switch-slider {
  background-color: var(--color-primary);
}

input:checked + .switch-slider:before {
  transform: translateX(20px);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.modal-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13.5px;
  color: var(--color-text);
  font-family: inherit;
  resize: vertical;
}

.modal-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

@media (max-width: 960px) {
  .automations-kpi-grid {
    grid-template-columns: 1fr;
  }

  .automation-row-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .automation-actions {
    width: 100%;
    justify-content: space-between;
    padding-top: 14px;
    border-top: 1px solid var(--color-border-subtle);
  }
}
</style>
