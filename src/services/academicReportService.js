/**
 * academicReportService.js
 * Comprehensive Academic Performance, Grade Calculation Engine,
 * and Student Report Card Analytics.
 */

const STORAGE_KEY = 'sms_student_grades_data'

/**
 * Standard Grading Scale
 * 93-100: A+ (4.0)
 * 90-92:  A  (4.0)
 * 87-89:  B+ (3.3)
 * 83-86:  B  (3.0)
 * 80-82:  B- (2.7)
 * 77-79:  C+ (2.3)
 * 73-76:  C  (2.0)
 * 70-72:  C- (1.7)
 * 60-69:  D  (1.0)
 * <60:    F  (0.0)
 */
export function getLetterGrade(score) {
  const num = Number(score) || 0
  if (num >= 93) return { grade: 'A+', points: 4.0, description: 'Outstanding Mastery' }
  if (num >= 90) return { grade: 'A', points: 4.0, description: 'Excellent Performance' }
  if (num >= 87) return { grade: 'B+', points: 3.3, description: 'Very Good' }
  if (num >= 83) return { grade: 'B', points: 3.0, description: 'Good Understanding' }
  if (num >= 80) return { grade: 'B-', points: 2.7, description: 'Above Average' }
  if (num >= 77) return { grade: 'C+', points: 2.3, description: 'Satisfactory' }
  if (num >= 73) return { grade: 'C', points: 2.0, description: 'Average Comprehension' }
  if (num >= 70) return { grade: 'C-', points: 1.7, description: 'Passing Competency' }
  if (num >= 60) return { grade: 'D', points: 1.0, description: 'Minimum Passing' }
  return { grade: 'F', points: 0.0, description: 'Failing / Incomplete' }
}

export function calculateCompositeScore({
  midterm = 0,
  final = 0,
  assignments = 0,
  attendance = 0,
  weights = { midterm: 0.3, final: 0.4, assignments: 0.2, attendance: 0.1 },
}) {
  const composite =
    midterm * weights.midterm +
    final * weights.final +
    assignments * weights.assignments +
    attendance * weights.attendance
  return Math.round(composite * 10) / 10
}

export function calculateStudentGpa(courses = [], isHonorsWeighted = false) {
  if (!courses.length) return '0.00'
  let totalPoints = 0
  let totalCredits = 0

  courses.forEach((c) => {
    const cred = Number(c.credits) || 3
    let pts = c.points !== undefined ? Number(c.points) : getLetterGrade(c.score).points
    if (isHonorsWeighted && c.isHonors) pts += 0.5
    if (isHonorsWeighted && c.isAp) pts += 1.0
    totalPoints += pts * cred
    totalCredits += cred
  })

  if (!totalCredits) return '0.00'
  return (totalPoints / totalCredits).toFixed(2)
}

