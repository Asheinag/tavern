import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import GamesView from '../views/GamesView.vue'
import { useCampaignStore } from '../stores/campaign'
import { gamesApi } from '../api/games'

vi.mock('../api/games', () => ({
  gamesApi: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
    createScene: vi.fn(),
    patchScene: vi.fn(),
    deleteScene: vi.fn(),
    createEdge: vi.fn(),
    deleteEdge: vi.fn(),
  },
}))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: GamesView },
      { path: '/master/:id', component: { template: '<div />' } },
    ],
  })
}

const mockGame = {
  id: 1,
  title: 'Тестовая кампания',
  system: 'OSR',
  cover: null,
  share_code: 'abc',
  created_at: '2026-01-01T00:00:00Z',
}

describe('GamesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  async function mountView() {
    const router = makeRouter()
    await router.push('/')
    await router.isReady()
    return mount(GamesView, {
      attachTo: document.body,
      global: { plugins: [createPinia(), router] },
    })
  }

  it('рендерится без ошибок', async () => {
    vi.mocked(gamesApi.list).mockResolvedValueOnce([])
    const wrapper = await mountView()
    expect(wrapper.exists()).toBe(true)
  })

  it('показывает empty-state когда нет игр', async () => {
    vi.mocked(gamesApi.list).mockResolvedValueOnce([])
    const wrapper = await mountView()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('показывает карточки игр после загрузки', async () => {
    vi.mocked(gamesApi.list).mockResolvedValueOnce([mockGame])
    const store = useCampaignStore()
    const wrapper = await mountView()
    await store.fetchGames()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.game-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Тестовая кампания')
  })

  it('кнопка "Создать игру" открывает модалку', async () => {
    vi.mocked(gamesApi.list).mockResolvedValueOnce([])
    const wrapper = await mountView()
    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.modal')).toBeTruthy()
    wrapper.unmount()
  })

  it('кнопка "Отмена" закрывает модалку', async () => {
    vi.mocked(gamesApi.list).mockResolvedValueOnce([])
    const wrapper = await mountView()
    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    const cancelBtn = document.body.querySelector<HTMLElement>('.btn-secondary')
    cancelBtn?.click()
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.modal')).toBeFalsy()
    wrapper.unmount()
  })

  it('submitCreate создаёт игру и закрывает модалку', async () => {
    vi.mocked(gamesApi.list).mockResolvedValueOnce([])
    vi.mocked(gamesApi.create).mockResolvedValueOnce(mockGame)
    const wrapper = await mountView()
    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    const input = document.body.querySelector<HTMLInputElement>('.field-input')!
    input.value = 'Новая кампания'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()
    const submitBtn = Array.from(document.body.querySelectorAll<HTMLElement>('button')).find(
      (b) => b.textContent?.trim() === 'Создать',
    )
    submitBtn?.click()
    await wrapper.vm.$nextTick()
    expect(gamesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Новая кампания' }),
    )
    wrapper.unmount()
  })

  it('кнопка "Создать" задизейблена при пустом названии', async () => {
    vi.mocked(gamesApi.list).mockResolvedValueOnce([])
    const wrapper = await mountView()
    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    const submitBtn = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Создать',
    )
    expect(submitBtn?.disabled).toBe(true)
    wrapper.unmount()
  })

  // TODO: тест перехода на /master/:id после создания игры
  // — требует мока router.push и проверки навигации
  // TODO: тест форматирования даты (formatDate) — завязан на locale окружения
})
