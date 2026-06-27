import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useArtifactsStore } from '../stores/artifacts'
import ArtifactPanel from '../components/artifacts/ArtifactPanel.vue'

const mockLocationLink = {
  id: 10,
  scene_id: 5,
  artifact_id: 1,
  is_active: false,
  position: null,
  artifact: {
    id: 1,
    owner_id: 1,
    type: 'location_image',
    title: 'Закатный тракт',
    file_path: '1/abc.png',
    tags: [],
    created_at: '2026-01-01T00:00:00Z',
  },
}

const mockNpcLink = {
  id: 11,
  scene_id: 5,
  artifact_id: 2,
  is_active: false,
  position: null,
  artifact: {
    id: 2,
    owner_id: 1,
    type: 'npc',
    title: 'Мирта',
    file_path: '1/def.png',
    tags: [],
    created_at: '2026-01-01T00:00:00Z',
  },
}

beforeEach(() => {
  setActivePinia(createPinia())
})

function mountPanel() {
  return mount(ArtifactPanel, { props: { sceneId: 5 } })
}

describe('ArtifactPanel', () => {
  it('shows empty hint when no links', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('Пусто')
  })

  it('renders location_image link with type tag and action button', () => {
    const store = useArtifactsStore()
    store.sceneLinks = [mockLocationLink]
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('фон')
    expect(wrapper.text()).toContain('Закатный тракт')
    expect(wrapper.text()).toContain('→ фоном')
  })

  it('shows фон ✓ when location_image is active', () => {
    const store = useArtifactsStore()
    store.sceneLinks = [{ ...mockLocationLink, is_active: true }]
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('фон ✓')
  })

  it('renders npc link with position buttons', () => {
    const store = useArtifactsStore()
    store.sceneLinks = [mockNpcLink]
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('npc')
    expect(wrapper.text()).toContain('Мирта')
    expect(wrapper.text()).toContain('слева')
    expect(wrapper.text()).toContain('центр')
    expect(wrapper.text()).toContain('справа')
  })

  it('calls patchLink with is_active toggle on action button click', async () => {
    const store = useArtifactsStore()
    store.sceneLinks = [mockLocationLink]
    store.patchLink = vi.fn().mockResolvedValue({ ...mockLocationLink, is_active: true })

    const wrapper = mountPanel()
    await wrapper.find('.action-btn').trigger('click')

    expect(store.patchLink).toHaveBeenCalledWith(5, 1, { is_active: true })
  })

  it('calls patchLink with position on position button click', async () => {
    const store = useArtifactsStore()
    store.sceneLinks = [mockNpcLink]
    store.patchLink = vi.fn().mockResolvedValue({ ...mockNpcLink, position: 'left' })

    const wrapper = mountPanel()
    const posBtn = wrapper.findAll('.pos-btn')[0]
    await posBtn.trigger('click')

    expect(store.patchLink).toHaveBeenCalledWith(5, 2, { position: 'left' })
  })

  it('calls detachFromScene on ✕ button click', async () => {
    const store = useArtifactsStore()
    store.sceneLinks = [mockLocationLink]
    store.detachFromScene = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountPanel()
    await wrapper.find('.icon-btn').trigger('click')

    expect(store.detachFromScene).toHaveBeenCalledWith(5, 1)
  })
})
