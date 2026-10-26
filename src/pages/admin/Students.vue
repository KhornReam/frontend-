<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createStudent, deleteStudent, getStudents, updateStudent } from '../../services/studentService.js'

const students = ref([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const formError = ref('')
const modalOpen = ref(false)
const editingId = ref(null)
const form = reactive({ name: '', email: '', course: '' })

const filteredStudents = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return students.value

  return students.value.filter((student) =>
    [student.name, student.email, student.course].some((value) => value?.toLowerCase().includes(query)),
  )
})

function messageFor(error) {
  const validationErrors = error.response?.data?.errors
  if (validationErrors) return Object.values(validationErrors).flat().join(' ')
  if (!error.response) return 'Could not connect to Laravel. Check that the backend is running.'
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

function openCreateForm() {
  editingId.value = null
  Object.assign(form, { name: '', email: '', course: '' })
  formError.value = ''
  modalOpen.value = true
}

function openEditForm(student) {
  editingId.value = student.id
  Object.assign(form, { name: student.name, email: student.email, course: student.course || '' })
  formError.value = ''
  modalOpen.value = true
}

async function saveStudent() {
  saving.value = true
  formError.value = ''
  const payload = { ...form, course: form.course || null }

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

onMounted(loadStudents)
</script>

<template>
  <section class="management-page">
    <header class="management-heading">
      <div>
        <p class="eyebrow">ACADEMIC RECORDS</p>
        <h1>Students</h1>
        <p class="page-description">Manage student profiles and contact information.</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateForm"><span aria-hidden="true">＋</span> Add student</button>
    </header>

    <div class="summary-card">
      <span class="summary-icon" aria-hidden="true">♙</span>
      <div><span class="summary-label">Total students</span><strong>{{ students.length }}</strong></div>
      <span class="summary-caption">Student records</span>
    </div>

    <div class="records-card">
      <div class="records-toolbar">
        <div><h2>Student directory</h2><p>Search and update student records.</p></div>
        <label class="search-box"><span aria-hidden="true">⌕</span><input v-model="search" type="search" placeholder="Search students" aria-label="Search students" /></label>
      </div>

      <p v-if="pageError" class="state-message error-message" role="alert">{{ pageError }}</p>
      <div v-if="loading" class="state-message">Loading students…</div>
      <div v-else-if="!filteredStudents.length" class="empty-state">
        <span class="empty-icon" aria-hidden="true">♙</span>
        <strong>{{ search ? 'No students match your search' : 'No student records yet' }}</strong>
        <p>{{ search ? 'Try a different name, email, or course.' : 'Add a student to start building your directory.' }}</p>
        <button v-if="!search" class="secondary-button" type="button" @click="openCreateForm">Add your first student</button>
      </div>
      <div v-else class="table-scroll">
        <table class="records-table">
          <thead><tr><th>STUDENT</th><th>EMAIL</th><th>COURSE</th><th class="actions-heading">ACTIONS</th></tr></thead>
          <tbody>
            <tr v-for="student in filteredStudents" :key="student.id">
              <td><div class="person-cell"><span class="person-avatar">{{ student.name?.charAt(0)?.toUpperCase() || '?' }}</span><div><strong>{{ student.name }}</strong><small>Student #{{ student.id }}</small></div></div></td>
              <td>{{ student.email }}</td>
              <td><span v-if="student.course" class="course-tag">{{ student.course }}</span><span v-else class="muted-value">Not assigned</span></td>
              <td class="row-actions"><button class="action-button" type="button" @click="openEditForm(student)">Edit</button><button class="action-button danger-action" type="button" @click="removeStudent(student)">Delete</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer v-if="!loading && filteredStudents.length" class="records-footer">Showing {{ filteredStudents.length }} of {{ students.length }} students</footer>
    </div>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false" @keydown.esc="modalOpen = false">
      <section class="student-modal" role="dialog" aria-modal="true" :aria-labelledby="'student-modal-title'">
        <div class="modal-heading"><div><p class="eyebrow">STUDENT DIRECTORY</p><h2 id="student-modal-title">{{ editingId ? 'Edit student' : 'Add a student' }}</h2></div><button class="close-button" type="button" aria-label="Close" @click="modalOpen = false">×</button></div>
        <p class="modal-description">Enter the student's basic contact and course information.</p>
        <form class="student-fields" @submit.prevent="saveStudent">
          <label>Full name<input v-model="form.name" required maxlength="255" placeholder="e.g. Alex Johnson" /></label>
          <label>Email address<input v-model="form.email" required type="email" maxlength="255" placeholder="alex@example.com" /></label>
          <label>Course <span class="optional-label">Optional</span><input v-model="form.course" maxlength="255" placeholder="e.g. Computer Science" /></label>
          <p v-if="formError" class="error-message" role="alert">{{ formError }}</p>
          <div class="modal-actions"><button class="secondary-button" type="button" @click="modalOpen = false">Cancel</button><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Add student' }}</button></div>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.management-page{--green:#274332;--ink:#27332b;--muted:#7b857b;--line:#e8ece6;color:var(--ink)}.management-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:25px}.eyebrow{margin:0 0 7px;color:#768671;font-size:9px;font-weight:750;letter-spacing:1.45px}.management-heading h1{margin:0;font-size:27px;font-weight:650;letter-spacing:-.8px}.page-description{margin:6px 0 0;color:var(--muted);font-size:12px}.primary-button,.secondary-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:6px;min-height:39px;padding:0 14px;background:var(--green);color:#fff;font-size:11px;font-weight:650;cursor:pointer}.primary-button:hover{background:#345941}.primary-button:disabled{opacity:.6;cursor:wait}.primary-button span{font-size:16px}.summary-card{display:flex;align-items:center;gap:14px;width:min(100%,260px);padding:16px 18px;border:1px solid var(--line);border-radius:9px;background:#fff}.summary-icon{display:grid;place-items:center;width:39px;height:39px;border-radius:9px;background:#edf2e6;color:#46613f;font-size:20px}.summary-card>div{display:flex;flex-direction:column;gap:2px}.summary-label{color:var(--muted);font-size:10px}.summary-card strong{font-size:21px;font-weight:700}.summary-caption{margin-left:auto;color:#9aa298;font-size:9px}.records-card{margin-top:19px;border:1px solid var(--line);border-radius:9px;background:#fff;overflow:hidden}.records-toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:19px 20px;border-bottom:1px solid #edf0eb}.records-toolbar h2{margin:0;font-size:14px;font-weight:650}.records-toolbar p{margin:5px 0 0;color:var(--muted);font-size:10px}.search-box{display:flex;align-items:center;gap:8px;width:235px;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:6px;color:#839080}.search-box>span{font-size:19px}.search-box input{width:100%;border:0;outline:0;color:var(--ink);font-size:11px}.search-box input::placeholder{color:#a2aaa0}.table-scroll{overflow-x:auto}.records-table{width:100%;border-collapse:collapse}.records-table th{height:39px;padding:0 17px;background:#fafbf9;color:#899187;font-size:9px;letter-spacing:.75px;font-weight:700;text-align:left;white-space:nowrap}.records-table td{height:62px;padding:8px 17px;border-bottom:1px solid #f0f2ee;color:#586256;font-size:11px;white-space:nowrap}.records-table tbody tr:last-child td{border-bottom:0}.person-cell{display:flex;align-items:center;gap:10px}.person-cell>div{display:flex;flex-direction:column;gap:3px}.person-cell strong{color:#313a32;font-size:11px;font-weight:620}.person-cell small{color:#9aa197;font-size:9px}.person-avatar{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#e9efdf;color:#4b6345;font-size:11px;font-weight:700}.course-tag{display:inline-flex;padding:4px 8px;border-radius:20px;background:#f1f4ed;color:#68745f;font-size:9px}.muted-value{color:#a0a69e}.actions-heading{text-align:right!important}.row-actions{text-align:right;white-space:nowrap}.action-button{margin-left:6px;padding:6px 8px;border:0;border-radius:4px;background:transparent;color:#45634a;font-size:10px;cursor:pointer}.action-button:hover{background:#f0f4ed}.danger-action{color:#a24c45}.danger-action:hover{background:#fbefee}.records-footer{padding:12px 18px;border-top:1px solid #edf0eb;color:#899187;font-size:10px}.state-message{padding:28px 20px;color:var(--muted);font-size:12px}.error-message{color:#aa4842}.empty-state{display:flex;align-items:center;flex-direction:column;padding:42px 20px;text-align:center}.empty-icon{display:grid;place-items:center;width:45px;height:45px;border-radius:50%;background:#f1f4ed;color:#607356;font-size:22px}.empty-state strong{margin-top:13px;font-size:12px}.empty-state p{margin:6px 0 16px;color:var(--muted);font-size:10px}.secondary-button{border:1px solid #dfe6dc;background:#fff;color:#425943}.secondary-button:hover{background:#f7f9f5}.modal-backdrop{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:20px;background:#18231db8}.student-modal{width:min(100%,460px);padding:23px;border:1px solid var(--line);border-radius:11px;background:#fff;box-shadow:0 20px 70px #0c1b1233}.modal-heading{display:flex;align-items:flex-start;justify-content:space-between}.modal-heading h2{margin:0;font-size:20px;font-weight:650;letter-spacing:-.4px}.close-button{width:30px;height:30px;border:0;border-radius:6px;background:#f4f6f2;color:#687267;font-size:20px;cursor:pointer}.modal-description{margin:8px 0 20px;color:var(--muted);font-size:11px}.student-fields{display:grid;gap:13px}.student-fields label{display:grid;gap:6px;color:#4b554a;font-size:10px;font-weight:650}.student-fields input{height:38px;width:100%;padding:0 10px;border:1px solid #dfe5dc;border-radius:5px;outline:0;color:var(--ink);font-size:11px}.student-fields input:focus{border-color:#829878;box-shadow:0 0 0 3px #8298781c}.optional-label{margin-left:4px;color:#9aa197;font-weight:400}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:7px}@media(max-width:650px){.management-heading{align-items:flex-start}.management-heading h1{font-size:23px}.summary-caption{display:none}.records-toolbar{align-items:flex-start;flex-direction:column}.search-box{width:100%}.records-table th,.records-table td{padding-right:12px;padding-left:12px}.row-actions .action-button{padding-right:4px;padding-left:4px}}
</style>
