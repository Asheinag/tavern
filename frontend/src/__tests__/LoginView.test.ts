/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '../stores/auth'

vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

const mockRouter = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/games', component: { template: '<div/>' } },
  ],
})

function makeStore(overrides = {}) {
  return {
    user: null,
    loading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    fetchMe: vi.fn(),
    ...overrides,
  }
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('рендерит форму входа по умолчанию', () => {
    vi.mocked(useAuthStore).mockReturnValue(makeStore() as any)
    const w = mount(LoginView, { global: { plugins: [mockRouter] } })
    expect(w.find('form').exists()).toBe(true)
    expect(w.find('input[autocomplete="username"]').exists()).toBe(true)
    expect(w.find('input[type="password"]').exists()).toBe(true)
  })

  it('переключает на вкладку регистрации', async () => {
    vi.mocked(useAuthStore).mockReturnValue(makeStore() as any)
    const w = mount(LoginView, { global: { plugins: [mockRouter] } })
    await w.find('button.tab:last-child').trigger('click')
    expect(w.findAll('input[type="password"]').length).toBe(1)
    // поле инвайт-кода появилось
    const inputs = w.findAll('input')
    expect(inputs.length).toBe(3)
  })

  it('показывает ошибку из store', () => {
    vi.mocked(useAuthStore).mockReturnValue(makeStore({ error: 'Неверный логин' }) as any)
    const w = mount(LoginView, { global: { plugins: [mockRouter] } })
    expect(w.find('.error').text()).toBe('Неверный логин')
  })

  it('вызывает login при отправке формы', async () => {
    const loginFn = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuthStore).mockReturnValue(makeStore({ login: loginFn }) as any)
    const w = mount(LoginView, { global: { plugins: [mockRouter] } })

    await w.find('input[autocomplete="username"]').setValue('master')
    await w.find('input[type="password"]').setValue('pass')
    await w.find('form').trigger('submit')

    expect(loginFn).toHaveBeenCalledWith({ username: 'master', password: 'pass' })
  })

  it('кнопка отключена при loading', () => {
    vi.mocked(useAuthStore).mockReturnValue(makeStore({ loading: true }) as any)
    const w = mount(LoginView, { global: { plugins: [mockRouter] } })
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
