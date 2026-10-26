<script setup>


import { onMounted, ref } from 'vue'
import { getStudents } from '../api/studentApi.js'

const totalStudents = ref(0)
const totalProducts = ref(20)
const totalOders = ref(90)

onMounted(async () => {
  try {
    const response = await getStudents()
    totalStudents.value = response.data.length
  } catch {
    totalStudents.value = 0
  }
})

</script>

<template>
    <section>
        <h2>Dasboard</h2>

        <div class="cards">
            <div class="card">
                <h3>Total Students</h3>
                <p>{{ totalStudents }}</p>
            </div>
            <div class="card">
                <h3>Total Product</h3>
                <p>{{ totalProducts }}</p>
            </div>

            <div class="card">
                <h3>totalOders</h3>
                <p>{{ totalOders }}</p>
            </div>
        </div>
    </section>




</template>
