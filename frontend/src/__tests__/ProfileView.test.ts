/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import ProfileView from '../views/ProfileView.vue'
import { useAuthStore } from '../stores/auth'
import { useCharactersStore } from '../stores/characters'

vi.mock('../stores/auth', () => ({ useAuthStore: vi.fn() }))
vi.mock('../stores/characters', () => ({ useCharactersStore: vi.fn() }))

const mockRouter = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/profile', component: ProfileView },
    { path: '/games', component: { template: '<div/>' } },
  ],
})

function makeAuthStore(role = 'user') {
  return {
    user: { id: 1, username: 'master', avatar: null, bio: null, system_role: role, created_at: '' },
    uploadAvatar: vi.fn(),
  }
}

function makeCharStore() {
  return {
    characters: [],
    invites: [],
    loading: false,
    fetchCharacters: vi.fn(),
    fetchInvites: vi.fn(),
    createCharacter: vi.fn(),
    updateCharacter: vi.fn(),
    removeCharacter: vi.fn(),
    createInvite: vi.fn(),
  }
}

describe('ProfileView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('рендерится, показывает имя пользователя', () => {
    vi.mocked(useAuthStore).mockReturnValue(makeAuthStore() as any)
    vi.mocked(useCharactersStore).mockReturnValue(makeCharStore() as any)
    const w = mount(ProfileView, { global: { plugins: [mockRouter] } })
    expect(w.find('.field-input').exists()).toBe(true)
  })

  it('не показывает вкладку «Инвайты» для обычного пользователя', () => {
    vi.mocked(useAuthStore).mockReturnValue(makeAuthStore('user') as any)
    vi.mocked(useCharactersStore).mockReturnValue(makeCharStore() as any)
    const w = mount(ProfileView, { global: { plugins: [mockRouter] } })
    expect(w.text()).not.toContain('Инвайты')
  })

  it('показывает вкладку «Инвайты» для admin', () => {
    vi.mocked(useAuthStore).mockReturnValue(makeAuthStore('admin') as any)
    vi.mocked(useCharactersStore).mockReturnValue(makeCharStore() as any)
    const w = mount(ProfileView, { global: { plugins: [mockRouter] } })
    expect(w.text()).toContain('Инвайты')
  })

  it('переключение на вкладку «Персонажи» показывает пустое состояние', async () => {
    vi.mocked(useAuthStore).mockReturnValue(makeAuthStore() as any)
    vi.mocked(useCharactersStore).mockReturnValue(makeCharStore() as any)
    const w = mount(ProfileView, { global: { plugins: [mockRouter] } })
    const tabs = w.findAll('.tab')
    await tabs[1].trigger('click')
    expect(w.text()).toContain('Персонажей пока нет')
  })

  it('показывает персонажей в списке', async () => {
    vi.mocked(useAuthStore).mockReturnValue(makeAuthStore() as any)
    const charStore = {
      ...makeCharStore(),
      characters: [
        { id: 1, owner_id: 1, name: 'Горин', avatar: null, bio: 'Воин', created_at: '' },
      ],
    }
    vi.mocked(useCharactersStore).mockReturnValue(charStore as any)
    const w = mount(ProfileView, { global: { plugins: [mockRouter] } })
    await w.findAll('.tab')[1].trigger('click')
    expect(w.text()).toContain('Горин')
  })

  it('кнопка «+ Новый» открывает модалку создания персонажа', async () => {
    vi.mocked(useAuthStore).mockReturnValue(makeAuthStore() as any)
    vi.mocked(useCharactersStore).mockReturnValue(makeCharStore() as any)
    const w = mount(ProfileView, { attachTo: document.body, global: { plugins: [mockRouter] } })
    await w.findAll('.tab')[1].trigger('click')
    await w.find('.btn-sm').trigger('click')
    expect(document.body.querySelector('.modal')).toBeTruthy()
    w.unmount()
  })
})
