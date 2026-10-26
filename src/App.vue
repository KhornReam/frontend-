<template>
  <div class="app">
    <aside class="sidebar">
      <h2>View Panel</h2>
      <nav>
        <RouterLink to="/">Dashboard</RouterLink>
        <RouterLink to="/users">Students</RouterLink>
        <RouterLink to="/products">Products</RouterLink>
      </nav>
    </aside>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>
