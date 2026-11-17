<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createSubject, deleteSubject, getSubjects, updateSubject } from '../../services/subjectService.js'
import { getTeachers } from '../../services/teacherService.js'

const subjects = ref([])
const teachers = ref([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const formError = ref('')
const successMessage = ref('')
const modalOpen = ref(false)
const editingId = ref(null)

const form = reactive({
  name: '',
  code: '',
  grade: 'Grades 10-12',
  teacher: '',
  credits: '3',
  description: '',
})

const gradeOptions = [
  'Grades 10-12',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'Grades 7-9',
  'Grade 9',
  'Grade 8',
  'Grade 7',
  'All Grades (7-12)',
]

const filteredSubjects = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return subjects.value
  return subjects.value.filter((subject) =>
    [subject.name, subject.code, subject.grade, subject.teacher, subject.description]
      .some((val) => val?.toLowerCase().includes(query)),
  )
})

const assignedTeachersCount = computed(() => {
  const teacherSet = new Set()
  subjects.value.forEach((s) => {
    if (s.teacher && s.teacher !== 'Unassigned' && s.teacher.trim() !== '') {
      teacherSet.add(s.teacher.trim())
    }
  })
  return teacherSet.size
})

function messageFor(error) {
  const validationErrors = error.response?.data?.errors
  if (validationErrors) return Object.values(validationErrors).flat().join(' ')
  if (!error.response) return 'Could not connect to Laravel backend. Changes are saved locally in your browser.'
  return error.response.data?.message || 'The request could not be completed.'
}

async function loadSubjects() {
  loading.value = true
  pageError.value = ''
  try {
    const response = await getSubjects()
    subjects.value = response.data || []
  } catch (error) {
    pageError.value = messageFor(error)
  } finally {
    loading.value = false
  }
}

async function loadTeachers() {
  try {
    const response = await getTeachers()
    teachers.value = response.data || []
  } catch {
    // If backend teachers table isn't populated, teachers dropdown will just show text input
  }
}

function openCreateForm() {
  editingId.value = null
  Object.assign(form, {
    name: '',
    code: '',
    grade: 'Grades 10-12',
    teacher: '',
    credits: '3',
    description: '',
  })
  formError.value = ''
  modalOpen.value = true
}

function openEditForm(subject) {
  editingId.value = subject.id
  Object.assign(form, {
    name: subject.name,
    code: subject.code,
    grade: subject.grade || 'Grades 10-12',
    teacher: subject.teacher || '',
    credits: subject.credits || '3',
    description: subject.description || '',
  })
  formError.value = ''
  modalOpen.value = true
}

async function saveSubject() {
  saving.value = true
  formError.value = ''

  const payload = {
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    grade: form.grade,
    teacher: form.teacher.trim() || 'Unassigned',
    credits: form.credits ? String(form.credits) : '3',
    description: form.description.trim(),
  }

  try {
    if (editingId.value) {
      await updateSubject(editingId.value, payload)
      showNotification(`Subject "${payload.name}" updated successfully!`)
    } else {
      await createSubject(payload)
      showNotification(`Subject "${payload.name}" created successfully!`)
    }
    modalOpen.value = false
    await loadSubjects()
  } catch (error) {
    formError.value = messageFor(error)
  } finally {
    saving.value = false
  }
}

async function removeSubject(subject) {
  if (!window.confirm(`Delete subject "${subject.name}" (${subject.code})? This action cannot be undone.`)) {
    return
  }

  pageError.value = ''
  try {
    await deleteSubject(subject.id)
    subjects.value = subjects.value.filter((item) => item.id !== subject.id)
    showNotification(`Subject "${subject.name}" was removed.`)
  } catch (error) {
    pageError.value = messageFor(error)
  }
}

function showNotification(msg) {
  successMessage.value = msg
  setTimeout(() => {
    if (successMessage.value === msg) {
      successMessage.value = ''
    }
  }, 3500)
}

onMounted(() => {
  loadSubjects()
  loadTeachers()
})
</script>

