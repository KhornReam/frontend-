<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  emptyMessage: { type: String, default: 'Nothing to show yet.' },
})
</script>

<template>
  <div class="data-table-wrap">
    <table v-if="rows.length" class="data-table">
      <thead><tr><th v-for="column in columns" :key="column.key">{{ column.label }}</th></tr></thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="row.id ?? index">
          <td v-for="column in columns" :key="column.key">
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">{{ row[column.key] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="data-table-empty">{{ emptyMessage }}</p>
  </div>
</template>
