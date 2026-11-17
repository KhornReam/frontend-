<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { DEMO_ACCOUNTS, login } from '../../services/authService.js'

const router = useRouter()
const selectedRole = ref('admin') // 'admin' | 'teacher' | 'student'
const email = ref(DEMO_ACCOUNTS.admin.email)
const password = ref(DEMO_ACCOUNTS.admin.password)
const showPassword = ref(false)
const rememberMe = ref(true)
const error = ref('')
const isSubmitting = ref(false)

function selectRole(roleKey) {
  selectedRole.value = roleKey
  const acc = DEMO_ACCOUNTS[roleKey]
  if (acc) {
    email.value = acc.email
    password.value = acc.password
  }
  error.value = ''
}

async function signIn() {
  error.value = ''
  isSubmitting.value = true

  const result = login(email.value, password.value)
  if (!result.success) {
    error.value = result.message || 'Invalid email or password.'
    isSubmitting.value = false
    return
  }

  setTimeout(() => {
    isSubmitting.value = false
    router.push('/')
  }, 300)
}
</script>

<template>
  <main class="login-container">
    <div class="login-card">
      <!-- Brand Logo & Header -->
      <div class="brand-header">
        <div class="brand-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <h1>StudentHub</h1>
        <p>Institutional Authentication & Access Portal</p>
      </div>

      <!-- Quick Role Selector Pills -->
      <div class="role-selector-bar">
        <span class="role-selector-label">Sign in as:</span>
        <div class="role-pills">
          <button
            type="button"
            class="role-pill"
            :class="{ active: selectedRole === 'admin' }"
            @click="selectRole('admin')"
          >
            <span class="role-dot dot-admin"></span>
            <span>Administrator</span>
          </button>

          <button
            type="button"
            class="role-pill"
            :class="{ active: selectedRole === 'teacher' }"
            @click="selectRole('teacher')"
          >
            <span class="role-dot dot-teacher"></span>
            <span>Teacher</span>
          </button>

          <button
            type="button"
            class="role-pill"
            :class="{ active: selectedRole === 'student' }"
            @click="selectRole('student')"
          >
            <span class="role-dot dot-student"></span>
            <span>Student</span>
          </button>
        </div>
      </div>

      <!-- Role preview info banner -->
      <div class="role-info-card">
        <div class="role-info-avatar">
          {{ selectedRole === 'admin' ? 'AD' : selectedRole === 'teacher' ? 'MP' : 'OM' }}
        </div>
        <div class="role-info-text">
          <strong>{{ DEMO_ACCOUNTS[selectedRole].name }}</strong>
          <span>{{ DEMO_ACCOUNTS[selectedRole].roleLabel }} • {{ DEMO_ACCOUNTS[selectedRole].department }}</span>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="error-alert" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Login Form -->
      <form class="login-form" @submit.prevent="signIn">
        <div class="form-group">
          <label for="email">Account Email</label>
          <div class="input-wrap">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </span>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="user@school.edu"
              required
              autocomplete="username"
            />
          </div>
        </div>

        <div class="form-group">
          <div class="label-row">
            <label for="password">Password</label>
          </div>
          <div class="input-wrap">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter password"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="eye-btn"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="form-row">
          <label class="remember-label">
            <input v-model="rememberMe" type="checkbox" />
            <span>Remember session</span>
          </label>
          <span class="encryption-tag">🔒 256-bit Encrypted</span>
        </div>

        <button type="submit" class="submit-button" :disabled="isSubmitting">
          <span>{{ isSubmitting ? 'Authenticating...' : `Sign In as ${DEMO_ACCOUNTS[selectedRole].name.split(' ')[0]}` }}</span>
          <svg v-if="!isSubmitting" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </form>

      <footer class="login-footer">
        <span>© 2026 StudentHub • Role-Based Access Control Active</span>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.25);
}

.brand-header {
  text-align: center;
  margin-bottom: 22px;
}

.brand-logo {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  border-radius: 10px;
  display: inline-grid;
  place-items: center;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
}

.brand-header h1 {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}

.brand-header p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* Role Selector Bar */
.role-selector-bar {
  margin-bottom: 14px;
}

.role-selector-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.role-pills {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
}

.role-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 7px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.role-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  font-weight: 700;
}

.role-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dot-admin { background: #8b5cf6; }
.dot-teacher { background: #3b82f6; }
.dot-student { background: #10b981; }

.role-info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 18px;
}

.role-info-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  font-size: 12px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.role-info-text strong {
  display: block;
  font-size: 13px;
  color: #0f172a;
}

.role-info-text span {
  display: block;
  font-size: 11px;
  color: #64748b;
}

.error-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.input-wrap input {
  width: 100%;
  height: 42px;
  padding: 0 40px 0 36px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-size: 13.5px;
  color: #0f172a;
  outline: none;
  transition: all 0.15s ease;
}

.input-wrap input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.eye-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 4px;
}

.eye-btn:hover {
  color: #334155;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.remember-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  cursor: pointer;
}

.encryption-tag {
  color: #64748b;
  font-size: 11px;
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
}

.submit-button:hover {
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
  transform: translateY(-1px);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  font-size: 11.5px;
  color: #94a3b8;
}
</style>
