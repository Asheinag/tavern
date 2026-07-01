import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLogStore } from '../stores/log'

vi.mock('../api/log', () => ({
  logApi: {
    list: vi.fn(),
    add: vi.fn(),
  },
}))

import { logApi } from '../api/log'

const mockList = vi.mocked(logApi.list)
const mockAdd = vi.mocked(logApi.add)

const entry = {
  id: 1,
  game_id: 42,
  ts: '2026-01-01T12:00:00Z',
  kind: 'note',
  text: 'Заметка',
  scene_id: null,
}

describe('useLogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('начальное состояние пусто', () => {
    const store = useLogStore()
    expect(store.entries).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchLog загружает записи', async () => {
    mockList.mockResolvedValue([entry])
    const store = useLogStore()
    await store.fetchLog(42)
    expect(store.entries).toEqual([entry])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchLog устанавливает loading во время запроса', async () => {
    let resolve!: (v: typeof entry[]) => void
    mockList.mockReturnValue(new Promise((r) => (resolve = r)))
    const store = useLogStore()
    const promise = store.fetchLog(42)
    expect(store.loading).toBe(true)
    resolve([entry])
    await promise
    expect(store.loading).toBe(false)
  })

  it('fetchLog устанавливает error при сбое', async () => {
    mockList.mockRejectedValue(new Error('Network error'))
    const store = useLogStore()
    await store.fetchLog(42)
    expect(store.error).toBe('Не удалось загрузить журнал')
    expect(store.entries).toEqual([])
  })

  it('addEntry добавляет запись в конец', async () => {
    mockList.mockResolvedValue([entry])
    const newEntry = { ...entry, id: 2, text: 'Вторая' }
    mockAdd.mockResolvedValue(newEntry)
    const store = useLogStore()
    await store.fetchLog(42)
    await store.addEntry(42, 'Вторая')
    expect(store.entries).toHaveLength(2)
    expect(store.entries[1]).toEqual(newEntry)
  })

  it('addEntry возвращает созданную запись', async () => {
    mockAdd.mockResolvedValue(entry)
    const store = useLogStore()
    const result = await store.addEntry(42, 'Заметка')
    expect(result).toEqual(entry)
  })

  it('clear сбрасывает entries и error', async () => {
    mockList.mockResolvedValue([entry])
    const store = useLogStore()
    await store.fetchLog(42)
    store.clear()
    expect(store.entries).toEqual([])
    expect(store.error).toBeNull()
  })

  it('fetchLog сбрасывает предыдущую ошибку', async () => {
    mockList.mockRejectedValueOnce(new Error('fail'))
    const store = useLogStore()
    await store.fetchLog(42)
    expect(store.error).toBeTruthy()

    mockList.mockResolvedValue([entry])
    await store.fetchLog(42)
    expect(store.error).toBeNull()
  })
})
