import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser, isAuthenticated } from '../services/authService.js'
import { hasPermission } from '../services/permissionService.js'

import DashboardPage from '../pages/admin/Dashboard.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import LoginPage from '../pages/admin/Login.vue'
import AssessmentsPage from '../pages/admin/Assessments.vue'
import AttendancePage from '../pages/admin/Attendance.vue'
import AutomationsPage from '../pages/admin/Automations.vue'
import ClassesPage from '../pages/admin/Classes.vue'
import ReportsPage from '../pages/admin/Reports.vue'
import SettingsPage from '../pages/admin/Settings.vue'
import StudentsPage from '../pages/admin/Students.vue'
import SubjectsPage from '../pages/admin/Subjects.vue'
import TeachersPage from '../pages/admin/Teachers.vue'
import UserLoginPage from '../pages/admin/UserLogin.vue'
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
        {
          path: '',
          component: DashboardPage,
          meta: { title: 'Dashboard', roles: ['admin', 'teacher', 'student'] },
        },
        {
          path: 'students',
          component: StudentsPage,
          meta: { title: 'Students', roles: ['admin', 'teacher'], permission: 'view_students' },
        },
        {
          path: 'teachers',
          component: TeachersPage,
          meta: { title: 'Teachers', roles: ['admin'] },
        },
        {
          path: 'classes',
          component: ClassesPage,
          meta: { title: 'Classes', roles: ['admin', 'teacher'], permission: 'view_classes' },
        },
        {
          path: 'subjects',
          component: SubjectsPage,
          meta: { title: 'Subjects', roles: ['admin', 'teacher', 'student'] },
        },
        {
          path: 'attendance',
          component: AttendancePage,
          meta: { title: 'Attendance', roles: ['admin', 'teacher', 'student'] },
        },
        {
          path: 'exams-scores',
          component: AssessmentsPage,
          meta: { title: 'Exams & Scores', roles: ['admin', 'teacher'], permission: 'manage_scores' },
        },
        {
          path: 'users-roles',
          component: UsersPage,
          meta: { title: 'Users & Roles', roles: ['admin'] },
        },
        {
          path: 'user-login',
          component: UserLoginPage,
          meta: { title: 'User Login', roles: ['admin'] },
        },
        {
          path: 'automations',
          component: AutomationsPage,
          meta: { title: 'Automations', roles: ['admin'] },
        },
        {
          path: 'reports',
          component: ReportsPage,
          meta: { title: 'Reports', roles: ['admin', 'teacher', 'student'] },
        },
        {
          path: 'settings',
          component: SettingsPage,
          meta: { title: 'Settings', roles: ['admin'] },
        },
      ],
    },
    { path: '/users', redirect: '/students' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const signedIn = isAuthenticated()
  if (to.meta.requiresAuth && !signedIn) return '/login'
  if (to.meta.guest && signedIn) return '/'

  const user = getCurrentUser()
  if (signedIn && user && to.meta.roles) {
    if (!to.meta.roles.includes(user.role)) {
      return '/'
    }
  }

  // Check feature-level permissions configured by Administrator
  if (signedIn && user && user.role !== 'admin') {
    if (to.meta.permission && !hasPermission(user.role, to.meta.permission)) {
      return '/'
    }
    if (to.path === '/attendance') {
      if (user.role === 'teacher' && !hasPermission('teacher', 'manage_attendance')) return '/'
      if (user.role === 'student' && !hasPermission('student', 'view_attendance')) return '/'
    }
    if (to.path === '/reports') {
      if (user.role === 'teacher' && !hasPermission('teacher', 'export_reports')) return '/'
      if (user.role === 'student' && !hasPermission('student', 'view_grades')) return '/'
    }
    if (to.path === '/subjects') {
      if (user.role === 'student' && !hasPermission('student', 'view_curriculum')) return '/'
    }
  }
})

export default router
