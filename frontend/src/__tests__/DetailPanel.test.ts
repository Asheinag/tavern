import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '../stores/player'
import { useArtifactsStore } from '../stores/artifacts'
import DetailPanel from '../components/player/DetailPanel.vue'

const npcArtifact = {
  id: 2,
  owner_id: 1,
  type: 'npc',
  title: 'Мирта',
  file_path: 'npc.jpg',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
}

describe('DetailPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('не отображает панель когда playerExpandedId = null', () => {
    const wrapper = mount(DetailPanel, { attachTo: document.body })
    expect(document.body.querySelector('.detail-overlay')).toBeFalsy()
    wrapper.unmount()
  })

  it('отображает панель с именем артефакта когда expanded', async () => {
    useArtifactsStore().library = [npcArtifact]
    usePlayerStore().setExpanded(2)

    const wrapper = mount(DetailPanel, { attachTo: document.body })
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.detail-overlay')).toBeTruthy()
    expect(document.body.querySelector('.detail-title')?.textContent).toBe('Мирта')
    wrapper.unmount()
  })

  it('показывает изображение артефакта', async () => {
    useArtifactsStore().library = [npcArtifact]
    usePlayerStore().setExpanded(2)

    const wrapper = mount(DetailPanel, { attachTo: document.body })
    await wrapper.vm.$nextTick()

    const img = document.body.querySelector<HTMLImageElement>('.detail-image img')
    expect(img?.src).toContain('npc.jpg')
    wrapper.unmount()
  })

  it('кнопка ✕ закрывает панель', async () => {
    useArtifactsStore().library = [npcArtifact]
    const playerStore = usePlayerStore()
    playerStore.setExpanded(2)

    const wrapper = mount(DetailPanel, { attachTo: document.body })
    await wrapper.vm.$nextTick()

    const closeBtn = document.body.querySelector<HTMLElement>('.btn-close')!
    closeBtn.click()
    await wrapper.vm.$nextTick()

    expect(playerStore.playerExpandedId).toBeNull()
    expect(document.body.querySelector('.detail-overlay')).toBeFalsy()
    wrapper.unmount()
  })

  it('клик по подложке закрывает панель', async () => {
    useArtifactsStore().library = [npcArtifact]
    const playerStore = usePlayerStore()
    playerStore.setExpanded(2)

    const wrapper = mount(DetailPanel, { attachTo: document.body })
    await wrapper.vm.$nextTick()

    const overlay = document.body.querySelector<HTMLElement>('.detail-overlay')!
    overlay.click()
    await wrapper.vm.$nextTick()

    expect(playerStore.playerExpandedId).toBeNull()
    wrapper.unmount()
  })

  it('Escape закрывает панель', async () => {
    useArtifactsStore().library = [npcArtifact]
    const playerStore = usePlayerStore()
    playerStore.setExpanded(2)

    const wrapper = mount(DetailPanel, { attachTo: document.body })
    await wrapper.vm.$nextTick()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(playerStore.playerExpandedId).toBeNull()
    wrapper.unmount()
  })

  it('панель исчезает когда playerExpandedId сбрасывается', async () => {
    useArtifactsStore().library = [npcArtifact]
    const playerStore = usePlayerStore()
    playerStore.setExpanded(2)

    const wrapper = mount(DetailPanel, { attachTo: document.body })
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.detail-overlay')).toBeTruthy()

    playerStore.setExpanded(null)
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.detail-overlay')).toBeFalsy()
    wrapper.unmount()
  })
})
