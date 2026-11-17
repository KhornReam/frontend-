import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
  timeout: 4000,
})

const STORAGE_KEY = 'sms_attendances_data'

function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DEFAULT_ATTENDANCES = [
  {
    id: 1,
    student_id: 1,
    student_name: 'Olivia Martin',
    class_name: 'Grade 10 - A',
    date: getTodayString(),
    check_in_time: '08:02 AM',
    status: 'Present',
    remarks: 'Arrived on school bus A',
  },
  {
    id: 2,
    student_id: 2,
    student_name: 'Ethan Wilson',
    class_name: 'Grade 8 - B',
    date: getTodayString(),
    check_in_time: '08:18 AM',
    status: 'Late',
    remarks: 'Parent called: morning dental checkup',
  },
  {
    id: 3,
    student_id: 3,
    student_name: 'Sophia Chen',
    class_name: 'Grade 11 - A',
    date: getTodayString(),
    check_in_time: '—',
    status: 'Absent',
    remarks: 'Unexcused - automated SMS notification sent to parent',
  },
  {
    id: 4,
    student_id: 4,
    student_name: 'Noah Williams',
    class_name: 'Grade 9 - C',
    date: getTodayString(),
    check_in_time: '08:05 AM',
    status: 'Present',
    remarks: 'On time',
  },
  {
    id: 5,
    student_id: 5,
    student_name: 'Emma Davis',
    class_name: 'Grade 10 - B',
    date: getTodayString(),
    check_in_time: '08:00 AM',
    status: 'Present',
    remarks: 'Homeroom lead check-in',
  },
  {
    id: 6,
    student_id: 6,
    student_name: 'Liam Johnson',
    class_name: 'Grade 10 - A',
    date: getTodayString(),
    check_in_time: '08:04 AM',
    status: 'Present',
    remarks: 'On time',
  },
  {
    id: 7,
    student_id: 7,
    student_name: 'Ava Robinson',
    class_name: 'Grade 10 - A',
    date: getTodayString(),
    check_in_time: '—',
    status: 'Excused',
    remarks: 'Official school track & field regional meet',
  },
  {
    id: 8,
    student_id: 8,
    student_name: 'Lucas Martinez',
    class_name: 'Grade 8 - B',
    date: getTodayString(),
    check_in_time: '08:07 AM',
    status: 'Present',
    remarks: 'On time',
  },
]

function getLocalAttendances() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ATTENDANCES))
  return DEFAULT_ATTENDANCES
}

function saveLocalAttendances(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export async function getAttendances(params = {}) {
  try {
    const response = await api.get('/attendances', { params })
    const list = response.data.data ?? response.data
    if (Array.isArray(list) && list.length > 0) {
      saveLocalAttendances(list)
      return { data: list, fromApi: true }
    }
    return { data: filterLocal(params), fromApi: false }
  } catch {
    return { data: filterLocal(params), fromApi: false }
  }
}

function filterLocal(params = {}) {
  let list = getLocalAttendances()

  if (params.date) {
    list = list.filter((r) => r.date === params.date)
  }

  if (params.class_name && params.class_name !== 'all') {
    list = list.filter((r) => r.class_name?.toLowerCase() === params.class_name.toLowerCase())
  }

  if (params.status && params.status !== 'all') {
    list = list.filter((r) => r.status?.toLowerCase() === params.status.toLowerCase())
  }

  if (params.search) {
    const q = params.search.toLowerCase()
    list = list.filter(
      (r) =>
        r.student_name?.toLowerCase().includes(q) ||
        r.class_name?.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q),
    )
  }

  return list
}

export async function createAttendance(attendance) {
  try {
    const response = await api.post('/attendances', attendance)
    const newRecord = response.data.data ?? response.data
    const local = getLocalAttendances()
    local.push(newRecord)
    saveLocalAttendances(local)
    return response
  } catch (error) {
    if (!error.response) {
      const local = getLocalAttendances()
      const newRecord = {
        ...attendance,
        id: local.length ? Math.max(...local.map((r) => Number(r.id) || 0)) + 1 : 1,
        created_at: new Date().toISOString(),
      }
      local.push(newRecord)
      saveLocalAttendances(local)
      return { data: newRecord }
    }
    throw error
  }
}

export async function updateAttendance(id, attendance) {
  try {
    const response = await api.put(`/attendances/${id}`, attendance)
    const updated = response.data.data ?? response.data
    const local = getLocalAttendances()
    const index = local.findIndex((r) => r.id === id)
    if (index !== -1) {
      local[index] = { ...local[index], ...updated }
      saveLocalAttendances(local)
    }
    return response
  } catch (error) {
    if (!error.response) {
      const local = getLocalAttendances()
      const index = local.findIndex((r) => r.id === id)
      if (index !== -1) {
        local[index] = { ...local[index], ...attendance }
        saveLocalAttendances(local)
        return { data: local[index] }
      }
    }
    throw error
  }
}

export async function deleteAttendance(id) {
  try {
    const response = await api.delete(`/attendances/${id}`)
    const local = getLocalAttendances()
    saveLocalAttendances(local.filter((r) => r.id !== id))
    return response
  } catch (error) {
    if (!error.response) {
      const local = getLocalAttendances()
      saveLocalAttendances(local.filter((r) => r.id !== id))
      return { data: { success: true } }
    }
    throw error
  }
}

export async function batchSaveAttendance(records) {
  try {
    const response = await api.post('/attendances/batch', { records })
    return response
  } catch {
    const local = getLocalAttendances()
    for (const rec of records) {
      const existingIdx = local.findIndex(
        (l) => l.student_name === rec.student_name && l.date === rec.date,
      )
      if (existingIdx !== -1) {
        local[existingIdx] = { ...local[existingIdx], ...rec }
      } else {
        const nextId = local.length ? Math.max(...local.map((r) => Number(r.id) || 0)) + 1 : 1
        local.push({ ...rec, id: nextId })
      }
    }
    saveLocalAttendances(local)
    return { data: { count: records.length } }
  }
}

export { getTodayString }
