import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ArtifactInspector from '../components/artifacts/ArtifactInspector.vue'
import { useArtifactsStore } from '../stores/artifacts'

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

const mockArtifact = {
  id: 1,
  owner_id: 1,
  type: 'location_image',
  title: 'Таверна',
  file_path: 'test.jpg',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
}

describe('ArtifactInspector', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('рендерится с заголовком артефакта', () => {
    const wrapper = mount(ArtifactInspector, {
      props: { artifact: mockArtifact },
      attachTo: document.body,
    })
    const input = wrapper.find('.title-input')
    expect((input.element as HTMLInputElement).value).toBe('Таверна')
    wrapper.unmount()
  })

  it('показывает превью изображения', () => {
    const wrapper = mount(ArtifactInspector, {
      props: { artifact: mockArtifact },
      attachTo: document.body,
    })
    expect(wrapper.find('.insp-preview img').attributes('src')).toContain('test.jpg')
    wrapper.unmount()
  })

  it('клик на оверлей эмитит close', async () => {
    const wrapper = mount(ArtifactInspector, {
      props: { artifact: mockArtifact },
      attachTo: document.body,
    })
    await wrapper.find('.inspector-overlay').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('кнопка ✕ эмитит close', async () => {
    const wrapper = mount(ArtifactInspector, {
      props: { artifact: mockArtifact },
      attachTo: document.body,
    })
    await wrapper.find('.close-btn').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('сохранение вызывает patchArtifact и закрывает инспектор', async () => {
    const { artifactsApi } = await import('../api/artifacts')
    vi.mocked(artifactsApi.patch).mockResolvedValueOnce({ ...mockArtifact, title: 'Новое' })

    const wrapper = mount(ArtifactInspector, {
      props: { artifact: mockArtifact },
      attachTo: document.body,
    })

    const input = wrapper.find<HTMLInputElement>('.title-input')
    await input.setValue('Новое')
    await wrapper.find('.save-btn').trigger('click')
    await wrapper.vm.$nextTick()

    expect(artifactsApi.patch).toHaveBeenCalledWith(1, { title: 'Новое' })
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('Enter в поле сохраняет артефакт', async () => {
    const { artifactsApi } = await import('../api/artifacts')
    vi.mocked(artifactsApi.patch).mockResolvedValueOnce({ ...mockArtifact, title: 'Порт' })

    const wrapper = mount(ArtifactInspector, {
      props: { artifact: mockArtifact },
      attachTo: document.body,
    })

    const input = wrapper.find<HTMLInputElement>('.title-input')
    await input.setValue('Порт')
    await input.trigger('keydown.enter')
    await wrapper.vm.$nextTick()

    expect(artifactsApi.patch).toHaveBeenCalledWith(1, { title: 'Порт' })
    wrapper.unmount()
  })
})
