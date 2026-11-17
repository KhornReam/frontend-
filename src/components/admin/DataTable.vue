<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  emptyMessage: { type: String, default: 'No records found.' },
})
</script>

<template>
  <div class="data-table-wrap">
    <table v-if="rows.length" class="data-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="row.id ?? index">
          <td v-for="column in columns" :key="column.key">
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="data-table-empty">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      </div>
      <p>{{ emptyMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface-hover);
  color: var(--color-text-subtle);
  display: grid;
  place-items: center;
  margin: 0 auto 10px;
}
</style>
