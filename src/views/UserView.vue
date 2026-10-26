<script setup>
import { onMounted, ref } from 'vue'
import { createStudent, deleteStudent, getStudents } from '../api/studentApi.js'

const students = ref([])
const name = ref('')
const email = ref('')
const course = ref('')
const error = ref('')
const isLoading = ref(false)
const isSaving = ref(false)

function getErrorMessage(err) {
  const validationErrors = err.response?.data?.errors

  if (validationErrors) {
    return Object.values(validationErrors).flat().join(' ')
  }

  if (!err.response) {
    return 'Cannot reach the backend. Check that Laravel is running and VITE_API_URL is correct.'
  }

  return err.response.data?.message || 'The request could not be completed.'
}

async function loadStudents() {
  isLoading.value = true
  error.value = ''

  try {
    const response = await getStudents()
    students.value = response.data
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    isLoading.value = false
  }
}

async function addStudent() {
  isSaving.value = true
  error.value = ''

  try {
    await createStudent({
      name: name.value,
      email: email.value,
      course: course.value || null,
    })

    name.value = ''
    email.value = ''
    course.value = ''
    await loadStudents()
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    isSaving.value = false
  }
}

async function removeStudent(id) {
  error.value = ''

  try {
    await deleteStudent(id)
    students.value = students.value.filter((student) => student.id !== id)
  } catch (err) {
    error.value = getErrorMessage(err)
  }
}

onMounted(loadStudents)
</script>

<template>
  <section>
    <h2>Student Management</h2>

    <form class="student-form" @submit.prevent="addStudent">
      <input v-model="name" placeholder="Student name" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="course" placeholder="Course (optional)" />
      <button type="submit" :disabled="isSaving">
        {{ isSaving ? 'Saving…' : 'Add student' }}
      </button>
    </form>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="isLoading">Loading students…</p>
    <p v-else-if="students.length === 0">No students yet.</p>

    <table v-else>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Course</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="student in students" :key="student.id">
          <td>{{ student.name }}</td>
          <td>{{ student.email }}</td>
          <td>{{ student.course || '—' }}</td>
          <td><button type="button" @click="removeStudent(student.id)">Delete</button></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