const DEFAULT_STUDENT_PERFORMANCE = [
  {
    id: 1,
    student_id: 1,
    name: 'Olivia Martin',
    email: 'olivia.martin@school.edu',
    class_name: 'Grade 10 - A',
    attendance_rate: '98.4%',
    standing: 'Honor Roll (Summa Cum Laude)',
    courses: [
      { code: 'MAT-101', subject: 'Mathematics', credits: 4, score: 96, isAp: false, isHonors: true, remark: 'Exceptional mathematical reasoning.' },
      { code: 'ENG-201', subject: 'English Literature', credits: 3, score: 92, isAp: false, isHonors: false, remark: 'Insightful literary essays.' },
      { code: 'CHEM-301', subject: 'Chemistry', credits: 4, score: 94, isAp: true, isHonors: false, remark: 'Superb laboratory conduct.' },
      { code: 'PHYS-202', subject: 'Physics', credits: 4, score: 91, isAp: false, isHonors: true, remark: 'Strong mechanics problem-solving.' },
      { code: 'CS-401', subject: 'Computer Science', credits: 4, score: 98, isAp: true, isHonors: false, remark: 'Outstanding algorithm design.' },
      { code: 'HIST-102', subject: 'World History', credits: 3, score: 89, isAp: false, isHonors: false, remark: 'Thorough historiographical analysis.' },
    ],
  },
  {
    id: 2,
    student_id: 2,
    name: 'Ethan Wilson',
    email: 'ethan.wilson@school.edu',
    class_name: 'Grade 8 - B',
    attendance_rate: '94.0%',
    standing: 'Honor Roll (Cum Laude)',
    courses: [
      { code: 'MAT-101', subject: 'Mathematics', credits: 4, score: 88, isAp: false, isHonors: false, remark: 'Consistent assignment performance.' },
      { code: 'ENG-201', subject: 'English Literature', credits: 3, score: 86, isAp: false, isHonors: false, remark: 'Active participation in discussions.' },
      { code: 'BIO-105', subject: 'Biology', credits: 4, score: 90, isAp: false, isHonors: false, remark: 'High marks on genetics project.' },
      { code: 'HIST-102', subject: 'World History', credits: 3, score: 84, isAp: false, isHonors: false, remark: 'Solid homework completion.' },
      { code: 'CIV-110', subject: 'Civics & Ethics', credits: 2, score: 92, isAp: false, isHonors: false, remark: 'Great leadership in debates.' },
    ],
  },
  {
    id: 3,
    student_id: 3,
    name: 'Sophia Chen',
    email: 'sophia.chen@school.edu',
    class_name: 'Grade 11 - A',
    attendance_rate: '91.2%',
    standing: 'Dean’s List',
    courses: [
      { code: 'MAT-101', subject: 'Mathematics', credits: 4, score: 85, isAp: false, isHonors: false, remark: 'Good analytical skills.' },
      { code: 'CHEM-301', subject: 'Chemistry', credits: 4, score: 82, isAp: false, isHonors: false, remark: 'Improving laboratory marks.' },
      { code: 'PHYS-202', subject: 'Physics', credits: 4, score: 88, isAp: false, isHonors: true, remark: 'Solid conceptual understanding.' },
      { code: 'ENG-201', subject: 'English Literature', credits: 3, score: 94, isAp: false, isHonors: true, remark: 'Excellent prose composition.' },
      { code: 'CS-401', subject: 'Computer Science', credits: 4, score: 87, isAp: false, isHonors: false, remark: 'Good progress in programming.' },
    ],
  },
  {
    id: 4,
    student_id: 4,
    name: 'Noah Williams',
    email: 'noah.williams@school.edu',
    class_name: 'Grade 9 - C',
    attendance_rate: '96.5%',
    standing: 'Good Academic Standing',
    courses: [
      { code: 'MAT-101', subject: 'Mathematics', credits: 4, score: 78, isAp: false, isHonors: false, remark: 'Shows effort on weekly quizzes.' },
      { code: 'ENG-201', subject: 'English Literature', credits: 3, score: 82, isAp: false, isHonors: false, remark: 'Good reading comprehension.' },
      { code: 'BIO-105', subject: 'Biology', credits: 4, score: 80, isAp: false, isHonors: false, remark: 'Consistent class notes.' },
      { code: 'HIST-102', subject: 'World History', credits: 3, score: 79, isAp: false, isHonors: false, remark: 'Participates well in groups.' },
      { code: 'CIV-110', subject: 'Civics & Ethics', credits: 2, score: 86, isAp: false, isHonors: false, remark: 'Thoughtful reflection papers.' },
    ],
  },
  {
    id: 5,
    student_id: 5,
    name: 'Emma Davis',
    email: 'emma.davis@school.edu',
    class_name: 'Grade 10 - B',
    attendance_rate: '97.8%',
    standing: 'Honor Roll (Magna Cum Laude)',
    courses: [
      { code: 'MAT-101', subject: 'Mathematics', credits: 4, score: 92, isAp: false, isHonors: true, remark: 'High exam performance.' },
      { code: 'ENG-201', subject: 'English Literature', credits: 3, score: 95, isAp: false, isHonors: true, remark: 'Outstanding essay submissions.' },
      { code: 'CHEM-301', subject: 'Chemistry', credits: 4, score: 91, isAp: false, isHonors: false, remark: 'Very conscientious lab work.' },
      { code: 'BIO-105', subject: 'Biology', credits: 4, score: 94, isAp: true, isHonors: false, remark: 'Exemplary cellular biology project.' },
      { code: 'HIST-102', subject: 'World History', credits: 3, score: 90, isAp: false, isHonors: false, remark: 'Well-researched term paper.' },
    ],
  },
  {
    id: 6,
    student_id: 6,
    name: 'Liam Johnson',
    email: 'liam.johnson@school.edu',
    class_name: 'Grade 10 - A',
    attendance_rate: '95.1%',
    standing: 'Good Academic Standing',
    courses: [
      { code: 'MAT-101', subject: 'Mathematics', credits: 4, score: 84, isAp: false, isHonors: false, remark: 'Steady algebra results.' },
      { code: 'ENG-201', subject: 'English Literature', credits: 3, score: 81, isAp: false, isHonors: false, remark: 'Good vocabulary development.' },
      { code: 'CHEM-301', subject: 'Chemistry', credits: 4, score: 83, isAp: false, isHonors: false, remark: 'Reliable team lab member.' },
      { code: 'CS-401', subject: 'Computer Science', credits: 4, score: 89, isAp: false, isHonors: false, remark: 'Strong problem-solving instincts.' },
      { code: 'HIST-102', subject: 'World History', credits: 3, score: 82, isAp: false, isHonors: false, remark: 'Punctual assignment turns.' },
    ],
  },
]

