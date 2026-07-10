import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, type LoginPayload, type RegisterPayload, type User } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMe() {
    try {
      const res = await authApi.me()
      user.value = res.data
    } catch {
      user.value = null
    }
  }

  async function login(payload: LoginPayload) {
    loading.value = true
    error.value = null
    try {
      const res = await authApi.login(payload)
      user.value = res.data
    } catch (e: unknown) {
      error.value =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Ошибка входа'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    loading.value = true
    error.value = null
    try {
      const res = await authApi.register(payload)
      user.value = res.data
    } catch (e: unknown) {
      error.value =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Ошибка регистрации'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await authApi.logout()
    user.value = null
  }

  return { user, loading, error, fetchMe, login, register, logout }
})
