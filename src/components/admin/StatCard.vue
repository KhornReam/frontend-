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
    <div class="stat-card-top"><span class="stat-icon" :class="`tone-${tone}`" aria-hidden="true">{{ icon }}</span><span class="stat-change">{{ change }}</span></div>
    <p class="stat-label">{{ label }}</p>
    <strong class="stat-value">{{ value }}</strong>
  </article>
</template>
