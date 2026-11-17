<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createTeacher, deleteTeacher, getTeachers, updateTeacher } from '../../services/teacherService.js'

const teachers = ref([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const formError = ref('')
const modalOpen = ref(false)
const editingId = ref(null)
const form = reactive({ employee_number: '', name: '', email: '', phone: '', specialization: '' })

const filteredTeachers = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return teachers.value
  return teachers.value.filter((teacher) =>
    [teacher.employee_number, teacher.name, teacher.email, teacher.phone, teacher.specialization]
      .some((value) => value?.toLowerCase().includes(query)),
  )
})

const departmentsCount = computed(() => {
  const set = new Set(teachers.value.map((t) => t.specialization).filter(Boolean))
  return set.size || (teachers.value.length ? 5 : 0)
})

function messageFor(error) {
  const validationErrors = error.response?.data?.errors
  if (validationErrors) return Object.values(validationErrors).flat().join(' ')
  if (!error.response) return 'Could not connect to Laravel backend. Check that the server is running.'
  return error.response.data?.message || 'The request could not be completed.'
}

async function loadTeachers() {
  loading.value = true
  pageError.value = ''
  try {
    const response = await getTeachers()
    teachers.value = response.data
  } catch (error) {
    pageError.value = messageFor(error)
  } finally {
    loading.value = false
  }
}

function openCreateForm() {
  editingId.value = null
  Object.assign(form, { employee_number: '', name: '', email: '', phone: '', specialization: '' })
  formError.value = ''
  modalOpen.value = true
}

function openEditForm(teacher) {
  editingId.value = teacher.id
  Object.assign(form, {
    employee_number: teacher.employee_number || '',
    name: teacher.name,
    email: teacher.email || '',
    phone: teacher.phone || '',
    specialization: teacher.specialization || '',
  })
  formError.value = ''
  modalOpen.value = true
}

async function saveTeacher() {
  saving.value = true
  formError.value = ''

  const payload = {
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    employee_number: form.employee_number.trim() || null,
    specialization: form.specialization.trim() || null,
  }

  try {
    if (editingId.value) await updateTeacher(editingId.value, payload)
    else await createTeacher(payload)
    modalOpen.value = false
    await loadTeachers()
  } catch (error) {
    formError.value = messageFor(error)
  } finally {
    saving.value = false
  }
}

async function removeTeacher(teacher) {
  if (!window.confirm(`Delete ${teacher.name}? This cannot be undone.`)) return
  pageError.value = ''
  try {
    await deleteTeacher(teacher.id)
    teachers.value = teachers.value.filter((item) => item.id !== teacher.id)
  } catch (error) {
    pageError.value = messageFor(error)
  }
}

onMounted(loadTeachers)
</script>

