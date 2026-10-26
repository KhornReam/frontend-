
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue'

import DashboardView from './views/DashboardView.vue'
import ProductsView from './views/ProductsView.vue'
import UserView from './views/UserView.vue'
import './assets/main.css'



const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: DashboardView },
        { path: '/users', component: UserView },
        { path: '/products', component: ProductsView }
    ]
})

createApp(App)
    .use(router)
    .mount('#app')
