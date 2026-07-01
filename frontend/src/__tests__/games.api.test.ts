import { describe, it, expect, vi, beforeEach } from 'vitest'

// Мокируем http ДО импорта gamesApi, чтобы реальный axios не запускался
vi.mock('../api/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { gamesApi } from '../api/games'
import http from '../api/http'

const mockGame = {
  id: 1,
  title: 'Таверна',
  system: 'OSR',
  cover: null,
  share_code: 'abc',
  created_at: '2026-01-01T00:00:00Z',
}

const mockScene = {
  id: 10,
  game_id: 1,
  title: 'Вход',
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

beforeEach(() => vi.clearAllMocks())

describe('gamesApi', () => {
  it('list — GET /games', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: [mockGame] })
    const result = await gamesApi.list()
    expect(http.get).toHaveBeenCalledWith('/games')
    expect(result).toEqual([mockGame])
  })

  it('create — POST /games', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: mockGame })
    const result = await gamesApi.create({ title: 'Таверна', system: 'OSR' })
    expect(http.post).toHaveBeenCalledWith('/games', { title: 'Таверна', system: 'OSR' })
    expect(result).toEqual(mockGame)
  })

  it('remove — DELETE /games/:id', async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({ data: undefined })
    await gamesApi.remove(1)
    expect(http.delete).toHaveBeenCalledWith('/games/1')
  })

  it('get — GET /games/:id', async () => {
    const detail = { ...mockGame, scenes: [], edges: [] }
    vi.mocked(http.get).mockResolvedValueOnce({ data: detail })
    const result = await gamesApi.get(1)
    expect(http.get).toHaveBeenCalledWith('/games/1')
    expect(result).toEqual(detail)
  })

  it('getByCode — GET /games/by-code/:code', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: { id: 1, title: 'Таверна' } })
    const result = await gamesApi.getByCode('abc')
    expect(http.get).toHaveBeenCalledWith('/games/by-code/abc')
    expect(result).toEqual({ id: 1, title: 'Таверна' })
  })

  it('createScene — POST /games/:id/scenes', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: mockScene })
    const result = await gamesApi.createScene(1, { title: 'Вход', x: 60, y: 60 })
    expect(http.post).toHaveBeenCalledWith('/games/1/scenes', { title: 'Вход', x: 60, y: 60 })
    expect(result).toEqual(mockScene)
  })

  it('patchScene — PATCH /scenes/:id', async () => {
    vi.mocked(http.patch).mockResolvedValueOnce({ data: { ...mockScene, title: 'Зал' } })
    const result = await gamesApi.patchScene(10, { title: 'Зал' })
    expect(http.patch).toHaveBeenCalledWith('/scenes/10', { title: 'Зал' })
    expect(result.title).toBe('Зал')
  })

  it('deleteScene — DELETE /scenes/:id', async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({ data: undefined })
    await gamesApi.deleteScene(10)
    expect(http.delete).toHaveBeenCalledWith('/scenes/10')
  })

  it('createEdge — POST /games/:id/edges', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: mockEdge })
    const result = await gamesApi.createEdge(1, 10, 11)
    expect(http.post).toHaveBeenCalledWith('/games/1/edges', {
      from_scene_id: 10,
      to_scene_id: 11,
    })
    expect(result).toEqual(mockEdge)
  })

  it('deleteEdge — DELETE /edges/:id', async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({ data: undefined })
    await gamesApi.deleteEdge(20)
    expect(http.delete).toHaveBeenCalledWith('/edges/20')
  })
})