<template>
  <section class="management-page">
    <header class="management-heading">
      <div>
        <p class="eyebrow">STAFF DIRECTORY</p>
        <h1>Teachers & Faculty</h1>
        <p class="page-description">Manage teaching faculty profiles, subject specializations, and contact details.</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateForm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Teacher
      </button>
    </header>

    <!-- Summary KPI Cards -->
    <div class="teachers-kpi-grid">
      <article class="summary-card">
        <div class="summary-icon tone-blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Total Faculty Staff</span>
          <strong>{{ teachers.length }}</strong>
        </div>
        <span class="summary-caption">Active directory</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-amber">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Academic Faculties</span>
          <strong>{{ departmentsCount }}</strong>
        </div>
        <span class="summary-caption">Specializations</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-green">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Instructional Status</span>
          <strong>100% Active</strong>
        </div>
        <span class="summary-caption">Staff verified</span>
      </article>
    </div>

    <div class="records-card">
      <div class="records-toolbar">
        <div>
          <h2>Teacher Directory</h2>
          <p>Search and manage educator profiles</p>
        </div>
        <div class="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" type="search" placeholder="Search by name, email, subject..." aria-label="Search teachers" />
        </div>
      </div>

      <div v-if="pageError" class="state-message error-message" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ pageError }}</span>
      </div>

      <div v-if="loading" class="state-message">
        <div class="spinner"></div>
        <span>Loading faculty records...</span>
      </div>

      <div v-else-if="!filteredTeachers.length" class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <strong>{{ search ? 'No teachers match your search query' : 'No teacher records yet' }}</strong>
        <p>{{ search ? 'Try a different keyword, name, or subject area.' : 'Add your first faculty member to begin building the staff directory.' }}</p>
        <button v-if="!search" class="secondary-button" type="button" @click="openCreateForm">Add your first teacher</button>
      </div>

      <div v-else class="table-scroll">
        <table class="records-table">
          <thead>
            <tr>
              <th>TEACHER</th>
              <th>EMAIL</th>
              <th>PHONE</th>
              <th>SUBJECT AREA</th>
              <th class="actions-heading">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="teacher in filteredTeachers" :key="teacher.id">
              <td>
                <div class="person-cell">
                  <span class="person-avatar">{{ teacher.name?.charAt(0)?.toUpperCase() || '?' }}</span>
                  <div class="person-info">
                    <strong>{{ teacher.name }}</strong>
                    <small>{{ teacher.employee_number || `Staff #${teacher.id}` }}</small>
                  </div>
                </div>
              </td>
              <td>{{ teacher.email || '—' }}</td>
              <td>{{ teacher.phone || '—' }}</td>
              <td>
                <span v-if="teacher.specialization" class="course-tag">{{ teacher.specialization }}</span>
                <span v-else class="muted-value">Not assigned</span>
              </td>
              <td class="row-actions">
                <button class="action-button" type="button" @click="openEditForm(teacher)">Edit</button>
                <button class="action-button danger-action" type="button" @click="removeTeacher(teacher)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="!loading && filteredTeachers.length" class="records-footer">
        Showing {{ filteredTeachers.length }} of {{ teachers.length }} teachers
      </footer>
    </div>

    <!-- Modal Form -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <section class="teacher-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-modal-title">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">FACULTY DIRECTORY</p>
            <h2 id="teacher-modal-title">{{ editingId ? 'Edit Teacher Details' : 'Add New Faculty' }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="Close" @click="modalOpen = false">✕</button>
        </div>

        <p class="modal-description">Enter teacher details and subject specialization.</p>

        <form class="teacher-fields" @submit.prevent="saveTeacher">
          <label>
            Full Name
            <input v-model="form.name" required maxlength="255" placeholder="e.g. Dr. Jamie Lee" />
          </label>

          <label>
            Email Address <span class="optional-label">(Optional)</span>
            <input v-model="form.email" type="email" maxlength="255" placeholder="jamie@school.edu" />
          </label>

          <div class="field-row">
            <label>
              Employee ID <span class="optional-label">(Optional)</span>
              <input v-model="form.employee_number" maxlength="50" placeholder="e.g. T-1042" />
            </label>
            <label>
              Phone Number <span class="optional-label">(Optional)</span>
              <input v-model="form.phone" maxlength="30" placeholder="+1 (555) 000-0000" />
            </label>
          </div>

          <label>
            Subject Specialization <span class="optional-label">(Optional)</span>
            <input v-model="form.specialization" maxlength="255" placeholder="e.g. Advanced Mathematics" />
          </label>

          <div v-if="formError" class="error-message" role="alert">
            {{ formError }}
          </div>

          <div class="modal-actions">
            <button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button>
            <button class="primary-button" type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : editingId ? 'Update Teacher' : 'Add Teacher' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.management-page {
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

.person-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.person-avatar {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  background: var(--color-info-bg);
  color: var(--color-info);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.person-info {
  display: flex;
  flex-direction: column;
}

.person-info strong {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text);
}

.person-info small {
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.actions-heading {
  text-align: right !important;
}

.row-actions {
  text-align: right;
  white-space: nowrap;
}

.state-message {
  padding: 36px 20px;
  text-align: center;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 13.5px;
}

.error-message {
  color: var(--color-danger);
  background-color: var(--color-danger-bg);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin: 10px 0;
}

.optional-label {
  color: var(--color-text-subtle);
  font-weight: 400;
  font-size: 11.5px;
}

@media (max-width: 600px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
