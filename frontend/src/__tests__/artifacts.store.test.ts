import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArtifactsStore } from '../stores/artifacts'
import { artifactsApi } from '../api/artifacts'

vi.mock('../api/artifacts', () => ({
  artifactsApi: {
    upload: vi.fn(),
    list: vi.fn(),
    patch: vi.fn(),
    remove: vi.fn(),
    listSceneArtifacts: vi.fn(),
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
  file_path: '1/abc.png',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
}

const mockNpc = {
  id: 2,
  owner_id: 1,
  type: 'npc',
  title: 'Мирта',
  file_path: '1/def.png',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
}

const mockLink = {
  id: 10,
  scene_id: 5,
  artifact_id: 1,
  is_active: false,
  position: null,
  artifact: mockArtifact,
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('fetchLibrary', () => {
  it('loads library from API', async () => {
    vi.mocked(artifactsApi.list).mockResolvedValue([mockArtifact])
    const store = useArtifactsStore()
    await store.fetchLibrary()
    expect(store.library).toEqual([mockArtifact])
  })

  it('filters by type when provided', async () => {
    vi.mocked(artifactsApi.list).mockResolvedValue([mockNpc])
    const store = useArtifactsStore()
    await store.fetchLibrary('npc')
    expect(artifactsApi.list).toHaveBeenCalledWith('npc')
  })
})

describe('upload', () => {
  it('adds uploaded artifact to the start of library', async () => {
    vi.mocked(artifactsApi.list).mockResolvedValue([mockArtifact])
    vi.mocked(artifactsApi.upload).mockResolvedValue(mockNpc)
    const store = useArtifactsStore()
    await store.fetchLibrary()

    const file = new File(['x'], 'img.png', { type: 'image/png' })
    await store.upload(file, 'npc', 'Мирта')

    expect(store.library[0]).toEqual(mockNpc)
    expect(store.library).toHaveLength(2)
  })

  it('sets uploading flag during upload', async () => {
    let resolve!: (v: typeof mockArtifact) => void
    vi.mocked(artifactsApi.upload).mockReturnValue(new Promise((r) => (resolve = r)))
    const store = useArtifactsStore()

    const file = new File(['x'], 'img.png', { type: 'image/png' })
    const promise = store.upload(file, 'location_image')
    expect(store.uploading).toBe(true)
    resolve(mockArtifact)
    await promise
    expect(store.uploading).toBe(false)
  })
})

describe('patchArtifact', () => {
  it('updates artifact in library and sceneLinks', async () => {
    const updated = { ...mockArtifact, title: 'Новый фон' }
    vi.mocked(artifactsApi.patch).mockResolvedValue(updated)
    const store = useArtifactsStore()
    store.library = [mockArtifact]
    store.sceneLinks = [{ ...mockLink, artifact: mockArtifact }]

    await store.patchArtifact(1, { title: 'Новый фон' })

    expect(store.library[0].title).toBe('Новый фон')
    expect(store.sceneLinks[0].artifact.title).toBe('Новый фон')
  })
})

describe('deleteArtifact', () => {
  it('removes artifact from library and sceneLinks', async () => {
    vi.mocked(artifactsApi.remove).mockResolvedValue(undefined as never)
    const store = useArtifactsStore()
    store.library = [mockArtifact, mockNpc]
    store.sceneLinks = [{ ...mockLink, artifact: mockArtifact }]

    await store.deleteArtifact(1)

    expect(store.library).toHaveLength(1)
    expect(store.library[0].id).toBe(2)
    expect(store.sceneLinks).toHaveLength(0)
  })
})

describe('fetchSceneArtifacts', () => {
  it('loads scene links', async () => {
    vi.mocked(artifactsApi.listSceneArtifacts).mockResolvedValue([mockLink])
    const store = useArtifactsStore()
    await store.fetchSceneArtifacts(5)
    expect(store.sceneLinks).toEqual([mockLink])
    expect(store.currentSceneId).toBe(5)
  })
})

describe('attachToScene / detachFromScene', () => {
  it('attach adds link to sceneLinks', async () => {
    vi.mocked(artifactsApi.attach).mockResolvedValue(mockLink)
    const store = useArtifactsStore()
    await store.attachToScene(5, 1)
    expect(store.sceneLinks).toContainEqual(mockLink)
  })

  it('detach removes link from sceneLinks', async () => {
    vi.mocked(artifactsApi.detach).mockResolvedValue(undefined as never)
    const store = useArtifactsStore()
    store.sceneLinks = [mockLink]
    await store.detachFromScene(5, 1)
    expect(store.sceneLinks).toHaveLength(0)
  })
})

describe('patchLink', () => {
  it('updates the link in sceneLinks', async () => {
    const updated = { ...mockLink, is_active: true }
    vi.mocked(artifactsApi.patchLink).mockResolvedValue(updated)
    const store = useArtifactsStore()
    store.sceneLinks = [mockLink]

    await store.patchLink(5, 1, { is_active: true })
    expect(store.sceneLinks[0].is_active).toBe(true)
  })

  it('deactivates other location_image links when one is activated', async () => {
    const link2 = { ...mockLink, id: 11, artifact_id: 3, artifact: { ...mockArtifact, id: 3 } }
    const updated = { ...mockLink, is_active: true }
    vi.mocked(artifactsApi.patchLink).mockResolvedValue(updated)

    const store = useArtifactsStore()
    store.sceneLinks = [{ ...mockLink, is_active: true }, link2]

    await store.patchLink(5, 3, { is_active: true })

    expect(store.sceneLinks.find((l) => l.artifact_id === 1)?.is_active).toBe(false)
  })

  it('does not deactivate npc links when location_image is activated', async () => {
    const npcLink = { ...mockLink, id: 11, artifact_id: 2, is_active: true, artifact: mockNpc }
    const updated = { ...mockLink, is_active: true }
    vi.mocked(artifactsApi.patchLink).mockResolvedValue(updated)

    const store = useArtifactsStore()
    store.sceneLinks = [mockLink, npcLink]

    await store.patchLink(5, 1, { is_active: true })
    expect(store.sceneLinks.find((l) => l.artifact_id === 2)?.is_active).toBe(true)
  })
})

describe('clearSceneArtifacts', () => {
  it('resets sceneLinks and currentSceneId', () => {
    const store = useArtifactsStore()
    store.sceneLinks = [mockLink]
    store.currentSceneId = 5
    store.clearSceneArtifacts()
    expect(store.sceneLinks).toHaveLength(0)
    expect(store.currentSceneId).toBeNull()
  })
})
