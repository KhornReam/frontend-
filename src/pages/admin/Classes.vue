<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createClass, deleteClass, getClasses, updateClass } from '../../services/classService.js'

const classes = ref([])
const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const formError = ref('')
const modalOpen = ref(false)
const editingId = ref(null)
const form = reactive({ grade: '', section: '' })

const assignedStudents = computed(() => classes.value.reduce((count, schoolClass) => count + (schoolClass.students_count || 0), 0))

function messageFor(error) {
  const validationErrors = error.response?.data?.errors
  if (validationErrors) return Object.values(validationErrors).flat().join(' ')
  if (!error.response) return 'Could not connect to Laravel backend. Check that the server is running.'
  return error.response.data?.message || 'The request could not be completed.'
}

async function loadClasses() {
  loading.value = true
  pageError.value = ''

  try {
    const response = await getClasses()
    classes.value = response.data
  } catch (error) {
    pageError.value = messageFor(error)
  } finally {
    loading.value = false
  }
}

function openCreateForm() {
  editingId.value = null
  Object.assign(form, { grade: '', section: '' })
  formError.value = ''
  modalOpen.value = true
}

function openEditForm(schoolClass) {
  editingId.value = schoolClass.id
  Object.assign(form, { grade: schoolClass.grade, section: schoolClass.section })
  formError.value = ''
  modalOpen.value = true
}

async function saveClass() {
  saving.value = true
  formError.value = ''
  const payload = { grade: Number(form.grade), section: form.section.trim().toUpperCase() }

  try {
    if (editingId.value) await updateClass(editingId.value, payload)
    else await createClass(payload)
    modalOpen.value = false
    await loadClasses()
  } catch (error) {
    formError.value = messageFor(error)
  } finally {
    saving.value = false
  }
}

async function removeClass(schoolClass) {
  const assignedCount = schoolClass.students_count
  const assignmentNotice = assignedCount ? ` ${assignedCount} student(s) in it will become unassigned.` : ''
  if (!window.confirm(`Delete class ${schoolClass.name}?${assignmentNotice}`)) return

  pageError.value = ''
  try {
    await deleteClass(schoolClass.id)
    await loadClasses()
  } catch (error) {
    pageError.value = messageFor(error)
  }
}

onMounted(loadClasses)
</script>

<template>
  <section class="management-page">
    <header class="management-heading">
      <div>
        <p class="eyebrow">ACADEMIC STRUCTURE</p>
        <h1>Class Management</h1>
        <p class="page-description">Add, organize, and monitor grade levels and section capacities.</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateForm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Class
      </button>
    </header>

    <div class="class-summary">
      <article class="summary-card">
        <div class="summary-icon tone-amber">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Active Class Sections</span>
          <strong>{{ classes.length }}</strong>
        </div>
        <span class="summary-caption">Grades 1–12</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Students Assigned</span>
          <strong>{{ assignedStudents }}</strong>
        </div>
        <span class="summary-caption">Enrolled students</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-green">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Average Capacity</span>
          <strong>{{ classes.length ? Math.round(assignedStudents / classes.length) || 32 : 0 }}</strong>
        </div>
        <span class="summary-caption">Students / Section</span>
      </article>
    </div>

    <div class="records-card">
      <div class="records-toolbar">
        <div>
          <h2>Class Sections Overview</h2>
          <p>Student counts update automatically based on student assignments</p>
        </div>
      </div>

      <p v-if="pageError" class="state-message error-message" role="alert">{{ pageError }}</p>
      <div v-else-if="loading" class="state-message">
        <div class="spinner"></div>
        <span>Loading class enrollment...</span>
      </div>
      <div v-else-if="!classes.length" class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
        </div>
        <strong>No class sections created yet</strong>
        <p>Add a grade and section to start assigning students and homeroom teachers.</p>
        <button class="secondary-button" type="button" @click="openCreateForm">Add your first class</button>
      </div>

      <div v-else class="table-scroll">
        <table class="records-table">
          <thead>
            <tr>
              <th>CLASS NAME</th>
              <th>GRADE LEVEL</th>
              <th>SECTION</th>
              <th>ENROLLED STUDENTS</th>
              <th class="actions-heading">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="schoolClass in classes" :key="schoolClass.id">
              <td><span class="course-tag">{{ schoolClass.name }}</span></td>
              <td>Grade {{ schoolClass.grade }}</td>
              <td>Section {{ schoolClass.section }}</td>
              <td>
                <strong>{{ schoolClass.students_count }}</strong>
                <span class="muted-value"> students</span>
              </td>
              <td class="row-actions">
                <button class="action-button" type="button" @click="openEditForm(schoolClass)">Edit</button>
                <button class="action-button danger-action" type="button" @click="removeClass(schoolClass)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="!loading && !pageError && classes.length" class="records-footer">
        Showing {{ classes.length }} active class sections
      </footer>
    </div>

    <!-- Modal Form -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <section class="student-modal" role="dialog" aria-modal="true" aria-labelledby="class-modal-title">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">ACADEMIC STRUCTURE</p>
            <h2 id="class-modal-title">{{ editingId ? 'Edit Class Section' : 'Add Class Section' }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="Close" @click="modalOpen = false">✕</button>
        </div>

        <p class="modal-description">Choose a grade number (1–12) and a section identifier (e.g. A, B, C).</p>

        <form class="student-fields" @submit.prevent="saveClass">
          <label>
            Grade Level (1–12)
            <input v-model="form.grade" type="number" min="1" max="12" required placeholder="e.g. 10" />
          </label>

          <label>
            Section Letter or Number
            <input v-model="form.section" required maxlength="10" pattern="[A-Za-z0-9]+" placeholder="e.g. A" />
          </label>

          <div v-if="formError" class="error-message" role="alert">
            {{ formError }}
          </div>

          <div class="modal-actions">
            <button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button>
            <button class="primary-button" type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Class' }}
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
  font-size: 13.5px;
}

.error-message {
  color: var(--color-danger);
  background-color: var(--color-danger-bg);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin: 10px 0;
}
</style>
