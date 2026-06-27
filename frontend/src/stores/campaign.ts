import { defineStore } from 'pinia'
import { ref } from 'vue'
import { gamesApi, type Game, type GameCreate, type GameDetail, type ScenePatch } from '../api/games'

export const useCampaignStore = defineStore('campaign', () => {
  // список игр (GamesView)
  const games = ref<Game[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // текущая открытая игра (MasterView)
  const currentGame = ref<GameDetail | null>(null)
  const gameLoading = ref(false)
  const gameError = ref<string | null>(null)

  // ── Список игр ────────────────────────────────────────────────────────────

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

  // ── Текущая игра ──────────────────────────────────────────────────────────

  async function fetchGame(id: number) {
    gameLoading.value = true
    gameError.value = null
    try {
      currentGame.value = await gamesApi.get(id)
    } catch {
      gameError.value = 'Не удалось загрузить игру'
    } finally {
      gameLoading.value = false
    }
  }

  async function addScene(title: string) {
    if (!currentGame.value) return
    const scenes = currentGame.value.scenes
    // авто-позиция: смещаем от последней ноды
    const x = scenes.length > 0 ? Math.max(...scenes.map((s) => s.x)) + 220 : 60
    const y = 60
    const scene = await gamesApi.createScene(currentGame.value.id, { title, x, y })
    currentGame.value.scenes.push(scene)
  }

  async function updateScene(sceneId: number, patch: ScenePatch) {
    const scene = await gamesApi.patchScene(sceneId, patch)
    if (!currentGame.value) return
    const idx = currentGame.value.scenes.findIndex((s) => s.id === sceneId)
    if (idx !== -1) currentGame.value.scenes[idx] = scene
  }

  async function removeScene(sceneId: number) {
    await gamesApi.deleteScene(sceneId)
    if (!currentGame.value) return
    currentGame.value.scenes = currentGame.value.scenes.filter((s) => s.id !== sceneId)
    currentGame.value.edges = currentGame.value.edges.filter(
      (e) => e.from_scene_id !== sceneId && e.to_scene_id !== sceneId,
    )
  }

  return {
    games, loading, error, fetchGames, createGame, removeGame,
    currentGame, gameLoading, gameError, fetchGame, addScene, updateScene, removeScene,
  }
})
