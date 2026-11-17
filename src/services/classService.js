import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: { Accept: 'application/json' },
})

export function getClasses() {
  return api.get('/classes')
}

export function createClass(schoolClass) {
  return api.post('/classes', schoolClass)
}

export function updateClass(id, schoolClass) {
  return api.put(`/classes/${id}`, schoolClass)
}

export function deleteClass(id) {
  return api.delete(`/classes/${id}`)
}