<template>
  <section class="management-page">
    <!-- Header -->
    <header class="management-heading">
      <div>
        <p class="eyebrow">ACADEMIC CURRICULUM</p>
        <h1>Subjects & Courses</h1>
        <p class="page-description">Create, update, and manage school subjects, curriculum codes, and faculty leads.</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateForm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Subject
      </button>
    </header>

    <!-- Success Toast Notification -->
    <div v-if="successMessage" class="toast-notification" role="status">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <!-- Summary KPI Cards -->
    <div class="summary-kpi-grid">
      <article class="summary-card">
        <div class="summary-icon tone-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Total Subjects Offered</span>
          <strong>{{ subjects.length }}</strong>
        </div>
        <span class="summary-caption">Active curriculum</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Assigned Lead Faculty</span>
          <strong>{{ assignedTeachersCount }}</strong>
        </div>
        <span class="summary-caption">Subject coordinators</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon tone-amber">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div class="summary-details">
          <span class="summary-label">Academic Structure</span>
          <strong>Grades 7–12</strong>
        </div>
        <span class="summary-caption">Secondary levels</span>
      </article>
    </div>

    <!-- Main Table Panel -->
    <div class="records-card">
      <div class="records-toolbar">
        <div>
          <h2>Curriculum Subject List</h2>
          <p>Search, create, update, or remove subjects</p>
        </div>
        <div class="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" type="search" placeholder="Search by name, code, teacher..." aria-label="Search subjects" />
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
        <span>Loading curriculum subjects...</span>
      </div>

      <div v-else-if="!filteredSubjects.length" class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <strong>{{ search ? 'No subjects match your search' : 'No subjects registered yet' }}</strong>
        <p>{{ search ? 'Try a different search term or clear the filter.' : 'Add your first subject to organize the curriculum.' }}</p>
        <button v-if="!search" class="secondary-button" type="button" @click="openCreateForm">Add your first subject</button>
      </div>

      <div v-else class="table-scroll">
        <table class="records-table">
          <thead>
            <tr>
              <th>SUBJECT & CODE</th>
              <th>GRADE LEVEL</th>
              <th>LEAD TEACHER</th>
              <th>CREDITS</th>
              <th class="actions-heading">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="subject in filteredSubjects" :key="subject.id">
              <td>
                <div class="subject-cell">
                  <div class="subject-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  </div>
                  <div class="subject-info">
                    <strong>{{ subject.name }}</strong>
                    <div class="subject-sub">
                      <span class="subject-code-tag">{{ subject.code }}</span>
                      <small v-if="subject.description" class="subject-desc-preview">{{ subject.description }}</small>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <span class="grade-pill">{{ subject.grade }}</span>
              </td>
              <td>
                <div v-if="subject.teacher && subject.teacher !== 'Unassigned'" class="teacher-cell">
                  <span class="teacher-avatar">{{ subject.teacher.charAt(0).toUpperCase() }}</span>
                  <span>{{ subject.teacher }}</span>
                </div>
                <span v-else class="unassigned-badge">Unassigned</span>
              </td>
              <td>
                <span class="credits-badge">{{ subject.credits || '3' }} Credits</span>
              </td>
              <td class="row-actions">
                <button class="action-button" type="button" title="Edit subject" @click="openEditForm(subject)">
                  Edit
                </button>
                <button class="action-button danger-action" type="button" title="Delete subject" @click="removeSubject(subject)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="!loading && filteredSubjects.length" class="records-footer">
        Showing {{ filteredSubjects.length }} of {{ subjects.length }} curriculum subjects
      </footer>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <section class="student-modal" role="dialog" aria-modal="true" aria-labelledby="subject-modal-title">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">CURRICULUM MANAGEMENT</p>
            <h2 id="subject-modal-title">{{ editingId ? 'Edit Subject Details' : 'Create New Subject' }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="Close" @click="modalOpen = false">✕</button>
        </div>

        <p class="modal-description">Enter the subject name, course code, grade level, and assigned instructor.</p>

        <form class="student-fields" @submit.prevent="saveSubject">
          <div class="field-row">
            <label>
              Subject Name
              <input v-model="form.name" required maxlength="255" placeholder="e.g. Advanced Mathematics" />
            </label>

            <label>
              Course Code
              <input v-model="form.code" required maxlength="50" placeholder="e.g. MAT-301" />
            </label>
          </div>

          <div class="field-row">
            <label>
              Grade Level
              <select v-model="form.grade" required>
                <option v-for="grade in gradeOptions" :key="grade" :value="grade">{{ grade }}</option>
              </select>
            </label>

            <label>
              Credits / Units
              <input v-model="form.credits" type="number" min="1" max="10" placeholder="e.g. 4" />
            </label>
          </div>

          <label>
            Lead Teacher
            <input
              v-model="form.teacher"
              list="teacher-suggestions"
              placeholder="Select or enter teacher name (e.g. Dr. Arthur Pendelton)"
            />
            <datalist id="teacher-suggestions">
              <option v-for="t in teachers" :key="t.id" :value="t.name">{{ t.name }} ({{ t.specialization || 'Faculty' }})</option>
              <option value="Unassigned">Unassigned</option>
            </datalist>
          </label>

          <label>
            Course Description <span class="optional-label">(Optional)</span>
            <textarea
              v-model="form.description"
              rows="3"
              class="modal-textarea"
              placeholder="Brief summary of syllabus, requirements, or objectives..."
            ></textarea>
          </label>

          <div v-if="formError" class="error-message" role="alert">
            {{ formError }}
          </div>

          <div class="modal-actions">
            <button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button>
            <button class="primary-button" type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : editingId ? 'Update Subject' : 'Create Subject' }}
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

.subject-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.subject-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.subject-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.subject-info strong {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text);
}

.subject-sub {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subject-code-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-family: var(--font-mono);
  font-weight: 700;
}

.subject-desc-preview {
  color: var(--color-text-muted);
  font-size: 11.5px;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grade-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
}

.teacher-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text);
  font-weight: 500;
}

.teacher-avatar {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background-color: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid var(--color-info-border);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
}

.unassigned-badge {
  color: var(--color-text-subtle);
  font-size: 12px;
  font-style: italic;
}

.credits-badge {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.actions-heading {
  text-align: right !important;
}

.row-actions {
  text-align: right;
  white-space: nowrap;
}

.field-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
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
  transition: all 0.15s ease;
}

.modal-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.optional-label {
  color: var(--color-text-subtle);
  font-weight: 400;
  font-size: 11.5px;
}

@media (max-width: 900px) {
  .summary-kpi-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
