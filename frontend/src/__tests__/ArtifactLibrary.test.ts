import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useArtifactsStore } from '../stores/artifacts'
import ArtifactLibrary from '../components/artifacts/ArtifactLibrary.vue'

const mockArtifact = {
  id: 1,
  owner_id: 1,
  type: 'location_image',
  title: 'Таверна',
  file_path: '1/abc.png',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  setActivePinia(createPinia())
})

function mountLibrary(currentSceneId: number | null = null) {
  return mount(ArtifactLibrary, {
    props: { currentSceneId },
    global: { stubs: { Teleport: true } },
  })
}

describe('ArtifactLibrary', () => {
  it('shows empty hint when library is empty', () => {
    const wrapper = mountLibrary()
    expect(wrapper.text()).toContain('Библиотека пуста')
  })

  it('renders artifact cards', () => {
    const store = useArtifactsStore()
    store.library = [mockArtifact]
    const wrapper = mountLibrary()

    expect(wrapper.text()).toContain('Таверна')
    expect(wrapper.text()).toContain('фон')
  })

  it('emits close when ✕ button clicked', async () => {
    const wrapper = mountLibrary()
    await wrapper.find('.close-btn').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows attach button when currentSceneId is set', () => {
    const store = useArtifactsStore()
    store.library = [mockArtifact]
    const wrapper = mountLibrary(5)

    expect(wrapper.text()).toContain('+ к сцене')
  })

  it('hides attach button when no scene selected', () => {
    const store = useArtifactsStore()
    store.library = [mockArtifact]
    const wrapper = mountLibrary(null)

    expect(wrapper.text()).not.toContain('+ к сцене')
  })

  it('shows "отвязать" for attached artifacts', () => {
    const store = useArtifactsStore()
    store.library = [mockArtifact]
    store.sceneLinks = [
      {
        id: 10,
        scene_id: 5,
        artifact_id: 1,
        is_active: false,
        position: null,
        artifact: mockArtifact,
      },
    ]
    const wrapper = mountLibrary(5)

    expect(wrapper.text()).toContain('отвязать')
  })

  it('calls attachToScene when "+ к сцене" clicked', async () => {
    const store = useArtifactsStore()
    store.library = [mockArtifact]
    store.attachToScene = vi.fn().mockResolvedValue({})

    const wrapper = mountLibrary(5)
    await wrapper.find('.attach-btn').trigger('click')

    expect(store.attachToScene).toHaveBeenCalledWith(5, 1)
  })

  it('calls detachFromScene when "отвязать" clicked', async () => {
    const store = useArtifactsStore()
    store.library = [mockArtifact]
    store.sceneLinks = [
      {
        id: 10,
        scene_id: 5,
        artifact_id: 1,
        is_active: false,
        position: null,
        artifact: mockArtifact,
      },
    ]
    store.detachFromScene = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountLibrary(5)
    await wrapper.find('.attach-btn').trigger('click')

    expect(store.detachFromScene).toHaveBeenCalledWith(5, 1)
  })

  it('calls deleteArtifact when delete button clicked', async () => {
    const store = useArtifactsStore()
    store.library = [mockArtifact]
    store.deleteArtifact = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountLibrary()
    await wrapper.find('.icon-btn.danger').trigger('click')

    expect(store.deleteArtifact).toHaveBeenCalledWith(1)
  })
})
