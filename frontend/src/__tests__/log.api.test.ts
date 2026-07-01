import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logApi } from '../api/log'

vi.mock('../api/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import http from '../api/http'

const mockGet = vi.mocked(http.get)
const mockPost = vi.mocked(http.post)

const entry = {
  id: 1,
  game_id: 42,
  ts: '2026-01-01T12:00:00Z',
  kind: 'note',
  text: 'Тест',
  scene_id: null,
}

describe('logApi', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('list возвращает массив записей', async () => {
    mockGet.mockResolvedValue({ data: [entry] })
    const result = await logApi.list(42)
    expect(mockGet).toHaveBeenCalledWith('/games/42/log')
    expect(result).toEqual([entry])
  })

  it('list с пустым журналом', async () => {
    mockGet.mockResolvedValue({ data: [] })
    const result = await logApi.list(1)
    expect(result).toEqual([])
  })

  it('add отправляет текст и возвращает запись', async () => {
    mockPost.mockResolvedValue({ data: entry })
    const result = await logApi.add(42, 'Тест')
    expect(mockPost).toHaveBeenCalledWith('/games/42/log', { text: 'Тест' })
    expect(result).toEqual(entry)
  })
})
