import { defineStore } from 'pinia'
import { ref } from 'vue'
import { gamesApi, type Game, type GameCreate } from '../api/games'

export const useCampaignStore = defineStore('campaign', () => {
  const games = ref<Game[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchGames() {
    loading.value = true
    error.value = null
    try {
      games.value = await gamesApi.list()
    } catch {
      error.value = 'Не удалось загрузить список игр'
    } finally {
      loading.value = false
    }
  }

  async function createGame(data: GameCreate): Promise<Game> {
    const game = await gamesApi.create(data)
    games.value.unshift(game)
    return game
  }

  async function removeGame(id: number) {
    await gamesApi.remove(id)
    games.value = games.value.filter((g) => g.id !== id)
  }

  return { games, loading, error, fetchGames, createGame, removeGame }
})
