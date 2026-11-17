<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { getClasses } from '../../services/classService.js'
import { createStudent, deleteStudent, getStudents, updateStudent } from '../../services/studentService.js'

const students = ref([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const formError = ref('')
const modalOpen = ref(false)
const editingId = ref(null)
const classOptions = ref([])
const form = reactive({ name: '', email: '', course: '', school_class_id: '' })

const filteredStudents = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return students.value

  return students.value.filter((student) =>
    [student.name, student.email, student.course, student.school_class?.name].some((value) => value?.toLowerCase().includes(query)),
  )
})

function messageFor(error) {
  const validationErrors = error.response?.data?.errors
  if (validationErrors) return Object.values(validationErrors).flat().join(' ')
  if (!error.response) return 'Could not connect to Laravel backend. Check that the server is running.'
  return error.response.data?.message || 'The request could not be completed.'
}

async function loadStudents() {
  loading.value = true
  pageError.value = ''
  try {
    const response = await getStudents()
    students.value = response.data
  } catch (error) {
    pageError.value = messageFor(error)
  } finally {
    loading.value = false
  }
}

async function loadClasses() {
  try {
    const response = await getClasses()
    classOptions.value = response.data
  } catch (error) {
    pageError.value = messageFor(error)
  }
}

function openCreateForm() {
  editingId.value = null
  Object.assign(form, { name: '', email: '', course: '', school_class_id: '' })
  formError.value = ''
  modalOpen.value = true
}

function openEditForm(student) {
  editingId.value = student.id
  Object.assign(form, {
    name: student.name,
    email: student.email,
    course: student.course || '',
    school_class_id: student.school_class_id || '',
  })
  formError.value = ''
  modalOpen.value = true
}

async function saveStudent() {
  saving.value = true
  formError.value = ''

  const payload = {
    name: form.name.trim(),
    email: form.email.trim(),
    course: form.course.trim() || null,
    school_class_id: form.school_class_id || null,
  }

  try {
    if (editingId.value) await updateStudent(editingId.value, payload)
    else await createStudent(payload)
    modalOpen.value = false
    await loadStudents()
  } catch (error) {
    formError.value = messageFor(error)
  } finally {
    saving.value = false
  }
}

async function removeStudent(student) {
  if (!window.confirm(`Delete ${student.name}? This cannot be undone.`)) return
  pageError.value = ''
  try {
    await deleteStudent(student.id)
    students.value = students.value.filter((item) => item.id !== student.id)
  } catch (error) {
    pageError.value = messageFor(error)
  }
}

onMounted(() => {
  loadStudents()
  loadClasses()
})
</script>

<template>
  <section class="management-page">
    <!-- Page Header -->
    <header class="management-heading">
      <div>
        <p class="eyebrow">ACADEMIC RECORDS</p>
        <h1>Student Directory</h1>
        <p class="page-description">Manage student enrollments, class assignments, and student contact information.</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateForm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Student
      </button>
    </header>

    <!-- Summary KPI Cards -->
    <div class="students-kpi-grid">
      <article class="summary-card">
        <div class="summary-icon tone-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Total Registered Students</span>
          <strong>{{ students.length }}</strong>
        </div>
        <span class="summary-caption">Active directory</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Active Class Sections</span>
          <strong>{{ classOptions.length }}</strong>
        </div>
        <span class="summary-caption">Current term</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-green">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Enrollment Standing</span>
          <strong>100% Verified</strong>
        </div>
        <span class="summary-caption">Academic active</span>
      </article>
    </div>

    <!-- Main Table Card -->
    <div class="records-card">
      <div class="records-toolbar">
        <div>
          <h2>Student Records</h2>
          <p>Search, filter, edit or remove student details</p>
        </div>
        <div class="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" type="search" placeholder="Search by name, email, class..." aria-label="Search students" />
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
        <span>Loading student records...</span>
      </div>

      <div v-else-if="!filteredStudents.length" class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
        <strong>{{ search ? 'No students match your search query' : 'No student records yet' }}</strong>
        <p>{{ search ? 'Try searching for another student name, email, or class name.' : 'Start organizing your school by registering your first student.' }}</p>
        <button v-if="!search" class="secondary-button" type="button" @click="openCreateForm">Add your first student</button>
      </div>

      <div v-else class="table-scroll">
        <table class="records-table">
          <thead>
            <tr>
              <th>STUDENT</th>
              <th>EMAIL</th>
              <th>CLASS</th>
              <th>COURSE</th>
              <th class="actions-heading">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in filteredStudents" :key="student.id">
              <td>
                <div class="person-cell">
                  <span class="person-avatar">{{ student.name?.charAt(0)?.toUpperCase() || '?' }}</span>
                  <div class="person-info">
                    <strong>{{ student.name }}</strong>
                    <small>ID #{{ student.id }}</small>
                  </div>
                </div>
              </td>
              <td>{{ student.email }}</td>
              <td>
                <span v-if="student.school_class" class="course-tag">{{ student.school_class.name }}</span>
                <span v-else class="muted-value">Unassigned</span>
              </td>
              <td>
                <span v-if="student.course" class="course-tag">{{ student.course }}</span>
                <span v-else class="muted-value">General</span>
              </td>
              <td class="row-actions">
                <button class="action-button" type="button" @click="openEditForm(student)">Edit</button>
                <button class="action-button danger-action" type="button" @click="removeStudent(student)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="!loading && filteredStudents.length" class="records-footer">
        Showing {{ filteredStudents.length }} of {{ students.length }} student records
      </footer>
    </div>

    <!-- Modal Form -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <section class="student-modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">STUDENT DIRECTORY</p>
            <h2 id="student-modal-title">{{ editingId ? 'Edit Student Details' : 'Register New Student' }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="Close" @click="modalOpen = false">✕</button>
        </div>

        <p class="modal-description">Enter the student's legal name, email address, and class assignment.</p>

        <form class="student-fields" @submit.prevent="saveStudent">
          <label>
            Full Name
            <input v-model="form.name" required maxlength="255" placeholder="e.g. Alex Johnson" />
          </label>

          <label>
            Email Address
            <input v-model="form.email" required type="email" maxlength="255" placeholder="alex@example.com" />
          </label>

          <label>
            Assigned Class
            <select v-model="form.school_class_id">
              <option value="">Not assigned</option>
              <option v-for="schoolClass in classOptions" :key="schoolClass.id" :value="schoolClass.id">
                {{ schoolClass.name }}
              </option>
            </select>
          </label>

          <label>
            Course Track <span class="optional-label">(Optional)</span>
            <input v-model="form.course" maxlength="255" placeholder="e.g. Science Track" />
          </label>

          <div v-if="formError" class="error-message" role="alert">
            {{ formError }}
          </div>

          <div class="modal-actions">
            <button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button>
            <button class="primary-button" type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : editingId ? 'Update Student' : 'Add Student' }}
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
  background: var(--color-primary-light);
  color: var(--color-primary);
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
</style>
