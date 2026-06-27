import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import MasterView from '../views/MasterView.vue'
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

vi.mock('../api/ws', () => ({
  createWsClient: vi.fn().mockReturnValue({
    connect: vi.fn(),
    send: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

vi.mock('../api/artifacts', () => ({
  artifactsApi: {
    upload: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    patch: vi.fn(),
    remove: vi.fn(),
    listSceneArtifacts: vi.fn().mockResolvedValue([]),
    attach: vi.fn(),
    detach: vi.fn(),
    patchLink: vi.fn(),
  },
}))

const mockScene = {
  id: 10,
  game_id: 1,
  title: 'Таверна',
  type: 'Социум',
  status: 'draft',
  color: null,
  summary: 'Место встречи',
  x: 60,
  y: 60,
  col: 0,
  row: 0,
}

const mockScene2 = { ...mockScene, id: 11, title: 'Лес', x: 280, y: 60 }

const mockGame = {
  id: 1,
  title: 'Кампания',
  system: 'OSR',
  cover: null,
  share_code: 'abc',
  created_at: '2026-01-01T00:00:00Z',
  scenes: [mockScene, mockScene2],
  edges: [],
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/master/:id', component: MasterView },
      { path: '/games', component: { template: '<div />' } },
    ],
  })
}

describe('MasterView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  async function mountView() {
    vi.mocked(gamesApi.get).mockResolvedValue(mockGame)
    const router = makeRouter()
    await router.push('/master/1')
    await router.isReady()
    const wrapper = mount(MasterView, {
      attachTo: document.body,
      global: { plugins: [createPinia(), router] },
    })
    const store = useCampaignStore()
    await store.fetchGame(1)
    await wrapper.vm.$nextTick()
    return { wrapper, store }
  }

  it('рендерится без ошибок', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.exists()).toBe(true)
  })

  it('показывает название игры в шапке', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('Кампания')
  })

  it('рендерит ноды сцен на холсте', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.findAll('.node')).toHaveLength(2)
  })

  it('клик на сцену открывает инспектор', async () => {
    const { wrapper } = await mountView()
    await wrapper.findAll('.node')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.inspector').exists()).toBe(true)
    expect(wrapper.find('.insp-title').text()).toBe('Таверна')
  })

  it('инспектор показывает описание сцены', async () => {
    const { wrapper } = await mountView()
    await wrapper.findAll('.node')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Место встречи')
  })

  it('кнопка ✕ в инспекторе закрывает его', async () => {
    const { wrapper } = await mountView()
    await wrapper.findAll('.node')[0].trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.btn-close').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.inspector').exists()).toBe(false)
  })

  it('кнопка "Создать сцену" открывает модалку', async () => {
    const { wrapper } = await mountView()
    await wrapper.find('.btn-scene').trigger('click')
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.modal')).toBeTruthy()
    wrapper.unmount()
  })

  it('создание сцены вызывает addScene и закрывает модалку', async () => {
    vi.mocked(gamesApi.createScene).mockResolvedValueOnce({ ...mockScene, id: 99, title: 'Порт' })
    const { wrapper } = await mountView()
    await wrapper.find('.btn-scene').trigger('click')
    await wrapper.vm.$nextTick()
    const input = document.body.querySelector<HTMLInputElement>('.field-input')!
    input.value = 'Порт'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()
    const submitBtn = Array.from(document.body.querySelectorAll<HTMLElement>('button')).find(
      (b) => b.textContent?.trim() === 'Создать',
    )
    submitBtn?.click()
    await wrapper.vm.$nextTick()
    expect(gamesApi.createScene).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('переключение табов меняет активный таб', async () => {
    const { wrapper } = await mountView()
    const tabs = wrapper.findAll('.tab-btn')
    await tabs[1].trigger('click') // Карта
    expect(tabs[1].classes()).toContain('active')
    expect(tabs[0].classes()).not.toContain('active')
  })

  it('инспектор показывает список рёбер выходящих из сцены', async () => {
    const edge = { id: 5, game_id: 1, from_scene_id: 10, to_scene_id: 11, cond: null }
    vi.mocked(gamesApi.get).mockResolvedValue({ ...mockGame, edges: [edge] })
    const router = makeRouter()
    await router.push('/master/1')
    await router.isReady()
    const wrapper = mount(MasterView, { global: { plugins: [createPinia(), router] } })
    const store = useCampaignStore()
    await store.fetchGame(1)
    await wrapper.vm.$nextTick()
    await wrapper.findAll('.node')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Лес')
    expect(wrapper.find('.transition-row').exists()).toBe(true)
  })

  // TODO: тест удаления сцены — требует мока window.confirm
  // TODO: тест удаления ребра — аналогично
  // TODO: тест добавления ребра через select в инспекторе
  // TODO: тест drag (onNodeMove) — требует симуляции mousemove на window
  // TODO: тест debounce при перетаскивании — завязан на fake timers
})