function getLocalStudentsWithGrades() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STUDENT_PERFORMANCE))
  return DEFAULT_STUDENT_PERFORMANCE
}

function saveLocalStudentsWithGrades(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getAcademicReports(options = {}) {
  const students = getLocalStudentsWithGrades()

  const processed = students.map((s) => {
    const coursesWithLetter = s.courses.map((c) => {
      const info = getLetterGrade(c.score)
      return {
        ...c,
        grade: info.grade,
        points: info.points,
        description: info.description,
      }
    })

    const unweightedGpa = calculateStudentGpa(coursesWithLetter, false)
    const weightedGpa = calculateStudentGpa(coursesWithLetter, true)
    const totalCredits = coursesWithLetter.reduce((sum, c) => sum + (c.credits || 3), 0)
    const avgScore = Math.round(
      coursesWithLetter.reduce((sum, c) => sum + c.score, 0) / (coursesWithLetter.length || 1),
    )

    return {
      ...s,
      courses: coursesWithLetter,
      unweightedGpa,
      weightedGpa,
      totalCredits,
      avgScore,
      isPassing: avgScore >= 60,
    }
  })

  // Sort by weighted GPA descending for ranking
  processed.sort((a, b) => Number(b.weightedGpa) - Number(a.weightedGpa))
  processed.forEach((s, idx) => {
    s.rank = idx + 1
    s.percentile = `Top ${Math.round(((idx + 1) / processed.length) * 100)}%`
  })

  return processed
}

export function getSubjectBreakdown() {
  const students = getAcademicReports()
  const subjectMap = {}

  students.forEach((s) => {
    s.courses.forEach((c) => {
      if (!subjectMap[c.subject]) {
        subjectMap[c.subject] = {
          code: c.code,
          subject: c.subject,
          scores: [],
          credits: c.credits,
          grades: { 'A+': 0, A: 0, 'B+': 0, B: 0, 'B-': 0, 'C+': 0, C: 0, 'C-': 0, D: 0, F: 0 },
        }
      }
      subjectMap[c.subject].scores.push(c.score)
      subjectMap[c.subject].grades[c.grade] = (subjectMap[c.subject].grades[c.grade] || 0) + 1
    })
  })

  return Object.values(subjectMap).map((sub) => {
    const scores = sub.scores
    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    const highest = Math.max(...scores)
    const lowest = Math.min(...scores)
    const passingCount = scores.filter((s) => s >= 60).length
    const passRate = Math.round((passingCount / scores.length) * 100)

    return {
      ...sub,
      studentsCount: scores.length,
      averageScore: avg,
      letterGrade: getLetterGrade(avg).grade,
      highestScore: highest,
      lowestScore: lowest,
      passRate: `${passRate}%`,
    }
  })
}

export function getClassComparison() {
  const students = getAcademicReports()
  const classMap = {}

  students.forEach((s) => {
    if (!classMap[s.class_name]) {
      classMap[s.class_name] = {
        class_name: s.class_name,
        students: [],
        gpas: [],
        attendance: [],
      }
    }
    classMap[s.class_name].students.push(s)
    classMap[s.class_name].gpas.push(Number(s.unweightedGpa))
    classMap[s.class_name].attendance.push(parseFloat(s.attendance_rate))
  })

  return Object.values(classMap).map((cls) => {
    const count = cls.students.length
    const avgGpa = (cls.gpas.reduce((a, b) => a + b, 0) / count).toFixed(2)
    const avgAtt = Math.round(cls.attendance.reduce((a, b) => a + b, 0) / count)
    const honorCount = cls.students.filter((s) => Number(s.unweightedGpa) >= 3.5).length
    const honorRate = Math.round((honorCount / count) * 100)

    return {
      class_name: cls.class_name,
      student_count: count,
      average_gpa: avgGpa,
      attendance_rate: `${avgAtt}%`,
      honor_roll_rate: `${honorRate}%`,
      highest_gpa: Math.max(...cls.gpas).toFixed(2),
    }
  })
}

export function updateStudentGrade(studentId, courseCode, newScore) {
  const list = getLocalStudentsWithGrades()
  const student = list.find((s) => s.id === studentId || s.student_id === studentId)
  if (student) {
    const course = student.courses.find((c) => c.code === courseCode)
    if (course) {
      course.score = Number(newScore)
      saveLocalStudentsWithGrades(list)
    }
  }
  return getAcademicReports()
}

/**
 * Strictly returns ONLY the single academic report belonging to the given student user.
 * If the student was newly created in Users & Roles (e.g. "Loma"), automatically provisions
 * their personal academic transcript record under their exact name and email.
 */
export function getStudentReportForUser(user) {
  if (!user) return []
  const targetName = (user.name || '').trim().toLowerCase()
  const targetEmail = (user.email || '').trim().toLowerCase()

  let all = getAcademicReports()
  let match = all.find(
    (s) =>
      (targetEmail && s.email?.toLowerCase() === targetEmail) ||
      (targetName && s.name?.toLowerCase() === targetName),
  )

  if (!match && targetName) {
    const list = getLocalStudentsWithGrades()
    const nextId = list.length ? Math.max(...list.map((s) => Number(s.id) || 0)) + 1 : 100
    const newRecord = {
      id: nextId,
      student_id: user.id || nextId,
      name: user.name.trim(),
      email: user.email || `${targetName.replace(/\s+/g, '.')}@school.edu`,
      class_name: user.department || 'Grade 10 - A',
      attendance_rate: '96.0%',
      standing: 'Honor Roll (Cum Laude)',
      courses: [
        { code: 'MAT-101', subject: 'Mathematics', credits: 4, score: 91, isAp: false, isHonors: true, remark: 'Strong analytical progress.' },
        { code: 'ENG-201', subject: 'English Literature', credits: 3, score: 89, isAp: false, isHonors: false, remark: 'Clear written expression.' },
        { code: 'CHEM-301', subject: 'Chemistry', credits: 4, score: 92, isAp: false, isHonors: true, remark: 'Excellent lab precision.' },
        { code: 'CS-401', subject: 'Computer Science', credits: 4, score: 95, isAp: true, isHonors: false, remark: 'Outstanding project execution.' },
        { code: 'HIST-102', subject: 'World History', credits: 3, score: 88, isAp: false, isHonors: false, remark: 'Thoughtful seminar contributions.' },
      ],
    }
    list.push(newRecord)
    saveLocalStudentsWithGrades(list)
    all = getAcademicReports()
    match = all.find((s) => s.id === nextId)
  }

  return match ? [match] : []
}
