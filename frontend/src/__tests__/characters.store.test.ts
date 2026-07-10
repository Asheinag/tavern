/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCharactersStore } from '../stores/characters'
import { charactersApi, invitesApi } from '../api/characters'

vi.mock('../api/characters', () => ({
  charactersApi: {
    list: vi.fn(),
    create: vi.fn(),
    patch: vi.fn(),
    remove: vi.fn(),
    uploadAvatar: vi.fn(),
  },
  invitesApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}))

const mockChar = {
  id: 1,
  owner_id: 10,
  name: 'Горин',
  avatar: null,
  bio: 'Дварфийский воин',
  created_at: '2026-01-01T00:00:00Z',
}

const mockInvite = {
  id: 1,
  code: 'ABC123',
  used_by: null,
  expires_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('useCharactersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchCharacters — загружает список', async () => {
    vi.mocked(charactersApi.list).mockResolvedValue({ data: [mockChar] } as any)
    const store = useCharactersStore()
    await store.fetchCharacters()
    expect(store.characters).toHaveLength(1)
    expect(store.characters[0].name).toBe('Горин')
  })

  it('createCharacter — добавляет в список', async () => {
    vi.mocked(charactersApi.create).mockResolvedValue({ data: mockChar } as any)
    const store = useCharactersStore()
    const char = await store.createCharacter('Горин', 'Дварфийский воин')
    expect(store.characters).toHaveLength(1)
    expect(char.id).toBe(1)
  })

  it('updateCharacter — обновляет в списке', async () => {
    vi.mocked(charactersApi.list).mockResolvedValue({ data: [mockChar] } as any)
    vi.mocked(charactersApi.patch).mockResolvedValue({
      data: { ...mockChar, name: 'Горин Стальной' },
    } as any)
    const store = useCharactersStore()
    await store.fetchCharacters()
    await store.updateCharacter(1, { name: 'Горин Стальной' })
    expect(store.characters[0].name).toBe('Горин Стальной')
  })

  it('removeCharacter — удаляет из списка', async () => {
    vi.mocked(charactersApi.list).mockResolvedValue({ data: [mockChar] } as any)
    vi.mocked(charactersApi.remove).mockResolvedValue({} as any)
    const store = useCharactersStore()
    await store.fetchCharacters()
    await store.removeCharacter(1)
    expect(store.characters).toHaveLength(0)
  })

  it('fetchInvites — загружает инвайты', async () => {
    vi.mocked(invitesApi.list).mockResolvedValue({ data: [mockInvite] } as any)
    const store = useCharactersStore()
    await store.fetchInvites()
    expect(store.invites).toHaveLength(1)
    expect(store.invites[0].code).toBe('ABC123')
  })

  it('createInvite — добавляет в начало списка', async () => {
    const inv2 = { ...mockInvite, id: 2, code: 'XYZ' }
    vi.mocked(invitesApi.list).mockResolvedValue({ data: [mockInvite] } as any)
    vi.mocked(invitesApi.create).mockResolvedValue({ data: inv2 } as any)
    const store = useCharactersStore()
    await store.fetchInvites()
    await store.createInvite()
    expect(store.invites[0].code).toBe('XYZ')
    expect(store.invites).toHaveLength(2)
  })
})
