import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: { Accept: 'application/json' },
})

export function getTeachers() {
  return api.get('/teachers').then((response) => ({
    ...response,
    data: response.data.data ?? response.data,
  }))
}

export function createTeacher(teacher) {
  return api.post('/teachers', teacher)
}

export function updateTeacher(id, teacher) {
  return api.put(`/teachers/${id}`, teacher)
}

export function deleteTeacher(id) {
  return api.delete(`/teachers/${id}`)
}
