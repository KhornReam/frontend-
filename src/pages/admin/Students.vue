<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { getClasses } from '../../services/classService.js'
import { createStudent, deleteStudent, getStudents, updateStudent } from '../../services/studentService.js'
import {
  findLinkedUser,
  getCurrentUser,
  removeLinkedUser,
  syncUsersWithDirectories,
  upsertLinkedUser,
} from '../../services/authService.js'
import { hasPermission } from '../../services/permissionService.js'

const currentUser = ref(getCurrentUser())
const canEditStudents = computed(() => {
  if (currentUser.value?.role === 'admin') return true
  if (currentUser.value?.role === 'teacher') return hasPermission('teacher', 'edit_students')
  return false
})

const students = ref([])
const search = ref('')
const genderFilter = ref('all') // 'all' | 'Male' | 'Female'
const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const formError = ref('')
const modalOpen = ref(false)
const editingId = ref(null)
const editingPreviousEmail = ref('')
const classOptions = ref([])
const form = reactive({ name: '', email: '', gender: 'Male', password: 'student123', course: '', school_class_id: '' })

const STUDENT_GENDER_KEY = 'sms_student_genders'

function getSavedStudentGenders() {
  try {
    return JSON.parse(localStorage.getItem(STUDENT_GENDER_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveStudentGenderLocal(emailOrId, gender) {
  if (!emailOrId || !gender) return
  const map = getSavedStudentGenders()
  map[String(emailOrId).toLowerCase()] = gender
  localStorage.setItem(STUDENT_GENDER_KEY, JSON.stringify(map))
}

function resolveStudentGender(student) {
  if (student.gender === 'Male' || student.gender === 'Female') return student.gender
  const map = getSavedStudentGenders()
  return map[String(student.id)] || map[(student.email || '').toLowerCase()] || ''
}

const maleStudentCount = computed(() => students.value.filter((s) => resolveStudentGender(s) === 'Male').length)
const femaleStudentCount = computed(() => students.value.filter((s) => resolveStudentGender(s) === 'Female').length)

const filteredStudents = computed(() => {
  let list = students.value
  if (genderFilter.value !== 'all') {
    list = list.filter((s) => resolveStudentGender(s) === genderFilter.value)
  }

  const query = search.value.trim().toLowerCase()
  if (!query) return list

  return list.filter((student) =>
    [student.name, student.email, student.course, student.school_class?.name, resolveStudentGender(student)]
      .some((value) => value?.toLowerCase().includes(query)),
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
    // Automatically keep Users & Roles directory synchronized with live Students
    syncUsersWithDirectories({ students: students.value })
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
  editingPreviousEmail.value = ''
  Object.assign(form, { name: '', email: '', gender: 'Male', password: 'student123', course: '', school_class_id: '' })
  formError.value = ''
  modalOpen.value = true
}

function openEditForm(student) {
  editingId.value = student.id
  editingPreviousEmail.value = student.email || ''
  const linked = findLinkedUser({ role: 'student', linkedId: student.id, email: student.email })
  Object.assign(form, {
    name: student.name,
    email: student.email,
    gender: resolveStudentGender(student) || 'Male',
    password: linked?.password || 'student123',
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
    gender: form.gender || 'Male',
    course: form.course.trim() || null,
    school_class_id: form.school_class_id || null,
  }

  const matchedClass = classOptions.value.find((c) => c.id == form.school_class_id)
  const assignedDept = matchedClass?.name || payload.course || 'Grade 10 - A'

  try {
    let savedId = editingId.value
    if (editingId.value) {
      await updateStudent(editingId.value, payload)
    } else {
      const res = await createStudent(payload)
      savedId = res.data?.data?.id ?? res.data?.id ?? null
    }

    saveStudentGenderLocal(payload.email, payload.gender)
    if (savedId) saveStudentGenderLocal(savedId, payload.gender)

    // Sync login account & password into Users & Roles
    upsertLinkedUser({
      role: 'student',
      linkedId: savedId,
      name: payload.name,
      email: payload.email,
      password: form.password.trim() || 'student123',
      department: assignedDept,
      previousEmail: editingPreviousEmail.value,
    })

    modalOpen.value = false
    await loadStudents()
  } catch (error) {
    formError.value = messageFor(error)
  } finally {
    saving.value = false
  }
}

async function removeStudent(student) {
  if (!window.confirm(`Delete ${student.name}? This will also remove their portal login account.`)) return
  pageError.value = ''
  try {
    await deleteStudent(student.id)
    students.value = students.value.filter((item) => item.id !== student.id)
    removeLinkedUser({ role: 'student', linkedId: student.id, email: student.email })
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
      <button v-if="canEditStudents" class="primary-button" type="button" @click="openCreateForm">
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
        <span class="summary-caption">{{ classOptions.length }} Classes</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="14" r="5"/>
            <path d="M19 5l-5.4 5.4"/>
            <path d="M15 5h4v4"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Male Students</span>
          <strong>{{ maleStudentCount }}</strong>
        </div>
        <span class="summary-caption">Enrolled male</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-purple">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="9" r="5"/>
            <path d="M12 14v7"/>
            <path d="M9 18h6"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Female Students</span>
          <strong>{{ femaleStudentCount }}</strong>
        </div>
        <span class="summary-caption">Enrolled female</span>
      </article>
    </div>

    <!-- Main Table Card -->
    <div class="records-card">
      <div class="records-toolbar">
        <div>
          <h2>Student Records</h2>
          <p>Search, filter by gender, edit or remove student details</p>
        </div>
        <div class="toolbar-controls" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div class="gender-filter-group" role="group" aria-label="Filter students by gender">
            <button type="button" class="gender-filter-pill" :class="{ active: genderFilter === 'all' }" @click="genderFilter = 'all'">
              All ({{ students.length }})
            </button>
            <button type="button" class="gender-filter-pill" :class="{ active: genderFilter === 'Male' }" @click="genderFilter = 'Male'">
              Male ({{ maleStudentCount }})
            </button>
            <button type="button" class="gender-filter-pill" :class="{ active: genderFilter === 'Female' }" @click="genderFilter = 'Female'">
              Female ({{ femaleStudentCount }})
            </button>
          </div>
          <div class="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input v-model="search" type="search" placeholder="Search by name, email, class..." aria-label="Search students" />
          </div>
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
              <th>GENDER</th>
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
              <td>
                <span
                  v-if="resolveStudentGender(student) === 'Male'"
                  class="gender-badge gender-male"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="10" cy="14" r="5"/>
                    <path d="M19 5l-5.4 5.4"/>
                    <path d="M15 5h4v4"/>
                  </svg>
                  Male
                </span>
                <span
                  v-else-if="resolveStudentGender(student) === 'Female'"
                  class="gender-badge gender-female"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="9" r="5"/>
                    <path d="M12 14v7"/>
                    <path d="M9 18h6"/>
                  </svg>
                  Female
                </span>
                <span v-else class="gender-badge gender-unset">Unassigned</span>
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
              <td v-if="canEditStudents" class="row-actions">
                <button class="action-button" type="button" @click="openEditForm(student)">Edit</button>
                <button class="action-button danger-action" type="button" @click="removeStudent(student)">Delete</button>
              </td>
              <td v-else class="row-actions">
                <span class="muted-value">View Only</span>
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
            <p class="eyebrow">STUDENT DIRECTORY & PORTAL LOGIN</p>
            <h2 id="student-modal-title">{{ editingId ? 'Edit Student Details' : 'Register New Student' }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="Close" @click="modalOpen = false">✕</button>
        </div>

        <p class="modal-description">Enter student profile details and portal login password (automatically synced with Users & Roles).</p>

        <form class="student-fields" @submit.prevent="saveStudent">
          <div class="field-row">
            <label>
              Full Name
              <input v-model="form.name" required maxlength="255" placeholder="e.g. Alex Johnson" />
            </label>

            <!-- Professional Male / Female Gender Picker -->
            <div class="gender-field-wrap">
              <span class="gender-field-label">Gender</span>
              <div class="gender-picker-grid" role="group" aria-label="Select student gender">
                <button
                  type="button"
                  class="gender-option-btn"
                  :class="{ 'active-male': form.gender === 'Male' }"
                  @click="form.gender = 'Male'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="10" cy="14" r="5"/>
                    <path d="M19 5l-5.4 5.4"/>
                    <path d="M15 5h4v4"/>
                  </svg>
                  <span>Male</span>
                </button>

                <button
                  type="button"
                  class="gender-option-btn"
                  :class="{ 'active-female': form.gender === 'Female' }"
                  @click="form.gender = 'Female'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="9" r="5"/>
                    <path d="M12 14v7"/>
                    <path d="M9 18h6"/>
                  </svg>
                  <span>Female</span>
                </button>
              </div>
            </div>
          </div>

          <div class="field-row">
            <label>
              Email Address (Portal Login)
              <input v-model="form.email" required type="email" maxlength="255" placeholder="alex@school.edu" />
            </label>

            <label>
              Portal Login Password
              <input v-model="form.password" required maxlength="100" placeholder="e.g. student123" />
            </label>
          </div>

          <div class="field-row">
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
          </div>

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
