import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useLiveStore } from '../stores/live'
import { useArtifactsStore } from '../stores/artifacts'
import { usePlayerStore } from '../stores/player'
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

describe('SceneScreen — master mode (default)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('показывает плейсхолдер когда live_state пуст', () => {
    const wrapper = mount(SceneScreen)
    expect(wrapper.find('.empty-overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('Экран затемнён')
  })

  it('показывает фоновое изображение когда bg задан', () => {
    useArtifactsStore().library = [bgArtifact]
    useLiveStore().liveState.bg = { artId: 1 }
    const wrapper = mount(SceneScreen)
    expect(wrapper.find('.bg-layer').exists()).toBe(true)
    expect(wrapper.find('.bg-layer img').attributes('src')).toContain('bg.jpg')
    expect(wrapper.find('.empty-overlay').exists()).toBe(false)
  })

  it('показывает NPC слева', () => {
    useArtifactsStore().library = [npcArtifact]
    useLiveStore().liveState.npcs = [{ artId: 2, side: 'left' }]
    const wrapper = mount(SceneScreen)
    const npc = wrapper.find('.npc-layer')
    expect(npc.exists()).toBe(true)
    expect(npc.classes()).toContain('side-left')
    expect(npc.find('img').attributes('src')).toContain('npc.jpg')
  })

  it('показывает двух NPC', () => {
    const npc2 = { ...npcArtifact, id: 3, title: 'Волдрик' }
    useArtifactsStore().library = [npcArtifact, npc2]
    useLiveStore().liveState.npcs = [
      { artId: 2, side: 'left' },
      { artId: 3, side: 'right' },
    ]
    const wrapper = mount(SceneScreen)
    const npcs = wrapper.findAll('.npc-layer')
    expect(npcs).toHaveLength(2)
    expect(npcs[0].classes()).toContain('side-left')
    expect(npcs[1].classes()).toContain('side-right')
  })

  it('показывает текстовый оверлей', () => {
    const textArtifact = { ...bgArtifact, id: 4, type: 'note', title: 'Загадка сфинкса' }
    useArtifactsStore().library = [textArtifact]
    useLiveStore().liveState.text = { artId: 4 }
    const wrapper = mount(SceneScreen)
    expect(wrapper.find('.text-overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('Загадка сфинкса')
  })

  it('не показывает empty-overlay когда есть контент', () => {
    useArtifactsStore().library = [bgArtifact]
    useLiveStore().liveState.bg = { artId: 1 }
    const wrapper = mount(SceneScreen)
    expect(wrapper.find('.empty-overlay').exists()).toBe(false)
  })

  it('NPC-слои не имеют класса draggable в мастер-режиме', () => {
    useArtifactsStore().library = [npcArtifact]
    useLiveStore().liveState.npcs = [{ artId: 2, side: 'left' }]
    const wrapper = mount(SceneScreen)
    expect(wrapper.find('.npc-layer').classes()).not.toContain('draggable')
  })
})

describe('SceneScreen — player mode', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('NPC-слои имеют класс draggable в режиме игрока', () => {
    useArtifactsStore().library = [npcArtifact]
    useLiveStore().liveState.npcs = [{ artId: 2, side: 'left' }]
    const wrapper = mount(SceneScreen, { props: { mode: 'player' } })
    expect(wrapper.find('.npc-layer').classes()).toContain('draggable')
  })

  it('pointerdown + pointerup без движения → setExpanded', async () => {
    useArtifactsStore().library = [npcArtifact]
    useLiveStore().liveState.npcs = [{ artId: 2, side: 'left' }]
    const playerStore = usePlayerStore()
    const wrapper = mount(SceneScreen, { props: { mode: 'player' }, attachTo: document.body })

    const npc = wrapper.find('.npc-layer').element as HTMLElement
    npc.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 100, clientY: 100 }))

    expect(playerStore.playerExpandedId).toBe(2)
    wrapper.unmount()
  })

  it('повторный клик по тому же NPC закрывает панель', async () => {
    useArtifactsStore().library = [npcArtifact]
    useLiveStore().liveState.npcs = [{ artId: 2, side: 'left' }]
    const playerStore = usePlayerStore()
    const wrapper = mount(SceneScreen, { props: { mode: 'player' }, attachTo: document.body })

    const npc = wrapper.find('.npc-layer').element as HTMLElement
    npc.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 100, clientY: 100 }))
    npc.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 100, clientY: 100 }))

    expect(playerStore.playerExpandedId).toBeNull()
    wrapper.unmount()
  })

  it('drag обновляет playerOffsets', async () => {
    useArtifactsStore().library = [npcArtifact]
    useLiveStore().liveState.npcs = [{ artId: 2, side: 'left' }]
    const playerStore = usePlayerStore()
    const wrapper = mount(SceneScreen, { props: { mode: 'player' }, attachTo: document.body })

    const npc = wrapper.find('.npc-layer').element as HTMLElement
    npc.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 130, clientY: 115 }))
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 130, clientY: 115 }))

    expect(playerStore.playerOffsets[2]).toBeDefined()
    expect(playerStore.playerOffsets[2].dx).toBe(30)
    expect(playerStore.playerOffsets[2].dy).toBe(15)
    // После drag expanded не устанавливается
    expect(playerStore.playerExpandedId).toBeNull()
    wrapper.unmount()
  })

  it('кнопка ↺ появляется при наличии смещения и сбрасывает offsets', async () => {
    useArtifactsStore().library = [npcArtifact]
    useLiveStore().liveState.npcs = [{ artId: 2, side: 'left' }]
    const playerStore = usePlayerStore()
    playerStore.setOffset(2, 20, 0)
    const wrapper = mount(SceneScreen, { props: { mode: 'player' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.btn-reset').exists()).toBe(true)
    await wrapper.find('.btn-reset').trigger('click')
    expect(playerStore.playerOffsets).toEqual({})
  })

  it('кнопка ↺ не показывается без смещения', () => {
    useArtifactsStore().library = [npcArtifact]
    useLiveStore().liveState.npcs = [{ artId: 2, side: 'left' }]
    const wrapper = mount(SceneScreen, { props: { mode: 'player' } })
    expect(wrapper.find('.btn-reset').exists()).toBe(false)
  })

  it('clear_all в live_state сбрасывает offsets и expanded', async () => {
    useArtifactsStore().library = [npcArtifact]
    const live = useLiveStore()
    live.liveState.npcs = [{ artId: 2, side: 'left' }]
    const playerStore = usePlayerStore()
    playerStore.setOffset(2, 15, 0)
    playerStore.setExpanded(2)

    mount(SceneScreen, { props: { mode: 'player' } })

    live.liveState.npcs = []
    await new Promise((r) => setTimeout(r, 0)) // дать watch сработать

    expect(playerStore.playerOffsets).toEqual({})
    expect(playerStore.playerExpandedId).toBeNull()
  })
})
