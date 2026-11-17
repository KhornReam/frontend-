<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  change: { type: String, required: true },
  icon: { type: String, required: true },
  tone: { type: String, default: 'green' },
})
</script>

<template>
  <article class="stat-card">
    <div class="stat-card-top">
      <div class="stat-icon" :class="`tone-${tone}`" aria-hidden="true">
        <!-- Students -->
        <svg v-if="icon === 'students' || icon === '♙'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <!-- Teachers -->
        <svg v-else-if="icon === 'teachers' || icon === '♧'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <path d="M12 6v6"/>
          <path d="M9 9h6"/>
        </svg>
        <!-- Classes -->
        <svg v-else-if="icon === 'classes' || icon === '▤'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <!-- Attendance -->
        <svg v-else-if="icon === 'attendance' || icon === '✓'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <!-- Clock / Assessments -->
        <svg v-else-if="icon === 'time' || icon === '◷'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <!-- Trend / Up -->
        <svg v-else-if="icon === 'trend' || icon === '↗'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          <polyline points="17 6 23 6 23 12"/>
        </svg>
        <!-- Default Fallback Icon -->
        <span v-else>{{ icon }}</span>
      </div>

      <div class="stat-change" :class="change.startsWith('+') ? 'positive' : 'neutral'">
        <svg v-if="change.startsWith('+')" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
        <span>{{ change }}</span>
      </div>
    </div>

    <p class="stat-label">{{ label }}</p>
    <strong class="stat-value">{{ value }}</strong>
  </article>
</template>
