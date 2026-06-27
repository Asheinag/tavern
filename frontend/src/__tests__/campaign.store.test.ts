import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
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

const mockGame = {
  id: 1,
  title: 'Тест',
  system: 'OSR',
  cover: null,
  share_code: 'abc',
  created_at: '2026-01-01T00:00:00Z',
}

const mockScene = {
  id: 10,
  game_id: 1,
  title: 'Таверна',
  type: '',
  status: 'draft',
  color: null,
  summary: '',
  x: 60,
  y: 60,
  col: 0,
  row: 0,
}

const mockEdge = { id: 20, game_id: 1, from_scene_id: 10, to_scene_id: 11, cond: null }

const mockGameDetail = { ...mockGame, scenes: [mockScene], edges: [mockEdge] }

describe('useCampaignStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Список игр ─────────────────────────────────────────────────────────────

  it('fetchGames — заполняет список', async () => {
    vi.mocked(gamesApi.list).mockResolvedValueOnce([mockGame])
    const store = useCampaignStore()
    await store.fetchGames()
    expect(store.games).toHaveLength(1)
    expect(store.games[0].title).toBe('Тест')
  })

  it('fetchGames — ставит error при сбое', async () => {
    vi.mocked(gamesApi.list).mockRejectedValueOnce(new Error('fail'))
    const store = useCampaignStore()
    await store.fetchGames()
    expect(store.error).toBeTruthy()
    expect(store.games).toHaveLength(0)
  })

  it('createGame — добавляет игру в начало списка', async () => {
    vi.mocked(gamesApi.create).mockResolvedValueOnce(mockGame)
    const store = useCampaignStore()
    const result = await store.createGame({ title: 'Тест' })
    expect(result.id).toBe(1)
    expect(store.games).toHaveLength(1)
  })

  it('removeGame — удаляет игру из списка', async () => {
    vi.mocked(gamesApi.list).mockResolvedValueOnce([mockGame])
    vi.mocked(gamesApi.remove).mockResolvedValueOnce(undefined as never)
    const store = useCampaignStore()
    await store.fetchGames()
    await store.removeGame(1)
    expect(store.games).toHaveLength(0)
  })

  // ── Текущая игра ───────────────────────────────────────────────────────────

  it('fetchGame — загружает игру с деталями', async () => {
    vi.mocked(gamesApi.get).mockResolvedValueOnce(mockGameDetail)
    const store = useCampaignStore()
    await store.fetchGame(1)
    expect(store.currentGame?.id).toBe(1)
    expect(store.currentGame?.scenes).toHaveLength(1)
    expect(store.currentGame?.edges).toHaveLength(1)
  })

  it('fetchGame — ставит gameError при сбое', async () => {
    vi.mocked(gamesApi.get).mockRejectedValueOnce(new Error('fail'))
    const store = useCampaignStore()
    await store.fetchGame(1)
    expect(store.gameError).toBeTruthy()
    expect(store.currentGame).toBeNull()
  })

  // ── Сцены ──────────────────────────────────────────────────────────────────

  it('addScene — добавляет сцену в currentGame', async () => {
    vi.mocked(gamesApi.get).mockResolvedValueOnce({ ...mockGameDetail, scenes: [], edges: [] })
    vi.mocked(gamesApi.createScene).mockResolvedValueOnce(mockScene)
    const store = useCampaignStore()
    await store.fetchGame(1)
    await store.addScene('Таверна')
    expect(store.currentGame?.scenes).toHaveLength(1)
    expect(store.currentGame?.scenes[0].title).toBe('Таверна')
  })

  it('addScene — авто-позиция X смещается от последней сцены', async () => {
    const existingScene = { ...mockScene, x: 300 }
    vi.mocked(gamesApi.get).mockResolvedValueOnce({
      ...mockGameDetail,
      scenes: [existingScene],
      edges: [],
    })
    vi.mocked(gamesApi.createScene).mockResolvedValueOnce({ ...mockScene, x: 520 })
    const store = useCampaignStore()
    await store.fetchGame(1)
    await store.addScene('Лес')
    const call = vi.mocked(gamesApi.createScene).mock.calls[0]
    expect(call[1].x).toBe(520) // 300 + 220
  })

  it('updateScene — обновляет сцену в списке', async () => {
    vi.mocked(gamesApi.get).mockResolvedValueOnce(mockGameDetail)
    vi.mocked(gamesApi.patchScene).mockResolvedValueOnce({ ...mockScene, title: 'Порт' })
    const store = useCampaignStore()
    await store.fetchGame(1)
    await store.updateScene(10, { title: 'Порт' })
    expect(store.currentGame?.scenes[0].title).toBe('Порт')
  })

  it('removeScene — удаляет сцену и её рёбра', async () => {
    vi.mocked(gamesApi.get).mockResolvedValueOnce(mockGameDetail)
    vi.mocked(gamesApi.deleteScene).mockResolvedValueOnce(undefined as never)
    const store = useCampaignStore()
    await store.fetchGame(1)
    await store.removeScene(10)
    expect(store.currentGame?.scenes).toHaveLength(0)
    expect(store.currentGame?.edges).toHaveLength(0)
  })

  // ── Рёбра ──────────────────────────────────────────────────────────────────

  it('addEdge — добавляет ребро в currentGame', async () => {
    vi.mocked(gamesApi.get).mockResolvedValueOnce({ ...mockGameDetail, edges: [] })
    vi.mocked(gamesApi.createEdge).mockResolvedValueOnce(mockEdge)
    const store = useCampaignStore()
    await store.fetchGame(1)
    await store.addEdge(10, 11)
    expect(store.currentGame?.edges).toHaveLength(1)
    expect(store.currentGame?.edges[0].from_scene_id).toBe(10)
  })

  it('removeEdge — удаляет ребро из currentGame', async () => {
    vi.mocked(gamesApi.get).mockResolvedValueOnce(mockGameDetail)
    vi.mocked(gamesApi.deleteEdge).mockResolvedValueOnce(undefined as never)
    const store = useCampaignStore()
    await store.fetchGame(1)
    await store.removeEdge(20)
    expect(store.currentGame?.edges).toHaveLength(0)
  })
})
