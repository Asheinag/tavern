import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import PlayerView from '../views/PlayerView.vue'
import { gamesApi } from '../api/games'
import { useLiveStore } from '../stores/live'

vi.mock('../api/games', () => ({
  gamesApi: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
    getByCode: vi.fn(),
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
    list: vi.fn().mockResolvedValue([]),
    upload: vi.fn(),
    patch: vi.fn(),
    remove: vi.fn(),
    listSceneArtifacts: vi.fn().mockResolvedValue([]),
    attach: vi.fn(),
    detach: vi.fn(),
    patchLink: vi.fn(),
  },
}))

// SceneScreen использует canvas-зависимые сторы — мокаем компонент
vi.mock('../components/player/SceneScreen.vue', () => ({
  default: { template: '<div class="scene-screen-mock" />' },
}))

function makeRouter(code = 'abc123') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/play/:code', component: PlayerView }],
  })
  router.push(`/play/${code}`)
  return router
}

describe('PlayerView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('показывает экран загрузки до получения ответа', async () => {
    vi.mocked(gamesApi.getByCode).mockReturnValue(new Promise(() => {}))
    const router = makeRouter()
    await router.isReady()
    const wrapper = mount(PlayerView, { global: { plugins: [createPinia(), router] } })
    expect(wrapper.text()).toContain('Подключение')
  })

  it('подключается к WS как player после загрузки игры', async () => {
    vi.mocked(gamesApi.getByCode).mockResolvedValue({ id: 42, title: 'Таверна' })
    const { createWsClient } = await import('../api/ws')
    const router = makeRouter()
    await router.isReady()
    const wrapper = mount(PlayerView, { global: { plugins: [createPinia(), router] } })
    await flushPromises()
    expect(createWsClient).toHaveBeenCalledWith(42, 'player', expect.any(Function))
    wrapper.unmount()
  })

  it('показывает экран игрока после загрузки', async () => {
    vi.mocked(gamesApi.getByCode).mockResolvedValue({ id: 1, title: 'Игра' })
    const router = makeRouter()
    await router.isReady()
    const wrapper = mount(PlayerView, { global: { plugins: [createPinia(), router] } })
    await flushPromises()
    expect(wrapper.find('.scene-screen-mock').exists()).toBe(true)
    wrapper.unmount()
  })

  it('показывает ошибку при неверном коде', async () => {
    vi.mocked(gamesApi.getByCode).mockRejectedValue(new Error('404'))
    const router = makeRouter('bad-code')
    await router.isReady()
    const wrapper = mount(PlayerView, { global: { plugins: [createPinia(), router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('не найдена')
    wrapper.unmount()
  })

  it('disconnect вызывается при размонтировании', async () => {
    vi.mocked(gamesApi.getByCode).mockResolvedValue({ id: 1, title: 'Игра' })
    const router = makeRouter()
    await router.isReady()
    const wrapper = mount(PlayerView, { global: { plugins: [createPinia(), router] } })
    await flushPromises()
    const liveStore = useLiveStore()
    const disconnectSpy = vi.spyOn(liveStore, 'disconnect')
    wrapper.unmount()
    expect(disconnectSpy).toHaveBeenCalled()
  })
})
