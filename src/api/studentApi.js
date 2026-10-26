import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
})

export function getStudents() {
  return api.get('/students')
}

export function createStudent(student) {
  return api.post('/students', student)
}

export function deleteStudent(id) {
  return api.delete(`/students/${id}`)
}

export default api
