<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../../services/authService.js'
import {
  getLoginAttemptStatus,
  MAX_LOGIN_ATTEMPTS,
} from '../../services/loginSecurityService.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(true)
const error = ref('')
const isSubmitting = ref(false)
const capsLockOn = ref(false)
const shakeCard = ref(false)

const securityState = ref({
  isBlocked: false,
  failedCount: 0,
  remainingAttempts: MAX_LOGIN_ATTEMPTS,
  maxAttempts: MAX_LOGIN_ATTEMPTS,
  blockRecord: null,
  cooldownSeconds: 0,
})

let cooldownTimer = null

function refreshEmailSecurityStatus() {
  const status = getLoginAttemptStatus(email.value)
  securityState.value = status
  if (status.isBlocked && status.cooldownSeconds > 0) {
    startCooldownTicker()
  }
}

function startCooldownTicker() {
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    const status = getLoginAttemptStatus(email.value)
    securityState.value = status
    if (!status.isBlocked || status.cooldownSeconds <= 0) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
      if (!status.isBlocked) {
        error.value = ''
      }
    }
  }, 1000)
}

watch(email, () => {
  refreshEmailSecurityStatus()
  if (!securityState.value.isBlocked) {
    error.value = ''
  }
})

const isBlocked = computed(() => securityState.value.isBlocked)
const failedCount = computed(() => securityState.value.failedCount)
const remainingAttempts = computed(() => securityState.value.remainingAttempts)

function triggerShake() {
  shakeCard.value = false
  requestAnimationFrame(() => {
    shakeCard.value = true
    setTimeout(() => {
      shakeCard.value = false
    }, 450)
  })
}

function checkCapsLock(e) {
  if (e && typeof e.getModifierState === 'function') {
    capsLockOn.value = e.getModifierState('CapsLock')
  }
}

async function signIn() {
  if (!email.value.trim() || !password.value.trim()) {
    error.value = 'Please enter both your email address and password.'
    triggerShake()
    return
  }

  error.value = ''
  isSubmitting.value = true

  setTimeout(() => {
    const result = login(email.value, password.value)
    refreshEmailSecurityStatus()

    if (!result.success) {
      error.value = result.message || 'Invalid email or password. Please try again.'
      isSubmitting.value = false
      password.value = ''
      triggerShake()
      if (result.blocked && result.cooldownSeconds > 0) {
        startCooldownTicker()
      }
      return
    }

    isSubmitting.value = false
    router.push('/')
  }, 240)
}

onMounted(() => {
  refreshEmailSecurityStatus()
  window.addEventListener('sms-security-alerts-updated', refreshEmailSecurityStatus)
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
  window.removeEventListener('sms-security-alerts-updated', refreshEmailSecurityStatus)
})
</script>

<template>
  <main class="login-shell">
    <div class="bg-pattern" aria-hidden="true"></div>

    <div class="login-card" :class="{ 'is-shaking': shakeCard }">
      <div class="card-accent-top" :class="{ 'accent-danger': isBlocked }"></div>

      <!-- Brand & Header -->
      <div class="brand-header">
        <div class="brand-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <h1>StudentHub</h1>
        <p>Sign in with your email and password</p>
      </div>

      <!-- Blocked Email Critical Security Banner -->
      <div v-if="isBlocked" class="blocked-banner" role="alert">
        <div class="blocked-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
        </div>
        <div class="blocked-body">
          <strong>Email Blocked (3 / 3 Failed Attempts)</strong>
          <p>
            <code>{{ securityState.email }}</code> has been locked. An alert has been sent to the System Administrator.
          </p>
          <span v-if="securityState.cooldownSeconds > 0" class="cooldown-pill">
            Admin recovery unlock in {{ securityState.cooldownSeconds }}s
          </span>
          <span v-else class="contact-admin-note">
            Please contact your Administrator to unblock this email.
          </span>
        </div>
      </div>

      <!-- Failed Attempt Warning & 3-Step Meter -->
      <div v-else-if="error || failedCount > 0" class="warning-banner" role="alert">
        <div class="warning-top">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            {{ error || `Failed login detected for this email. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} left before lock.` }}
          </span>
        </div>

        <div v-if="failedCount > 0" class="attempt-meter">
          <div class="attempt-bars">
            <span
              v-for="step in MAX_LOGIN_ATTEMPTS"
              :key="step"
              class="attempt-bar"
              :class="{ filled: step <= failedCount }"
            ></span>
          </div>
          <span class="attempt-text">
            {{ failedCount }} / {{ MAX_LOGIN_ATTEMPTS }} failed • {{ remainingAttempts }} left
          </span>
        </div>
      </div>

      <!-- Clean Email & Password Login Form -->
      <form class="login-form" @submit.prevent="signIn" novalidate>
        <div class="form-group">
          <label for="email">Email Address</label>
          <div class="input-wrap" :class="{ 'input-blocked': isBlocked }">
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
              placeholder="name@school.edu"
              required
              autocomplete="username"
            />
            <span v-if="isBlocked" class="field-locked-tag">Blocked</span>
          </div>
        </div>

        <div class="form-group">
          <div class="label-row">
            <label for="password">Password</label>
            <span v-if="capsLockOn" class="caps-pill">Caps Lock ON</span>
          </div>
          <div class="input-wrap" :class="{ 'input-blocked': isBlocked }">
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
              placeholder="Enter your password"
              required
              :disabled="isBlocked"
              autocomplete="current-password"
              @keyup="checkCapsLock"
              @keydown="checkCapsLock"
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
            <span>Remember me</span>
          </label>
          <span class="guard-policy-tag" title="Emails are automatically locked after 3 failed login attempts">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            3-Attempt Protection
          </span>
        </div>

        <button
          type="submit"
          class="submit-button"
          :class="{ 'is-blocked': isBlocked }"
          :disabled="isSubmitting || isBlocked"
        >
          <span v-if="isSubmitting" class="btn-spinner"></span>
          <svg v-else-if="isBlocked" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>
            {{ isBlocked ? 'Email Blocked — Contact Admin' : isSubmitting ? 'Signing in...' : 'Sign In' }}
          </span>
          <svg v-if="!isSubmitting && !isBlocked" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </form>

      <footer class="login-footer">
        <span>© 2026 StudentHub</span>
        <span class="footer-dot">•</span>
        <span>256-bit Encrypted Portal</span>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.login-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 60%, #f1f5f9 100%);
  overflow: hidden;
}

