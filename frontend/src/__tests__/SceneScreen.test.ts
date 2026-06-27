import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useLiveStore } from '../stores/live'
import { useArtifactsStore } from '../stores/artifacts'
import SceneScreen from '../components/player/SceneScreen.vue'

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

const bgArtifact = {
  id: 1,
  owner_id: 1,
  type: 'location_image',
  title: 'Таверна',
  file_path: 'bg.jpg',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
}

const npcArtifact = {
  id: 2,
  owner_id: 1,
  type: 'npc',
  title: 'Мирта',
  file_path: 'npc.jpg',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
}

describe('SceneScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('показывает плейсхолдер когда live_state пуст', () => {
    const wrapper = mount(SceneScreen)
    expect(wrapper.find('.empty-overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('Экран затемнён')
  })

  it('показывает фоновое изображение когда bg задан', async () => {
    const artifacts = useArtifactsStore()
    artifacts.library = [bgArtifact]

    const live = useLiveStore()
    live.liveState.bg = { artId: 1 }

    const wrapper = mount(SceneScreen)
    expect(wrapper.find('.bg-layer').exists()).toBe(true)
    expect(wrapper.find('.bg-layer img').attributes('src')).toContain('bg.jpg')
    expect(wrapper.find('.empty-overlay').exists()).toBe(false)
  })

  it('показывает NPC слева', async () => {
    const artifacts = useArtifactsStore()
    artifacts.library = [npcArtifact]

    const live = useLiveStore()
    live.liveState.npcs = [{ artId: 2, side: 'left' }]

    const wrapper = mount(SceneScreen)
    const npc = wrapper.find('.npc-layer')
    expect(npc.exists()).toBe(true)
    expect(npc.classes()).toContain('side-left')
    expect(npc.find('img').attributes('src')).toContain('npc.jpg')
  })

  it('показывает двух NPC', async () => {
    const npc2 = { ...npcArtifact, id: 3, title: 'Волдрик' }
    const artifacts = useArtifactsStore()
    artifacts.library = [npcArtifact, npc2]

    const live = useLiveStore()
    live.liveState.npcs = [
      { artId: 2, side: 'left' },
      { artId: 3, side: 'right' },
    ]

    const wrapper = mount(SceneScreen)
    const npcs = wrapper.findAll('.npc-layer')
    expect(npcs).toHaveLength(2)
    expect(npcs[0].classes()).toContain('side-left')
    expect(npcs[1].classes()).toContain('side-right')
  })

  it('показывает текстовый оверлей', async () => {
    const textArtifact = { ...bgArtifact, id: 4, type: 'note', title: 'Загадка сфинкса' }
    const artifacts = useArtifactsStore()
    artifacts.library = [textArtifact]

    const live = useLiveStore()
    live.liveState.text = { artId: 4 }

    const wrapper = mount(SceneScreen)
    expect(wrapper.find('.text-overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('Загадка сфинкса')
  })

  it('не показывает empty-overlay когда есть контент', async () => {
    const artifacts = useArtifactsStore()
    artifacts.library = [bgArtifact]

    const live = useLiveStore()
    live.liveState.bg = { artId: 1 }

    const wrapper = mount(SceneScreen)
    expect(wrapper.find('.empty-overlay').exists()).toBe(false)
  })
})
