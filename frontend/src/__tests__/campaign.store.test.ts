import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCampaignStore } from '../stores/campaign'
import { gamesApi } from '../api/games'

vi.mock('../api/games', () => ({
  gamesApi: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
}))

const mockGame = { id: 1, title: 'Тест', system: 'OSR', cover: null, share_code: 'abc', created_at: '2026-01-01T00:00:00Z' }

describe('useCampaignStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

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
})
