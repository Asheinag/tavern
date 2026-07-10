/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../api/auth'

vi.mock('../api/auth', () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    uploadAvatar: vi.fn(),
  },
}))

const mockUser = {
  id: 1,
  username: 'master',
  avatar: null,
  bio: null,
  system_role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchMe — устанавливает пользователя при успехе', async () => {
    vi.mocked(authApi.me).mockResolvedValue({ data: mockUser } as any)
    const store = useAuthStore()
    await store.fetchMe()
    expect(store.user).toEqual(mockUser)
  })

  it('fetchMe — сбрасывает пользователя при 401', async () => {
    vi.mocked(authApi.me).mockRejectedValue({ response: { status: 401 } })
    const store = useAuthStore()
    store.user = mockUser as any
    await store.fetchMe()
    expect(store.user).toBeNull()
  })

  it('login — устанавливает пользователя', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ data: mockUser } as any)
    const store = useAuthStore()
    await store.login({ username: 'master', password: 'pass' })
    expect(store.user).toEqual(mockUser)
    expect(store.error).toBeNull()
  })

  it('login — сохраняет ошибку при неверных данных', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: { data: { detail: 'Неверный логин или пароль' } },
    })
    const store = useAuthStore()
    await expect(store.login({ username: 'x', password: 'y' })).rejects.toBeDefined()
    expect(store.error).toBe('Неверный логин или пароль')
    expect(store.user).toBeNull()
  })

  it('register — устанавливает пользователя', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ data: mockUser } as any)
    const store = useAuthStore()
    await store.register({ username: 'newbie', password: 'pass', invite_code: 'CODE' })
    expect(store.user).toEqual(mockUser)
  })

  it('register — сохраняет ошибку при плохом инвайте', async () => {
    vi.mocked(authApi.register).mockRejectedValue({
      response: { data: { detail: 'Инвайт-код недействителен или уже использован' } },
    })
    const store = useAuthStore()
    await expect(
      store.register({ username: 'x', password: 'y', invite_code: 'BAD' }),
    ).rejects.toBeDefined()
    expect(store.error).toBe('Инвайт-код недействителен или уже использован')
  })

  it('logout — сбрасывает пользователя', async () => {
    vi.mocked(authApi.logout).mockResolvedValue({} as any)
    const store = useAuthStore()
    store.user = mockUser as any
    await store.logout()
    expect(store.user).toBeNull()
  })
})
