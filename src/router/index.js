import { createRouter, createWebHistory } from 'vue-router'

import DashboardPage from '../pages/admin/Dashboard.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import LoginPage from '../pages/admin/Login.vue'
import AssessmentsPage from '../pages/admin/Assessments.vue'
import AttendancePage from '../pages/admin/Attendance.vue'
import ClassesPage from '../pages/admin/Classes.vue'
import ReportsPage from '../pages/admin/Reports.vue'
import SettingsPage from '../pages/admin/Settings.vue'
import StudentsPage from '../pages/admin/Students.vue'
import SubjectsPage from '../pages/admin/Subjects.vue'
import TeachersPage from '../pages/admin/Teachers.vue'
import UsersPage from '../pages/admin/Users.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage, meta: { guest: true } },
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', component: DashboardPage, meta: { title: 'Dashboard' } },
        { path: 'students', component: StudentsPage, meta: { title: 'Students' } },
        { path: 'teachers', component: TeachersPage, meta: { title: 'Teachers' } },
        { path: 'classes', component: ClassesPage, meta: { title: 'Classes' } },
        { path: 'subjects', component: SubjectsPage, meta: { title: 'Subjects' } },
        { path: 'attendance', component: AttendancePage, meta: { title: 'Attendance' } },
        { path: 'exams-scores', component: AssessmentsPage, meta: { title: 'Exams & Scores' } },
        { path: 'users-roles', component: UsersPage, meta: { title: 'Users & Roles' } },
        { path: 'reports', component: ReportsPage, meta: { title: 'Reports' } },
        { path: 'settings', component: SettingsPage, meta: { title: 'Settings' } },
      ],
    },
    { path: '/users', redirect: '/students' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const signedIn = sessionStorage.getItem('dashboard-authenticated') === 'true'
  if (to.meta.requiresAuth && !signedIn) return '/login'
  if (to.meta.guest && signedIn) return '/'
})

export default router
