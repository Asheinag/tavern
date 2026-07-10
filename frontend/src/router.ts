import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import GamesView from './views/GamesView.vue'
import LoginView from './views/LoginView.vue'
import MasterView from './views/MasterView.vue'
import PlayerView from './views/PlayerView.vue'
import ProfileView from './views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/games' },
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/games', component: GamesView },
    { path: '/profile', component: ProfileView },
    { path: '/master/:id', component: MasterView },
    { path: '/play/:code', component: PlayerView, meta: { public: true } },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true

  const auth = useAuthStore()
  if (!auth.user) {
    await auth.fetchMe()
  }
  if (!auth.user) {
    return '/login'
  }
})

export default router
