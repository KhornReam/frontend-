<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('Admin@gmail.com')
const password = ref('admin123')
const showPassword = ref(false)
const error = ref('')

function signIn() {
  const validEmail = email.value.trim().toLowerCase() === 'admin@gmail.com'
  const validPassword = password.value === 'admin123'

  if (!validEmail || !validPassword) {
    error.value = 'The email or password is incorrect. Please try again.'
    return
  }

  error.value = ''
  sessionStorage.setItem('dashboard-authenticated', 'true')
  router.push('/')
}
</script>

<template>
  <main class="login-page">
    <section class="login-aside" aria-label="Student Management">
      <div class="login-brand"><span class="brand-mark">S</span> Student Management</div>
      <div class="aside-content">
        <span class="eyebrow"><span class="eyebrow-dot"></span> YOUR SCHOOL, IN ONE PLACE</span>
        <h1>Helping every<br />student <em>thrive.</em></h1>
        <p>Keep student records organized and make the important work of your school a little simpler.</p>
        <div class="aside-foot"><span class="foot-line"></span> CLEAR RECORDS. STRONGER COMMUNITIES.</div>
      </div>
      <div class="aside-decoration decoration-one"></div>
      <div class="aside-decoration decoration-two"></div>
      <div class="aside-footer">© 2026 Student Management <span>•</span> School administration</div>
    </section>

    <section class="login-main">
      <div class="login-card-wrap">
        <div class="mobile-brand"><span class="brand-mark">S</span> Student Management</div>
        <div class="login-heading">
          <span class="welcome-tag">ADMIN PORTAL</span>
          <h2>Welcome back</h2>
          <p>Sign in to manage your student records.</p>
        </div>

        <form class="login-form" @submit.prevent="signIn">
          <label for="email">Email address</label>
          <div class="input-wrap">
            <span class="input-icon" aria-hidden="true">✉</span>
            <input id="email" v-model="email" type="email" autocomplete="username" placeholder="admin@example.com" required />
          </div>

          <div class="password-label"><label for="password">Password</label><span class="password-hint">Administrator access</span></div>
          <div class="input-wrap">
            <span class="input-icon" aria-hidden="true">▣</span>
            <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Enter your password" required />
            <button class="toggle-password" type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
          </div>

          <p v-if="error" class="login-error" role="alert">{{ error }}</p>
          <button class="login-submit" type="submit">Sign in <span aria-hidden="true">→</span></button>
        </form>

        <aside class="demo-credentials" aria-label="Demo account credentials">
          <div class="demo-credentials-heading"><span class="demo-dot"></span><strong>Demo administrator account</strong></div>
          <p><span>Email</span><code>Admin@gmail.com</code></p>
          <p><span>Password</span><code>admin123</code></p>
        </aside>
        <p class="login-note"><span class="shield-icon" aria-hidden="true">♢</span> Demo sign-in for this frontend preview.</p>
      </div>
      <footer class="login-main-footer"><span>Student Management System</span><span>Administrator portal</span></footer>
    </section>
  </main>
</template>