.bg-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(79, 70, 229, 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  padding: 38px 36px 30px;
  box-shadow: 0 20px 50px -15px rgba(15, 23, 42, 0.1), 0 4px 14px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.card-accent-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #3b82f6 100%);
}

.card-accent-top.accent-danger {
  background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
}

.login-card.is-shaking {
  animation: cardShake 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes cardShake {
  10%, 90% { transform: translateX(-3px); }
  20%, 80% { transform: translateX(5px); }
  30%, 50%, 70% { transform: translateX(-6px); }
  40%, 60% { transform: translateX(6px); }
}

.brand-header {
  text-align: center;
  margin-bottom: 26px;
}

.brand-logo {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  border-radius: 15px;
  display: inline-grid;
  place-items: center;
  margin-bottom: 14px;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.28);
}

.brand-header h1 {
  font-size: 25px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.brand-header p {
  font-size: 13.5px;
  color: #64748b;
  margin: 0;
}

/* Blocked Banner */
.blocked-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 14px;
  border-radius: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  margin-bottom: 20px;
}

.blocked-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #fee2e2;
  color: #dc2626;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.blocked-body strong {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: #991b1b;
  margin-bottom: 3px;
}

.blocked-body p {
  margin: 0 0 7px;
  font-size: 12px;
  line-height: 1.48;
  color: #b91c1c;
}

.blocked-body code {
  background: rgba(220, 38, 38, 0.1);
  padding: 1px 5px;
  border-radius: 5px;
  font-weight: 700;
}

.cooldown-pill {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: #991b1b;
  background: #fecaca;
  padding: 3px 9px;
  border-radius: 999px;
}

.contact-admin-note {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: #7f1d1d;
}

/* Warning / Attempt Counter Banner */
.warning-banner {
  padding: 12px 14px;
  border-radius: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  margin-bottom: 20px;
}

.warning-top {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.45;
  color: #b45309;
}

.warning-top svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: #d97706;
}

.attempt-meter {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px dashed #fcd34d;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.attempt-bars {
  display: flex;
  gap: 6px;
  flex: 1;
}

.attempt-bar {
  height: 6px;
  flex: 1;
  border-radius: 999px;
  background: #fde68a;
  transition: background-color 0.2s ease;
}

.attempt-bar.filled {
  background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%);
}

.attempt-text {
  font-size: 11px;
  font-weight: 700;
  color: #b45309;
  white-space: nowrap;
}

/* Form Controls */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.label-row label {
  margin-bottom: 0;
}

.caps-pill {
  font-size: 10.5px;
  font-weight: 700;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 1px 7px;
  border-radius: 999px;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #94a3b8;
  display: grid;
  place-items: center;
  pointer-events: none;
  transition: color 0.15s ease;
}

.input-wrap:focus-within .input-icon {
  color: #4f46e5;
}

.input-wrap input {
  width: 100%;
  height: 46px;
  padding: 0 44px 0 42px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  transition: all 0.16s ease;
}

.input-wrap input:focus {
  background: #ffffff;
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.input-wrap input:disabled {
  background: #fef2f2;
  color: #94a3b8;
  cursor: not-allowed;
}

.input-wrap.input-blocked input {
  border-color: #fca5a5;
  background: #fff5f5;
  padding-right: 84px;
}

.field-locked-tag {
  position: absolute;
  right: 12px;
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #dc2626;
  background: #fee2e2;
  border: 1px solid #fecaca;
  padding: 3px 8px;
  border-radius: 999px;
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
  padding: 6px;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.eye-btn:hover {
  color: #334155;
  background: #f1f5f9;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12.5px;
}

.remember-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-weight: 500;
  cursor: pointer;
}

.remember-label input {
  accent-color: #4f46e5;
  width: 15px;
  height: 15px;
}

.guard-policy-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 4px 9px;
  border-radius: 999px;
}

.guard-policy-tag svg {
  color: #4f46e5;
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: #ffffff;
  font-size: 14.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.16s ease;
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.28);
  margin-top: 2px;
}

.submit-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(79, 70, 229, 0.34);
}

.submit-button:disabled {
  opacity: 0.72;
  cursor: not-allowed;
  transform: none;
}

.submit-button.is-blocked {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow: 0 6px 16px rgba(220, 38, 38, 0.22);
  opacity: 0.92;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2.5px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 26px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  font-size: 11.5px;
  color: #94a3b8;
  font-weight: 500;
}

.footer-dot {
  color: #cbd5e1;
}

@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px 26px;
  }
}
</style>
