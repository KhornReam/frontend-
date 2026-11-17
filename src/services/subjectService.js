import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
  timeout: 4000,
})

const STORAGE_KEY = 'sms_subjects_data'

const DEFAULT_SUBJECTS = [
  { id: 1, name: 'Mathematics', code: 'MAT-101', grade: 'Grades 10-12', teacher: 'Dr. Arthur Pendelton', credits: '4', description: 'Core algebraic and calculus concepts for upper secondary.' },
  { id: 2, name: 'English Literature', code: 'ENG-201', grade: 'Grades 10-12', teacher: 'Sarah Jenkins', credits: '3', description: 'Classical literature analysis, essay writing and rhetoric.' },
  { id: 3, name: 'Chemistry', code: 'CHEM-301', grade: 'Grades 10-12', teacher: 'Michael Chang', credits: '4', description: 'Organic, inorganic and analytical laboratory experiments.' },
  { id: 4, name: 'World History', code: 'HIST-102', grade: 'Grades 10-12', teacher: 'Amanda Brooks', credits: '3', description: 'Modern civilizations, geopolitics and historical developments.' },
  { id: 5, name: 'Physics', code: 'PHYS-202', grade: 'Grades 10-12', teacher: 'David Miller', credits: '4', description: 'Classical mechanics, electromagnetism and thermodynamics.' },
  { id: 6, name: 'Biology', code: 'BIO-105', grade: 'Grades 10-12', teacher: 'Rachel Green', credits: '4', description: 'Cell biology, genetics, ecology and evolutionary biology.' },
  { id: 7, name: 'Computer Science', code: 'CS-401', grade: 'Grades 10-12', teacher: 'Jordan Lee', credits: '4', description: 'Introductory programming, algorithms, and web technologies.' },
  { id: 8, name: 'Civics & Ethics', code: 'CIV-110', grade: 'Grades 10-12', teacher: 'Elena Rostova', credits: '2', description: 'Government systems, ethics, constitutional rights and community law.' },
]

function getLocalSubjects() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUBJECTS))
  return DEFAULT_SUBJECTS
}

function saveLocalSubjects(subjects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects))
}

export async function getSubjects() {
  try {
    const response = await api.get('/subjects')
    const list = response.data.data ?? response.data
    if (Array.isArray(list) && list.length > 0) {
      saveLocalSubjects(list)
      return { data: list, fromApi: true }
    }
    return { data: getLocalSubjects(), fromApi: false }
  } catch {
    return { data: getLocalSubjects(), fromApi: false }
  }
}

export async function createSubject(subject) {
  try {
    const response = await api.post('/subjects', subject)
    const newSubject = response.data.data ?? response.data
    const local = getLocalSubjects()
    local.push(newSubject)
    saveLocalSubjects(local)
    return response
  } catch (error) {
    // If backend connection fails, persist locally
    if (!error.response) {
      const local = getLocalSubjects()
      const newSubject = {
        ...subject,
        id: local.length ? Math.max(...local.map(s => Number(s.id) || 0)) + 1 : 1,
        created_at: new Date().toISOString(),
      }
      local.push(newSubject)
      saveLocalSubjects(local)
      return { data: newSubject }
    }
    throw error
  }
}

export async function updateSubject(id, subject) {
  try {
    const response = await api.put(`/subjects/${id}`, subject)
    const updated = response.data.data ?? response.data
    const local = getLocalSubjects().map(item => item.id === id ? { ...item, ...updated } : item)
    saveLocalSubjects(local)
    return response
  } catch (error) {
    if (!error.response) {
      const local = getLocalSubjects().map(item => item.id === id ? { ...item, ...subject } : item)
      saveLocalSubjects(local)
      return { data: { id, ...subject } }
    }
    throw error
  }
}

export async function deleteSubject(id) {
  try {
    const response = await api.delete(`/subjects/${id}`)
    const local = getLocalSubjects().filter(item => item.id !== id)
    saveLocalSubjects(local)
    return response
  } catch (error) {
    if (!error.response) {
      const local = getLocalSubjects().filter(item => item.id !== id)
      saveLocalSubjects(local)
      return { data: { message: 'Deleted locally.' } }
    }
    throw error
  }
}

export default api
