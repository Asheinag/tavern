import http from './http'

export interface Game {
  id: number
  title: string
  system: string
  cover: string | null
  share_code: string
  created_at: string
}

export interface Scene {
  id: number
  game_id: number
  title: string
  type: string
  status: string
  color: string | null
  summary: string
  x: number
  y: number
  col: number
  row: number
}

export interface Edge {
  id: number
  game_id: number
  from_scene_id: number
  to_scene_id: number
  cond: string | null
}

export interface GameDetail extends Game {
  scenes: Scene[]
  edges: Edge[]
}

export interface GameCreate {
  title: string
  system?: string
}

export interface SceneCreate {
  title: string
  x?: number
  y?: number
}

export interface ScenePatch {
  title?: string
  type?: string
  status?: string
  color?: string | null
  summary?: string
  x?: number
  y?: number
}

export const gamesApi = {
  list: () => http.get<Game[]>('/games').then((r) => r.data),
  create: (data: GameCreate) => http.post<Game>('/games', data).then((r) => r.data),
  remove: (id: number) => http.delete(`/games/${id}`),
  get: (id: number) => http.get<GameDetail>(`/games/${id}`).then((r) => r.data),

  createScene: (gameId: number, data: SceneCreate) =>
    http.post<Scene>(`/games/${gameId}/scenes`, data).then((r) => r.data),
  patchScene: (sceneId: number, data: ScenePatch) =>
    http.patch<Scene>(`/scenes/${sceneId}`, data).then((r) => r.data),
  deleteScene: (sceneId: number) => http.delete(`/scenes/${sceneId}`),

  createEdge: (gameId: number, fromSceneId: number, toSceneId: number) =>
    http.post<Edge>(`/games/${gameId}/edges`, { from_scene_id: fromSceneId, to_scene_id: toSceneId }).then((r) => r.data),
  deleteEdge: (edgeId: number) => http.delete(`/edges/${edgeId}`),
}
