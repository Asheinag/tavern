<template>
  <div class="page">
    <div class="card">
      <div class="logo">🜂</div>
      <h1 class="title">Таверна</h1>

      <div class="tabs">
        <button :class="['tab', { active: mode === 'login' }]" @click="mode = 'login'">Войти</button>
        <button :class="['tab', { active: mode === 'register' }]" @click="mode = 'register'">
          Регистрация
        </button>
      </div>

      <div v-if="authStore.error" class="error">{{ authStore.error }}</div>

      <!-- Вход -->
      <form v-if="mode === 'login'" @submit.prevent="submitLogin">
        <label class="field-label">Имя пользователя</label>
        <input
          v-model="loginForm.username"
          class="field-input"
          placeholder="Введите логин"
          autocomplete="username"
          autofocus
        />
        <label class="field-label">Пароль</label>
        <input
          v-model="loginForm.password"
          type="password"
          class="field-input"
          placeholder="Введите пароль"
          autocomplete="current-password"
        />
        <button class="btn-primary" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Вхожу...' : 'Войти' }}
        </button>
      </form>

      <!-- Регистрация -->
      <form v-else @submit.prevent="submitRegister">
        <label class="field-label">Имя пользователя</label>
        <input
          v-model="registerForm.username"
          class="field-input"
          placeholder="Придумайте логин"
          autocomplete="username"
          autofocus
        />
        <label class="field-label">Пароль</label>
        <input
          v-model="registerForm.password"
          type="password"
          class="field-input"
          placeholder="Придумайте пароль"
          autocomplete="new-password"
        />
        <label class="field-label">Инвайт-код</label>
        <input
          v-model="registerForm.invite_code"
          class="field-input"
          placeholder="Код от администратора"
        />
        <button class="btn-primary" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Регистрирую...' : 'Зарегистрироваться' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', invite_code: '' })

async function submitLogin() {
  if (!loginForm.value.username || !loginForm.value.password) return
  try {
    await authStore.login(loginForm.value)
    router.push('/games')
  } catch {
    // ошибка уже в authStore.error
  }
}

async function submitRegister() {
  if (!registerForm.value.username || !registerForm.value.password || !registerForm.value.invite_code)
    return
  try {
    await authStore.register(registerForm.value)
    router.push('/games')
  } catch {
    // ошибка уже в authStore.error
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(120% 70% at 50% -10%, var(--accentBg) 0%, transparent 55%), var(--t0);
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 400px;
  background: var(--t1);
  border: 1px solid var(--t21);
  border-radius: 18px;
  padding: 36px 32px 32px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
}

.logo {
  font-size: 36px;
  text-align: center;
  margin-bottom: 8px;
}

.title {
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 24px;
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--t5);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 22px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--t34);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.tab.active {
  background: var(--t1);
  color: var(--t28);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.error {
  color: #f88;
  background: #3b1111;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 16px;
}

.field-label {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--t35);
  text-transform: uppercase;
  margin-bottom: 7px;
}

.field-input {
  display: block;
  width: 100%;
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--t28);
  font-size: 14px;
  margin-bottom: 16px;
  transition: border-color 0.12s;
  box-sizing: border-box;
}
.field-input:focus {
  border-color: var(--t20);
  outline: none;
}

.btn-primary {
  width: 100%;
  background: var(--accent);
  color: var(--onAccent);
  border: none;
  border-radius: 9px;
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
  margin-top: 4px;
}
.btn-primary:hover:not(:disabled) {
  background: var(--accentH);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
