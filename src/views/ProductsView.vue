
<script setup>
import { ref } from 'vue'

const products = ref([
  { id: 1, name: 'Laptop', price: 800 },
  { id: 2, name: 'Mouse', price: 20 },
  { id: 3, name: 'Keyboard', price: 35 }
])
</script>

<template>
  <section>
    <h2>Product Management</h2>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Product</th>
          <th>Price</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="product in products" :key="product.id">
          <td>{{ product.id }}</td>
          <td>{{ product.name }}</td>
          <td>${{ product.price }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
