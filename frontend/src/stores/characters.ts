import { defineStore } from 'pinia'
import { ref } from 'vue'
import { charactersApi, invitesApi, type Character, type InviteCode } from '../api/characters'

export const useCharactersStore = defineStore('characters', () => {
  const characters = ref<Character[]>([])
  const invites = ref<InviteCode[]>([])
  const loading = ref(false)

  async function fetchCharacters() {
    loading.value = true
    try {
      const res = await charactersApi.list()
      characters.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function createCharacter(name: string, bio?: string) {
    const res = await charactersApi.create({ name, bio: bio || null })
    characters.value.push(res.data)
    return res.data
  }

  async function updateCharacter(id: number, data: { name?: string; bio?: string | null }) {
    const res = await charactersApi.patch(id, data)
    const idx = characters.value.findIndex((c) => c.id === id)
    if (idx !== -1) characters.value[idx] = res.data
    return res.data
  }

  async function removeCharacter(id: number) {
    await charactersApi.remove(id)
    characters.value = characters.value.filter((c) => c.id !== id)
  }

  async function uploadAvatar(id: number, file: File) {
    const res = await charactersApi.uploadAvatar(id, file)
    const idx = characters.value.findIndex((c) => c.id === id)
    if (idx !== -1) characters.value[idx] = res.data
    return res.data
  }

  async function fetchInvites() {
    const res = await invitesApi.list()
    invites.value = res.data
  }

  async function createInvite(expiresAt?: string) {
    const res = await invitesApi.create({ expires_at: expiresAt ?? null })
    invites.value.unshift(res.data)
    return res.data
  }

  return {
    characters,
    invites,
    loading,
    fetchCharacters,
    createCharacter,
    updateCharacter,
    removeCharacter,
    uploadAvatar,
    fetchInvites,
    createInvite,
  }
})
