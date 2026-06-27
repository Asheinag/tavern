import { createRouter, createWebHistory } from 'vue-router'
import GamesView from './views/GamesView.vue'
import MasterView from './views/MasterView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/games' },
    { path: '/games', component: GamesView },
    { path: '/master/:id', component: MasterView },
  ],
})

export default router
